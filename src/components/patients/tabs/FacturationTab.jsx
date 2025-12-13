import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard,
  Download,
  Send,
  FileText,
  Filter,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FacturationTab({ patient, onNewBilling }) {
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', patient?.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patient.id }, '-invoice_date'),
    enabled: !!patient?.id
  });

  const filteredInvoices = invoices.filter(inv => {
    const typeMatch = filterType === 'ALL' || inv.type === filterType;
    const statusMatch = filterStatus === 'ALL' || inv.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const totalFacture = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaye = filteredInvoices.filter(inv => inv.status === 'ACCEPTED' || inv.status === 'PAID').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const resteDu = totalFacture - totalPaye;

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

  return (
    <div className="space-y-6">
      {/* Historique des paiements */}
      <PaymentHistory patient={patient} />
      {/* En-tête avec totaux */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-600 mb-1">Total facturé</div>
              <div className="text-2xl font-bold text-slate-900">{totalFacture.toFixed(2)}€</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Total payé</div>
              <div className="text-2xl font-bold text-green-600">{totalPaye.toFixed(2)}€</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Reste dû</div>
              <div className="text-2xl font-bold text-orange-600">{resteDu.toFixed(2)}€</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold">Filtres:</span>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="EFACT">eFact</SelectItem>
                <SelectItem value="EATTEST">eAttest</SelectItem>
                <SelectItem value="PAPER">Papier</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="SENT">Envoyée</SelectItem>
                <SelectItem value="ACCEPTED">Acceptée</SelectItem>
                <SelectItem value="REJECTED">Refusée</SelectItem>
                <SelectItem value="PAID">Payée</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="ml-auto">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des factures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Factures du patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune facture pour ce patient</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => {
                const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) : null;
                const isValidDate = invoiceDate && !isNaN(invoiceDate.getTime());
                
                return (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeBadge(invoice.type)}
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {isValidDate 
                            ? format(invoiceDate, 'dd MMMM yyyy', { locale: fr })
                            : 'Date non disponible'
                          } •
                          {' '}{getPaymentLabel(invoice.payment_method)} •
                          OA: {invoice.oa_code || 'N/A'}
                        </div>
                        {invoice.transaction_id && (
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            Réf: {invoice.transaction_id}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">
                          {invoice.total_amount?.toFixed(2) || '0.00'}€
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {invoice.receipt_pdf_url && (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === 'REJECTED' && (
                          <Button variant="outline" size="sm">
                            <Send className="w-4 h-4 mr-2" />
                            Renvoyer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}