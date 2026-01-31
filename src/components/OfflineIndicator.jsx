import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncManager } from './offline/useSyncManager';

export default function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncAll } = useSyncManager();

  // Ne pas afficher si en ligne et pas d'actions en attente
  if (isOnline && pendingCount === 0) {
    return null;
  }

  // Afficher un indicateur discret si hors-ligne
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-red-100 border border-red-300 animate-pulse">
        <WifiOff className="w-5 h-5 text-red-600" />
        <div>
          <p className="text-sm font-medium text-red-800">Mode visite à domicile</p>
          <p className="text-xs text-red-700">
            {pendingCount > 0 
              ? `${pendingCount} modifications en attente`
              : 'Données en cache disponibles'
            }
          </p>
        </div>
      </div>
    );
  }

  // Si en ligne mais avec des actions en attente
  if (pendingCount > 0) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-yellow-100 border border-yellow-300">
        <Home className="w-5 h-5 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            {pendingCount} modifications à synchroniser
          </p>
          <p className="text-xs text-yellow-700">
            Cliquez pour synchroniser maintenant
          </p>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={syncAll}
          disabled={isSyncing}
          className="bg-yellow-50"
        >
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  return null;
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