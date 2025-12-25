import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logPrint } from '../security/AuditTrailService';

export default function AttestationPrint({ invoice, patient, lines = [], isOpen, onClose }) {
  const printRef = useRef();

  const handlePrint = async () => {
    // Logger l'impression pour audit RGPD
    await logPrint(patient.id, 'Attestation', invoice.id);
    
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attestation de soins - ${invoice.id}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { font-size: 16pt; margin: 0; }
            .header p { margin: 5px 0; font-size: 10pt; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { color: #555; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .total-row { font-weight: bold; background: #f0f0f0; }
            .footer { margin-top: 30px; font-size: 9pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
            .signature { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
            .inami-box { border: 2px solid #000; padding: 10px; margin: 10px 0; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const officialName = patient?.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  const niss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  
  const totalHonoraires = lines.reduce((sum, l) => sum + (l.amount || 0), 0) / 100;
  const totalRembourse = lines.reduce((sum, l) => sum + (l.reimbursed || l.amount * 0.75 || 0), 0) / 100;
  const totalPatient = totalHonoraires - totalRembourse;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Attestation de soins donnés
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </div>

        {/* Prévisualisation */}
        <div ref={printRef} className="bg-white p-6 border rounded-lg text-sm">
          <div className="header">
            <h1>ATTESTATION DE SOINS DONNÉS</h1>
            <p>Document destiné au patient - Remboursement mutuelle</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Prestataire */}
            <div className="section">
              <div className="section-title">PRESTATAIRE DE SOINS</div>
              <div className="row"><span className="label">Nom:</span><span>Dr. [Nom du médecin]</span></div>
              <div className="row"><span className="label">N° INAMI:</span><span>[N° INAMI]</span></div>
              <div className="row"><span className="label">Adresse:</span><span>[Adresse cabinet]</span></div>
            </div>

            {/* Patient */}
            <div className="section">
              <div className="section-title">BÉNÉFICIAIRE</div>
              <div className="row"><span className="label">Nom:</span><span>{fullName}</span></div>
              <div className="row"><span className="label">NISS:</span><span>{niss}</span></div>
              <div className="row"><span className="label">Mutuelle:</span><span>{patient?.mutuelle || '-'}</span></div>
              <div className="row"><span className="label">N° affiliation:</span><span>{patient?.numero_mutuelle || '-'}</span></div>
            </div>
          </div>

          {/* Prestations */}
          <div className="section">
            <div className="section-title">PRESTATIONS EFFECTUÉES</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Prestation</th>
                  <th className="text-right">Honoraires</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>{format(new Date(line.date_prestation || invoice.invoice_date), 'dd/MM/yyyy')}</td>
                    <td className="font-mono">{line.nomenclature_code}</td>
                    <td>{line.nomenclature_label}</td>
                    <td className="text-right">{((line.amount || 0) / 100).toFixed(2)} €</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan="3">TOTAL HONORAIRES</td>
                  <td className="text-right">{totalHonoraires.toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Récapitulatif paiement */}
          <div className="inami-box">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600">Intervention mutuelle</p>
                <p className="text-xl font-bold">{totalRembourse.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Quote-part patient</p>
                <p className="text-xl font-bold">{totalPatient.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Montant payé</p>
                <p className="text-xl font-bold">{((invoice.patient_contribution || 0) / 100).toFixed(2)} €</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="signature">
            <div className="signature-box">
              <p>Signature du prestataire</p>
              <div className="signature-line">Date: {format(new Date(), 'dd/MM/yyyy')}</div>
            </div>
            <div className="signature-box">
              <p>Cachet du cabinet</p>
              <div className="signature-line"></div>
            </div>
          </div>

          <div className="footer">
            <p>Document généré le {format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
            <p>Ce document est destiné au remboursement par votre organisme assureur (mutuelle).</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}