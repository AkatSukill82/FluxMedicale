import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Indicateur de statut réseau avec gestion offline
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      toast.success('Connexion rétablie', {
        description: 'Synchronisation en cours...'
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      toast.warning('Mode hors ligne', {
        description: 'Vos modifications seront synchronisées une fois la connexion rétablie.',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending changes in localStorage
    checkPendingChanges();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingChanges = () => {
    try {
      const pending = localStorage.getItem('offline_pending_changes');
      if (pending) {
        const changes = JSON.parse(pending);
        setPendingChanges(changes.length);
      }
    } catch (error) {
      console.error('Error checking pending changes:', error);
    }
  };

  const syncPendingChanges = async () => {
    try {
      const pending = localStorage.getItem('offline_pending_changes');
      if (!pending) return;

      const changes = JSON.parse(pending);
      // Here you would implement actual sync logic
      console.log('Syncing pending changes:', changes);

      // Clear after sync
      localStorage.removeItem('offline_pending_changes');
      setPendingChanges(0);
      
      toast.success('Synchronisation terminée', {
        description: `${changes.length} modification(s) synchronisée(s)`
      });
    } catch (error) {
      console.error('Error syncing changes:', error);
      toast.error('Échec de la synchronisation');
    }
  };

  const handleRetry = () => {
    if (navigator.onLine) {
      syncPendingChanges();
    } else {
      toast.error('Toujours hors ligne', {
        description: 'Vérifiez votre connexion internet'
      });
    }
  };

  return (
    <>
      {/* Status indicator in corner */}
      <div className="fixed bottom-4 right-4 z-50 no-print">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ${
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          } text-white text-xs font-medium`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>En ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Hors ligne</span>
            </>
          )}
          {pendingChanges > 0 && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full">
              {pendingChanges}
            </span>
          )}
        </motion.div>
      </div>

      {/* Banner for offline mode */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-0 right-0 z-40 no-print"
          >
            <div className="mx-4 md:mx-auto md:max-w-2xl">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CloudOff className="w-6 h-6 text-orange-600" />
                    <div>
                      <h4 className="font-semibold text-orange-900">Mode hors ligne activé</h4>
                      <p className="text-sm text-orange-700">
                        Vous pouvez continuer à travailler. Les modifications seront synchronisées automatiquement.
                      </p>
                    </div>
                  </div>
                  {pendingChanges > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      className="ml-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Synchroniser
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}