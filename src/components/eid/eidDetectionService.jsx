// Service de détection eID Viewer / Middleware (multi-OS)
export const eidDetectionService = {
  // État de la détection
  status: {
    isDetected: false,
    hasMiddleware: false,
    hasSmartCardService: false,
    platform: null,
    details: null
  },

  // Détecter la middleware eID sur le poste local
  async detectEIDMiddleware() {
    // Silent detection, no console spam
    
    const platform = this.detectPlatform();
    this.status.platform = platform;
    this.status.isDetected = false;
    this.status.hasMiddleware = false;
    this.status.hasSmartCardService = true; // On l'assume, l'API est le vrai test

    try {
      // Le seul test fiable est d'appeler l'API locale.
      const response = await fetch('http://localhost:35963/v1/readers', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(1500) // Timeout court de 1.5s
      });

      if (response.ok) {
        this.status.hasMiddleware = true;
        this.status.details = 'eID Middleware détectée (API locale)';
      } else {
        throw new Error(`Local API responded with status: ${response.status}`);
      }

    } catch (error) {
      // Silently handle expected errors when eID is not installed
      if (error.message !== 'Failed to fetch') {
        console.warn('[eID Detection]', error.message);
      }
      this.status.hasMiddleware = false;
      this.status.details = "L'API locale eID n'est pas accessible. Installez eID Viewer ou créez les patients manuellement.";
    }

    this.status.isDetected = this.status.hasMiddleware;
    
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

  // Liens d'installation officiels corrigés
  getInstallationLinks() {
    const platform = this.detectPlatform();
    
    return {
      // Page principale de téléchargement (multilingue)
      viewer: 'https://eid.belgium.be/fr/telechargements',
      
      // Liens directs par plateforme
      windows: 'https://eid.belgium.be/sites/default/files/software/Belgium_eID_MW_5.1.11.6348_Installer_x64.msi',
      macos: 'https://eid.belgium.be/sites/default/files/software/eID_Viewer_5.1.11.pkg',
      linux: 'https://eid.belgium.be/fr/telechargements', // Page avec instructions apt/rpm
      
      // Documentation
      faq: 'https://eid.belgium.be/fr/faq',
      support: 'https://eid.belgium.be/fr/support',
      userManual: 'https://eid.belgium.be/sites/default/files/software/user_manual_-_eid_viewer_5.1_-_fr.pdf',
      
      // Liens alternatifs
      fedict: 'https://www.fedict.belgium.be/fr/identification-et-authentification/eid',
      csam: 'https://iamapps.belgium.be/fr/'
    };
  }
};