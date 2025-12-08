import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  Euro,
  Activity,
  Clock,
  Stethoscope
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardAnalytics({ patients, appointments, invoices, consultations, isLoading }) {
  const analytics = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    // Patients statistics
    const totalPatients = patients.length;
    const newPatientsThisMonth = patients.filter(p => 
      new Date(p.created_date) >= monthStart
    ).length;

    // Appointments statistics
    const todayAppointments = appointments.filter(apt => {
      if (!apt.date) return false;
      const aptDate = new Date(apt.date);
      return !isNaN(aptDate.getTime()) && aptDate >= todayStart && aptDate < new Date(todayStart.getTime() + 86400000);
    });
    const thisWeekAppointments = appointments.filter(apt => {
      if (!apt.date) return false;
      const aptDate = new Date(apt.date);
      return !isNaN(aptDate.getTime()) && aptDate >= weekStart;
    });
    const completedToday = todayAppointments.filter(apt => apt.statut === 'Terminé').length;
    const pendingToday = todayAppointments.filter(apt => apt.statut === 'Planifié' || apt.statut === 'Confirmé').length;

    // Revenue statistics
    const thisMonthInvoices = invoices.filter(inv => {
      if (!inv.invoice_date) return false;
      const invDate = new Date(inv.invoice_date);
      return !isNaN(invDate.getTime()) && invDate >= monthStart;
    });
    const totalRevenue = thisMonthInvoices.reduce((sum, inv) => sum + (inv.total_amount / 100), 0);
    const paidRevenue = thisMonthInvoices
      .filter(inv => inv.status === 'SENT')
      .reduce((sum, inv) => sum + (inv.patient_contribution / 100), 0);

    // Consultations statistics
    const todayConsultations = consultations.filter(cons => {
      if (!cons.date_consultation) return false;
      const consDate = new Date(cons.date_consultation);
      return !isNaN(consDate.getTime()) && consDate >= todayStart;
    }).length;
    const avgConsultationsPerDay = consultations.length > 0 
      ? (consultations.length / 30).toFixed(1) 
      : 0;

    // Week chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayAppointments = appointments.filter(apt => {
        if (!apt.date) return false;
        const aptDate = new Date(apt.date);
        return !isNaN(aptDate.getTime()) && format(aptDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });
      return {
        name: format(date, 'EEE'),
        consultations: dayAppointments.length,
        completed: dayAppointments.filter(apt => apt.statut === 'Terminé').length
      };
    });

    // Status distribution
    const statusData = [
      { name: 'Terminé', value: appointments.filter(a => a.statut === 'Terminé').length, color: '#22c55e' },
      { name: 'Confirmé', value: appointments.filter(a => a.statut === 'Confirmé').length, color: '#3b82f6' },
      { name: 'Planifié', value: appointments.filter(a => a.statut === 'Planifié').length, color: '#f59e0b' },
      { name: 'Annulé', value: appointments.filter(a => a.statut === 'Annulé').length, color: '#ef4444' }
    ].filter(item => item.value > 0);

    return {
      totalPatients,
      newPatientsThisMonth,
      todayAppointments: todayAppointments.length,
      completedToday,
      pendingToday,
      thisWeekAppointments: thisWeekAppointments.length,
      totalRevenue,
      paidRevenue,
      todayConsultations,
      avgConsultationsPerDay,
      last7Days,
      statusData
    };
  }, [patients, appointments, invoices, consultations]);

  const kpis = [
    {
      title: 'Patients Total',
      value: analytics.totalPatients,
      change: `+${analytics.newPatientsThisMonth} ce mois`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: "Aujourd'hui",
      value: analytics.todayAppointments,
      change: `${analytics.completedToday} terminés`,
      icon: Calendar,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Revenus du mois',
      value: `${analytics.totalRevenue.toFixed(0)}€`,
      change: `${analytics.paidRevenue.toFixed(0)}€ encaissés`,
      icon: Euro,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Consultations/jour',
      value: analytics.avgConsultationsPerDay,
      change: `${analytics.todayConsultations} aujourd'hui`,
      icon: Stethoscope,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${kpi.color} opacity-5 translate-x-10 -translate-y-10`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-2">
                      {kpi.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mb-1">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-slate-500">
                      {kpi.change}
                    </p>
                  </div>
                  <div className={`${kpi.bgColor} p-3 rounded-xl`}>
                    <Icon className={`w-6 h-6 ${kpi.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Activité des 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="consultations" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-slate-600">Consultations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-slate-600">Terminées</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Statut RDV
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {analytics.statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}