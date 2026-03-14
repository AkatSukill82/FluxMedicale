import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Send, CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, ArrowRight, Loader2
} from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

const STATUS_FLOW = [
  { key: 'PENDING', label: 'En file', color: '#94a3b8', icon: Clock },
  { key: 'SENT', label: 'Envoyé', color: '#3b82f6', icon: Send },
  { key: 'ACCEPTED', label: 'Accepté', color: '#10b981', icon: CheckCircle },
  { key: 'PAID', label: 'Payé', color: '#059669', icon: CheckCircle },
];

export default function MyCareNetPaymentTracker() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['mycarenet_tracking_invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date', 500)
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['mycarenet_tracking_txns'],
    queryFn: () => base44.entities.MyCareNetTransaction.list('-created_date', 200)
  });

  // Only eFact/eAttest invoices
  const efactInvoices = useMemo(() => {
    return invoices.filter(i => ['EFACT', 'EATTEST'].includes(i.type));
  }, [invoices]);

  // Pipeline summary
  const pipeline = useMemo(() => {
    const counts = { PENDING: 0, SENT: 0, ACCEPTED: 0, PAID: 0, ERROR: 0, REJECTED: 0 };
    const amounts = { PENDING: 0, SENT: 0, ACCEPTED: 0, PAID: 0, ERROR: 0, REJECTED: 0 };
    efactInvoices.forEach(inv => {
      const status = inv.status || 'PENDING';
      counts[status] = (counts[status] || 0) + 1;
      amounts[status] = (amounts[status] || 0) + (inv.total_amount || 0);
    });
    return { counts, amounts };
  }, [efactInvoices]);

  // Recent activity (last 30 days)
  const recentActivity = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return efactInvoices
      .filter(i => i.sent_at && new Date(i.sent_at) >= cutoff)
      .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
      .slice(0, 20);
  }, [efactInvoices]);

  // Average processing time
  const avgProcessingDays = useMemo(() => {
    const processed = efactInvoices.filter(i => i.sent_at && (i.status === 'ACCEPTED' || i.status === 'PAID'));
    if (processed.length === 0) return null;
    const totalDays = processed.reduce((sum, i) => {
      const sent = new Date(i.sent_at);
      const processed = new Date(i.paid_at || i.updated_date || i.sent_at);
      return sum + differenceInDays(processed, sent);
    }, 0);
    return Math.round(totalDays / processed.length);
  }, [efactInvoices]);

  // Group by mutuelle for chart
  const mutuelleChart = useMemo(() => {
    const groups = {};
    efactInvoices.forEach(inv => {
      const key = inv.oa_name || inv.oa_code || 'Autre';
      if (!groups[key]) groups[key] = { name: key, sent: 0, accepted: 0, paid: 0, error: 0 };
      if (inv.status === 'SENT' || inv.status === 'PENDING') groups[key].sent += (inv.total_amount || 0) / 100;
      if (inv.status === 'ACCEPTED') groups[key].accepted += (inv.total_amount || 0) / 100;
      if (inv.status === 'PAID') groups[key].paid += (inv.total_amount || 0) / 100;
      if (['ERROR', 'REJECTED'].includes(inv.status)) groups[key].error += (inv.total_amount || 0) / 100;
    });
    return Object.values(groups).sort((a, b) => (b.sent + b.accepted + b.paid) - (a.sent + a.accepted + a.paid)).slice(0, 8);
  }, [efactInvoices]);

  const formatAmount = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  if (isLoading) {
    return <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Pipeline visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            Pipeline MyCareNet — Suivi des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 py-4">
            {STATUS_FLOW.map((step, i) => {
              const Icon = step.icon;
              const count = pipeline.counts[step.key] || 0;
              const amount = pipeline.amounts[step.key] || 0;
              return (
                <React.Fragment key={step.key}>
                  {i > 0 && <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />}
                  <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: `${step.color}15`, borderColor: `${step.color}40`, borderWidth: '1px' }}>
                    <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: step.color }} />
                    <p className="text-xs font-medium text-slate-600">{step.label}</p>
                    <p className="text-xl font-bold" style={{ color: step.color }}>{count}</p>
                    <p className="text-[10px] text-slate-500">{formatAmount(amount)}</p>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Errors */}
            {(pipeline.counts.ERROR || 0) + (pipeline.counts.REJECTED || 0) > 0 && (
              <>
                <div className="w-px h-16 bg-slate-200" />
                <div className="flex-1 rounded-xl p-3 text-center bg-red-50 border border-red-200">
                  <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                  <p className="text-xs font-medium text-slate-600">Erreurs</p>
                  <p className="text-xl font-bold text-red-600">
                    {(pipeline.counts.ERROR || 0) + (pipeline.counts.REJECTED || 0)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatAmount((pipeline.amounts.ERROR || 0) + (pipeline.amounts.REJECTED || 0))}
                  </p>
                </div>
              </>
            )}
          </div>

          {avgProcessingDays !== null && (
            <p className="text-xs text-center text-slate-500 mt-2">
              Délai moyen de traitement: <strong>{avgProcessingDays} jours</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart by mutuelle */}
      {mutuelleChart.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Montants par mutuelle (€)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mutuelleChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `${v}€`} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip formatter={v => `${v.toFixed(2)} €`} />
                  <Bar dataKey="paid" stackId="a" fill="#059669" name="Payé" />
                  <Bar dataKey="accepted" stackId="a" fill="#10b981" name="Accepté" />
                  <Bar dataKey="sent" stackId="a" fill="#3b82f6" name="Envoyé" />
                  <Bar dataKey="error" stackId="a" fill="#ef4444" name="Erreur" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activité récente (30 jours)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucune activité récente</p>
          ) : (
            <div className="divide-y">
              {recentActivity.map(inv => {
                const statusColors = {
                  PENDING: 'bg-slate-100 text-slate-700',
                  SENT: 'bg-blue-100 text-blue-700',
                  ACCEPTED: 'bg-green-100 text-green-700',
                  PAID: 'bg-emerald-100 text-emerald-800',
                  ERROR: 'bg-red-100 text-red-700',
                  REJECTED: 'bg-red-100 text-red-700'
                };
                return (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{inv.patient_name || 'Patient'}</p>
                        <p className="text-xs text-slate-500">{inv.oa_name || inv.oa_code || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${statusColors[inv.status] || 'bg-slate-100 text-slate-700'}`}>
                        {inv.status}
                      </Badge>
                      <span className="font-semibold text-sm">{formatAmount(inv.total_amount || 0)}</span>
                      <span className="text-xs text-slate-500">
                        {inv.sent_at ? format(new Date(inv.sent_at), 'dd/MM', { locale: fr }) : '-'}
                      </span>
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