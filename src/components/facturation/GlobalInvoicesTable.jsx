import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Eye, 
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

export default function GlobalInvoicesTable({ 
  invoices, 
  currentUser, 
  isLoading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRefresh 
}) {
  const [sortColumn, setSortColumn] = useState('invoice_date');
  const [sortDirection, setSortDirection] = useState('desc');

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

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    if (sortColumn === 'invoice_date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (sortColumn === 'total_amount') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedInvoices = sortedInvoices.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sortedInvoices.length / pageSize);

  const handleOpenPatient = (invoice) => {
    const url = createPageUrl('Patients') + `?patient=${invoice.patient_id}`;
    window.open(url, '_blank');
  };

  const handleDownloadPDF = (invoice) => {
    console.log('[Download] Reçu PDF pour facture:', invoice.id);
    alert(`Téléchargement du reçu PDF pour la facture ${invoice.id.substring(0, 8)}...`);
  };

  const handleDuplicate = (invoice) => {
    console.log('[Duplicate] Facture:', invoice.id);
    alert(`Duplication de la facture ${invoice.id.substring(0, 8)}... (TODO: préremplit formulaire)`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-600">Chargement des factures...</p>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Aucune facture
          </h3>
          <p className="text-slate-500">
            Aucune facture ne correspond aux filtres sélectionnés.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Toutes les factures ({invoices.length})</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Afficher:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              className="border border-slate-200 rounded px-2 py-1 text-sm"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('invoice_date')}
                >
                  Date {sortColumn === 'invoice_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('patient_name')}
                >
                  Patient {sortColumn === 'patient_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Facture</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Paiement</th>
                <th 
                  className="text-right py-3 px-4 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('total_amount')}
                >
                  Montant {sortColumn === 'total_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm">
                    {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleOpenPatient(invoice)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                    >
                      {invoice.patient_name}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <div className="text-xs text-slate-500 font-mono">{invoice.patient_niss_masked}</div>
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
                        onClick={() => handleOpenPatient(invoice)}
                        title="Ouvrir patient"
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

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Affichage {(page - 1) * pageSize + 1} à {Math.min(page * pageSize, invoices.length)} sur {invoices.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
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