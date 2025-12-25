import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  Upload,
  Info,
  Pill,
  User,
  Calendar,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { myCareNetChapter4 } from '@/functions/myCareNetChapter4';

// Classification des erreurs
function classifyError(error) {
  const message = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.response?.status;

  if (status === 400 || message.includes('manquant') || message.includes('invalide')) {
    return { type: 'VALIDATION', title: 'Données invalides', icon: '⚠️' };
  }
  if (status === 401 || status === 403) {
    return { type: 'AUTH', title: 'Non autorisé', icon: '🔒' };
  }
  if (message.includes('mycarenet') || message.includes('timeout') || message.includes('connexion') || status >= 502) {
    return { type: 'EXTERNAL', title: 'Erreur MyCareNet (service externe)', icon: '🌐' };
  }
  return { type: 'INTERNAL', title: 'Erreur interne', icon: '⚙️' };
}

// Codes diagnostics courants pour Chapitre IV
const COMMON_DIAGNOSES = {
  '5.8.1': [
    { code: 'M05.9', description: 'Polyarthrite rhumatoïde séropositive' },
    { code: 'M06.9', description: 'Polyarthrite rhumatoïde non précisée' },
    { code: 'L40.5', description: 'Rhumatisme psoriasique' },
    { code: 'K50.9', description: 'Maladie de Crohn' },
    { code: 'K51.9', description: 'Colite ulcéreuse' },
    { code: 'L40.0', description: 'Psoriasis vulgaire' },
  ],
  '4.2.2': [
    { code: 'I48.9', description: 'Fibrillation auriculaire non valvulaire' },
    { code: 'I82.9', description: 'Thrombose veineuse profonde' },
    { code: 'I26.9', description: 'Embolie pulmonaire' },
  ],
  '3.2.1': [
    { code: 'E11.9', description: 'Diabète de type 2 sans complication' },
    { code: 'E11.65', description: 'DT2 avec obésité (IMC ≥ 30)' },
    { code: 'E11.51', description: 'DT2 avec maladie cardiovasculaire' },
  ],
  '8.1': [
    { code: 'C43.9', description: 'Mélanome malin de la peau' },
    { code: 'C34.9', description: 'Cancer bronchique non à petites cellules' },
    { code: 'C67.9', description: 'Carcinome urothélial' },
  ]
};

