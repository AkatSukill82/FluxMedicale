import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Package, Clock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BatchSendDialog from './BatchSendDialog';
import { useI18n } from '../i18n/i18nContext';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

export default function PendingInvoicesQueue({ invoices, isLoading }) {
  const { t } = useI18n();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING');

  // Grouper par mutuelle pour l'envoi
  const groups = Object.values(
    pendingInvoices.reduce((acc, inv) => {
      const key = inv.oa_code || inv.oa_name || 'INCONNU';
      const name = inv.oa_name || inv.oa_code || 'Mutuelle inconnue';
      if (!acc[key]) {
        acc[key] = { oa_code: key, oa_name: name, invoices: [], total: 0, insuranceTotal: 0, patientTotal: 0 };
      }
      acc[key].invoices.push(inv);
      acc[key].total += inv.total_amount || 0;
      acc[key].insuranceTotal += inv.insurance_contribution || 0;
      acc[key].patientTotal += inv.patient_contribution || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.invoices.length - a.invoices.length);

  const handleConfirmSend = async (enrichedGroups) => {
    setIsSending(true);
    let totalSent = 0;

    for (const group of enrichedGroups) {
      const batch = await base44.entities.InvoiceBatch.create({
        batch_number: group.batchNumber,
        oa_code: group.oa_code,
        oa_name: group.oa_name,
        invoice_count: group.invoices.length,
        total_amount: group.total,
        insurance_total: group.insuranceTotal,
        patient_total: group.patientTotal,
        status: 'SENT',
        invoice_ids: group.invoices.map(i => i.id),
        trigger: 'manual',
        sent_at: new Date().toISOString()
      });

      for (const inv of group.invoices) {
        await base44.entities.Invoice.update(inv.id, {
          status: 'SENT',
          batch_id: batch.id,
          sent_at: new Date().toISOString()
        });
      }
      totalSent += group.invoices.length;
    }

    toast.success(t('billing.sentSuccess', { count: totalSent }), {
      description: t('billing.batchCreated', { count: enrichedGroups.length })
    });
    queryClient.invalidateQueries({ queryKey: ['facturation_data'] });
    setIsSending(false);
    setShowSendDialog(false);
  };

  if (isLoading) {
    return (
      <Card><CardContent className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
      </CardContent></Card>
    );
  }

  if (pendingInvoices.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">{t('billing.queueEmpty')}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {t('billing.queueEmptyDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = pendingInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);

  return (
    <>
      <div className="space-y-4">
        {/* Bandeau résumé + bouton tout envoyer */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">
                    {t('billing.attestPending', { count: pendingInvoices.length })}
                  </h2>
                  <p className="text-sm text-blue-700">
                    {t('billing.mutuelles', { count: groups.length })} • Total: {formatAmount(totalAmount)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowSendDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-6 text-base gap-2"
              >
                <Send className="w-5 h-5" />
                {t('billing.sendAll')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste plate de toutes les factures */}
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-6 gap-4 text-xs font-semibold text-slate-500 px-4 py-3 border-b bg-slate-50">
              <span>{t('billing.invoiceNumber')}</span>
              <span>{t('billing.patient')}</span>
              <span>{t('billing.date')}</span>
              <span>{t('billing.mutuelle')}</span>
              <span>{t('billing.type')}</span>
              <span className="text-right">{t('billing.amount')}</span>
            </div>
            {pendingInvoices.map(inv => (
              <div key={inv.id} className="grid grid-cols-6 gap-4 text-sm py-3 px-4 border-b last:border-0 hover:bg-slate-50">
                <span className="font-mono text-xs text-slate-600">{inv.invoice_number || inv.id.slice(0, 10)}</span>
                <span className="font-medium truncate">{inv.patient_name || 'Patient'}</span>
                <span className="text-slate-600">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '-'}</span>
                <span className="text-slate-600 truncate">{inv.oa_name || '-'}</span>
                <Badge variant="outline" className="w-fit text-xs">{inv.type}</Badge>
                <span className="text-right font-semibold">{formatAmount(inv.total_amount)}</span>
              </div>
            ))}
            {/* Total */}
            <div className="grid grid-cols-6 gap-4 text-sm py-3 px-4 bg-slate-100 font-bold">
              <span className="col-span-5">Total</span>
              <span className="text-right">{formatAmount(totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog récapitulatif d'envoi */}
      <BatchSendDialog
        groups={groups}
        open={showSendDialog}
        onOpenChange={(val) => { if (!isSending) setShowSendDialog(val); }}
        onConfirm={handleConfirmSend}
        isSending={isSending}
      />
    </>
  );
}