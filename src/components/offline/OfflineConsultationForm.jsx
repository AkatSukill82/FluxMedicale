import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  WifiOff,
  Save,
  Clock,
  Stethoscope,
  FileText,
  Pill,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOnlineStatus } from '../OfflineIndicator';
import { saveOfflineConsultation, getCachedConsultations } from './OfflineService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OfflineConsultationForm({ patient, onSaved, existingConsultation }) {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: patient?.id || '',
    date_consultation: existingConsultation?.date_consultation || new Date().toISOString(),
    motif: existingConsultation?.motif || '',
    anamnese: existingConsultation?.anamnese || '',
    examen_clinique: existingConsultation?.examen_clinique || '',
    diagnostic: existingConsultation?.diagnostic || '',
    prescriptions: existingConsultation?.prescriptions || '',
    statut: existingConsultation?.statut || 'Brouillon'
  });

  const [previousConsultations, setPreviousConsultations] = useState([]);

  // Charger les consultations précédentes depuis le cache
  useEffect(() => {
    const loadPreviousConsultations = async () => {
      if (patient?.id) {
        const cached = await getCachedConsultations(patient.id);
        setPreviousConsultations(cached.slice(0, 3));
      }
    };
    loadPreviousConsultations();
  }, [patient?.id]);

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isOnline) {
        // Sauvegarder en ligne
        if (existingConsultation?.id && !existingConsultation.isOffline) {
          return await base44.entities.Consultation.update(existingConsultation.id, data);
        } else {
          return await base44.entities.Consultation.create(data);
        }
      } else {
        // Sauvegarder hors-ligne
        return await saveOfflineConsultation({
          ...data,
          id: existingConsultation?.id
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      
      if (isOnline) {
        toast.success('Consultation enregistrée');
      } else {
        toast.success('Consultation sauvegardée localement', {
          description: 'Elle sera synchronisée au retour de la connexion',
          icon: <WifiOff className="w-4 h-4" />
        });
      }
      
      if (onSaved) onSaved(result);
    },
    onError: (error) => {
      toast.error('Erreur lors de la sauvegarde', {
        description: error.message
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const consultationData = {
      ...formData,
      medecin_email: (await base44.auth.me())?.email,
      last_updated_by: (await base44.auth.me())?.email
    };

    saveMutation.mutate(consultationData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-save en mode hors-ligne
  useEffect(() => {
    if (!isOnline && formData.motif) {
      const timer = setTimeout(() => {
        // Auto-save silencieux toutes les 30 secondes
        saveOfflineConsultation({
          ...formData,
          id: existingConsultation?.id,
          medecin_email: 'auto-save'
        });
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [formData, isOnline]);

  return (
    <div className="space-y-4">
      {/* Banner hors-ligne */}
      {!isOnline && (
        <Alert className="bg-amber-50 border-amber-200">
          <WifiOff className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Mode hors-ligne actif</strong> - Les données sont sauvegardées localement 
            et seront synchronisées automatiquement au retour de la connexion.
          </AlertDescription>
        </Alert>
      )}

      {/* Résumé des dernières consultations */}
      {previousConsultations.length > 0 && (
        <Card className="bg-slate-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dernières consultations
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="space-y-2">
              {previousConsultations.map((consult) => (
                <div 
                  key={consult.id} 
                  className="p-2 bg-white rounded border text-sm flex items-start gap-2"
                >
                  {consult.isOffline && (
                    <Badge variant="outline" className="text-xs">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Local
                    </Badge>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{consult.motif || 'Sans motif'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(consult.date_consultation), 'dd/MM/yyyy')} - {consult.diagnostic?.slice(0, 50)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Nouvelle consultation
              {existingConsultation?.isOffline && (
                <Badge variant="outline">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Hors-ligne
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Motif */}
            <div>
              <Label>Motif de consultation</Label>
              <Input
                value={formData.motif}
                onChange={(e) => handleChange('motif', e.target.value)}
                placeholder="Ex: Douleur thoracique, contrôle annuel..."
                required
              />
            </div>

            {/* Anamnèse */}
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Anamnèse
              </Label>
              <Textarea
                value={formData.anamnese}
                onChange={(e) => handleChange('anamnese', e.target.value)}
                placeholder="Histoire de la maladie, symptômes..."
                rows={3}
              />
            </div>

            {/* Examen clinique */}
            <div>
              <Label className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Examen clinique
              </Label>
              <Textarea
                value={formData.examen_clinique}
                onChange={(e) => handleChange('examen_clinique', e.target.value)}
                placeholder="Observations, constantes vitales..."
                rows={3}
              />
            </div>

            {/* Diagnostic */}
            <div>
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Diagnostic
              </Label>
              <Textarea
                value={formData.diagnostic}
                onChange={(e) => handleChange('diagnostic', e.target.value)}
                placeholder="Diagnostic(s) posé(s)..."
                rows={2}
              />
            </div>

            {/* Prescriptions */}
            <div>
              <Label className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Prescriptions / Plan de traitement
              </Label>
              <Textarea
                value={formData.prescriptions}
                onChange={(e) => handleChange('prescriptions', e.target.value)}
                placeholder="Médicaments, posologie, durée..."
                rows={3}
              />
              {!isOnline && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Les prescriptions Recip-e nécessitent une connexion internet
                </p>
              )}
            </div>

            {/* Statut */}
            <div>
              <Label>Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => handleChange('statut', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Brouillon">Brouillon</SelectItem>
                  <SelectItem value="Completee">Complétée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex-1"
          >
            {saveMutation.isPending ? (
              <>Sauvegarde...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isOnline ? 'Enregistrer' : 'Sauvegarder localement'}
              </>
            )}
          </Button>

          {!isOnline && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleChange('statut', 'Brouillon');
                toast.info('Brouillon sauvegardé');
              }}
            >
              Brouillon
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}