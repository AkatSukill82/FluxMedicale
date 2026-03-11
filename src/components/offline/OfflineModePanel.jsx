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
} from '@/components/ui/dialog';
import {
  Wifi,
  WifiOff,
  Cloud,
  Download,
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
  Settings,
  ArrowRight,
  Shield,
  Stethoscope,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react';
import { useSyncManager } from './useSyncManager';
import { getExtendedOfflineStats, clearAllCache } from './OfflineService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

function StepIndicator({ step, currentStep, label }) {
  const isCompleted = currentStep > step;
  const isActive = currentStep === step;
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
        isCompleted ? 'bg-green-500 text-white' : 
        isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 
        'bg-slate-200 text-slate-500'
      }`}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoSync, setAutoSync] = useState(
    localStorage.getItem('offline_auto_sync') !== 'false'
  );

  // Determine the current "step" in the workflow
  const hasData = stats && stats.patientsCount > 0;
  const isOffline = !isOnline;
  const hasPending = pendingCount > 0;
  
  // Step: 1 = Prepare, 2 = Ready/Working offline, 3 = Back online (sync)
  const currentStep = isOffline ? 2 : (hasPending ? 3 : (hasData ? 2 : 1));

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const offlineStats = await getExtendedOfflineStats();
    setStats(offlineStats);
  };

  const handleDownload = async () => {
    await downloadForOffline();
    await loadStats();
  };

  const handleSync = async () => {
    await syncAll();
    await loadStats();
  };

  const handleClearCache = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données en cache ?')) {
      await clearAllCache();
      await loadStats();
      toast.success('Cache vidé');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Visite à Domicile
          </DialogTitle>
          <DialogDescription>
            Consultez vos patients même sans internet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* Connection status banner */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`font-medium text-sm ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
                {isOnline ? 'Vous êtes connecté' : 'Vous êtes hors-ligne'}
              </p>
              <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline 
                  ? (hasPending ? `${pendingCount} modifications à synchroniser` : 'Préparez-vous avant de partir')
                  : 'Les données en cache sont utilisées'}
              </p>
            </div>
            {hasPending && isOnline && (
              <Badge className="bg-yellow-500">{pendingCount}</Badge>
            )}
          </div>

          {/* Workflow steps */}
          <div className="flex items-center justify-between px-2">
            <StepIndicator step={1} currentStep={currentStep} label="Préparer" />
            <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <StepIndicator step={2} currentStep={currentStep} label="Consulter" />
            <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <StepIndicator step={3} currentStep={currentStep} label="Synchroniser" />
          </div>

          {/* Step 1: Prepare - Download data */}
          {isOnline && !hasPending && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">Avant de partir</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Téléchargez les dossiers de vos patients sur votre appareil. 
                      Vous pourrez ensuite les consulter et créer des consultations sans internet.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleDownload}
                  disabled={isSyncing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Téléchargement en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {hasData ? 'Mettre à jour les données' : 'Télécharger les données'}
                    </>
                  )}
                </Button>

                {/* Progress bar */}
                {isSyncing && syncProgress.total > 0 && (
                  <Progress value={(syncProgress.current / syncProgress.total) * 100} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Sync back */}
          {isOnline && hasPending && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900">De retour au cabinet</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Vous avez <strong>{pendingCount} modification(s)</strong> créée(s) hors-ligne. 
                      Synchronisez maintenant pour sauvegarder vos données sur le serveur.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Synchronisation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Synchroniser maintenant
                    </>
                  )}
                </Button>
                {isSyncing && syncProgress.total > 0 && (
                  <Progress value={(syncProgress.current / syncProgress.total) * 100} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Offline guidance */}
          {isOffline && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900">Vous travaillez hors-ligne</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Vous pouvez consulter les dossiers patients et créer des consultations. 
                      Tout sera synchronisé automatiquement au retour de la connexion.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Voir les patients</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Consultations</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Prescriptions</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Antécédents</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>eHealth, Recip-e, Hubs, eID : indisponibles sans connexion</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data summary (compact) */}
          {stats && hasData && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <HardDrive className="w-4 h-4" />
                    Données disponibles hors-ligne
                  </div>
                  {lastSyncDate && (
                    <span className="text-xs text-slate-400">
                      Sync: {format(new Date(lastSyncDate), "d MMM HH:mm", { locale: fr })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <DataBadge icon={Users} label="Patients" count={stats.patientsCount} color="blue" />
                  <DataBadge icon={FileText} label="Consultations" count={stats.consultationsCount} color="green" />
                  <DataBadge icon={Pill} label="Prescriptions" count={stats.prescriptionsCount} color="purple" />
                  <DataBadge icon={Clock} label="RDV" count={stats.rendezVousCount || 0} color="orange" />
                  <DataBadge icon={Shield} label="Antécédents" count={stats.medicalHistoryCount || 0} color="red" />
                  <DataBadge icon={CheckCircle} label="Codes INAMI" count={stats.nomenclatureCount || 0} color="teal" />
                </div>

                {(stats.offlineConsultations > 0 || stats.offlinePrescriptions > 0) && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {stats.offlineConsultations > 0 && `${stats.offlineConsultations} consultation(s) `}
                      {stats.offlinePrescriptions > 0 && `${stats.offlinePrescriptions} prescription(s) `}
                      en attente de synchronisation
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Advanced settings (collapsible) */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-sm text-slate-500 hover:text-slate-700 py-1"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Paramètres avancés
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Sync automatique au retour</Label>
                    <p className="text-xs text-muted-foreground">
                      Envoyer les données dès le retour en ligne
                    </p>
                  </div>
                  <Switch
                    checked={autoSync}
                    onCheckedChange={(v) => {
                      setAutoSync(v);
                      localStorage.setItem('offline_auto_sync', String(v));
                    }}
                  />
                </div>

                <hr />

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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DataBadge({ icon: Icon, label, count, color }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    teal: 'text-teal-600 bg-teal-50'
  };
  
  return (
    <div className={`text-center p-2 rounded-lg ${colorClasses[color] || 'bg-slate-50'}`}>
      <Icon className="w-4 h-4 mx-auto mb-0.5" />
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  );
}