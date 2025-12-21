import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function BillingStatsWidget() {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['monthly-invoices', format(today, 'yyyy-MM')],
    queryFn: async () => {
      const all = await base44.entities.Invoice.list('-invoice_date', 500);
      return all.filter(inv => {
        const invoiceDate = new Date(inv.invoice_date);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalFacture = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
  const totalPaye = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
  const enAttente = invoices.filter(inv => 
    inv.status === 'SENT' || inv.status === 'ACCEPTED'
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-900">Total facturé</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {totalFacture.toFixed(2)}€
          </p>
          <p className="text-xs text-blue-700 mt-1">
            {invoices.length} facture(s)
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-900">Payé</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {totalPaye.toFixed(2)}€
          </p>
          <p className="text-xs text-green-700 mt-1">
            {((totalPaye / totalFacture) * 100 || 0).toFixed(0)}% encaissé
          </p>
        </div>
      </div>

      <div className="p-4 bg-orange-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-900">En attente</span>
          </div>
          <span className="text-2xl font-bold text-orange-600">{enAttente}</span>
        </div>
        <p className="text-xs text-orange-700 mt-2">
          {((totalFacture - totalPaye)).toFixed(2)}€ à encaisser
        </p>
      </div>

      <p className="text-xs text-center text-slate-500">
        {format(today, 'MMMM yyyy', { locale: fr })}
      </p>
    </div>
  );
}