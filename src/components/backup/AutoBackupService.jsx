import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  HardDrive, 
  Cloud, 
  Download, 
  CheckCircle2, 
  Clock, 
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const BACKUP_KEY = 'medical_app_backup_config';
const LAST_BACKUP_KEY = 'medical_app_last_backup';

export default function AutoBackupService() {
  const [config, setConfig] = useState({
    enabled: true,
    frequency: 'daily', // daily, weekly
    includeDocuments: false,
    lastBackup: null
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [lastBackupInfo, setLastBackupInfo] = useState(null);

  useEffect(() => {
    // Charger la config depuis localStorage
    const savedConfig = localStorage.getItem(BACKUP_KEY);
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
    
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (lastBackup) {
      setLastBackupInfo(JSON.parse(lastBackup));
    }
  }, []);

  useEffect(() => {
    // Sauvegarder la config
    localStorage.setItem(BACKUP_KEY, JSON.stringify(config));
  }, [config]);

  const performBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        entities: {}
      };

      // Liste des entités à sauvegarder
      const entitiesToBackup = [
        { name: 'Patient', entity: base44.entities.Patient },
        { name: 'Consultation', entity: base44.entities.Consultation },
        { name: 'Prescription', entity: base44.entities.Prescription },
        { name: 'RendezVous', entity: base44.entities.RendezVous },
        { name: 'Invoice', entity: base44.entities.Invoice },
        { name: 'InvoiceLine', entity: base44.entities.InvoiceLine },
        { name: 'LabResult', entity: base44.entities.LabResult },
        { name: 'Vaccination', entity: base44.entities.Vaccination },
        { name: 'Document', entity: base44.entities.Document }
      ];

      let completed = 0;
      for (const { name, entity } of entitiesToBackup) {
        try {
          const data = await entity.list();
          backup.entities[name] = data;
          completed++;
          setBackupProgress(Math.round((completed / entitiesToBackup.length) * 100));
        } catch (e) {
          console.warn(`Skipping ${name}:`, e);
          backup.entities[name] = [];
        }
      }

      // Générer le fichier de backup
      const backupContent = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupContent], { type: 'application/json' });
      
      // Sauvegarder localement aussi (IndexedDB via localStorage simplifié)
      const backupInfo = {
        date: new Date().toISOString(),
        size: blob.size,
        recordCount: Object.values(backup.entities).reduce((sum, arr) => sum + arr.length, 0)
      };
      
      localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(backupInfo));
      setLastBackupInfo(backupInfo);

      // Télécharger
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_medical_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Backup terminé: ${backupInfo.recordCount} enregistrements`);
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Erreur lors du backup');
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('ATTENTION: La restauration va écraser les données existantes. Continuer?')) {
      return;
    }

    try {
      const content = await file.text();
      const backup = JSON.parse(content);

      if (!backup.version || !backup.entities) {
        throw new Error('Format de backup invalide');
      }

      toast.info('Restauration en cours... Cette opération peut prendre plusieurs minutes.');

      // Restaurer chaque entité
      for (const [entityName, records] of Object.entries(backup.entities)) {
        if (records.length === 0) continue;
        
        try {
          const entity = base44.entities[entityName];
          if (entity) {
            // Créer les nouveaux enregistrements
            for (const record of records) {
              const { id, created_date, updated_date, created_by, ...data } = record;
              await entity.create(data);
            }
          }
        } catch (e) {
          console.warn(`Erreur restauration ${entityName}:`, e);
        }
      }

      toast.success('Restauration terminée');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Erreur lors de la restauration: ' + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" />
          Sauvegarde automatique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statut dernière sauvegarde */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            {lastBackupInfo ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">
                {lastBackupInfo ? 'Dernière sauvegarde' : 'Aucune sauvegarde'}
              </p>
              {lastBackupInfo && (
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(lastBackupInfo.date), { addSuffix: true, locale: fr })}
                  {' • '}{lastBackupInfo.recordCount} enregistrements
                  {' • '}{(lastBackupInfo.size / 1024).toFixed(1)} Ko
                </p>
              )}
            </div>
          </div>
          <Badge variant={lastBackupInfo ? 'secondary' : 'destructive'}>
            {lastBackupInfo ? 'OK' : 'Requis'}
          </Badge>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sauvegarde automatique</Label>
              <p className="text-sm text-muted-foreground">Rappel périodique pour effectuer une sauvegarde</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Fréquence des rappels</Label>
            <Select 
              value={config.frequency} 
              onValueChange={(value) => setConfig({ ...config, frequency: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress bar pendant backup */}
        {isBackingUp && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Sauvegarde en cours...</span>
            </div>
            <Progress value={backupProgress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={performBackup} 
            disabled={isBackingUp}
            className="flex-1"
          >
            {isBackingUp ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Sauvegarder maintenant
          </Button>
          
          <label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
            />
            <Button variant="outline" asChild>
              <span className="cursor-pointer">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restaurer
              </span>
            </Button>
          </label>
        </div>

        {/* Info stockage local */}
        <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
          <p className="font-medium text-blue-800 mb-1">💡 Conseil sécurité</p>
          <p className="text-blue-700">
            Conservez vos fichiers de backup sur un disque externe ou un service cloud sécurisé (Google Drive, OneDrive).
            Pour une conformité RGPD optimale, chiffrez vos backups.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}