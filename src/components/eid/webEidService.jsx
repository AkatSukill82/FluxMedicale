/**
 * Service Web-eID pour la lecture de carte eID belge
 *
 * Web-eID est la solution officielle recommandée par eHealth platform Belgique.
 * Elle nécessite :
 *  1. L'application native Web-eID installée sur le PC (https://web-eid.eu)
 *  2. L'extension de navigateur Web-eID (Chrome / Firefox / Safari)
 *  3. Le middleware eID belge (https://eid.belgium.be)
 *
 * Flux :
 *  - web-eid.authenticate() → demande PIN → retourne token SAML + certificat X.509
 *  - Le certificat contient : NISS, prénom, nom, date naissance, sexe
 *
 * Documentation : https://github.com/web-eid/web-eid-system-architecture-doc
 */
import * as webeid from '@web-eid/web-eid-library';
import { nissValidator } from './nissValidator';

// Parser ASN.1 simplifié pour extraire les données du certificat X.509 d'authentification eID
const parseAsn1 = {
  parseCertificate(base64Cert) {
    try {
      const binary = atob(base64Cert);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return this.extractSubjectFromDER(bytes);
    } catch {
      return null;
    }
  },

  extractSubjectFromDER(bytes) {
    const result = { serialNumber: null, givenName: null, surname: null, commonName: null };
    result.serialNumber = this.findAttributeValue(bytes, [0x55, 0x04, 0x05]); // OID 2.5.4.5
    result.givenName    = this.findAttributeValue(bytes, [0x55, 0x04, 0x2A]); // OID 2.5.4.42
    result.surname      = this.findAttributeValue(bytes, [0x55, 0x04, 0x04]); // OID 2.5.4.4
    result.commonName   = this.findAttributeValue(bytes, [0x55, 0x04, 0x03]); // OID 2.5.4.3
    return result;
  },

  findAttributeValue(bytes, oidPattern) {
    for (let i = 0; i < bytes.length - oidPattern.length - 5; i++) {
      let found = true;
      for (let j = 0; j < oidPattern.length; j++) {
        if (bytes[i + j] !== oidPattern[j]) { found = false; break; }
      }
      if (!found) continue;

      const offset = i + oidPattern.length;
      const valueType = bytes[offset];
      const valueLength = bytes[offset + 1];

      if ((valueType === 0x0C || valueType === 0x13 || valueType === 0x14 || valueType === 0x1E)
          && valueLength > 0 && valueLength < 200) {
        const valueStart = offset + 2;
        const valueEnd = valueStart + valueLength;
        if (valueEnd > bytes.length) continue;

        if (valueType === 0x1E) {
          // BMPString (UTF-16 BE)
          let str = '';
          for (let k = valueStart; k < valueEnd; k += 2)
            str += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]);
          return str.trim();
        } else {
          let str = '';
          for (let k = valueStart; k < valueEnd; k++) str += String.fromCharCode(bytes[k]);
          try { return decodeURIComponent(escape(str)).trim(); } catch { return str.trim(); }
        }
      }
    }
    return null;
  },
};

