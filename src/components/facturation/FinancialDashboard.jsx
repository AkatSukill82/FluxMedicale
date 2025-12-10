import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Wallet,
  Calendar
} from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function FinancialDashboard({ invoices = [] }) {
  // Calculs financiers
  const today = new Date();
  
  const totalPaid = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const totalUnpaid = invoices
    .filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === 'PAID' || inv.status === 'DRAFT') return false;
    const dueDate = addDays(new Date(inv.invoice_date), 30);
    return today > dueDate;
  });
  
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const pendingInvoices = invoices.filter(inv => 
    inv.status === 'SENT' || inv.status === 'ACCEPTED'
  );
  
  const rejectedInvoices = invoices.filter(inv => inv.status === 'REJECTED');
  
  // Prévisions (factures en attente + moyenne des 3 derniers mois)
  const last3MonthsPaid = invoices
    .filter(inv => {
      const date = new Date(inv.invoice_date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return date >= threeMonthsAgo && inv.status === 'PAID';
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  
  const monthlyAverage = last3MonthsPaid / 3;
  const forecastNextMonth = totalUnpaid + monthlyAverage;
  
  // Taux de recouvrement
  const totalBilled = invoices
    .filter(inv => inv.status !== 'DRAFT')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  const stats = [
    {
      title: 'Encaissé ce mois',
      value: (totalPaid / 100).toFixed(2),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'En attente',
      value: (totalUnpaid / 100).toFixed(2),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      count: pendingInvoices.length,
      subtitle: `${pendingInvoices.length} facture(s)`
    },
    {
      title: 'Impayés',
      value: (overdueAmount / 100).toFixed(2),
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      count: overdueInvoices.length,
      subtitle: `${overdueInvoices.length} en retard`,
      urgent: overdueInvoices.length > 0
    },
    {
      title: 'Prévisions',
      value: (forecastNextMonth / 100).toFixed(2),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'Mois prochain'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className={stat.urgent ? 'border-orange-300 shadow-sm' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900">
                      {stat.value}€
                    </h3>
                    {stat.trend && (
                      <Badge variant="outline" className={stat.trendUp ? 'text-green-600' : 'text-red-600'}>
                        {stat.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {stat.trend}
                      </Badge>
                    )}
                  </div>
                  {stat.subtitle && (
                    <p className="text-xs text-slate-500 mt-2">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertes financières */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Factures urgentes */}
        {overdueInvoices.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-900 mb-2">
                    ⚠️ {overdueInvoices.length} facture(s) en retard
                  </h4>
                  <p className="text-sm text-orange-700 mb-3">
                    Total: <strong>{(overdueAmount / 100).toFixed(2)}€</strong> à recouvrer
                  </p>
                  <div className="space-y-2">
                    {overdueInvoices.slice(0, 3).map(inv => {
                      const daysOverdue = differenceInDays(today, addDays(new Date(inv.invoice_date), 30));
                      return (
                        <div key={inv.id} className="text-xs bg-white rounded p-2 flex justify-between items-center">
                          <span className="font-mono">{inv.id.substring(0, 8)}...</span>
                          <Badge variant="destructive" className="text-xs">
                            {daysOverdue}j de retard
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {overdueInvoices.length > 3 && (
                    <p className="text-xs text-orange-600 mt-2">
                      +{overdueInvoices.length - 3} autre(s) facture(s)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Factures rejetées */}
        {rejectedInvoices.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">
                    ❌ {rejectedInvoices.length} facture(s) refusée(s)
                  </h4>
                  <p className="text-sm text-red-700 mb-3">
                    Action requise: vérifier et renvoyer
                  </p>
                  <div className="space-y-2">
                    {rejectedInvoices.map(inv => (
                      <div key={inv.id} className="text-xs bg-white rounded p-2 flex justify-between items-center">
                        <span className="font-mono">{inv.id.substring(0, 8)}...</span>
                        <span className="text-red-600">
                          {((inv.total_amount || 0) / 100).toFixed(2)}€
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Taux de recouvrement */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Taux de recouvrement
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600">
                    {collectionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-3 bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {(totalPaid / 100).toFixed(2)}€ sur {(totalBilled / 100).toFixed(2)}€ facturés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prochaines échéances */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Prochaines échéances
                </h4>
                <div className="space-y-2">
                  {pendingInvoices.slice(0, 3).map(inv => {
                    const dueDate = addDays(new Date(inv.invoice_date), 30);
                    const daysUntilDue = differenceInDays(dueDate, today);
                    return (
                      <div key={inv.id} className="flex justify-between items-center text-sm">
                        <span className="font-mono text-xs">{inv.id.substring(0, 8)}...</span>
                        <div className="text-right">
                          <p className="font-semibold">{((inv.total_amount || 0) / 100).toFixed(2)}€</p>
                          <p className="text-xs text-slate-500">
                            {daysUntilDue > 0 ? `dans ${daysUntilDue}j` : 'Échu'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}