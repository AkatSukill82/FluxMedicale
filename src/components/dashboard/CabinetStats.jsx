import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, Euro, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';

export default function CabinetStats() {
  const { data: consultations = [], isLoading: loadingConsults } = useQuery({
    queryKey: ['all-consultations'],
    queryFn: () => base44.entities.Consultation.list('-date_consultation', 500)
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.RendezVous.list('-date', 200)
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['all-invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date', 200)
  });

  if (loadingConsults || loadingPatients || loadingAppts || loadingInvoices) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate stats
  const thisMonth = new Date();
  const lastMonth = subMonths(thisMonth, 1);
  
  const thisMonthConsults = consultations.filter(c => {
    const date = new Date(c.date_consultation);
    return date >= startOfMonth(thisMonth) && date <= endOfMonth(thisMonth);
  });

  const lastMonthConsults = consultations.filter(c => {
    const date = new Date(c.date_consultation);
    return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
  });

  const thisMonthRevenue = invoices
    .filter(i => new Date(i.invoice_date) >= startOfMonth(thisMonth))
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const consultGrowth = lastMonthConsults.length > 0 
    ? ((thisMonthConsults.length - lastMonthConsults.length) / lastMonthConsults.length * 100).toFixed(1)
    : 0;

  // Daily consultations this month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(thisMonth),
    end: endOfMonth(thisMonth)
  });

  const dailyData = daysInMonth.map(day => ({
    date: format(day, 'dd/MM'),
    consultations: consultations.filter(c => 
      format(new Date(c.date_consultation), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    ).length
  }));

  // Appointment status distribution
  const appointmentStats = [
    { name: 'Planifié', value: appointments.filter(a => a.statut === 'Planifié').length, color: '#3b82f6' },
    { name: 'Confirmé', value: appointments.filter(a => a.statut === 'Confirmé').length, color: '#10b981' },
    { name: 'Terminé', value: appointments.filter(a => a.statut === 'Terminé').length, color: '#6366f1' },
    { name: 'Annulé', value: appointments.filter(a => a.statut === 'Annulé').length, color: '#ef4444' }
  ];

  const avgConsultsPerDay = (thisMonthConsults.length / new Date().getDate()).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Patients actifs</p>
                <p className="text-3xl font-bold">{patients.length}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consultations (mois)</p>
                <p className="text-3xl font-bold">{thisMonthConsults.length}</p>
                <p className={`text-xs flex items-center gap-1 ${parseFloat(consultGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {consultGrowth > 0 ? '+' : ''}{consultGrowth}% vs mois dernier
                </p>
              </div>
              <Calendar className="w-10 h-10 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CA du mois</p>
                <p className="text-3xl font-bold">{(thisMonthRevenue / 100).toFixed(0)}€</p>
              </div>
              <Euro className="w-10 h-10 text-purple-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Moy. consultations/jour</p>
                <p className="text-3xl font-bold">{avgConsultsPerDay}</p>
              </div>
              <Activity className="w-10 h-10 text-orange-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consultations quotidiennes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="consultations" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut des rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={appointmentStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentStats.map((entry, index) => (
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