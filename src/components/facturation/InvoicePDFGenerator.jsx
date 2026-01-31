import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Download, Printer, Send, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function InvoicePDFGenerator({ invoice, patient, isOpen, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const getPatientName = () => {
    const name = patient?.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim() || 'Patient';
  };

  const getPatientAddress = () => {
    const addr = patient?.address?.[0];
    if (!addr) return '';
    return `${(addr.line || []).join(', ')}, ${addr.postalCode} ${addr.city}`;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // En-tête
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text('FACTURE', 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`N° ${invoice.invoice_number || invoice.id.slice(0, 10)}`, 20, 32);
      doc.text(`Date: ${format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: fr })}`, 20, 38);
      
      if (invoice.due_date) {
        doc.text(`Échéance: ${format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: fr })}`, 20, 44);
      }
      
      // Statut
      const statusColors = {
        PAID: [34, 197, 94],
        PARTIAL: [251, 146, 60],
        SENT: [59, 130, 246],
        DRAFT: [156, 163, 175]
      };
      const statusLabels = {
        PAID: 'PAYÉE',
        PARTIAL: 'PARTIEL',
        SENT: 'ENVOYÉE',
        DRAFT: 'BROUILLON'
      };
      
      doc.setFillColor(...(statusColors[invoice.status] || [156, 163, 175]));
      doc.roundedRect(pageWidth - 50, 20, 35, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(statusLabels[invoice.status] || invoice.status, pageWidth - 47, 27);
      
      // Informations patient
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text('Facturé à:', pageWidth - 80, 50);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(getPatientName(), pageWidth - 80, 58);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const address = getPatientAddress();
      if (address) {
        doc.text(address, pageWidth - 80, 65, { maxWidth: 60 });
      }
      
      // Tableau des lignes
      const tableData = (invoice.invoice_lines || []).map(line => [
        line.description || '-',
        line.quantity?.toString() || '1',
        `${((line.unit_price || 0) / 100).toFixed(2)} €`,
        `${((line.amount || 0) / 100).toFixed(2)} €`
      ]);
      
      doc.autoTable({
        startY: 80,
        head: [['Description', 'Qté', 'Prix unit.', 'Total']],
        body: tableData.length > 0 ? tableData : [['Prestation médicale', '1', `${((invoice.total_amount || 0) / 100).toFixed(2)} €`, `${((invoice.total_amount || 0) / 100).toFixed(2)} €`]],
        theme: 'striped',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontSize: 10
        },
        styles: {
          fontSize: 9,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' }
        }
      });
      
      // Totaux
      const finalY = doc.lastAutoTable.finalY + 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      
      const rightCol = pageWidth - 60;
      
      if (invoice.subtotal) {
        doc.text('Sous-total:', rightCol, finalY);
        doc.text(`${(invoice.subtotal / 100).toFixed(2)} €`, rightCol + 40, finalY, { align: 'right' });
      }
      
      if (invoice.vat_amount && invoice.vat_amount > 0) {
        doc.text('TVA:', rightCol, finalY + 7);
        doc.text(`${(invoice.vat_amount / 100).toFixed(2)} €`, rightCol + 40, finalY + 7, { align: 'right' });
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.line(rightCol, finalY + 12, pageWidth - 20, finalY + 12);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL:', rightCol, finalY + 20);
      doc.setTextColor(30, 64, 175);
      doc.text(`${((invoice.total_amount || 0) / 100).toFixed(2)} €`, rightCol + 40, finalY + 20, { align: 'right' });
      
      // Montants payés/dus
      if (invoice.amount_paid > 0) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(34, 197, 94);
        doc.text('Déjà payé:', rightCol, finalY + 30);
        doc.text(`${(invoice.amount_paid / 100).toFixed(2)} €`, rightCol + 40, finalY + 30, { align: 'right' });
        
        if (invoice.amount_due > 0) {
          doc.setTextColor(251, 146, 60);
          doc.text('Reste à payer:', rightCol, finalY + 37);
          doc.setFont(undefined, 'bold');
          doc.text(`${(invoice.amount_due / 100).toFixed(2)} €`, rightCol + 40, finalY + 37, { align: 'right' });
        }
      }
      
      // Conditions de paiement
      const conditionsY = finalY + 55;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      if (invoice.payment_terms) {
        doc.text(`Conditions: ${invoice.payment_terms}`, 20, conditionsY);
      }
      
      const paymentMethods = {
        BANK: 'Virement bancaire',
        CARD: 'Carte bancaire',
        CASH: 'Espèces',
        DOMICILIATION: 'Domiciliation'
      };
      doc.text(`Mode de paiement: ${paymentMethods[invoice.payment_method] || invoice.payment_method}`, 20, conditionsY + 6);
      
      // Notes
      if (invoice.notes) {
        doc.text(`Notes: ${invoice.notes}`, 20, conditionsY + 15, { maxWidth: pageWidth - 40 });
      }
      
      // Pied de page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      // Générer le blob
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      toast.success('PDF généré');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `facture-${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`;
    link.click();
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    printWindow?.print();
  };

  const handleSendEmail = async () => {
    if (!patient?.telecom) {
      toast.error('Pas d\'email pour ce patient');
      return;
    }
    
    const email = patient.telecom.find(t => t.system === 'email')?.value;
    if (!email) {
      toast.error('Pas d\'email pour ce patient');
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Facture ${invoice.invoice_number || invoice.id.slice(0, 8)}`,
        body: `
          <h2>Facture ${invoice.invoice_number || invoice.id.slice(0, 8)}</h2>
          <p>Veuillez trouver ci-joint votre facture du ${format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: fr })}.</p>
          <p><strong>Montant total: ${((invoice.total_amount || 0) / 100).toFixed(2)} €</strong></p>
          ${invoice.amount_due > 0 ? `<p>Montant restant dû: ${(invoice.amount_due / 100).toFixed(2)} €</p>` : ''}
          <p>Cordialement,<br/>Votre cabinet médical</p>
        `
      });
      toast.success('Email envoyé');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  React.useEffect(() => {
    if (isOpen && !pdfUrl) {
      generatePDF();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Facture {invoice?.invoice_number || invoice?.id?.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <Button variant="outline" onClick={handleDownload} disabled={!pdfUrl}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!pdfUrl}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={handleSendEmail}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer par email
            </Button>
            <Button variant="outline" onClick={generatePDF} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
              Régénérer
            </Button>
          </div>

          {/* Aperçu */}
          <div className="border rounded-lg overflow-hidden bg-slate-100">
            {isGenerating ? (
              <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[600px]"
                title="Aperçu de la facture"
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                Erreur lors de la génération
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}