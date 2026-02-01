import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  User,
  Building,
  Send,
  Save,
  AlertTriangle,
  CheckCircle,
  Pen,
  Download
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const CERTIFICATE_TYPES = {
  incapacite_travail: { label: "Incapacité de travail", icon: "🏥" },
  aptitude: { label: "Certificat d'aptitude", icon: "✅" },
  accident_travail: { label: "Accident de travail", icon: "⚠️" },
  maladie_professionnelle: { label: "Maladie professionnelle", icon: "🏭" },
  reprise_travail: { label: "Reprise du travail", icon: "💼" }
};

export default function MedexCertificateForm({ patient, onClose, existingCertificate }) {
  const queryClient = useQueryClient();
  
  const patientName = patient?.name?.[0]
    ? `${(patient.name[0].given || []).join(' ')} ${patient.name[0].family || ''}`
    : '';
  const patientNiss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';

  const [formData, setFormData] = useState({
    type: existingCertificate?.type || 'incapacite_travail',
    date_debut: existingCertificate?.date_debut || format(new Date(), 'yyyy-MM-dd'),
    date_fin: existingCertificate?.date_fin || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    prolongation: existingCertificate?.prolongation || false,
    motif_code: existingCertificate?.motif_code || '',
    motif_description: existingCertificate?.motif_description || '',
    sortie_autorisee: existingCertificate?.sortie_autorisee ?? true,
    horaires_sortie: existingCertificate?.horaires_sortie || '',
    reprise_progressive: existingCertificate?.reprise_progressive || false,
    pourcentage_reprise: existingCertificate?.pourcentage_reprise || 50,
    employeur_nom: existingCertificate?.employeur_nom || '',
    employeur_adresse: existingCertificate?.employeur_adresse || '',
    notes: existingCertificate?.notes || ''
  });

  const duration = differenceInDays(new Date(formData.date_fin), new Date(formData.date_debut)) + 1;

  // Sauvegarder le certificat
  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const user = await base44.auth.me();
      const certData = {
        patient_id: patient.id,
        patient_niss: patientNiss,
        patient_nom: patientName,
        ...formData,
        medecin_email: user.email,
        medecin_nihii: user.numero_inami,
        status: status
      };

      if (status === 'signed') {
        certData.signature_date = new Date().toISOString();
        certData.signature_method = 'manual'; // TODO: intégrer eID/itsme
      }

      if (existingCertificate?.id) {
        return base44.entities.MedexCertificate.update(existingCertificate.id, certData);
      }
      return base44.entities.MedexCertificate.create(certData);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['medexCertificates'] });
      toast.success(status === 'signed' ? 'Certificat signé' : 'Certificat sauvegardé');
      if (status === 'signed') onClose?.();
    },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  });

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Certificat médical</CardTitle>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Type de certificat */}
        <div>
          <Label>Type de certificat</Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CERTIFICATE_TYPES).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.icon} {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prolongation */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <Label>Prolongation d'un certificat précédent</Label>
            <p className="text-xs text-muted-foreground">Cochez si ce certificat prolonge une incapacité existante</p>
          </div>
          <Switch
            checked={formData.prolongation}
            onCheckedChange={(v) => setFormData({...formData, prolongation: v})}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date de début</Label>
            <Input
              type="date"
              value={formData.date_debut}
              onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
            />
          </div>
          <div>
            <Label>Date de fin</Label>
            <Input
              type="date"
              value={formData.date_fin}
              onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
            />
          </div>
        </div>

        {duration > 0 && (
          <Alert className={duration > 14 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}>
            <Calendar className={`w-4 h-4 ${duration > 14 ? 'text-orange-600' : 'text-blue-600'}`} />
            <AlertDescription className={duration > 14 ? 'text-orange-700' : 'text-blue-700'}>
              Durée de l'incapacité: <strong>{duration} jour{duration > 1 ? 's' : ''}</strong>
              {duration > 14 && ' - Attention: durée supérieure à 2 semaines'}
            </AlertDescription>
          </Alert>
        )}

        {/* Diagnostic (confidentiel) */}
        <div>
          <Label>Diagnostic (confidentiel - non transmis à l'employeur)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Code ICD-10"
              className="col-span-1"
              value={formData.motif_code}
              onChange={(e) => setFormData({...formData, motif_code: e.target.value})}
            />
            <Textarea
              placeholder="Description médicale..."
              className="col-span-2"
              value={formData.motif_description}
              onChange={(e) => setFormData({...formData, motif_description: e.target.value})}
            />
          </div>
        </div>

        {/* Autorisations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label>Sortie autorisée</Label>
              <p className="text-xs text-muted-foreground">Le patient peut quitter son domicile</p>
            </div>
            <Switch
              checked={formData.sortie_autorisee}
              onCheckedChange={(v) => setFormData({...formData, sortie_autorisee: v})}
            />
          </div>

          {formData.sortie_autorisee && (
            <div>
              <Label>Horaires de sortie autorisés</Label>
              <Input
                placeholder="Ex: 10h-12h et 14h-18h"
                value={formData.horaires_sortie}
                onChange={(e) => setFormData({...formData, horaires_sortie: e.target.value})}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label>Reprise progressive</Label>
              <p className="text-xs text-muted-foreground">Reprise partielle du travail</p>
            </div>
            <Switch
              checked={formData.reprise_progressive}
              onCheckedChange={(v) => setFormData({...formData, reprise_progressive: v})}
            />
          </div>

          {formData.reprise_progressive && (
            <div>
              <Label>Pourcentage de reprise</Label>
              <Select 
                value={String(formData.pourcentage_reprise)} 
                onValueChange={(v) => setFormData({...formData, pourcentage_reprise: Number(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Employeur */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-slate-500" />
            <Label className="font-semibold">Informations employeur (optionnel)</Label>
          </div>
          <div>
            <Label>Nom de l'employeur</Label>
            <Input
              placeholder="Nom de l'entreprise"
              value={formData.employeur_nom}
              onChange={(e) => setFormData({...formData, employeur_nom: e.target.value})}
            />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input
              placeholder="Adresse de l'employeur"
              value={formData.employeur_adresse}
              onChange={(e) => setFormData({...formData, employeur_adresse: e.target.value})}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label>Notes complémentaires</Label>
          <Textarea
            placeholder="Notes internes (non imprimées)..."
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => saveMutation.mutate('draft')}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Brouillon
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => saveMutation.mutate('signed')}
              disabled={saveMutation.isPending}
            >
              <Pen className="w-4 h-4 mr-2" />
              Signer et créer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}