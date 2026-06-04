/**
 * Service Web-eID — lecture carte eID belge SANS PIN
 *
 * Utilise getSigningCertificate() qui retourne le certificat de signature
 * sans demander le PIN. Ce certificat contient : NISS, nom, prénom.
 *
 * Protocole window.postMessage (web-eid-webextension) :
 *   action : "web-eid-get-signing-certificate"   (tiret, pas espace)
 *   ack    : "web-eid-get-signing-certificate-ack"
 *
 * Prérequis :
 *  1. Extension Chrome Web-eID installée
 *  2. Application native Web-eID installée
 *  3. Middleware Belgium eID installé
 */
import { nissValidator } from './nissValidator';

const MSG_TIMEOUT = 8000;

function sendToExtension(payload, ackAction) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();

    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('ERR_WEBEID_TIMEOUT'));
    }, MSG_TIMEOUT);

    function handler(event) {
      if (!event.data || event.data.nonce !== nonce) return;
      if (event.data.action === ackAction) {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        const err = event.data.error;
        if (err) {
          const e = new Error(err.message || String(err));
          e.code = err.code || String(err);
          reject(e);
        } else {
          resolve(event.data);
        }
      }
    }

    window.addEventListener('message', handler);
    window.postMessage({ ...payload, nonce }, window.location.origin);
  });
}

/**
 * Parser ASN.1 minimal — extrait Subject d'un certificat X.509 DER (base64).
 */
const asn1 = {
  parse(b64) {
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return {
        serialNumber: this.oid(bytes, [0x55, 0x04, 0x05]), // NISS
        givenName:    this.oid(bytes, [0x55, 0x04, 0x2A]),
        surname:      this.oid(bytes, [0x55, 0x04, 0x04]),
        commonName:   this.oid(bytes, [0x55, 0x04, 0x03]),
      };
    } catch { return null; }
  },

  oid(bytes, pattern) {
    for (let i = 0; i < bytes.length - pattern.length - 4; i++) {
      if (!pattern.every((b, j) => bytes[i + j] === b)) continue;
      const type = bytes[i + pattern.length];
      const len  = bytes[i + pattern.length + 1];
      if (!len || len > 200) continue;
      const s = i + pattern.length + 2;
      const e = s + len;
      if (e > bytes.length) continue;
      if (type === 0x1E) {
        let r = '';
        for (let k = s; k < e; k += 2)
          r += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]);
        return r.trim();
      }
      let r = '';
      for (let k = s; k < e; k++) r += String.fromCharCode(bytes[k]);
      try { return decodeURIComponent(escape(r)).trim(); } catch { return r.trim(); }
    }
    return null;
  },
};

export const webEidService = {
  /** Vérifie si l'extension Web-eID est disponible. */
  async checkStatus() {
    try {
      const res = await sendToExtension(
        { action: 'web-eid-status' },
        'web-eid-status-ack'
      );
      return {
        isAvailable: true,
        extensionInstalled: true,
        nativeAppInstalled: !!res.nativeApp,
        libraryVersion: res.library || res.version,
        extensionVersion: res.extension,
        error: null,
      };
    } catch {
      return {
        isAvailable: false,
        extensionInstalled: false,
        nativeAppInstalled: false,
        error: 'Extension Web-eID non détectée.',
      };
    }
  },

  /**
   * Lit les données de la carte eID SANS PIN via getSigningCertificate.
   * Le certificat de signature contient NISS, nom, prénom.
   */
  async readCardData(options = {}) {
    try {
      const res = await sendToExtension(
        { action: 'web-eid-get-signing-certificate', lang: options.lang || 'fr' },
        'web-eid-get-signing-certificate-ack'
      );

      const certB64 = res.certificate || res.unverifiedCertificate;
      if (!certB64) throw new Error('Certificat absent dans la réponse Web-eID.');

      const cert = asn1.parse(certB64);
      if (!cert) throw new Error('Impossible de lire le certificat.');

      const normalizedNiss = nissValidator.normalize(cert.serialNumber || '');
      const birthDate = normalizedNiss
        ? nissValidator.extractBirthDate(normalizedNiss)?.toISOString().split('T')[0] ?? null
        : null;
      const gender = normalizedNiss ? nissValidator.extractGender(normalizedNiss) : 'unknown';

      return {
        success: true,
        nationalNumber: normalizedNiss,
        firstName: cert.givenName,
        lastName: cert.surname,
        commonName: cert.commonName,
        birthDate,
        gender,
      };
    } catch (err) {
      throw new Error(this.getErrorMessage(err));
    }
  },

  getErrorMessage(error) {
    const code = error.code || error.message || '';
    const map = {
      ERR_WEBEID_USER_CANCELLED:        "Opération annulée.",
      ERR_WEBEID_NATIVE_UNAVAILABLE:    "Application Web-eID non installée (web-eid.eu).",
      ERR_WEBEID_EXTENSION_UNAVAILABLE: "Extension Web-eID absente dans Chrome.",
      ERR_WEBEID_VERSION_MISMATCH:      "Mettez à jour l'extension et l'application Web-eID.",
      ERR_WEBEID_CARD_NOT_FOUND:        "Aucune carte eID dans le lecteur.",
      ERR_WEBEID_TIMEOUT:               "Délai dépassé — vérifiez que la carte est insérée.",
    };
    for (const [k, v] of Object.entries(map)) {
      if (code.includes(k)) return v;
    }
    return error.message || 'Erreur lecture eID.';
  },

  getInstallationLinks: () => ({
    main:              'https://web-eid.eu/',
    windows:           'https://installer.id.ee/media/web-eid/web-eid_2.8.0.913.x64.exe',
    macos:             'https://installer.id.ee/media/web-eid/web-eid_2.8.0.710.dmg',
    chromeExtension:   'https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic',
    firefoxExtension:  'https://addons.mozilla.org/firefox/addon/web-eid-webextension/',
    officialMiddleware:'https://eid.belgium.be/fr/telechargements',
  }),
};
