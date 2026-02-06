import { webEidService } from './webEidService';

// Service de détection eID Viewer / Middleware (multi-OS)
// Supporte Web-eID (moderne) et e-Contract.be (legacy)
export const eidDetectionService = {
  // État de la détection
  status: {
    isDetected: false,
    hasMiddleware: false,
    hasWebEid: false,
    hasEContract: false,
    hasSmartCardService: false,
    platform: null,
    details: null,
    preferredMethod: null // 'web-eid' ou 'e-contract'
  },

  // Détecter tous les middlewares eID disponibles
  async detectEIDMiddleware() {
    const platform = this.detectPlatform();
    this.status.platform = platform;
    this.status.isDetected = false;
    this.status.hasMiddleware = false;
    this.status.hasWebEid = false;
    this.status.hasEContract = false;
    this.status.hasSmartCardService = true;
    this.status.preferredMethod = null;

    // Test 1: Vérifier Web-eID (méthode moderne et recommandée)
    try {
      const webEidStatus = await webEidService.checkStatus();
      if (webEidStatus.isAvailable) {
        this.status.hasWebEid = true;
        this.status.hasMiddleware = true;
        this.status.isDetected = true;
        this.status.preferredMethod = 'web-eid';
        this.status.details = `Web-eID détecté (v${webEidStatus.libraryVersion || 'unknown'})`;
      }
    } catch (error) {
      // Web-eID non disponible, continuer avec e-Contract
    }

    // Test 2: Vérifier e-Contract.be (fallback legacy)
    if (!this.status.hasWebEid) {
      try {
        const response = await fetch('http://localhost:35963/v1/readers', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(1500)
        });

        if (response.ok) {
          this.status.hasEContract = true;
          this.status.hasMiddleware = true;
          this.status.isDetected = true;
          this.status.preferredMethod = 'e-contract';
          this.status.details = 'e-Contract.be Middleware détecté';
        }
      } catch (error) {
        // e-Contract non disponible non plus
      }
    }

    // Aucun middleware détecté
    if (!this.status.hasMiddleware) {
      this.status.details = "Aucun middleware eID détecté. Installez Web-eID (recommandé) ou e-Contract.be.";
    }
    
    return this.status;
  },

  // Détecter la plateforme
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac') || userAgent.includes('macintosh')) return 'macos';
    if (platform.includes('linux') || userAgent.includes('linux')) return 'linux';
    
    return 'unknown';
  },

  // Vérifier si une carte est insérée
  async checkCardPresence() {
    try {
      const response = await fetch('http://localhost:35963/v1/readers', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const data = await response.json();
        return data.readers?.some(r => r.card_present) || false;
      }
    } catch (error) {
      console.log('[eID Detection] Erreur vérification carte');
    }
    return false;
  },

  // Liens d'installation - Web-eID (recommandé) et alternatives
  getInstallationLinks() {
    const platform = this.detectPlatform();
    const browser = this.detectBrowser();
    
    return {
      // Web-eID (RECOMMANDÉ - moderne et officiel)
      webEid: {
        main: 'https://web-eid.eu/',
        windows: 'https://installer.id.ee/media/web-eid/web-eid_2.8.0.913.x64.exe',
        macos: 'https://installer.id.ee/media/web-eid/web-eid_2.8.0.710.dmg',
        macosSafari: 'https://apps.apple.com/ee/app/web-eid/id1576665083',
        linux: 'https://web-eid.eu/',
        chromeExtension: 'https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic',
        firefoxExtension: 'https://addons.mozilla.org/firefox/addon/web-eid-webextension/'
      },
      
      // e-Contract.be (fallback)
      eContract: {
        main: 'https://www.e-contract.be/products/eid-browser-middleware',
        download: 'https://www.e-contract.be/products/eid-browser-middleware'
      },
      
      // eID officiel belge (prérequis)
      official: {
        viewer: 'https://eid.belgium.be/fr/telechargements',
        windows: 'https://eid.belgium.be/sites/default/files/software/Belgium_eID_MW_5.1.11.6348_Installer_x64.msi',
        macos: 'https://eid.belgium.be/sites/default/files/software/eID_Viewer_5.1.11.pkg',
        linux: 'https://eid.belgium.be/fr/telechargements',
        faq: 'https://eid.belgium.be/fr/faq',
        support: 'https://eid.belgium.be/fr/support'
      },
      
      platform,
      browser
    };
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