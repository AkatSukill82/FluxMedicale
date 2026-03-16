import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, AlertTriangle, XCircle, Clock, CheckCircle, Send, FileX2, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import { useI18n } from '../i18n/i18nContext';

export default function InvoiceSearchPanel({ invoices, isLoading }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;

const STATUS_CONFIG = {
  DRAFT: { label: t('billing.draft'), color: 'bg-slate-100 text-slate-700', icon: FileX2 },
  PENDING: { label: t('billing.pending'), color: 'bg-blue-100 text-blue-700', icon: Clock },
  NOT_SENT: { label: t('billing.notSent'), color: 'bg-slate-100 text-slate-700', icon: FileX2 },
  SENT: { label: t('billing.sent'), color: 'bg-blue-100 text-blue-700', icon: Send },
  ERROR: { label: t('billing.error'), color: 'bg-red-100 text-red-700', icon: XCircle },
  ERROR_CORRECTED: { label: t('billing.corrected'), color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  ACCEPTED: { label: t('billing.accepted'), color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: t('billing.rejected'), color: 'bg-red-100 text-red-700', icon: XCircle },
  PAID: { label: t('billing.paid'), color: 'bg-green-100 text-green-800', icon: CheckCircle },
  PARTIAL: { label: t('billing.partial'), color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  CANCELLED: { label: t('billing.cancelled'), color: 'bg-slate-100 text-slate-500', icon: FileX2 },
  CREDIT_NOTE: { label: t('billing.creditNote'), color: 'bg-orange-100 text-orange-700', icon: FileX2 },
};

const QUICK_FILTERS = [
  { id: 'unpaid', label: `💸 ${t('billing.unpaid')}`, filter: inv => ['SENT', 'ACCEPTED', 'NOT_SENT'].includes(inv.status) },
  { id: 'errors', label: `❌ ${t('billing.errors')}`, filter: inv => ['ERROR', 'REJECTED'].includes(inv.status) },
  { id: 'pending', label: `⏳ ${t('billing.pendingTab')}`, filter: inv => inv.status === 'PENDING' },
  { id: 'paid', label: `✅ ${t('billing.paid')}`, filter: inv => inv.status === 'PAID' },
  { id: 'overdue', label: `⚠️ ${t('billing.overdue')}`, filter: inv => {
    if (inv.status === 'PAID' || inv.status === 'CANCELLED') return false;
    const due = new Date(inv.invoice_date);
    due.setDate(due.getDate() + 30);
    return new Date() > due;
  }},
];

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('30');
  const [activeQuickFilter, setActiveQuickFilter] = useState(null);

  const filtered = useMemo(() => {
    let result = [...invoices];

    // Period
    if (periodFilter !== 'all') {
      const days = periodFilter === 'today' ? 0 : parseInt(periodFilter);
      const start = format(subDays(new Date(), days), 'yyyy-MM-dd');
      result = result.filter(inv => inv.invoice_date >= start);
    }

    // Status
    if (statusFilter !== 'ALL') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // Quick filter
    if (activeQuickFilter) {
      const qf = QUICK_FILTERS.find(f => f.id === activeQuickFilter);
      if (qf) result = result.filter(qf.filter);
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inv =>
        (inv.patient_name || '').toLowerCase().includes(term) ||
        (inv.id || '').toLowerCase().includes(term) ||
        (inv.oa_name || '').toLowerCase().includes(term) ||
        (inv.invoice_number || '').toLowerCase().includes(term)
      );
    }

    return result.sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || ''));
  }, [invoices, searchTerm, statusFilter, periodFilter, activeQuickFilter]);

  const totalFiltered = filtered.reduce((s, i) => s + (i.total_amount || 0), 0);

  if (isLoading) {
    return <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(qf => (
          <Button
            key={qf.id}
            variant={activeQuickFilter === qf.id ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setActiveQuickFilter(activeQuickFilter === qf.id ? null : qf.id)}
          >
            {qf.label}
            <Badge variant="secondary" className="ml-1.5 text-[10px]">
              {invoices.filter(qf.filter).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Search & filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('billing.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('billing.allStatuses')}</SelectItem>
                <SelectItem value="PENDING">{t('billing.pending')}</SelectItem>
                <SelectItem value="SENT">{t('billing.sent')}</SelectItem>
                <SelectItem value="ACCEPTED">{t('billing.accepted')}</SelectItem>
                <SelectItem value="REJECTED">{t('billing.rejected')}</SelectItem>
                <SelectItem value="ERROR">{t('billing.error')}</SelectItem>
                <SelectItem value="PAID">{t('billing.paid')}</SelectItem>
                <SelectItem value="CANCELLED">{t('billing.cancelled')}</SelectItem>
                <SelectItem value="CREDIT_NOTE">{t('billing.creditNote')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('billing.today')}</SelectItem>
                <SelectItem value="7">{t('billing.7days')}</SelectItem>
                <SelectItem value="30">{t('billing.30days')}</SelectItem>
                <SelectItem value="90">{t('billing.3months')}</SelectItem>
                <SelectItem value="all">{t('billing.everything')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{t('billing.resultsCount', { count: filtered.length })}</span>
        <span>Total: <strong>{formatAmount(totalFiltered)}</strong></span>
      </div>

      {/* Results table */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">{t('billing.noResults')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">{t('billing.date')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">{t('billing.patient')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">{t('billing.mutuelle')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">{t('billing.type')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">{t('common.status')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">{t('billing.amount')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">{t('billing.batch')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(inv => {
                  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-sm">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yy') : '-'}</td>
                      <td className="py-2.5 px-4 text-sm font-medium">{inv.patient_name || 'N/A'}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-600">{inv.oa_name || '-'}</td>
                      <td className="py-2.5 px-4"><Badge variant="outline" className="text-xs">{inv.type}</Badge></td>
                      <td className="py-2.5 px-4"><Badge className={`${sc.color} text-xs`}>{sc.label}</Badge></td>
                      <td className="py-2.5 px-4 text-sm font-semibold text-right">{formatAmount(inv.total_amount)}</td>
                      <td className="py-2.5 px-4 text-xs font-mono text-right text-slate-500">{inv.batch_id ? inv.batch_id.slice(0, 8) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}