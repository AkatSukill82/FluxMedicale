import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Users,
  FileText,
  Pill,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Home,
  Settings
} from 'lucide-react';
import { useSyncManager } from './useSyncManager';
import { getOfflineStats, clearAllCache } from './OfflineService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function OfflineModePanel({ isOpen, onClose }) {
  const {
    isOnline,
    isSyncing,
    syncProgress,
    pendingCount,
    lastSyncDate,
    downloadForOffline,
    syncPendingActions,
    syncAll
  } = useSyncManager();

  const [stats, setStats] = useState(null);
  const [autoSync, setAutoSync] = useState(
    localStorage.getItem('offline_auto_sync') !== 'false'
  );
  const [downloadOnWifi, setDownloadOnWifi] = useState(
    localStorage.getItem('offline_wifi_only') === 'true'
  );

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const offlineStats = await getOfflineStats();
    setStats(offlineStats);
  };

  const handleClearCache = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données en cache ?')) {
      await clearAllCache();
      await loadStats();
      toast.success('Cache vidé');
    }
  };

  const handleAutoSyncChange = (checked) => {
    setAutoSync(checked);
    localStorage.setItem('offline_auto_sync', String(checked));
  };

  const handleWifiOnlyChange = (checked) => {
    setDownloadOnWifi(checked);
    localStorage.setItem('offline_wifi_only', String(checked));
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Mode Visite à Domicile
          </DialogTitle>
          <DialogDescription>
            Travaillez sans connexion internet et synchronisez vos données au retour
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status de connexion */}
          <Card className={isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <Wifi className="w-6 h-6 text-green-600" />
                  ) : (
                    <WifiOff className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className={`font-semibold ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
                      {isOnline ? 'Connecté' : 'Hors-ligne'}
                    </p>
                    <p className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline 
                        ? 'Toutes les fonctionnalités sont disponibles'
                        : 'Mode visite à domicile actif'}
                    </p>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Badge variant={isOnline ? 'default' : 'destructive'}>
                    {pendingCount} en attente
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions de synchronisation */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={downloadForOffline}
              disabled={!isOnline || isSyncing}
              className="h-auto py-4 flex flex-col gap-2"
              variant="outline"
            >
              <Download className="w-6 h-6 text-blue-600" />
              <span className="font-medium">Télécharger</span>
              <span className="text-xs text-muted-foreground">Préparer pour hors-ligne</span>
            </Button>

            <Button
              onClick={syncAll}
              disabled={!isOnline || isSyncing}
              className="h-auto py-4 flex flex-col gap-2"
              variant={pendingCount > 0 ? 'default' : 'outline'}
            >
              {isSyncing ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Cloud className="w-6 h-6 text-green-600" />
              )}
              <span className="font-medium">Synchroniser</span>
              <span className="text-xs text-muted-foreground">
                {pendingCount > 0 ? `${pendingCount} éléments` : 'Tout à jour'}
              </span>
            </Button>
          </div>

          {/* Barre de progression */}
          {isSyncing && syncProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Synchronisation en cours...</span>
                <span>{syncProgress.current} / {syncProgress.total}</span>
              </div>
              <Progress value={(syncProgress.current / syncProgress.total) * 100} />
            </div>
          )}

          {/* Statistiques du cache */}
          {stats && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Données en cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold">{stats.patientsCount}</p>
                    <p className="text-xs text-muted-foreground">Patients</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <FileText className="w-5 h-5 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold">{stats.consultationsCount}</p>
                    <p className="text-xs text-muted-foreground">Consultations</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Pill className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold">{stats.prescriptionsCount}</p>
                    <p className="text-xs text-muted-foreground">Prescriptions</p>
                  </div>
                </div>

                {/* Éléments créés hors-ligne */}
                {(stats.offlineConsultations > 0 || stats.offlinePrescriptions > 0) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Créés hors-ligne (non synchronisés)
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-yellow-700">
                      {stats.offlineConsultations > 0 && (
                        <span>{stats.offlineConsultations} consultations</span>
                      )}
                      {stats.offlinePrescriptions > 0 && (
                        <span>{stats.offlinePrescriptions} prescriptions</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Dernière synchronisation */}
                {lastSyncDate && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Dernière sync: {format(new Date(lastSyncDate), "d MMM à HH:mm", { locale: fr })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Paramètres */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Paramètres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Synchronisation automatique</Label>
                  <p className="text-xs text-muted-foreground">
                    Synchroniser au retour en ligne
                  </p>
                </div>
                <Switch
                  checked={autoSync}
                  onCheckedChange={handleAutoSyncChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Téléchargement Wi-Fi uniquement</Label>
                  <p className="text-xs text-muted-foreground">
                    Économiser les données mobiles
                  </p>
                </div>
                <Switch
                  checked={downloadOnWifi}
                  onCheckedChange={handleWifiOnlyChange}
                />
              </div>

              <hr className="my-4" />

              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50"
                onClick={handleClearCache}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Vider le cache local
              </Button>
            </CardContent>
          </Card>

          {/* Conseils */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">💡 Conseils pour les visites à domicile</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Téléchargez les données avant de partir</li>
              <li>• Les consultations créées hors-ligne seront synchronisées automatiquement</li>
              <li>• Les prescriptions Recip-e nécessitent une connexion pour être envoyées</li>
              <li>• Vérifiez le nombre d'éléments en attente avant de partir</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}