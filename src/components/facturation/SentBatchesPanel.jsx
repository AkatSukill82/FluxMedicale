import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, XCircle, Clock, Package, Loader2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

const BATCH_STATUS = {
  PENDING: { icon: Clock, label: 'En attente', color: 'bg-slate-100 text-slate-700' },
  SENDING: { icon: Loader2, label: 'Envoi...', color: 'bg-blue-100 text-blue-700' },
  SENT: { icon: Send, label: 'Envoyé', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { icon: CheckCircle, label: 'Accepté', color: 'bg-green-100 text-green-700' },
  PARTIAL: { icon: AlertTriangle, label: 'Partiel', color: 'bg-orange-100 text-orange-700' },
  REJECTED: { icon: XCircle, label: 'Refusé', color: 'bg-red-100 text-red-700' },
  ERROR: { icon: XCircle, label: 'Erreur', color: 'bg-red-100 text-red-700' },
};

const TRIGGER_LABELS = {
  manual: 'Manuel',
  auto_logout: 'Auto (déconnexion)',
  scheduled: 'Planifié',
};

export default function SentBatchesPanel() {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['invoice_batches'],
    queryFn: () => base44.entities.InvoiceBatch.list('-created_date', 100),
  });

  if (isLoading) {
    return <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></CardContent></Card>;
  }

  if (batches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Aucun lot envoyé</h3>
          <p className="text-sm text-slate-500 mt-1">Les lots envoyés aux mutuelles apparaîtront ici.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map(batch => {
        const status = BATCH_STATUS[batch.status] || BATCH_STATUS.PENDING;
        const StatusIcon = status.icon;

        return (
          <Card key={batch.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mt-0.5">
                    <Package className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sm">{batch.batch_number}</span>
                      <Badge className={`${status.color} text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{batch.oa_name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span>{batch.invoice_count} facture(s)</span>
                      <span>•</span>
                      <span>Total: <strong>{formatAmount(batch.total_amount)}</strong></span>
                      <span>•</span>
                      <span>Mutuelle: <strong className="text-green-700">{formatAmount(batch.insurance_total)}</strong></span>
                      {batch.trigger && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px]">{TRIGGER_LABELS[batch.trigger] || batch.trigger}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {batch.sent_at && (
                    <p>{format(new Date(batch.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                  )}
                  {batch.oa_code && (
                    <p className="font-mono mt-1">OA: {batch.oa_code}</p>
                  )}
                </div>
              </div>
              {batch.error_message && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                  {batch.error_message}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}