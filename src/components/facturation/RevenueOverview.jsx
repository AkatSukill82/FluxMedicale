import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  PieChart,
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import { useI18n } from '../i18n/i18nContext';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function RevenueOverview() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
  const [period, setPeriod] = useState('6');

  const { data, isLoading } = useQuery({
    queryKey: ['revenueOverview', period],
    queryFn: async () => {
      const [invoices, payments] = await Promise.all([
        base44.entities.Invoice.list('-invoice_date', 1000),
        base44.entities.Payment.list('-payment_date', 500)
      ]);

      const now = new Date();
      const startDate = subMonths(now, parseInt(period));
      
      // Filtrer par période
      const periodInvoices = invoices.filter(inv => new Date(inv.invoice_date) >= startDate);
      const periodPayments = payments.filter(p => new Date(p.payment_date) >= startDate);

      // Calculs de base
      const totalBilled = periodInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = periodInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPartial = periodInvoices.filter(inv => inv.status === 'PARTIAL').reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
      const totalCollected = totalPaid + totalPartial;
      
      const totalPending = periodInvoices
        .filter(inv => !['PAID', 'DRAFT', 'CANCELLED'].includes(inv.status))
        .reduce((sum, inv) => sum + ((inv.amount_due || inv.total_amount) || 0), 0);
      
      const overdueInvoices = periodInvoices.filter(inv => {
        if (['PAID', 'DRAFT', 'CANCELLED'].includes(inv.status)) return false;
        const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
        dueDate.setDate(dueDate.getDate() + 30);
        return now > dueDate;
      });
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + ((inv.amount_due || inv.total_amount) || 0), 0);

      // Données mensuelles pour le graphique
      const months = eachMonthOfInterval({ start: startDate, end: now });
      const monthlyData = months.map(month => {
        const monthInvoices = periodInvoices.filter(inv => isSameMonth(new Date(inv.invoice_date), month));
        const monthPayments = periodPayments.filter(p => isSameMonth(new Date(p.payment_date), month));
        
        return {
          month: format(month, 'MMM yy', { locale: dateLocale }),
          fullMonth: format(month, 'MMMM yyyy', { locale: dateLocale }),
          billed: monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100,
          collected: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100,
          invoiceCount: monthInvoices.length
        };
      });

      // Répartition par statut
      const statusData = [
        { name: t('billing.paidLabel'), value: periodInvoices.filter(inv => inv.status === 'PAID').length, color: '#22c55e' },
        { name: t('billing.partialLabel'), value: periodInvoices.filter(inv => inv.status === 'PARTIAL').length, color: '#f59e0b' },
        { name: t('billing.pending'), value: periodInvoices.filter(inv => ['SENT', 'ACCEPTED'].includes(inv.status)).length, color: '#3b82f6' },
        { name: t('billing.overdueLabel'), value: overdueInvoices.length, color: '#ef4444' },
      ].filter(s => s.value > 0);

      // Répartition par type
      const typeData = [
        { name: 'eFact', value: periodInvoices.filter(inv => inv.type === 'EFACT').reduce((s, i) => s + (i.total_amount || 0), 0) / 100 },
        { name: 'eAttest', value: periodInvoices.filter(inv => inv.type === 'EATTEST').reduce((s, i) => s + (i.total_amount || 0), 0) / 100 },
        { name: 'Standard', value: periodInvoices.filter(inv => inv.type === 'STANDARD').reduce((s, i) => s + (i.total_amount || 0), 0) / 100 },
        { name: t('billing.paperType'), value: periodInvoices.filter(inv => inv.type === 'PAPER').reduce((s, i) => s + (i.total_amount || 0), 0) / 100 },
      ].filter(t => t.value > 0);

      // Comparaison avec période précédente
      const prevStartDate = subMonths(startDate, parseInt(period));
      const prevInvoices = invoices.filter(inv => {
        const date = new Date(inv.invoice_date);
        return date >= prevStartDate && date < startDate;
      });
      const prevTotal = prevInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const growth = prevTotal > 0 ? ((totalBilled - prevTotal) / prevTotal) * 100 : 0;

      return {
        totalBilled: totalBilled / 100,
        totalCollected: totalCollected / 100,
        totalPending: totalPending / 100,
        totalOverdue: totalOverdue / 100,
        overdueCount: overdueInvoices.length,
        invoiceCount: periodInvoices.length,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
        growth,
        monthlyData,
        statusData,
        typeData,
        avgInvoiceAmount: periodInvoices.length > 0 ? (totalBilled / 100) / periodInvoices.length : 0
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('billing.revenueOverview')}</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{t('billing.last3months')}</SelectItem>
            <SelectItem value="6">{t('billing.last6months')}</SelectItem>
            <SelectItem value="12">{t('billing.last12months')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.billed')}</p>
                <p className="text-3xl font-bold mt-1">{data.totalBilled.toFixed(2)}€</p>
                <div className="flex items-center gap-1 mt-2">
                  {data.growth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(data.growth).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">{t('billing.vsPrevPeriod')}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Euro className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.collected')}</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{data.totalCollected.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('billing.rate')}: <span className="font-semibold">{data.collectionRate.toFixed(1)}%</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.pending')}</p>
                <p className="text-3xl font-bold mt-1 text-amber-600">{data.totalPending.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {data.invoiceCount - data.overdueCount} {t('billing.invoicesWord')}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={data.overdueCount > 0 ? 'border-red-200' : ''}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.unpaidAmount')}</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{data.totalOverdue.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('billing.invoicesOverdue', { count: data.overdueCount })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution mensuelle */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('billing.monthlyEvolution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(2)} €`]}
                  labelFormatter={(label) => data.monthlyData.find(m => m.month === label)?.fullMonth}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="billed" 
                  name={t('billing.billed')}
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.2}
                />
                <Area 
                  type="monotone" 
                  dataKey="collected" 
                  name={t('billing.collected')}
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par statut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {t('billing.invoiceDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={data.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {data.statusData.map((item, i) => (
                <Badge 
                  key={i} 
                  variant="outline"
                  style={{ borderColor: item.color, color: item.color }}
                >
                  {item.name}: {item.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par type et stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.billingTypeDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip formatter={(value) => [`${value.toFixed(2)} €`]} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('billing.keyStats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-muted-foreground">{t('billing.invoiceCountLabel')}</span>
                <span className="font-bold text-lg">{data.invoiceCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-muted-foreground">{t('billing.avgAmount')}</span>
                <span className="font-bold text-lg">{data.avgInvoiceAmount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-muted-foreground">{t('billing.recoveryRate')}</span>
                <span className="font-bold text-lg text-green-600">{data.collectionRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-muted-foreground">{t('billing.totalReceivables')}</span>
                <span className="font-bold text-lg text-amber-600">{(data.totalPending + data.totalOverdue).toFixed(2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}