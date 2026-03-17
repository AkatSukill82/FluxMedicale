import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '../i18n/i18nContext';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

export default function BatchSendDialog({ groups, open, onOpenChange, onConfirm, isSending }) {
  const { t } = useI18n();
  const [batchNumbers, setBatchNumbers] = useState({});

  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const dateStr = format(new Date(), 'yyyyMMdd');
    const initial = {};
    groups.forEach((g, i) => {
      const code = (g.oa_code || 'XX').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
      initial[g.oa_code] = `LOT-${dateStr}-${code}-${String(i + 1).padStart(3, '0')}`;
    });
    setBatchNumbers(initial);
  }, [groups]);

  if (!groups || groups.length === 0) return null;

  const totalInvoices = groups.reduce((s, g) => s + g.invoices.length, 0);
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  const handleConfirm = () => {
    onConfirm(groups.map(g => ({ ...g, batchNumber: batchNumbers[g.oa_code] || '' })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Send className="w-5 h-5 text-blue-600" />
            {t('billing.sendSummary')}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {t('billing.attestationsToSend', { count: totalInvoices })}
          </p>
        </DialogHeader>

        <div className="py-2">
          {/* Tableau récap par mutuelle */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('billing.sendNumber')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('billing.mutuelle')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">{t('billing.invoicesWord')}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.oa_code} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <Input
                        value={batchNumbers[group.oa_code] || ''}
                        onChange={(e) => setBatchNumbers(prev => ({ ...prev, [group.oa_code]: e.target.value }))}
                        className="h-8 text-xs font-mono w-52"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{group.oa_name}</div>
                      {group.oa_code !== 'INCONNU' && (
                        <div className="text-xs text-slate-400 font-mono">{group.oa_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">{group.invoices.length}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{formatAmount(group.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total général */}
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-t-2 border-blue-200">
              <span className="font-bold text-blue-900 text-base">TOTAL</span>
              <div className="flex items-center gap-6">
                <span className="text-sm text-blue-700">{t('billing.attestationsToSend', { count: totalInvoices })}</span>
                <span className="text-xl font-bold text-blue-900">{formatAmount(grandTotal)}</span>
              </div>
            </div>
          </div>

          {groups.some(g => g.oa_code === 'INCONNU') && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                {t('billing.noInsuranceCode')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSending}
            className="bg-blue-600 hover:bg-blue-700 gap-2 h-11 px-6"
          >
            {isSending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('billing.sendingProgress')}</>
            ) : (
              <><Send className="w-4 h-4" /> {t('billing.send')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}