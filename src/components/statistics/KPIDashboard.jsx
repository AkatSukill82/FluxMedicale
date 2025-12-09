import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, Euro, Calendar, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function KPIDashboard({ analytics, isLoading }) {
  if (isLoading || !analytics) {
    return <div className="text-center py-12">Chargement des données...</div>;
  }

  const kpiCards = [
    {
      title: 'Chiffre d\'affaires',
      value: `${analytics.totalRevenue.toFixed(2)}€`,
      subtitle: `Payé: ${analytics.paidRevenue.toFixed(2)}€`,
      icon: Euro,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Patients',
      value: analytics.totalPatients,
      subtitle: `+${analytics.newPatients} nouveaux`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Rendez-vous',
      value: analytics.totalAppointments,
      subtitle: `${analytics.completedAppointments} complétés`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Taux d\'occupation',
      value: `${analytics.occupationRate}%`,
      subtitle: 'Rendez-vous honorés',
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Impayés',
      value: `${analytics.unpaidAmount.toFixed(2)}€`,
      subtitle: `${analytics.unpaidInvoices.length} factures`,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Revenu moyen/jour',
      value: `${analytics.averageRevenuePerDay.toFixed(2)}€`,
      subtitle: 'Moyenne quotidienne',
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    }
  ];

  // Chart data
  const revenueData = analytics.invoices
    .reduce((acc, inv) => {
      const date = new Date(inv.invoice_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.montant += (inv.total_amount || 0) / 100;
      } else {
        acc.push({ date, montant: (inv.total_amount || 0) / 100 });
      }
      return acc;
    }, [])
    .slice(-14);

  const appointmentStatusData = [
    { name: 'Complétés', value: analytics.completedAppointments, color: '#10b981' },
    { name: 'Annulés', value: analytics.cancelledAppointments, color: '#ef4444' },
    { name: 'En attente', value: analytics.totalAppointments - analytics.completedAppointments - analytics.cancelledAppointments, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold mb-1">{kpi.value}</p>
                    <p className="text-xs text-slate-500">{kpi.subtitle}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-full ${kpi.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Évolution du chiffre d'affaires</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Legend />
                <Line type="monotone" dataKey="montant" stroke="#3b82f6" strokeWidth={2} name="Montant" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Statut des rendez-vous</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}