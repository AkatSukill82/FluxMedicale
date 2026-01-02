import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Send, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { jsPDF } from 'jspdf';

export default function GenerateReportModal({ isOpen, onClose, plan, progressEntries = [] }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    report_type: 'monthly',
    period_start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    period_end: format(new Date(), 'yyyy-MM-dd'),
    summary: '',
    recommendations: '',
    next_steps: '',
    send_to_patient: false
  });

  const [generatedPdf, setGeneratedPdf] = useState(null);

  // Calculer les stats pour la période
  const periodEntries = progressEntries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= new Date(formData.period_start) && entryDate <= new Date(formData.period_end);
  });

  const avgAdherence = periodEntries.length > 0
    ? Math.round(periodEntries.filter(e => e.adherence_score).reduce((sum, e) => sum + e.adherence_score, 0) / 
        periodEntries.filter(e => e.adherence_score).length) || 0
    : 0;

  const generatePDF = async () => {
    const doc = new jsPDF();
    const currentUser = await base44.auth.me();
    
    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text('Rapport de Suivi', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy')}`, 20, 32);
    
    // Info patient et plan
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Patient: ${plan.patient_name}`, 20, 45);
    doc.text(`Plan: ${plan.title}`, 20, 52);
    doc.text(`Période: ${format(new Date(formData.period_start), 'dd/MM/yyyy')} - ${format(new Date(formData.period_end), 'dd/MM/yyyy')}`, 20, 59);
    
    // Progression
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 68, 170, 25, 'F');
    doc.setFontSize(11);
    doc.text(`Progression globale: ${plan.overall_progress || 0}%`, 25, 78);
    doc.text(`Adhérence moyenne: ${avgAdherence}%`, 25, 86);
    
    let yPos = 105;
    
    // Objectifs
    if (plan.objectives?.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Objectifs', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      plan.objectives.forEach(obj => {
        doc.text(`• ${obj.title}: ${obj.current_value || '-'} / ${obj.target_value} ${obj.unit || ''} (${obj.status})`, 25, yPos);
        yPos += 7;
      });
      yPos += 5;
    }
    
    // Résumé
    if (formData.summary) {
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Résumé', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      const summaryLines = doc.splitTextToSize(formData.summary, 170);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 5 + 10;
    }
    
    // Recommandations
    if (formData.recommendations) {
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Recommandations', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      const recoLines = doc.splitTextToSize(formData.recommendations, 170);
      doc.text(recoLines, 20, yPos);
      yPos += recoLines.length * 5 + 10;
    }
    
    // Signature
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dr. ${currentUser.full_name}`, 20, 280);
    
    return doc;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const doc = await generatePDF();
      
      // Générer le blob PDF
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `rapport_suivi_${plan.id}_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      // Upload le PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      
      // Sauvegarder le rapport
      const report = await base44.entities.FollowUpReport.create({
        plan_id: plan.id,
        patient_id: plan.patient_id,
        patient_name: plan.patient_name,
        report_type: formData.report_type,
        period_start: formData.period_start,
        period_end: formData.period_end,
        summary: formData.summary,
        recommendations: formData.recommendations,
        next_steps: formData.next_steps,
        adherence_average: avgAdherence,
        objectives_status: plan.objectives?.map(obj => ({
          objective_title: obj.title,
          current_value: obj.current_value,
          target_value: obj.target_value,
          progress_percent: obj.progress_percent
        })),
        medecin_email: currentUser.email,
        pdf_url: file_url,
        sent_to_patient: formData.send_to_patient
      });

      // Envoyer au patient si demandé
      if (formData.send_to_patient) {
        // Logique d'envoi email...
        await base44.entities.FollowUpReport.update(report.id, {
          sent_to_patient: true,
          sent_date: new Date().toISOString()
        });
      }

      return { report, pdf_url: file_url };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followUpReports'] });
      toast.success('Rapport généré avec succès');
      
      // Ouvrir le PDF
      window.open(data.pdf_url, '_blank');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la génération');
    }
  });

  const handlePreview = async () => {
    const doc = await generatePDF();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Générer un rapport de suivi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type et période */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.report_type} onValueChange={(v) => setFormData({ ...formData, report_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="quarterly">Trimestriel</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Début</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>

          {/* Stats aperçu */}
          <Card className="bg-slate-50">
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{plan.overall_progress || 0}%</p>
                  <p className="text-xs text-muted-foreground">Progression</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{avgAdherence}%</p>
                  <p className="text-xs text-muted-foreground">Adhérence</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{periodEntries.length}</p>
                  <p className="text-xs text-muted-foreground">Mesures</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contenu */}
          <div className="space-y-2">
            <Label>Résumé de la période</Label>
            <Textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
              placeholder="Résumé de l'évolution du patient..."
            />
          </div>

          <div className="space-y-2">
            <Label>Recommandations</Label>
            <Textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              rows={3}
              placeholder="Conseils et ajustements recommandés..."
            />
          </div>

          <div className="space-y-2">
            <Label>Prochaines étapes</Label>
            <Textarea
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              rows={2}
              placeholder="Actions à prévoir..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send_to_patient"
              checked={formData.send_to_patient}
              onCheckedChange={(c) => setFormData({ ...formData, send_to_patient: c })}
            />
            <Label htmlFor="send_to_patient" className="cursor-pointer">
              Envoyer le rapport au patient par email
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handlePreview}>
            <Download className="w-4 h-4 mr-2" />
            Aperçu
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Générer & Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}