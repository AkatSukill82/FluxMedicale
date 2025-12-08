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
    console.log('[eID Agent] Tentative de connexion à ws://127.0.0.1:27272/events');

    // Vérifier si déjà connecté
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[eID Agent] Déjà connecté');
      return;
    }

    try {
      // Connexion WebSocket vers agent local (localhost sécurisé)
      this.ws = new WebSocket('ws://127.0.0.1:27272/events');

      this.ws.onopen = () => {
        console.log('[eID Agent] ✅ Connecté à l\'agent local');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners({ type: 'AGENT_CONNECTED' });

        // Démarrer le check de statut régulier
        this.startStatusCheck();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[eID Agent] 📨 Événement reçu:', data);

          // Debounce pour éviter doubles lectures
          if (data.type === 'card_inserted') {
            const now = Date.now();
            if (now - this.lastReadTimestamp < this.DEBOUNCE_MS) {
              console.log('[eID Agent] ⏭️  Lecture ignorée (debounce)');
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
        console.log('[eID Agent] ⚠️  Erreur WebSocket - Service local non disponible');
        this.isConnected = false;
      };

      this.ws.onclose = (event) => {
        console.log('[eID Agent] 🔌 Déconnecté (code:', event.code, ')');
        this.isConnected = false;
        this.ws = null;
        this.stopStatusCheck();
        this.notifyListeners({ type: 'AGENT_DISCONNECTED' });
        
        // Tentative de reconnexion limitée
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Backoff exponentiel max 30s
          console.log(`[eID Agent] 🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          console.log('[eID Agent] ❌ Nombre max de tentatives atteint');
          this.notifyListeners({ 
            type: 'AGENT_ERROR',
            message: 'Agent local non disponible - Veuillez vérifier l\'installation'
          });
        }
      };

    } catch (error) {
      console.log('[eID Agent] ❌ Service local non accessible');
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
        console.log('[eID Agent] 📊 Statut:', status);
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
        console.log('[eID Agent] ⏱️  Timeout vérification statut');
      } else {
        console.log('[eID Agent] ❌ Agent local non détecté');
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
        console.log('[eID Agent] ⚠️  Agent arrêté - déconnexion');
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

  // Récupérer la dernière carte lue
  async getLastCard() {
    try {
      const response = await fetch('http://127.0.0.1:27272/last-card');
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.log('[eID Agent] Erreur récupération dernière carte:', error);
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
        console.log('[eID Agent] 🧪 Simulation insertion déclenchée');
        return true;
      }
    } catch (error) {
      console.log('[eID Agent] Erreur simulation:', error);
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
    console.log('[eID Agent] 🔌 Déconnexion propre');
  },

  // Réinitialiser les tentatives de reconnexion
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }
};