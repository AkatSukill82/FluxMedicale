import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const InvoiceReceipt = forwardRef(({ invoice, patient, doctor, invoiceLines = [] }, ref) => {
  const patientName = patient?.name?.[0] 
    ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
    : 'Patient';
  
  const patientNiss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  const maskedNiss = patientNiss ? `***.**.***.${patientNiss.slice(-2)}` : 'N/A';

  const formatAmount = (cents) => {
    if (!cents && cents !== 0) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  return (
    <div ref={ref} className="print-receipt hidden print:block print:p-8 print:bg-white print:text-black">
      <style type="text/css" media="print">{`
        @media print {
          @page {
            size: A5;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          .print-receipt, .print-receipt * {
            visibility: visible;
          }
          .print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-family: Arial, sans-serif;
            font-size: 12pt;
          }
        }
      `}</style>

      {/* En-tête Médecin */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase">{doctor?.full_name || 'Dr.'}</h1>
        <p className="text-sm mt-1">Médecin généraliste</p>
        {doctor?.numero_inami && (
          <p className="text-sm font-mono mt-2">N° INAMI: {doctor.numero_inami}</p>
        )}
        {doctor?.adresse && <p className="text-sm mt-1">{doctor.adresse}</p>}
        {doctor?.telephone && <p className="text-sm">Tél: {doctor.telephone}</p>}
      </div>

      {/* Titre */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wide">Reçu de paiement</h2>
        <p className="text-sm mt-1">
          Date: {format(new Date(invoice?.invoice_date || new Date()), 'dd/MM/yyyy', { locale: fr })}
        </p>
        <p className="text-sm font-mono">N° {invoice?.id?.slice(0, 8).toUpperCase() || '---'}</p>
      </div>

      {/* Infos Patient */}
      <div className="mb-6 p-3 border border-gray-400">
        <p className="font-semibold">Patient: {patientName}</p>
        <p className="text-sm">NISS: {maskedNiss}</p>
      </div>

      {/* Type de facturation */}
      <div className="mb-6">
        <p className="font-semibold">
          Type: {invoice?.type === 'EATTEST' ? 'eAttest' : invoice?.type === 'EFACT' ? 'eFact' : 'Papier'}
        </p>
        <p className="text-sm">
          Paiement: {
            invoice?.payment_method === 'CARD' ? 'Carte bancaire' :
            invoice?.payment_method === 'CASH' ? 'Espèces' :
            invoice?.payment_method === 'BANK' ? 'Virement' : 'N/A'
          }
        </p>
      </div>

      {/* Codes INAMI / Prestations */}
      <div className="mb-6">
        <h3 className="font-bold border-b border-black pb-1 mb-3">Prestations</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Code INAMI</th>
              <th className="text-left py-1">Description</th>
              <th className="text-right py-1">Montant</th>
            </tr>
          </thead>
          <tbody>
            {invoiceLines.length > 0 ? (
              invoiceLines.map((line, idx) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="py-2 font-mono">{line.nomenclature_code || line.code}</td>
                  <td className="py-2">{line.nomenclature_label || line.title_fr || '-'}</td>
                  <td className="py-2 text-right">{formatAmount(line.amount || line.unit_price)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-2 text-center text-gray-500">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <div className="border-t-2 border-black pt-4">
        <div className="flex justify-between mb-1">
          <span>Honoraires totaux:</span>
          <span className="font-semibold">{formatAmount(invoice?.total_amount)}</span>
        </div>
        <div className="flex justify-between mb-1 text-sm">
          <span>Part mutuelle:</span>
          <span>{formatAmount(invoice?.insurance_contribution)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold mt-3 pt-2 border-t border-black">
          <span>Montant payé par le patient:</span>
          <span>{formatAmount(invoice?.patient_contribution)}</span>
        </div>
      </div>

      {/* Pied de page */}
      <div className="mt-8 pt-4 border-t border-gray-400 text-center text-xs text-gray-600">
        <p>Merci de votre confiance</p>
        <p className="mt-1">Conservez ce reçu pour vos remboursements</p>
      </div>
    </div>
  );
});

InvoiceReceipt.displayName = 'InvoiceReceipt';

export default InvoiceReceipt;