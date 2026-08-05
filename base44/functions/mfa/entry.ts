import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Authentification à deux facteurs — TOTP (RFC 6238).
 *
 * L'implémentation précédente était côté navigateur et inopérante :
 *  - le secret était tiré avec Math.random(), donc prédictible ;
 *  - il était envoyé à api.qrserver.com pour fabriquer le QR code, c'est-à-dire
 *    transmis en clair à un tiers ;
 *  - il était stocké tel quel malgré le nom de champ `_encrypted` ;
 *  - la vérification d'enrôlement se résumait à `code.length === 6` ;
 *  - le compteur de tentatives vivait dans un état React, réinitialisé par un
 *    simple rechargement de page.
 *
 * Ici le secret est tiré par le CSPRNG du serveur, chiffré en AES-256-GCM avant
 * stockage, et ne quitte le serveur qu'une seule fois, au moment de
 * l'enrôlement, pour permettre l'affichage du QR code (généré localement dans
 * le navigateur, sans service externe).
 *
 * Variable d'environnement requise :
 *   MFA_ENCRYPTION_KEY   32 octets en hexadécimal (64 caractères)
 */

const DIGITS = 6;
const PERIOD = 30;
const SKEW_STEPS = 1;            // ±30 s de tolérance d'horloge
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BACKUP_CODE_COUNT = 10;
const ISSUER = 'FluxMed';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// --- Base32 -----------------------------------------------------------------

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(secret: string): Uint8Array {
  const clean = secret.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = B32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Secret TOTP invalide');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// --- TOTP -------------------------------------------------------------------

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // Compteur sur 64 bits big-endian.
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);

  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));

  // Troncature dynamique (RFC 4226 §5.4).
  const offset = sig[sig.length - 1] & 0x0f;
  const code = ((sig[offset] & 0x7f) << 24)
    | ((sig[offset + 1] & 0xff) << 16)
    | ((sig[offset + 2] & 0xff) << 8)
    | (sig[offset + 3] & 0xff);

  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Comparaison à temps constant : ne renseigne pas sur la position d'un écart. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie un code sur la fenêtre autorisée.
 * @returns le pas de temps consommé, ou null si aucun ne correspond.
 */
async function verifyTotp(secretB32: string, code: string): Promise<number | null> {
  if (!/^\d{6}$/.test(code || '')) return null;
  const secret = base32Decode(secretB32);
  const current = Math.floor(Date.now() / 1000 / PERIOD);

  for (let drift = -SKEW_STEPS; drift <= SKEW_STEPS; drift += 1) {
    const counter = current + drift;
    if (timingSafeEqual(await hotp(secret, counter), code)) return counter;
  }
  return null;
}

// --- Chiffrement au repos ---------------------------------------------------

async function encryptionKey(): Promise<CryptoKey> {
  const hex = Deno.env.get('MFA_ENCRYPTION_KEY');
  if (!hex || hex.length !== 64) {
    throw new Error('MFA_ENCRYPTION_KEY absente ou invalide (32 octets hex attendus)');
  }
  return crypto.subtle.importKey(
    'raw', fromHex(hex), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
  );
}

async function encryptSecret(plain: string) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain),
  );
  return { ciphertext: toHex(new Uint8Array(cipher)), iv: toHex(iv) };
}

async function decryptSecret(ciphertextHex: string, ivHex: string): Promise<string> {
  const key = await encryptionKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(ivHex) }, key, fromHex(ciphertextHex),
  );
  return new TextDecoder().decode(plain);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}

// --- Codes de secours -------------------------------------------------------