export default function ChapterIVRequestForm({ 
  isOpen, 
  onClose, 
  patient, 
  medication,
  onSuccess 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    paragraph: medication?.chapter_iv?.paragraph || '',
    diagnosis: null,
    customDiagnosis: '',
    justification: '',
    durationMonths: 12,
    attachments: []
  });

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  // Vérifier accord existant
  const existingAgreementQuery = useQuery({
    queryKey: ['chapter4-agreement', patient?.id, formData.paragraph],
    queryFn: async () => {
      const response = await myCareNetChapter4({
        action: 'check_existing_agreement',
        patient_niss: getNISS(patient),
        paragraph: formData.paragraph
      });
      return response.data;
    },
    enabled: !!patient && !!formData.paragraph
  });

  // Soumission de la demande
  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const response = await myCareNetChapter4({
        action: 'submit_request',
        patient_id: patient.id,
        patient_niss: getNISS(patient),
        medication: {
          cnk: medication.cnk,
          product_name: medication.product_name
        },
        paragraph: data.paragraph,
        diagnosis: data.diagnosis || { 
          code: 'CUSTOM', 
          description: data.customDiagnosis 
        },
        justification: data.justification,
        prescriber_nihii: currentUser?.numero_inami,
        duration_months: data.durationMonths,
        attachments: data.attachments
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter4-requests'] });
      toast.success(`Demande Chapitre IV soumise avec succès`, {
        description: `Référence MyCareNet: ${data.mycarenet_reference}`
      });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error) => {
      const classified = classifyError(error);
      if (classified.type === 'EXTERNAL') {
        toast.error(`${classified.icon} ${classified.title}`, {
          description: `Le service MyCareNet a retourné une erreur: ${error.message}. Réessayez plus tard.`,
          duration: 8000
        });
      } else if (classified.type === 'VALIDATION') {
        toast.error(`${classified.icon} ${classified.title}`, {
          description: error.message,
          duration: 6000
        });
      } else {
        toast.error(`${classified.icon} ${classified.title}`, {
          description: `Une erreur s'est produite dans notre système: ${error.message}. Contactez le support si le problème persiste.`,
          duration: 8000
        });
      }
    }
  });

  const getNISS = (patient) => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const availableDiagnoses = COMMON_DIAGNOSES[formData.paragraph] || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.paragraph) {
      toast.error('Veuillez sélectionner un paragraphe');
      return;
    }
    if (!formData.diagnosis && !formData.customDiagnosis) {
      toast.error('Veuillez sélectionner ou saisir un diagnostic');
      return;
    }
    if (!formData.justification.trim()) {
      toast.error('Veuillez fournir une justification médicale');
      return;
    }

    submitMutation.mutate(formData);
  };

  const patientName = patient?.name?.find(n => n.use === 'official');
  const fullName = patientName 
    ? `${(patientName.given || []).join(' ')} ${patientName.family || ''}`.trim()
    : 'Patient';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Demande Chapitre IV - MyCareNet
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info patient et médicament */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">Patient</span>
                </div>
                <p className="font-semibold">{fullName}</p>
                <p className="text-xs text-slate-500 font-mono">
                  NISS: {getNISS(patient) || 'Non renseigné'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Médicament</span>
                </div>
                <p className="font-semibold">{medication?.product_name}</p>
                <div className="flex gap-1 mt-1">
                  {medication?.cnk && (
                    <Badge variant="outline" className="text-xs">CNK: {medication.cnk}</Badge>
                  )}
                  {medication?.chapter_iv?.paragraph && (
                    <Badge className="bg-purple-600 text-xs">§ {medication.chapter_iv.paragraph}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accord existant */}
          {existingAgreementQuery.data?.has_agreement && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Accord existant trouvé</strong>
                <p className="text-sm">Ce patient dispose déjà d'un accord pour ce paragraphe.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Paragraphe */}
          <div className="space-y-2">
            <Label>Paragraphe Chapitre IV *</Label>
            <Select
              value={formData.paragraph}
              onValueChange={(value) => setFormData({ ...formData, paragraph: value, diagnosis: null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le paragraphe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3.2.1">§ 3.2.1 - Antidiabétiques (GLP-1, SGLT2)</SelectItem>
                <SelectItem value="4.2.2">§ 4.2.2 - Anticoagulants oraux directs</SelectItem>
                <SelectItem value="5.8.1">§ 5.8.1 - Immunosuppresseurs biologiques</SelectItem>
                <SelectItem value="8.1">§ 8.1 - Antinéoplasiques</SelectItem>
                <SelectItem value="other">Autre paragraphe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Diagnostic */}
          <div className="space-y-2">
            <Label>Diagnostic (ICD-10) *</Label>
            {availableDiagnoses.length > 0 ? (
              <div className="space-y-2">
                <Select
                  value={formData.diagnosis?.code || ''}
                  onValueChange={(code) => {
                    const diag = availableDiagnoses.find(d => d.code === code);
                    setFormData({ ...formData, diagnosis: diag, customDiagnosis: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le diagnostic" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDiagnoses.map(diag => (
                      <SelectItem key={diag.code} value={diag.code}>
                        {diag.code} - {diag.description}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Autre diagnostic...</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.diagnosis?.code === 'custom' && (
                  <Input
                    placeholder="Code ICD-10 et description"
                    value={formData.customDiagnosis}
                    onChange={(e) => setFormData({ ...formData, customDiagnosis: e.target.value })}
                  />
                )}
              </div>
            ) : (
              <Input
                placeholder="Code ICD-10 et description du diagnostic"
                value={formData.customDiagnosis}
                onChange={(e) => setFormData({ ...formData, customDiagnosis: e.target.value })}
              />
            )}
          </div>

          {/* Justification médicale */}
          <div className="space-y-2">
            <Label>Justification médicale *</Label>
            <Textarea
              placeholder="Décrivez la justification clinique pour cette demande (historique thérapeutique, échec des traitements antérieurs, contre-indications, etc.)"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Minimum 50 caractères recommandé pour une justification complète
            </p>
          </div>

          {/* Durée */}
          <div className="space-y-2">
            <Label>Durée de l'accord demandée</Label>
            <Select
              value={formData.durationMonths.toString()}
              onValueChange={(value) => setFormData({ ...formData, durationMonths: parseInt(value) })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 mois</SelectItem>
                <SelectItem value="12">12 mois</SelectItem>
                <SelectItem value="24">24 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pièces jointes */}
          <div className="space-y-2">
            <Label>Pièces jointes (optionnel)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                Glissez vos documents ici (rapports, examens complémentaires)
              </p>
              <Input
                type="file"
                multiple
                className="mt-2"
                onChange={(e) => {
                  // TODO: upload files
                  toast.info('Upload de fichiers - À implémenter');
                }}
              />
            </div>
          </div>

          {/* Info délai */}
          <Alert>
            <Clock className="w-4 h-4" />
            <AlertDescription>
              <strong>Délai de traitement:</strong> Le médecin-conseil dispose de 10 jours ouvrables 
              pour répondre. En l'absence de réponse, l'accord est considéré comme tacite.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={submitMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Soumettre la demande
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}