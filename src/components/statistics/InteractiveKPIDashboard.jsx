import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Euro,
  Calendar,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Maximize2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InteractiveKPIDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartType, setChartType] = useState('line');

  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['interactiveKPI', timeRange],
    queryFn: async () => {
      const [invoices, appointments, patients] = await Promise.all([
        base44.entities.Invoice.list('-invoice_date', 1000),
        base44.entities.RendezVous.list('-date', 500),
        base44.entities.Patient.list()
      ]);

      // Calculer la plage de dates
      const now = new Date();
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(now, daysBack);

      // Filtrer les données
      const recentInvoices = invoices.filter(inv => new Date(inv.invoice_date) >= startDate);
      const recentAppointments = appointments.filter(apt => new Date(apt.date) >= startDate);

      // KPIs principaux
      const totalRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const paidRevenue = recentInvoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const averageInvoice = recentInvoices.length > 0 ? totalRevenue / recentInvoices.length : 0;

      const completedAppointments = recentAppointments.filter(apt => apt.statut === 'Terminé').length;
      const cancelledAppointments = recentAppointments.filter(apt => apt.statut === 'Annulé').length;
      const attendanceRate = recentAppointments.length > 0
        ? ((completedAppointments / recentAppointments.length) * 100).toFixed(1)
        : 0;

      // Données journalières
      const dailyData = [];
      const dateRange = eachDayOfInterval({ start: startDate, end: now });
      
      dateRange.forEach(date => {
        const dayStr = format(date, 'yyyy-MM-dd');
        const dayInvoices = recentInvoices.filter(inv => inv.invoice_date === dayStr);
        const dayAppointments = recentAppointments.filter(apt => apt.date === dayStr);
        
        dailyData.push({
          date: format(date, 'dd MMM', { locale: fr }),
          revenue: dayInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100,
          appointments: dayAppointments.length,
          completed: dayAppointments.filter(apt => apt.statut === 'Terminé').length
        });
      });

      // Distribution des statuts de rendez-vous
      const appointmentStatusData = [
        { name: 'Terminés', value: completedAppointments, color: '#10b981' },
        { name: 'Planifiés', value: recentAppointments.filter(apt => apt.statut === 'Planifié').length, color: '#3b82f6' },
        { name: 'Annulés', value: cancelledAppointments, color: '#ef4444' },
        { name: 'Confirmés', value: recentAppointments.filter(apt => apt.statut === 'Confirmé').length, color: '#8b5cf6' }
      ];

      // Performance par type de consultation
      const consultationTypes = {};
      recentAppointments.forEach(apt => {
        const type = apt.type_consultation || 'Autre';
        if (!consultationTypes[type]) {
          consultationTypes[type] = 0;
        }
        consultationTypes[type]++;
      });

      const performanceData = Object.entries(consultationTypes).map(([type, count]) => ({
        type,
        count,
        fullMark: Math.max(...Object.values(consultationTypes))
      }));

      // Calcul des variations
      const previousPeriodInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        const previousStart = subDays(startDate, daysBack);
        return invDate >= previousStart && invDate < startDate;
      });
      const previousRevenue = previousPeriodInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const revenueChange = previousRevenue > 0
        ? (((totalRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
        : 0;

      return {
        totalRevenue,
        paidRevenue,
        averageInvoice,
        invoiceCount: recentInvoices.length,
        appointmentCount: recentAppointments.length,
        completedAppointments,
        cancelledAppointments,
        attendanceRate,
        patientCount: patients.length,
        dailyData,
        appointmentStatusData,
        performanceData,
        revenueChange
      };
    }
  });

  if (isLoading || !kpiData) {
    return <div className="text-center py-12">Chargement des KPI...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeRange === '7d' ? 'default' : 'outline'}
                onClick={() => setTimeRange('7d')}
              >
                7 jours
              </Button>
              <Button
                size="sm"
                variant={timeRange === '30d' ? 'default' : 'outline'}
                onClick={() => setTimeRange('30d')}
              >
                30 jours
              </Button>
              <Button
                size="sm"
                variant={timeRange === '90d' ? 'default' : 'outline'}
                onClick={() => setTimeRange('90d')}
              >
                90 jours
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'outline'}
                onClick={() => setChartType('line')}
              >
                <LineChartIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'outline'}
                onClick={() => setChartType('area')}
              >
                <Activity className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'bar' ? 'default' : 'outline'}
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards avec animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Euro className="w-8 h-8 text-blue-600" />
              <div className="flex items-center gap-1">
                {parseFloat(kpiData.revenueChange) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${parseFloat(kpiData.revenueChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpiData.revenueChange}%
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">Revenus</p>
            <p className="text-3xl font-bold text-blue-600">
              {kpiData.totalRevenue.toFixed(0)}€
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {kpiData.invoiceCount} factures • Moy: {kpiData.averageInvoice.toFixed(2)}€
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Rendez-vous</p>
            <p className="text-3xl font-bold text-purple-600">
              {kpiData.appointmentCount}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {kpiData.completedAppointments} terminés • {kpiData.attendanceRate}% présence
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Patients</p>
            <p className="text-3xl font-bold text-green-600">
              {kpiData.patientCount}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Total dans la base
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Taux d'encaissement</p>
            <p className="text-3xl font-bold text-orange-600">
              {kpiData.totalRevenue > 0 ? ((kpiData.paidRevenue / kpiData.totalRevenue) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {kpiData.paidRevenue.toFixed(0)}€ encaissés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution quotidienne */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution quotidienne</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={kpiData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenus (€)" />
                  <Line yAxisId="right" type="monotone" dataKey="appointments" stroke="#8b5cf6" strokeWidth={2} name="RDV" />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={kpiData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Revenus (€)" />
                  <Area type="monotone" dataKey="appointments" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="RDV" />
                </AreaChart>
              ) : (
                <BarChart data={kpiData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenus (€)" />
                  <Bar dataKey="appointments" fill="#8b5cf6" name="RDV" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution des statuts */}
        <Card>
          <CardHeader>
            <CardTitle>Statuts des rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kpiData.appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {kpiData.appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance par type */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par type de consultation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={kpiData.performanceData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="type" />
              <PolarRadiusAxis />
              <Radar name="Nombre" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}