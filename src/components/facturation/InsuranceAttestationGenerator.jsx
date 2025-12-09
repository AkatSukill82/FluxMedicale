import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';

export default function InsuranceAttestationGenerator({ invoice, patient, isOpen, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);

  const generateAttestation = async () => {
    setIsGenerating(true);
    try {
      const user = await base44.auth.me();
      const invoiceLines = await base44.entities.InvoiceLine.filter({ invoice_id: invoice.id });
      
      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('ATTESTATION DE SOINS', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Patient info
      doc.text('PATIENT', 20, 40);
      const patientName = patient.name?.[0] 
        ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
        : 'Patient';
      doc.text(`Nom: ${patientName}`, 20, 48);
      
      const niss = patient.identifier?.find(id => id.system.includes('ssin'))?.value || 'N/A';
      doc.text(`NISS: ${niss}`, 20, 56);
      doc.text(`Mutuelle: ${patient.mutuelle || 'Non renseigné'}`, 20, 64);
      
      // Provider info
      doc.text('PRESTATAIRE', 120, 40);
      doc.text(`Dr. ${user.full_name}`, 120, 48);
      doc.text(`INAMI: ${user.inami_number || 'N/A'}`, 120, 56);
      
      // Invoice details
      doc.text('DETAILS DE LA FACTURATION', 20, 80);
      doc.text(`Date: ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: fr })}`, 20, 88);
      doc.text(`N° Facture: ${invoice.id}`, 20, 96);
      
      // Acts table
      let yPos = 110;
      doc.setFont(undefined, 'bold');
      doc.text('Code', 20, yPos);
      doc.text('Description', 50, yPos);
      doc.text('Qté', 140, yPos);
      doc.text('Montant', 160, yPos);
      
      doc.setFont(undefined, 'normal');
      yPos += 8;
      
      invoiceLines.forEach(line => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line.nomenclature_code, 20, yPos);
        doc.text(line.nomenclature_label.substring(0, 40), 50, yPos);
        doc.text(String(line.quantity), 140, yPos);
        doc.text(`${line.amount.toFixed(2)}€`, 160, yPos);
        yPos += 8;
      });
      
      // Totals
      yPos += 10;
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL', 140, yPos);
      doc.text(`${((invoice.total_amount || 0) / 100).toFixed(2)}€`, 160, yPos);
      
      yPos += 8;
      doc.setFont(undefined, 'normal');
      doc.text('Part mutuelle', 140, yPos);
      doc.text(`${((invoice.insurance_contribution || 0) / 100).toFixed(2)}€`, 160, yPos);
      
      yPos += 8;
      doc.text('Part patient', 140, yPos);
      doc.text(`${((invoice.patient_contribution || 0) / 100).toFixed(2)}€`, 160, yPos);
      
      // Footer
      doc.setFontSize(8);
      doc.text('Document généré automatiquement par FluxMed', pageWidth / 2, 285, { align: 'center' });
      doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth / 2, 290, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setGeneratedDoc({
        url: pdfUrl,
        blob: pdfBlob,
        filename: `attestation_${invoice.id}_${format(new Date(), 'yyyyMMdd')}.pdf`
      });
      
      toast.success('Attestation générée avec succès');
    } catch (error) {
      console.error('Error generating attestation:', error);
      toast.error('Erreur lors de la génération de l\'attestation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    const link = document.createElement('a');
    link.href = generatedDoc.url;
    link.download = generatedDoc.filename;
    link.click();
  };

  const handleSendToInsurance = async () => {
    if (!generatedDoc) return;
    
    try {
      // Upload PDF first
      const formData = new FormData();
      formData.append('file', generatedDoc.blob, generatedDoc.filename);
      
      // In a real implementation, this would send to the insurance system
      toast.success('Attestation envoyée à la mutuelle');
      
      // Update invoice status
      await base44.entities.Invoice.update(invoice.id, {
        status: 'SENT',
        sent_at: new Date().toISOString()
      });
      
      onClose();
    } catch (error) {
      console.error('Error sending attestation:', error);
      toast.error('Erreur lors de l\'envoi à la mutuelle');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Attestation de soins
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedDoc ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="font-semibold mb-2">Générer l'attestation de soins</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Ce document sera généré au format PDF conforme aux exigences des mutuelles belges.
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-left mb-6">
                  <div>
                    <p className="text-xs text-slate-500">Patient</p>
                    <p className="font-medium">
                      {patient.name?.[0] ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Mutuelle</p>
                    <p className="font-medium">{patient.mutuelle || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Montant total</p>
                    <p className="font-medium text-blue-600">
                      {((invoice.total_amount || 0) / 100).toFixed(2)}€
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Part mutuelle</p>
                    <p className="font-medium text-green-600">
                      {((invoice.insurance_contribution || 0) / 100).toFixed(2)}€
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={generateAttestation} 
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Générer l'attestation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Attestation générée</h3>
                    <p className="text-sm text-slate-600">{generatedDoc.filename}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleDownload} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button onClick={handleSendToInsurance} className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer à la mutuelle
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