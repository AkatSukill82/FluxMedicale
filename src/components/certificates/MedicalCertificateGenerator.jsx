import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  Briefcase,
  Heart,
  Car,
  Plane,
  Dumbbell,
  Baby,
  Loader2,
  Download,
  Mail,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const CERTIFICATE_TYPES = [
  { id: 'arret_travail', label: 'Arrêt de travail', icon: Briefcase, color: 'bg-blue-100 text-blue-700' },
  { id: 'aptitude_sport', label: 'Aptitude au sport', icon: Dumbbell, color: 'bg-green-100 text-green-700' },
  { id: 'aptitude_conduite', label: 'Aptitude à la conduite', icon: Car, color: 'bg-purple-100 text-purple-700' },
  { id: 'bonne_sante', label: 'Bonne santé', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  { id: 'voyage', label: 'Certificat de voyage', icon: Plane, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'grossesse', label: 'Suivi grossesse', icon: Baby, color: 'bg-orange-100 text-orange-700' },
  { id: 'personnalise', label: 'Personnalisé', icon: FileText, color: 'bg-slate-100 text-slate-700' }
];

export default function MedicalCertificateGenerator({ patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [certType, setCertType] = useState('');
  const [formData, setFormData] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    duration_days: 3,
    reason: '',
    restrictions: '',
    observations: '',
    send_to_employer: false,
    employer_email: ''
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const patientName = patient?.name?.[0] 
    ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`.trim()
    : 'Patient';

  const patientBirthDate = patient?.birthDate 
    ? format(new Date(patient.birthDate), 'dd/MM/yyyy')
    : '';

  const niss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';

  // Mettre à jour la date de fin selon la durée
  const handleDurationChange = (days) => {
    setFormData({
      ...formData,
      duration_days: days,
      end_date: format(addDays(new Date(formData.start_date), days - 1), 'yyyy-MM-dd')
    });
  };

  const generateCertificate = async () => {
    if (!certType) {
      toast.error('Veuillez sélectionner un type de certificat');
      return;
    }

    setIsGenerating(true);

    try {
      const currentUser = await base44.auth.me();
      const typeLabel = CERTIFICATE_TYPES.find(t => t.id === certType)?.label || '';

      let prompt = '';
      
      if (certType === 'arret_travail') {
        prompt = `Génère un certificat d'arrêt de travail professionnel en français belge pour:
Patient: ${patientName}
Né(e) le: ${patientBirthDate}
NISS: ${niss ? `***-**-***-${niss.slice(-2)}` : 'N/A'}
Période: du ${format(new Date(formData.start_date), 'dd/MM/yyyy')} au ${format(new Date(formData.end_date || addDays(new Date(formData.start_date), formData.duration_days - 1)), 'dd/MM/yyyy')} (${formData.duration_days} jour(s))
${formData.reason ? `Motif (confidentiel): ${formData.reason}` : ''}
${formData.restrictions ? `Restrictions: ${formData.restrictions}` : ''}

Le certificat doit:
- Être conforme aux exigences belges
- Ne pas mentionner le diagnostic (secret médical)
- Mentionner si sortie autorisée ou non
- Être signé par Dr. ${currentUser.full_name}`;
      } else if (certType === 'aptitude_sport') {
        prompt = `Génère un certificat d'aptitude au sport en français pour:
Patient: ${patientName}
Né(e) le: ${patientBirthDate}
${formData.observations ? `Observations: ${formData.observations}` : ''}

Le certificat doit attester l'aptitude à la pratique sportive (compétition/loisir).
Médecin: Dr. ${currentUser.full_name}`;
      } else {
        prompt = `Génère un ${typeLabel} professionnel en français belge pour:
Patient: ${patientName}
Né(e) le: ${patientBirthDate}
${formData.observations ? `Observations: ${formData.observations}` : ''}

Médecin: Dr. ${currentUser.full_name}`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            legal_mentions: { type: 'string' }
          }
        }
      });

      setGeneratedContent({
        ...result,
        type: certType,
        patient_name: patientName,
        doctor_name: currentUser.full_name,
        date: format(new Date(), 'dd/MM/yyyy'),
        period: certType === 'arret_travail' ? {
          start: formData.start_date,
          end: formData.end_date || format(addDays(new Date(formData.start_date), formData.duration_days - 1), 'yyyy-MM-dd'),
          days: formData.duration_days
        } : null
      });

      toast.success('Certificat généré');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCertificate = async () => {
    if (!generatedContent) return;

    try {
      const currentUser = await base44.auth.me();

      await base44.entities.PatientDocument.create({
        patient_id: patient.id,
        type: 'certificat',
        title: generatedContent.title,
        content: generatedContent.content,
        category: certType,
        medecin_email: currentUser.email,
        date_document: new Date().toISOString()
      });

      // Envoyer à l'employeur si demandé
      if (formData.send_to_employer && formData.employer_email && certType === 'arret_travail') {
        await base44.integrations.Core.SendEmail({
          to: formData.employer_email,
          subject: `Certificat médical - ${patientName}`,
          body: `Veuillez trouver ci-joint le certificat médical de ${patientName}.\n\n${generatedContent.content}\n\nCordialement,\nDr. ${currentUser.full_name}`
        });
        toast.success('Certificat envoyé à l\'employeur');
      }

      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patient.id] });
      toast.success('Certificat sauvegardé');
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    }
  };

  const printCertificate = () => {
    if (!generatedContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${generatedContent.title}</title>
        <style>
          body { font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; font-size: 18pt; margin-bottom: 30px; }
          .content { line-height: 1.8; text-align: justify; white-space: pre-wrap; }
          .footer { margin-top: 50px; }
          .signature { margin-top: 40px; text-align: right; }
          .legal { font-size: 9pt; color: #666; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${generatedContent.title}</h1>
        <p style="text-align: right;">Date: ${generatedContent.date}</p>
        <div class="content">${generatedContent.content}</div>
        <div class="signature">
          <p>Dr. ${generatedContent.doctor_name}</p>
        </div>
        <div class="legal">${generatedContent.legal_mentions || ''}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Générateur de certificats médicaux
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient info */}
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <p className="font-semibold">{patientName}</p>
              <p className="text-sm text-muted-foreground">
                Né(e) le {patientBirthDate} {niss && `• NISS: ***-${niss.slice(-4)}`}
              </p>
            </CardContent>
          </Card>

          {/* Type de certificat */}
          <div className="space-y-2">
            <Label>Type de certificat</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CERTIFICATE_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setCertType(type.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      certType === type.id 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${certType === type.id ? 'text-blue-600' : 'text-slate-500'}`} />
                    <p className="text-sm font-medium">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Champs spécifiques arrêt de travail */}
          {certType === 'arret_travail' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Durée (jours)</Label>
                    <Select 
                      value={formData.duration_days.toString()} 
                      onValueChange={(v) => handleDurationChange(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 7, 10, 14, 21, 30].map(d => (
                          <SelectItem key={d} value={d.toString()}>{d} jour(s)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={formData.end_date || format(addDays(new Date(formData.start_date), formData.duration_days - 1), 'yyyy-MM-dd')}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motif (confidentiel, non transmis à l'employeur)</Label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Optionnel - pour votre dossier"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Restrictions éventuelles</Label>
                  <Input
                    value={formData.restrictions}
                    onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                    placeholder="Ex: Sorties autorisées, repos strict..."
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Envoyer à l'employeur</p>
                    <p className="text-xs text-muted-foreground">Le certificat sera envoyé par email</p>
                  </div>
                  <Switch
                    checked={formData.send_to_employer}
                    onCheckedChange={(v) => setFormData({ ...formData, send_to_employer: v })}
                  />
                </div>

                {formData.send_to_employer && (
                  <div className="space-y-2">
                    <Label>Email de l'employeur</Label>
                    <Input
                      type="email"
                      value={formData.employer_email}
                      onChange={(e) => setFormData({ ...formData, employer_email: e.target.value })}
                      placeholder="rh@entreprise.be"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observations générales */}
          {certType && certType !== 'arret_travail' && (
            <div className="space-y-2">
              <Label>Observations</Label>
              <Textarea
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Informations complémentaires à inclure..."
                rows={3}
              />
            </div>
          )}

          {/* Bouton génération */}
          {certType && !generatedContent && (
            <Button 
              className="w-full" 
              onClick={generateCertificate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer le certificat
            </Button>
          )}

          {/* Aperçu */}
          {generatedContent && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-green-800">{generatedContent.title}</h3>
                  <Badge className="bg-green-100 text-green-700">Généré</Badge>
                </div>

                <div className="bg-white p-4 rounded border text-sm whitespace-pre-wrap">
                  {generatedContent.content}
                </div>

                <div className="flex gap-2">
                  <Button onClick={printCertificate} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button onClick={saveCertificate} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Sauvegarder
                    {formData.send_to_employer && ' & Envoyer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}