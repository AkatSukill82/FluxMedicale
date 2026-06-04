/**
 * Service Web-eID pour la lecture de carte eID belge
 *
 * Implémentation sans dépendance externe.
 * Communique directement avec l'extension navigateur Web-eID via window.postMessage.
 *
 * Prérequis :
 *  1. Extension Web-eID Chrome : https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic
 *  2. Application native Web-eID : https://installer.id.ee/media/web-eid/web-eid_2.8.0.913.x64.exe
 *  3. Middleware eID belge : https://eid.belgium.be/fr/telechargements
 *
 * Si l'extension n'est pas installée → isAvailable: false → useEIDReader bascule
 * automatiquement sur l'agent local (port 27272) ou e-Contract (35963).
 */
import { nissValidator } from './nissValidator';

const MSG_TIMEOUT = 5000;

/**
 * Envoie un message à l'extension Web-eID et attend la réponse.
 */
function postToExtension(payload, expectedAction) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('ERR_WEBEID_TIMEOUT'));
    }, MSG_TIMEOUT);

    function handler(event) {
      if (event.source !== window) return;
      const d = event.data;
      if (!d || d.nonce !== nonce) return;
      if (d.action === expectedAction) {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        if (d.error) reject(Object.assign(new Error(d.error.message || d.error), { code: d.error.code || d.error }));
        else resolve(d);
      }
    }

    window.addEventListener('message', handler);
    window.postMessage({ ...payload, nonce }, '*');
  });
}

/**
 * Parser ASN.1 minimal pour extraire les champs du Subject d'un certificat X.509.
 */
const parseAsn1 = {
  parseCertificate(base64Cert) {
    try {
      const bin = atob(base64Cert);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return this.extractSubject(bytes);
    } catch { return null; }
  },

  extractSubject(bytes) {
    return {
      serialNumber: this.findOid(bytes, [0x55, 0x04, 0x05]), // 2.5.4.5
      givenName:    this.findOid(bytes, [0x55, 0x04, 0x2A]), // 2.5.4.42
      surname:      this.findOid(bytes, [0x55, 0x04, 0x04]), // 2.5.4.4
      commonName:   this.findOid(bytes, [0x55, 0x04, 0x03]), // 2.5.4.3
    };
  },

  findOid(bytes, oid) {
    for (let i = 0; i < bytes.length - oid.length - 4; i++) {
      if (oid.every((b, j) => bytes[i + j] === b)) {
        const type = bytes[i + oid.length];
        const len  = bytes[i + oid.length + 1];
        if (len < 1 || len > 200) continue;
        const start = i + oid.length + 2;
        const end   = start + len;
        if (end > bytes.length) continue;
        if (type === 0x1E) {
          let s = '';
          for (let k = start; k < end; k += 2)
            s += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]);
          return s.trim();
        }
        let s = '';
        for (let k = start; k < end; k++) s += String.fromCharCode(bytes[k]);
        try { return decodeURIComponent(escape(s)).trim(); } catch { return s.trim(); }
      }
    }
    return null;
  },
};

export const webEidService = {
  parseAsn1,

  /** Vérifie si l'extension Web-eID est installée et active. */
  async checkStatus() {
    try {
      const res = await postToExtension({ action: 'web-eid status' }, 'web-eid status-ack');
      return {
        isAvailable: true,
        extensionInstalled: true,
        nativeAppInstalled: !!res.nativeApp,
        libraryVersion: res.library || res.version,
        extensionVersion: res.extension,
        error: null,
      };
    } catch {
      return { isAvailable: false, extensionInstalled: false, nativeAppInstalled: false, error: 'Extension Web-eID non détectée.' };
    }
  },

  /** Lit la carte eID via l'extension (demande PIN). */
  async readCardData(options = {}) {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    try {
      const res = await postToExtension(
        { action: 'web-eid authenticate', lang: options.lang || 'fr', nonce },
        'web-eid authenticate-ack'
      );

      if (!res.unverifiedCertificate) throw new Error('Certificat absent dans la réponse.');

      const cert = parseAsn1.parseCertificate(res.unverifiedCertificate);
      if (!cert) throw new Error('Impossible de parser le certificat X.509.');

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
      'ERR_WEBEID_USER_CANCELLED':       "Opération annulée par l'utilisateur.",
      'ERR_WEBEID_NATIVE_UNAVAILABLE':   'Application Web-eID non installée. Téléchargez-la sur web-eid.eu.',
      'ERR_WEBEID_EXTENSION_UNAVAILABLE':'Extension Web-eID absente. Installez-la dans votre navigateur.',
      'ERR_WEBEID_VERSION_MISMATCH':     "Version incompatible. Mettez à jour l'application et l'extension.",
      'ERR_WEBEID_CARD_NOT_FOUND':       'Aucune carte eID détectée. Insérez votre carte.',
      'ERR_WEBEID_WRONG_PIN':            'Code PIN incorrect.',
      'ERR_WEBEID_PIN_BLOCKED':          'Code PIN bloqué. Utilisez votre PUK.',
      'ERR_WEBEID_TIMEOUT':              'Délai dépassé. Réessayez.',
    };
    for (const [k, v] of Object.entries(map)) {
      if (code.includes(k)) return v;
    }
    return error.message || 'Erreur lors de la lecture eID.';
  },

  getInstallationLinks() {
    return {
      main:             'https://web-eid.eu/',
      windows:          'https://installer.id.ee/media/web-eid/web-eid_2.8.0.913.x64.exe',
      macos:            'https://installer.id.ee/media/web-eid/web-eid_2.8.0.710.dmg',
      macosSafari:      'https://apps.apple.com/ee/app/web-eid/id1576665083',
      linux:            'https://web-eid.eu/',
      chromeExtension:  'https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic',
      firefoxExtension: 'https://addons.mozilla.org/firefox/addon/web-eid-webextension/',
      officialMiddleware:'https://eid.belgium.be/fr/telechargements',
    };
  },
};
