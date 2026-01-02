import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Send, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths, subWeeks } from 'date-fns';
import { jsPDF } from 'jspdf';

export default function ReportGenerator({ isOpen, onClose, templates = [], preselectedPatient = null }) {
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForReport'],
    queryFn: () => base44.entities.Patient.list('-created_date', 200)
  });

  const [formData, setFormData] = useState({
    patient_id: preselectedPatient?.id || '',
    template_id: '',
    period_start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    period_end: format(new Date(), 'yyyy-MM-dd'),
    additional_notes: '',
    send_to_patient: false,
    send_to_emails: []
  });

  const [previewData, setPreviewData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedPatient = patients.find(p => p.id === formData.patient_id);
  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  // Charger les données pour le rapport
  const loadReportData = async () => {
    if (!formData.patient_id) return null;

    const [consultations, prescriptions, progress] = await Promise.all([
      base44.entities.Consultation.filter({ patient_id: formData.patient_id }, '-date_consultation', 50),
      base44.entities.Prescription.filter({ patient_id: formData.patient_id }, '-date_prescription', 50),
      base44.entities.TreatmentProgress.filter({ patient_id: formData.patient_id }, '-date', 50)
    ]);

    // Filtrer par période
    const filterByPeriod = (items, dateField) => items.filter(item => {
      const date = new Date(item[dateField]);
      return date >= new Date(formData.period_start) && date <= new Date(formData.period_end);
    });

    return {
      consultations: filterByPeriod(consultations, 'date_consultation'),
      prescriptions: filterByPeriod(prescriptions, 'date_prescription'),
      progress: filterByPeriod(progress, 'date')
    };
  };

  // Générer le PDF
  const generatePDF = async (data) => {
    const doc = new jsPDF();
    const currentUser = await base44.auth.me();
    const patientName = selectedPatient ? 
      `${selectedPatient.name?.[0]?.given?.[0] || ''} ${selectedPatient.name?.[0]?.family || ''}` : '';

    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text(selectedTemplate?.name || 'Rapport Médical', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy')}`, 20, 32);
    doc.text(`Période: ${format(new Date(formData.period_start), 'dd/MM/yyyy')} - ${format(new Date(formData.period_end), 'dd/MM/yyyy')}`, 20, 38);

    // Patient
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Patient: ${patientName}`, 20, 50);

    let yPos = 65;

    // Consultations
    if (data.consultations.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Consultations', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      data.consultations.slice(0, 10).forEach(c => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.text(`• ${format(new Date(c.date_consultation), 'dd/MM/yyyy')} - ${c.motif || 'Consultation'}`, 25, yPos);
        yPos += 6;
        if (c.diagnostic) {
          doc.setTextColor(100);
          doc.text(`  Diagnostic: ${c.diagnostic.substring(0, 80)}`, 30, yPos);
          doc.setTextColor(0);
          yPos += 6;
        }
      });
      yPos += 5;
    }

    // Prescriptions
    if (data.prescriptions.length > 0) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Prescriptions', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      data.prescriptions.slice(0, 10).forEach(p => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.text(`• ${format(new Date(p.date_prescription), 'dd/MM/yyyy')} - ${p.medicaments?.length || 0} médicament(s)`, 25, yPos);
        yPos += 6;
      });
      yPos += 5;
    }

    // Notes additionnelles
    if (formData.additional_notes) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Notes', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const noteLines = doc.splitTextToSize(formData.additional_notes, 170);
      doc.text(noteLines, 20, yPos);
    }

    // Signature
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dr. ${currentUser.full_name}`, 20, 280);

    return doc;
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const currentUser = await base44.auth.me();
      
      // Charger les données
      const data = await loadReportData();
      if (!data) throw new Error('Impossible de charger les données');

      // Générer PDF
      const doc = await generatePDF(data);
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `rapport_${formData.patient_id}_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      // Upload
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // Sauvegarder le rapport
      const report = await base44.entities.GeneratedReport.create({
        template_id: formData.template_id,
        template_name: selectedTemplate?.name || 'Rapport personnalisé',
        patient_id: formData.patient_id,
        patient_name: selectedPatient ? `${selectedPatient.name?.[0]?.given?.[0]} ${selectedPatient.name?.[0]?.family}` : '',
        report_type: selectedTemplate?.type || 'custom',
        period_start: formData.period_start,
        period_end: formData.period_end,
        content_summary: `${data.consultations.length} consultations, ${data.prescriptions.length} prescriptions`,
        data_snapshot: data,
        pdf_url: file_url,
        status: formData.send_to_patient ? 'sent' : 'generated',
        medecin_email: currentUser.email
      });

      // Envoyer si demandé
      if (formData.send_to_patient && selectedPatient?.telecom?.find(t => t.system === 'email')?.value) {
        const patientEmail = selectedPatient.telecom.find(t => t.system === 'email').value;
        await base44.integrations.Core.SendEmail({
          to: patientEmail,
          subject: `Votre rapport médical - ${format(new Date(), 'dd/MM/yyyy')}`,
          body: `Bonjour,\n\nVeuillez trouver ci-joint votre rapport médical.\n\nCordialement,\nDr. ${currentUser.full_name}`
        });

        await base44.entities.GeneratedReport.update(report.id, {
          sent_to: [{ email: patientEmail, sent_at: new Date().toISOString() }]
        });
      }

      return { report, pdf_url: file_url };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      toast.success('Rapport généré avec succès');
      window.open(data.pdf_url, '_blank');
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Générer un rapport
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          <div className="space-y-2">
            <Label>Patient *</Label>
            <Select value={formData.patient_id} onValueChange={(v) => setFormData({ ...formData, patient_id: v })}>
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

          {/* Template */}
          <div className="space-y-2">
            <Label>Modèle de rapport</Label>
            <Select value={formData.template_id} onValueChange={(v) => setFormData({ ...formData, template_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Utiliser un modèle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Rapport standard</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Début période</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fin période</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes additionnelles</Label>
            <Textarea
              value={formData.additional_notes}
              onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
              rows={3}
              placeholder="Commentaires, recommandations..."
            />
          </div>

          {/* Envoi */}
          <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
            <Checkbox
              id="send_to_patient"
              checked={formData.send_to_patient}
              onCheckedChange={(c) => setFormData({ ...formData, send_to_patient: c })}
            />
            <Label htmlFor="send_to_patient" className="cursor-pointer">
              Envoyer automatiquement au patient par email
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={() => generateMutation.mutate()} 
            disabled={!formData.patient_id || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Générer le rapport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}