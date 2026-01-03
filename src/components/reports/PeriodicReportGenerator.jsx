import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  Mail,
  FileText,
  Users,
  Download,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Hebdomadaire', icon: '📅' },
  { value: 'month', label: 'Mensuel', icon: '📆' },
  { value: 'quarter', label: 'Trimestriel', icon: '📊' },
  { value: 'custom', label: 'Personnalisé', icon: '⚙️' }
];

export default function PeriodicReportGenerator({ isOpen, onClose, patient = null }) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(patient?.id || '');
  const [reportType, setReportType] = useState('complete');
  const [sendToPatient, setSendToPatient] = useState(false);
  const [additionalRecipients, setAdditionalRecipients] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForReport'],
    queryFn: () => base44.entities.Patient.list('-created_date', 300),
    enabled: !patient
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultationsForReport', selectedPatient],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: selectedPatient }, '-date_consultation', 100),
    enabled: !!selectedPatient
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptionsForReport', selectedPatient],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: selectedPatient }, '-date_prescription', 100),
    enabled: !!selectedPatient
  });

  const { data: treatmentPlans = [] } = useQuery({
    queryKey: ['treatmentPlansForReport', selectedPatient],
    queryFn: () => base44.entities.TreatmentPlan.filter({ patient_id: selectedPatient }, '-created_date', 50),
    enabled: !!selectedPatient
  });

  const { data: progressEntries = [] } = useQuery({
    queryKey: ['progressForReport', selectedPatient],
    queryFn: () => base44.entities.TreatmentProgress.filter({ patient_id: selectedPatient }, '-date', 100),
    enabled: !!selectedPatient
  });

  // Calculer les dates selon la période
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subMonths(now, 3), end: now };
      case 'custom':
        return { 
          start: customStart ? new Date(customStart) : subMonths(now, 1), 
          end: customEnd ? new Date(customEnd) : now 
        };
      default:
        return { start: subMonths(now, 1), end: now };
    }
  };

  const generateReport = async () => {
    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }

    setIsGenerating(true);
    const { start, end } = getDateRange();

    try {
      const currentUser = await base44.auth.me();
      const patientData = patient || patients.find(p => p.id === selectedPatient);
      const patientName = patientData ? 
        `${patientData.name?.[0]?.given?.[0] || ''} ${patientData.name?.[0]?.family || ''}`.trim() : 'Patient';

      // Filtrer les données par période
      const periodConsults = consultations.filter(c => {
        const d = new Date(c.date_consultation);
        return d >= start && d <= end;
      });

      const periodPrescriptions = prescriptions.filter(p => {
        const d = new Date(p.date_prescription);
        return d >= start && d <= end;
      });

      const periodProgress = progressEntries.filter(p => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      });

      // Construire le contexte
      const context = `
RAPPORT PÉRIODIQUE - ${patientName}
Période: ${format(start, 'dd/MM/yyyy')} au ${format(end, 'dd/MM/yyyy')}

CONSULTATIONS (${periodConsults.length}):
${periodConsults.map(c => `- ${format(new Date(c.date_consultation), 'dd/MM')} : ${c.motif || 'Consultation'} - ${c.diagnostic || 'À définir'}`).join('\n')}

PRESCRIPTIONS (${periodPrescriptions.length}):
${periodPrescriptions.map(p => `- ${format(new Date(p.date_prescription), 'dd/MM')} : ${p.medicaments?.map(m => m.nom_produit).join(', ') || 'N/A'}`).join('\n')}

PLANS DE TRAITEMENT ACTIFS (${treatmentPlans.filter(t => t.status === 'actif').length}):
${treatmentPlans.filter(t => t.status === 'actif').map(t => `- ${t.title}: ${t.overall_progress || 0}% de progression`).join('\n')}

ÉVOLUTION (${periodProgress.length} mesures):
${periodProgress.slice(0, 10).map(p => `- ${format(new Date(p.date), 'dd/MM')}: ${p.type} = ${p.numeric_value || p.value} ${p.unit || ''}`).join('\n')}
`;

      // Générer le rapport avec l'IA
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `En tant que médecin, génère un rapport de suivi périodique professionnel et structuré basé sur ces données patient:

${context}

Le rapport doit inclure:
1. Résumé exécutif (2-3 phrases)
2. Activité médicale de la période
3. Évolution du patient
4. Points d'attention
5. Recommandations pour la période suivante

Génère un rapport clair, professionnel et adapté à un dossier médical belge.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            medical_activity: { type: 'string' },
            patient_evolution: { type: 'string' },
            attention_points: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            full_text: { type: 'string' }
          }
        }
      });

      setGeneratedContent({
        ...result,
        patient_name: patientName,
        patient_id: selectedPatient,
        period_start: format(start, 'yyyy-MM-dd'),
        period_end: format(end, 'yyyy-MM-dd'),
        stats: {
          consultations: periodConsults.length,
          prescriptions: periodPrescriptions.length,
          progress_entries: periodProgress.length
        }
      });

      toast.success('Rapport généré');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAndSendReport = async () => {
    if (!generatedContent) return;

    try {
      const currentUser = await base44.auth.me();

      // Sauvegarder le rapport
      const report = await base44.entities.GeneratedReport.create({
        patient_id: generatedContent.patient_id,
        patient_name: generatedContent.patient_name,
        report_type: `periodic_${period}`,
        period_start: generatedContent.period_start,
        period_end: generatedContent.period_end,
        content_summary: generatedContent.summary,
        data_snapshot: generatedContent,
        status: 'generated',
        medecin_email: currentUser.email
      });

      // Envoyer par email si demandé
      if (sendToPatient || additionalRecipients) {
        const patientData = patient || patients.find(p => p.id === selectedPatient);
        const patientEmail = patientData?.telecom?.find(t => t.system === 'email')?.value;

        const recipients = [];
        if (sendToPatient && patientEmail) recipients.push(patientEmail);
        if (additionalRecipients) {
          recipients.push(...additionalRecipients.split(',').map(e => e.trim()));
        }

        for (const email of recipients) {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `Rapport de suivi - ${generatedContent.patient_name} - ${format(new Date(generatedContent.period_start), 'MMMM yyyy', { locale: fr })}`,
            body: `${generatedContent.title}\n\n${generatedContent.full_text}\n\n---\nDr. ${currentUser.full_name}`
          });
        }

        await base44.entities.GeneratedReport.update(report.id, {
          status: 'sent',
          sent_to: recipients.map(email => ({ email, sent_at: new Date().toISOString() }))
        });

        toast.success(`Rapport envoyé à ${recipients.length} destinataire(s)`);
      } else {
        toast.success('Rapport sauvegardé');
      }

      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    }
  };

  const selectedPatientData = patient || patients.find(p => p.id === selectedPatient);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Générateur de rapports périodiques
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Patient */}
            {!patient && (
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name?.[0]?.given?.[0]} {p.name?.[0]?.family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Période */}
            <div className="space-y-2">
              <Label>Période</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`p-2 rounded-lg border text-left text-sm transition-all ${
                      period === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="mr-1">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates personnalisées */}
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}

          {/* Options d'envoi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Options d'envoi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Envoyer au patient</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatientData?.telecom?.find(t => t.system === 'email')?.value || 'Aucun email'}
                  </p>
                </div>
                <Switch checked={sendToPatient} onCheckedChange={setSendToPatient} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Destinataires additionnels</Label>
                <Input
                  value={additionalRecipients}
                  onChange={e => setAdditionalRecipients(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bouton génération */}
          <Button 
            className="w-full" 
            onClick={generateReport}
            disabled={!selectedPatient || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Générer le rapport
          </Button>

          {/* Aperçu du rapport généré */}
          {generatedContent && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    {generatedContent.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{generatedContent.stats.consultations} consultations</Badge>
                    <Badge variant="outline">{generatedContent.stats.prescriptions} prescriptions</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Résumé:</p>
                  <p className="text-sm bg-white p-3 rounded border">{generatedContent.summary}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Évolution patient:</p>
                  <p className="text-sm bg-white p-3 rounded border">{generatedContent.patient_evolution}</p>
                </div>

                {generatedContent.attention_points?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Points d'attention:</p>
                    <ul className="text-sm bg-white p-3 rounded border space-y-1">
                      {generatedContent.attention_points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-500">⚠</span> {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedContent.recommendations?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Recommandations:</p>
                    <ul className="text-sm bg-white p-3 rounded border space-y-1">
                      {generatedContent.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500">✓</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={saveAndSendReport} className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  {sendToPatient || additionalRecipients ? 'Sauvegarder et envoyer' : 'Sauvegarder le rapport'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}