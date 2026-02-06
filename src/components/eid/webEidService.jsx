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

export const webEidService = {
  // État du service
  status: {
    isAvailable: false,
    extensionInstalled: false,
    nativeAppInstalled: false,
    error: null
  },

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