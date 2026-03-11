import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../OfflineIndicator';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
      <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">Mode hors-ligne — Données en cache</p>
        <p className="text-xs text-amber-600">
          Vous consultez les données téléchargées. Les modifications seront synchronisées au retour de la connexion.
        </p>
      </div>
      <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
    </div>
  );
}