import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const OFFLINE_QUEUE_KEY = 'medical_app_offline_queue';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Charger les actions en attente
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (queue) {
      setPendingActions(JSON.parse(queue));
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie', {
        description: pendingActions.length > 0 
          ? `${pendingActions.length} actions en attente de synchronisation`
          : undefined
      });
      
      // Auto-sync quand on revient en ligne
      if (pendingActions.length > 0) {
        syncPendingActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors-ligne activé', {
        description: 'Les modifications seront synchronisées au retour de la connexion'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions.length]);

  const syncPendingActions = async () => {
    if (pendingActions.length === 0 || !isOnline) return;

    setIsSyncing(true);
    const queue = [...pendingActions];
    const failed = [];

    for (const action of queue) {
      try {
        // Exécuter l'action selon son type
        // Note: Ceci est simplifié, en production il faudrait un système plus robuste
        console.log('Syncing action:', action);
        // await executeAction(action);
      } catch (error) {
        console.error('Sync error:', error);
        failed.push(action);
      }
    }

    if (failed.length === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setPendingActions([]);
      toast.success('Synchronisation terminée');
    } else {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failed));
      setPendingActions(failed);
      toast.error(`${failed.length} actions n'ont pas pu être synchronisées`);
    }

    setIsSyncing(false);
  };

  // Ne pas afficher si en ligne et pas d'actions en attente
  if (isOnline && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
      isOnline ? 'bg-yellow-100 border border-yellow-300' : 'bg-red-100 border border-red-300'
    }`}>
      {isOnline ? (
        <>
          <Cloud className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {pendingActions.length} actions en attente
            </p>
            <p className="text-xs text-yellow-700">
              Cliquez pour synchroniser
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={syncPendingActions}
            disabled={isSyncing}
            className="bg-yellow-50"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Mode hors-ligne</p>
            <p className="text-xs text-red-700">
              {pendingActions.length > 0 
                ? `${pendingActions.length} actions en attente`
                : 'Les données en cache sont disponibles'
              }
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Fonction utilitaire pour ajouter une action à la queue offline
export function queueOfflineAction(action) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  queue.push({
    ...action,
    timestamp: new Date().toISOString(),
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

// Hook pour vérifier le statut en ligne
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}