import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, XCircle, Clock, RefreshCw, Edit2, 
  ChevronDown, ChevronUp, Loader2, Undo2, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import { toast } from 'sonner';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import ErrorExplanationCard from './ErrorExplanationCard';
import { useI18n } from '../i18n/i18nContext';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

export default function ErrorInvoicesPanel({ invoices, patients, isLoading }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const errorInvoices = useMemo(() => {
    return invoices
      .filter(inv => ['ERROR', 'REJECTED', 'PARTIAL'].includes(inv.status))
      .sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || ''));
  }, [invoices]);

  const requeueMutation = useMutation({
    mutationFn: async (invoiceId) => {
      await base44.entities.Invoice.update(invoiceId, {
        status: 'PENDING',
        oa_error_code: null,
        oa_response: null,
        batch_id: null,
        sent_at: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturation_data'] });
      toast.success(t('billing.requeuedSuccess'));
    }
  });

  const selectedPatient = selectedInvoice 
    ? patients?.find(p => p.id === selectedInvoice.patient_id) 
    : null;

  const statusConfig = {
    ERROR: { label: t('billing.error'), color: 'bg-red-100 text-red-700', icon: XCircle },
    REJECTED: { label: t('billing.rejected'), color: 'bg-red-100 text-red-700', icon: XCircle },
    PARTIAL: { label: t('billing.partial'), color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  };

  if (isLoading) {
    return <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></CardContent></Card>;
  }

  if (errorInvoices.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{t('billing.noErrorInvoices')}</h3>
          <p className="text-slate-500">{t('billing.allProcessedOk')}</p>
        </CardContent>
      </Card>
    );
  }

  const errorCount = errorInvoices.filter(i => i.status === 'ERROR').length;
  const rejectedCount = errorInvoices.filter(i => i.status === 'REJECTED').length;
  const partialCount = errorInvoices.filter(i => i.status === 'PARTIAL').length;
  const totalAmount = errorInvoices.reduce((s, i) => s + (i.insurance_contribution || 0), 0);

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{errorInvoices.length}</p>
            <p className="text-xs text-red-600">{t('billing.totalErrors')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            <p className="text-xs text-slate-500">{t('billing.rejected')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{errorCount}</p>
            <p className="text-xs text-slate-500">{t('billing.technicalErrors')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-700">{formatAmount(totalAmount)}</p>
            <p className="text-xs text-slate-500">{t('billing.blockedInsurance')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des factures en erreur */}
      <div className="space-y-3">
        {errorInvoices.map(inv => {
          const sc = statusConfig[inv.status] || statusConfig.ERROR;
          const StatusIcon = sc.icon;
          const isExpanded = expandedId === inv.id;

          return (
            <Card key={inv.id} className="border-red-100 hover:border-red-300 transition-colors">
              <CardContent className="p-0">
                {/* Ligne principale */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <StatusIcon className="w-5 h-5 text-red-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{inv.patient_name || 'N/A'}</span>
                      <Badge className={`${sc.color} text-[10px]`}>{sc.label}</Badge>
                      {inv.oa_error_code && (
                        <Badge variant="outline" className="text-[10px] font-mono">{inv.oa_error_code}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '-'}</span>
                      <span>•</span>
                      <span>{inv.oa_name || '-'}</span>
                      <span>•</span>
                      <span>{inv.type}</span>
                      <span>•</span>
                      <span className="font-mono">{inv.invoice_number || inv.id.slice(0, 10)}</span>
                    </div>
                  </div>

                  <div className="text-right mr-2">
                    <p className="font-bold text-sm">{formatAmount(inv.total_amount)}</p>
                    <p className="text-[10px] text-slate-400">
                      {t('billing.mut')}: {formatAmount(inv.insurance_contribution)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    >
                      <Info className="w-3.5 h-3.5 mr-1" />
                      {t('billing.details')}
                      {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      {t('billing.modify')}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => requeueMutation.mutate(inv.id)}
                      disabled={requeueMutation.isPending}
                    >
                      {requeueMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Undo2 className="w-3.5 h-3.5 mr-1" />
                          {t('billing.requeueInvoice')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Panneau d'explication de l'erreur */}
                {isExpanded && (
                  <div className="border-t bg-slate-50 p-4">
                    <ErrorExplanationCard invoice={inv} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de détails/modification */}
      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          patient={selectedPatient}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}