export const webEidService = {
  parseAsn1,

  async checkStatus() {
    try {
      const status = await webeid.status();
      return {
        isAvailable: true,
        extensionInstalled: true,
        nativeAppInstalled: status?.library !== undefined,
        libraryVersion: status?.library,
        extensionVersion: status?.extension,
        error: null,
      };
    } catch (error) {
      return {
        isAvailable: false,
        extensionInstalled: false,
        nativeAppInstalled: false,
        error: error.message || 'Web-eID non disponible',
      };
    }
  },

  async readCardData(options = {}) {
    // Générer un nonce cryptographique (32 octets)
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

    try {
      const result = await webeid.authenticate(nonce, { lang: options.lang || 'fr' });

      if (!result.unverifiedCertificate) throw new Error('Certificat absent dans la réponse Web-eID.');

      const certData = parseAsn1.parseCertificate(result.unverifiedCertificate);
      if (!certData) throw new Error('Impossible de parser le certificat X.509.');

      // Utiliser nissValidator pour extraire correctement la date de naissance et le sexe
      const normalizedNiss = nissValidator.normalize(certData.serialNumber || '');
      const birthDate = normalizedNiss
        ? nissValidator.extractBirthDate(normalizedNiss)?.toISOString().split('T')[0] ?? null
        : null;
      const gender = normalizedNiss ? nissValidator.extractGender(normalizedNiss) : 'unknown';

      return {
        success: true,
        rawCertificate: result.unverifiedCertificate,
        nationalNumber: normalizedNiss,
        firstName: certData.givenName,
        lastName: certData.surname,
        commonName: certData.commonName,
        birthDate,
        gender,
      };
    } catch (error) {
      throw new Error(this.getErrorMessage(error));
    }
  },

  async authenticate(nonce, options = {}) {
    return await webeid.authenticate(nonce, { lang: options.lang || 'fr', ...options });
  },

  async getSigningCertificate(options = {}) {
    return await webeid.getSigningCertificate({ lang: options.lang || 'fr', ...options });
  },

  async sign(certificate, hash, hashFunction, options = {}) {
    return await webeid.sign(certificate, hash, hashFunction, { lang: options.lang || 'fr', ...options });
  },

  getErrorMessage(error) {
    const code = error.code || error.message || '';
    const messages = {
      'ERR_WEBEID_USER_CANCELLED':       'Opération annulée par l\'utilisateur.',
      'ERR_WEBEID_NATIVE_UNAVAILABLE':   'Application Web-eID non installée. Téléchargez-la sur web-eid.eu.',
      'ERR_WEBEID_EXTENSION_UNAVAILABLE':'Extension Web-eID absente. Installez-la dans votre navigateur.',
      'ERR_WEBEID_VERSION_MISMATCH':     'Version Web-eID incompatible. Mettez à jour l\'application et l\'extension.',
      'ERR_WEBEID_CARD_NOT_FOUND':       'Aucune carte eID détectée. Insérez votre carte dans le lecteur.',
      'ERR_WEBEID_WRONG_PIN':            'Code PIN incorrect.',
      'ERR_WEBEID_PIN_BLOCKED':          'Code PIN bloqué. Utilisez votre PUK pour débloquer.',
      'ERR_WEBEID_TIMEOUT':              'Délai dépassé. Réessayez.',
      'user_cancelled':                  'Opération annulée par l\'utilisateur.',
    };
    for (const [key, msg] of Object.entries(messages)) {
      if (code.includes(key)) return msg;
    }
    return error.message || 'Erreur lors de la lecture de la carte eID.';
  },

  getInstallationLinks() {
    return {
      main: 'https://web-eid.eu/',
      windows: 'https://installer.id.ee/media/web-eid/web-eid_2.8.0.913.x64.exe',
      macos: 'https://installer.id.ee/media/web-eid/web-eid_2.8.0.710.dmg',
      macosSafari: 'https://apps.apple.com/ee/app/web-eid/id1576665083',
      linux: 'https://web-eid.eu/',
      chromeExtension: 'https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic',
      firefoxExtension: 'https://addons.mozilla.org/firefox/addon/web-eid-webextension/',
      officialMiddleware: 'https://eid.belgium.be/fr/telechargements',
    };
  },

  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    const p = (navigator.platform || '').toLowerCase();
    if (p.includes('win') || ua.includes('windows')) return 'windows';
    if (p.includes('mac') || ua.includes('macintosh')) return 'macos';
    if (p.includes('linux') || ua.includes('linux')) return 'linux';
    return 'unknown';
  },

  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
    if (ua.includes('Edg')) return 'edge';
    if (ua.includes('Chrome')) return 'chrome';
    return 'unknown';
  },
};
