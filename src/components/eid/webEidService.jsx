// Service Web-eID pour la lecture de carte eID belge
// Documentation: https://web-eid.eu / https://github.com/web-eid/web-eid.js

// Charger dynamiquement la librairie Web-eID depuis le CDN
let webeidPromise = null;

const loadWebEid = async () => {
  if (webeidPromise) return webeidPromise;
  
  webeidPromise = new Promise((resolve, reject) => {
    // Vérifier si déjà chargé
    if (window.webeid) {
      resolve(window.webeid);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://web-eid.eu/lib/web-eid.umd.js';
    script.async = true;
    script.onload = () => {
      if (window.webeid) {
        resolve(window.webeid);
      } else {
        reject(new Error('Web-eID library failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Web-eID library'));
    document.head.appendChild(script);
  });
  
  return webeidPromise;
};

// Parser ASN.1 simplifié pour extraire les données du certificat X.509
const parseAsn1 = {
  // Décoder un certificat base64 et extraire le Subject
  parseCertificate(base64Cert) {
    try {
      const binary = atob(base64Cert);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Extraire les attributs du Subject du certificat
      const subjectData = this.extractSubjectFromDER(bytes);
      return subjectData;
    } catch (e) {
      console.error('[ASN.1 Parser] Error:', e);
      return null;
    }
  },
  
  // Extraire le Subject d'un certificat DER
  extractSubjectFromDER(bytes) {
    const result = {
      serialNumber: null, // Numéro national
      givenName: null,
      surname: null,
      commonName: null
    };
    
    // Convertir en string pour recherche de patterns
    let certStr = '';
    for (let i = 0; i < bytes.length; i++) {
      certStr += String.fromCharCode(bytes[i]);
    }
    
    // OIDs des attributs X.500 communs
    // 2.5.4.5 = serialNumber (numéro national)
    // 2.5.4.42 = givenName
    // 2.5.4.4 = surname
    // 2.5.4.3 = commonName
    
    // Chercher les patterns OID suivis de la valeur
    // Format: OID + longueur + type + longueur + valeur
    
    // OID pour serialNumber: 55 04 05 (2.5.4.5)
    const serialOidPattern = [0x55, 0x04, 0x05];
    result.serialNumber = this.findAttributeValue(bytes, serialOidPattern);
    
    // OID pour givenName: 55 04 2A (2.5.4.42)
    const givenNameOidPattern = [0x55, 0x04, 0x2A];
    result.givenName = this.findAttributeValue(bytes, givenNameOidPattern);
    
    // OID pour surname: 55 04 04 (2.5.4.4)
    const surnameOidPattern = [0x55, 0x04, 0x04];
    result.surname = this.findAttributeValue(bytes, surnameOidPattern);
    
    // OID pour commonName: 55 04 03 (2.5.4.3)
    const commonNameOidPattern = [0x55, 0x04, 0x03];
    result.commonName = this.findAttributeValue(bytes, commonNameOidPattern);
    
    return result;
  },
  
  // Trouver une valeur d'attribut après un OID
  findAttributeValue(bytes, oidPattern) {
    for (let i = 0; i < bytes.length - oidPattern.length - 5; i++) {
      // Chercher le pattern OID
      let found = true;
      for (let j = 0; j < oidPattern.length; j++) {
        if (bytes[i + j] !== oidPattern[j]) {
          found = false;
          break;
        }
      }
      
      if (found) {
        // Après l'OID, on a: type (1 byte) + longueur (1 byte) + valeur
        const offset = i + oidPattern.length;
        const valueType = bytes[offset];
        const valueLength = bytes[offset + 1];
        
        // Types string courants: 0x0C (UTF8), 0x13 (PrintableString), 0x1E (BMPString)
        if ((valueType === 0x0C || valueType === 0x13 || valueType === 0x14 || valueType === 0x1E) && valueLength > 0 && valueLength < 200) {
          const valueStart = offset + 2;
          const valueEnd = valueStart + valueLength;
          
          if (valueEnd <= bytes.length) {
            // Décoder la valeur
            if (valueType === 0x1E) {
              // BMPString (UTF-16BE)
              let str = '';
              for (let k = valueStart; k < valueEnd; k += 2) {
                str += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]);
              }
              return str.trim();
            } else {
              // UTF8 ou PrintableString
              let str = '';
              for (let k = valueStart; k < valueEnd; k++) {
                str += String.fromCharCode(bytes[k]);
              }
              // Décoder UTF-8
              try {
                return decodeURIComponent(escape(str)).trim();
              } catch {
                return str.trim();
              }
            }
          }
        }
      }
    }
    return null;
  }
};

export const webEidService = {
  // État du service
  status: {
    isAvailable: false,
    extensionInstalled: false,
    nativeAppInstalled: false,
    error: null
  },

  // Parser ASN.1 exposé
  parseAsn1,

  // Vérifier si Web-eID est disponible
  async checkStatus() {
    try {
      const webeid = await loadWebEid();
      const status = await webeid.status();
      
      this.status = {
        isAvailable: true,
        extensionInstalled: true,
        nativeAppInstalled: status?.library !== undefined,
        libraryVersion: status?.library,
        extensionVersion: status?.extension,
        error: null
      };
      
      return this.status;
    } catch (error) {
      this.status = {
        isAvailable: false,
        extensionInstalled: false,
        nativeAppInstalled: false,
        error: error.message || 'Web-eID non disponible'
      };
      return this.status;
    }
  },

  // Authentifier avec la carte eID (retourne un token d'authentification)
  async authenticate(nonce, options = {}) {
    const webeid = await loadWebEid();
    
    const authOptions = {
      lang: options.lang || 'fr',
      ...options
    };
    
    return await webeid.authenticate(nonce, authOptions);
  },
  
  // Lire les données de la carte via getCertificate (plus simple que authenticate)
  async readCardData(options = {}) {
    const webeid = await loadWebEid();
    
    // Utiliser getSigningCertificate qui ne requiert pas de PIN pour le certificat d'authentification
    // mais authenticate donne accès au certificat d'auth qui contient les données personnelles
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    
    try {
      const result = await webeid.authenticate(nonce, {
        lang: options.lang || 'fr'
      });
      
      // Parser le certificat pour extraire les données
      if (result.unverifiedCertificate) {
        const certData = parseAsn1.parseCertificate(result.unverifiedCertificate);
        
        if (certData) {
          return {
            success: true,
            rawCertificate: result.unverifiedCertificate,
            nationalNumber: certData.serialNumber,
            firstName: certData.givenName,
            lastName: certData.surname,
            commonName: certData.commonName,
            // Parser la date de naissance du NISS
            ...this.parseNISS(certData.serialNumber)
          };
        }
      }
      
      throw new Error('Impossible d\'extraire les données du certificat');
    } catch (error) {
      // Gérer les erreurs spécifiques Web-eID
      const errorMsg = this.getErrorMessage(error);
      throw new Error(errorMsg);
    }
  },
  
  // Parser le NISS pour extraire date de naissance et genre
  parseNISS(niss) {
    if (!niss || niss.length !== 11) return {};
    
    const year = parseInt(niss.substring(0, 2));
    const month = parseInt(niss.substring(2, 4));
    const day = parseInt(niss.substring(4, 6));
    const seq = parseInt(niss.substring(6, 9));
    
    // Déterminer le siècle
    const currentYear = new Date().getFullYear() % 100;
    const century = year > currentYear ? 1900 : 2000;
    
    return {
      birthDate: `${century + year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      gender: seq % 2 === 1 ? 'male' : 'female'
    };
  },
  
  // Messages d'erreur explicites
  getErrorMessage(error) {
    const code = error.code || error.message || '';
    
    const errorMessages = {
      'ERR_WEBEID_USER_CANCELLED': 'Opération annulée par l\'utilisateur',
      'ERR_WEBEID_NATIVE_UNAVAILABLE': 'Application Web-eID native non installée. Téléchargez-la depuis web-eid.eu',
      'ERR_WEBEID_EXTENSION_UNAVAILABLE': 'Extension Web-eID non installée dans votre navigateur',
      'ERR_WEBEID_VERSION_MISMATCH': 'Version incompatible de Web-eID. Mettez à jour l\'application et l\'extension',
      'ERR_WEBEID_CARD_NOT_FOUND': 'Aucune carte eID détectée. Insérez votre carte dans le lecteur',
      'ERR_WEBEID_WRONG_PIN': 'Code PIN incorrect',
      'ERR_WEBEID_PIN_BLOCKED': 'Code PIN bloqué. Utilisez votre code PUK pour débloquer',
      'ERR_WEBEID_TIMEOUT': 'Délai d\'attente dépassé. Réessayez',
      'user_cancelled': 'Opération annulée par l\'utilisateur'
    };
    
    for (const [key, msg] of Object.entries(errorMessages)) {
      if (code.includes(key) || (error.message && error.message.includes(key))) {
        return msg;
      }
    }
    
    return error.message || 'Erreur lors de la lecture de la carte eID';
  },

  // Obtenir le certificat de signature
  async getSigningCertificate(options = {}) {
    const webeid = await loadWebEid();
    
    return await webeid.getSigningCertificate({
      lang: options.lang || 'fr',
      ...options
    });
  },

  // Signer un document
  async sign(certificate, hash, hashFunction, options = {}) {
    const webeid = await loadWebEid();
    
    return await webeid.sign(certificate, hash, hashFunction, {
      lang: options.lang || 'fr',
      ...options
    });
  },

  // Liens d'installation Web-eID
  getInstallationLinks() {
    const platform = this.detectPlatform();
    
    return {
      main: 'https://web-eid.eu/',
      windows: 'https://installer.id.ee/media/web-eid/web-eid_2.8.0.913.x64.exe',
      macos: 'https://installer.id.ee/media/web-eid/web-eid_2.8.0.710.dmg',
      macosSafari: 'https://apps.apple.com/ee/app/web-eid/id1576665083',
      linux: 'https://web-eid.eu/', // Instructions on main page
      chromeExtension: 'https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic',
      firefoxExtension: 'https://addons.mozilla.org/firefox/addon/web-eid-webextension/',
      documentation: 'https://github.com/web-eid/web-eid-system-architecture-doc',
      platform
    };
  },

  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    if (platform.includes('win') || userAgent.includes('windows')) return 'windows';
    if (platform.includes('mac') || userAgent.includes('macintosh')) return 'macos';
    if (platform.includes('linux') || userAgent.includes('linux')) return 'linux';
    
    return 'unknown';
  },

  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
    if (ua.includes('Edg')) return 'edge';
    if (ua.includes('Chrome')) return 'chrome';
    return 'unknown';
  }
};