function generateBackupCode(): string {
  // 4 groupes de 4 caractères non ambigus, tirés du CSPRNG.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

// --- Verrouillage -----------------------------------------------------------

function isLocked(device: Record<string, any>): boolean {
  return Boolean(device.locked_until) && new Date(device.locked_until) > new Date();
}

async function registerFailure(base44: any, device: Record<string, any>) {
  const failed = (device.failed_attempts || 0) + 1;
  const patch: Record<string, unknown> = { failed_attempts: failed };
  if (failed >= MAX_FAILED_ATTEMPTS) {
    patch.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
    patch.failed_attempts = 0;
  }
  await base44.asServiceRole.entities.MFADevice.update(device.id, patch);
  return failed;
}

async function activeDeviceFor(base44: any, email: string) {
  const devices = await base44.asServiceRole.entities.MFADevice.filter({
    user_email: email,
    device_type: 'TOTP',
    status: 'ACTIVE',
  });
  return devices?.[0] || null;
}

// --- Handler ----------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { action, code, device_name } = await req.json();

    // Un utilisateur n'agit que sur son propre facteur : l'e-mail vient de la
    // session, jamais de la charge utile.
    const email = user.email;

    switch (action) {
      /**
       * Démarre l'enrôlement. Le secret en clair n'est renvoyé qu'ici, pour
       * l'affichage du QR code, et n'est plus jamais réémis ensuite.
       */
      case 'enroll_start': {
        const secret = base32Encode(crypto.getRandomValues(new Uint8Array(20))); // 160 bits
        const { ciphertext, iv } = await encryptSecret(secret);

        // Un enrôlement en cours remplace le précédent.
        const pending = await base44.asServiceRole.entities.MFADevice.filter({
          user_email: email, device_type: 'TOTP', status: 'PENDING',
        });
        for (const device of pending || []) {
          await base44.asServiceRole.entities.MFADevice.delete(device.id);
        }

        const device = await base44.asServiceRole.entities.MFADevice.create({
          user_email: email,
          device_type: 'TOTP',
          device_name: device_name || 'Application d\'authentification',
          totp_secret_encrypted: ciphertext,
          totp_secret_iv: iv,
          status: 'PENDING',
          is_active: false,
          failed_attempts: 0,
          enrolled_at: new Date().toISOString(),
        });

        const label = encodeURIComponent(`${ISSUER}:${email}`);
        const otpauth = `otpauth://totp/${label}?secret=${secret}`
          + `&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1`
          + `&digits=${DIGITS}&period=${PERIOD}`;

        return Response.json({ device_id: device.id, secret, otpauth_url: otpauth });
      }

      /** Confirme l'enrôlement par un premier code valide, puis émet les codes de secours. */
      case 'enroll_confirm': {
        const pending = await base44.asServiceRole.entities.MFADevice.filter({
          user_email: email, device_type: 'TOTP', status: 'PENDING',
        });
        const device = pending?.[0];
        if (!device) {
          return Response.json({ error: 'Aucun enrôlement en cours' }, { status: 404 });
        }
        if (isLocked(device)) {
          return Response.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
        }

        const secret = await decryptSecret(device.totp_secret_encrypted, device.totp_secret_iv);
        const counter = await verifyTotp(secret, code);
        if (counter === null) {
          await registerFailure(base44, device);
          return Response.json({ valid: false, error: 'Code invalide' }, { status: 400 });
        }

        const codes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
        const hashes = await Promise.all(
          codes.map(async (c) => ({ hash: await sha256Hex(c), used: false })),
        );

        await base44.asServiceRole.entities.MFADevice.update(device.id, {
          status: 'ACTIVE',
          is_active: true,
          failed_attempts: 0,
          locked_until: null,
          last_used_counter: counter,
          last_used_at: new Date().toISOString(),
          backup_code_hashes: hashes,
        });

        // Les codes en clair ne sont renvoyés qu'ici : seuls leurs hachages
        // sont conservés.
        return Response.json({ valid: true, backup_codes: codes });
      }

      /** Vérifie un code TOTP. Rejeu bloqué, verrouillage appliqué côté serveur. */
      case 'verify': {
        const device = await activeDeviceFor(base44, email);
        if (!device) {
          return Response.json({ valid: false, error: 'Aucun facteur TOTP actif' }, { status: 404 });
        }
        if (isLocked(device)) {
          return Response.json({
            valid: false,
            error: 'Compte temporairement bloqué',
            locked_until: device.locked_until,
          }, { status: 429 });
        }

        const secret = await decryptSecret(device.totp_secret_encrypted, device.totp_secret_iv);
        const counter = await verifyTotp(secret, code);

        if (counter === null) {
          const failed = await registerFailure(base44, device);
          return Response.json({
            valid: false,
            remaining_attempts: Math.max(0, MAX_FAILED_ATTEMPTS - failed),
          });
        }

        // Un code déjà consommé ne peut pas resservir dans sa fenêtre de 30 s.
        if (device.last_used_counter && counter <= device.last_used_counter) {
          return Response.json({ valid: false, error: 'Code déjà utilisé' });
        }

        await base44.asServiceRole.entities.MFADevice.update(device.id, {
          last_used_counter: counter,
          last_used_at: new Date().toISOString(),
          failed_attempts: 0,
          locked_until: null,
        });

        return Response.json({ valid: true });
      }

      /** Vérifie un code de secours. Usage unique, invalidé immédiatement. */
      case 'verify_backup_code': {
        const device = await activeDeviceFor(base44, email);
        if (!device) {
          return Response.json({ valid: false, error: 'Aucun facteur TOTP actif' }, { status: 404 });
        }
        if (isLocked(device)) {
          return Response.json({ valid: false, error: 'Compte temporairement bloqué' }, { status: 429 });
        }

        const submitted = String(code || '').trim().toUpperCase();
        const hash = await sha256Hex(submitted);
        const entries = device.backup_code_hashes || [];
        const index = entries.findIndex((e: any) => e.hash === hash && !e.used);

        if (index === -1) {
          await registerFailure(base44, device);
          return Response.json({ valid: false, error: 'Code de secours invalide ou déjà utilisé' });
        }

        entries[index] = { ...entries[index], used: true, used_at: new Date().toISOString() };
        await base44.asServiceRole.entities.MFADevice.update(device.id, {
          backup_code_hashes: entries,
          last_used_at: new Date().toISOString(),
          failed_attempts: 0,
          locked_until: null,
        });

        const remaining = entries.filter((e: any) => !e.used).length;
        return Response.json({ valid: true, remaining_backup_codes: remaining });
      }

      /** État du facteur, pour l'interface. Ne divulgue jamais le secret. */
      case 'status': {
        const device = await activeDeviceFor(base44, email);
        return Response.json({
          enrolled: Boolean(device),
          enrolled_at: device?.enrolled_at || null,
          last_used_at: device?.last_used_at || null,
          remaining_backup_codes:
            (device?.backup_code_hashes || []).filter((e: any) => !e.used).length,
        });
      }

      default:
        return Response.json({ error: 'Action non reconnue' }, { status: 400 });
    }
  } catch (error) {
    console.error('MFA error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
