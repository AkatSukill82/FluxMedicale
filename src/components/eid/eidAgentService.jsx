// Service Agent eID Local - WebSocket ws://127.0.0.1:27272/events
export const eidAgentService = {
  ws: null,
  listeners: new Set(),
  isConnected: false,
  lastReadTimestamp: 0,
  DEBOUNCE_MS: 5000,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectTimeout: null,
  statusCheckInterval: null,

  // Démarrer la connexion WebSocket vers l'agent local
  async connect() {

    // Vérifier si déjà connecté
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Connexion WebSocket vers agent local (localhost sécurisé)
      this.ws = new WebSocket('ws://127.0.0.1:27272/events');

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners({ type: 'AGENT_CONNECTED' });

        // Démarrer le check de statut régulier
        this.startStatusCheck();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Debounce pour éviter doubles lectures
          if (data.type === 'card_inserted') {
            const now = Date.now();
            if (now - this.lastReadTimestamp < this.DEBOUNCE_MS) {
              return;
            }
            this.lastReadTimestamp = now;
          }

          this.notifyListeners(data);
        } catch (error) {
          console.error('[eID Agent] ❌ Erreur parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        this.isConnected = false;
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.ws = null;
        this.stopStatusCheck();
        this.notifyListeners({ type: 'AGENT_DISCONNECTED' });
        
        // Tentative de reconnexion limitée
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Backoff exponentiel max 30s
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          this.notifyListeners({ 
            type: 'AGENT_ERROR',
            message: 'Agent local non disponible - Veuillez vérifier l\'installation'
          });
        }
      };

    } catch (error) {
      this.isConnected = false;
      this.notifyListeners({ 
        type: 'AGENT_ERROR',
        message: 'Impossible de se connecter à l\'agent local'
      });
    }
  },

  // Vérifier le statut de l'agent via HTTP
  async checkStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout 2s

      const response = await fetch('http://127.0.0.1:27272/status', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const status = await response.json();
        return {
          isRunning: true,
          isConnected: status.ok,
          pcscAvailable: status.pcsc,
          readerCount: status.readerCount,
          version: status.version || 'unknown'
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
      } else {
      }
    }

    return {
      isRunning: false,
      isConnected: false,
      pcscAvailable: false,
      readerCount: 0,
      version: null
    };
  },

  // Démarrer vérification périodique du statut
  startStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    this.statusCheckInterval = setInterval(async () => {
      const status = await this.checkStatus();
      if (!status.isRunning && this.isConnected) {
        this.disconnect();
      }
    }, 30000); // Check toutes les 30s
  },

  // Arrêter vérification périodique
  stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  },

  // Récupérer les données de la dernière carte lue via l'agent eID Viewer local
  // Retourne les données publiques (NISS, nom, prénom, date naissance, adresse) sans PIN
  async getLastCard() {
    try {
      const response = await fetch('http://127.0.0.1:27272/last-card', {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        // Normaliser le format vers le format attendu par useEIDReader
        return {
          nationalNumber: data.nationalNumber || data.national_number || data.niss || null,
          firstName:      data.firstName      || data.first_name      || data.prenom || null,
          lastName:       data.lastName       || data.last_name       || data.nom    || null,
          birthDate:      data.birthDate      || data.birth_date      || data.dateNaissance || null,
          gender:         data.gender         || data.sexe            || null,
          address:        data.address        || null,
        };
      }
    } catch {
      // Agent non disponible ou timeout — silencieux, l'appelant gère le fallback
    }
    return null;
  },

  // Simuler une insertion (mode dev uniquement)
  async simulateInsertion() {
    try {
      const response = await fetch('http://127.0.0.1:27272/simulate', {
        method: 'POST'
      });
      if (response.ok) {
        return true;
      }
    } catch (error) {
    }
    return false;
  },

  // Enregistrer un listener pour les événements
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  // Notifier tous les listeners
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[eID Agent] ❌ Erreur listener:', error);
      }
    });
  },

  // Déconnecter
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopStatusCheck();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
  },

  // Réinitialiser les tentatives de reconnexion
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }
};