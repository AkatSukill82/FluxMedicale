import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PaymentTracker() {
  const { data: paymentData, isLoading } = useQuery({
    queryKey: ['paymentTracking'],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.list('-invoice_date', 500);
      
      const now = new Date();
      const thisMonth = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      });

      const paid = invoices.filter(inv => inv.status === 'PAID');
      const pending = invoices.filter(inv => inv.status === 'SENT' || inv.status === 'PENDING');
      const overdue = invoices.filter(inv => {
        if (inv.status === 'PAID') return false;
        const dueDate = addDays(new Date(inv.invoice_date), 30);
        return now > dueDate;
      });

      const totalPaid = paid.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const totalPending = pending.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const totalOverdue = overdue.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;

      const paymentRate = totalRevenue > 0 ? (totalPaid / totalRevenue * 100).toFixed(1) : 0;
      const averagePaymentDelay = paid.length > 0 
        ? paid.reduce((sum, inv) => {
            const invoiceDate = new Date(inv.invoice_date);
            const paidDate = inv.paid_at ? new Date(inv.paid_at) : new Date();
            return sum + differenceInDays(paidDate, invoiceDate);
          }, 0) / paid.length
        : 0;

      return {
        totalPaid,
        totalPending,
        totalOverdue,
        totalRevenue,
        paymentRate,
        averagePaymentDelay: Math.round(averagePaymentDelay),
        paidCount: paid.length,
        pendingCount: pending.length,
        overdueCount: overdue.length,
        thisMonthTotal: thisMonth.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100,
        recentPayments: paid.slice(0, 5),
        urgentOverdue: overdue.filter(inv => 
          differenceInDays(now, addDays(new Date(inv.invoice_date), 30)) > 60
        )
      };
    }
  });

  if (isLoading || !paymentData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des données de paiement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Payé</p>
                <p className="text-2xl font-bold text-green-600">
                  {paymentData.totalPaid.toFixed(2)}€
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {paymentData.paidCount} factures
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">En attente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {paymentData.totalPending.toFixed(2)}€
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {paymentData.pendingCount} factures
                </p>
              </div>
              <Clock className="w-10 h-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">En retard</p>
                <p className="text-2xl font-bold text-red-600">
                  {paymentData.totalOverdue.toFixed(2)}€
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {paymentData.overdueCount} factures
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Taux de paiement</p>
                <p className="text-2xl font-bold text-blue-600">
                  {paymentData.paymentRate}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Délai moy: {paymentData.averagePaymentDelay}j
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Progression des paiements</span>
              <span className="font-semibold">{paymentData.paymentRate}%</span>
            </div>
            <Progress value={parseFloat(paymentData.paymentRate)} className="h-3" />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{paymentData.totalPaid.toFixed(2)}€ collectés</span>
              <span>{paymentData.totalRevenue.toFixed(2)}€ total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Overdue */}
      {paymentData.urgentOverdue.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Factures urgentes en retard ({paymentData.urgentOverdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentData.urgentOverdue.map(inv => {
                const daysOverdue = differenceInDays(new Date(), addDays(new Date(inv.invoice_date), 30));
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-semibold">Facture {inv.id}</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(inv.invoice_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">{daysOverdue} jours</Badge>
                      <p className="text-sm font-semibold mt-1">
                        {((inv.total_amount || 0) / 100).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Paiements récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paymentData.recentPayments.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Facture {inv.id}</p>
                    <p className="text-sm text-slate-600">
                      {inv.paid_at && format(new Date(inv.paid_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-green-600">
                  {((inv.total_amount || 0) / 100).toFixed(2)}€
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}