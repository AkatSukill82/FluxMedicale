import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Eye, 
  Copy,
  AlertCircle
} from 'lucide-react';
import OAErrorExplainer from './OAErrorExplainer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InvoicesTable({ invoices, currentUser, patient, onRefresh }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-slate-100 text-slate-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-purple-100 text-purple-800'
    };

    const labels = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyée',
      ACCEPTED: 'Acceptée',
      REJECTED: 'Refusée',
      PAID: 'Payée'
    };

    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getTypeBadge = (type) => {
    const styles = {
      EFACT: 'bg-blue-100 text-blue-800',
      EATTEST: 'bg-green-100 text-green-800',
      PAPER: 'bg-slate-100 text-slate-800'
    };

    return <Badge className={styles[type]}>{type}</Badge>;
  };

  const getPaymentLabel = (method) => {
    const labels = {
      CARD: 'Carte',
      CASH: 'Espèces',
      BANK: 'Virement',
      PAPER: 'Papier'
    };
    return labels[method] || method;
  };

  const handleDownloadPDF = (invoice) => {
    // Simulation téléchargement PDF
    console.log('[Download] Reçu PDF pour facture:', invoice.id);
    alert(`Téléchargement du reçu PDF pour la facture ${invoice.id.substring(0, 8)}...`);
  };

  const handleDuplicate = (invoice) => {
    console.log('[Duplicate] Facture:', invoice.id);
    alert(`Duplication de la facture ${invoice.id.substring(0, 8)}... (TODO: préremplit formulaire)`);
  };

  const handleOpen = (invoice) => {
    setSelectedInvoice(invoice);
    // TODO: Modal avec détails facture + lignes
  };

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Aucune facture
          </h3>
          <p className="text-slate-500">
            Aucune facture pour ce patient avec les filtres sélectionnés.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Factures du patient</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Facture</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Paiement</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm">
                    {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-600">
                    {invoice.id.substring(0, 8)}...
                  </td>
                  <td className="py-3 px-4">
                    {getTypeBadge(invoice.type)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {getPaymentLabel(invoice.payment_method)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {(invoice.total_amount || 0).toFixed(2)}€
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpen(invoice)}
                        title="Ouvrir"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadPDF(invoice)}
                        title="Reçu PDF"
                        disabled={!invoice.receipt_pdf_url}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDuplicate(invoice)}
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <p>{invoices.length} facture(s)</p>
          <p>
            Total: <strong className="text-lg text-slate-900">
              {invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toFixed(2)}€
            </strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}