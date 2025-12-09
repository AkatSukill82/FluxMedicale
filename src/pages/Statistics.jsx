import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Download, TrendingUp, Users, Euro, Calendar, FileText, Activity } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import KPIDashboard from '../components/statistics/KPIDashboard';
import RevenueByPractitioner from '../components/statistics/RevenueByPractitioner';
import FrequentActsReport from '../components/statistics/FrequentActsReport';
import UnpaidInvoicesReport from '../components/statistics/UnpaidInvoicesReport';
import { exportToPDF, exportToCSV } from '../components/statistics/ExportUtils';

export default function StatisticsPage() {
  const [period, setPeriod] = useState('month');
  const [selectedTab, setSelectedTab] = useState('kpi');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const [invoices, patients, appointments, users] = await Promise.all([
        base44.entities.Invoice.list('-invoice_date', 1000),
        base44.entities.Patient.list(),
        base44.entities.RendezVous.list('-date', 1000),
        base44.auth.me().then(() => base44.entities.User?.list?.() || []).catch(() => [])
      ]);

      const now = new Date();
      let startDate, endDate;

      switch (period) {
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'lastMonth':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= startDate && invDate <= endDate;
      });

      const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate <= endDate;
      });

      const revenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const paidRevenue = filteredInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const unpaidInvoices = filteredInvoices.filter(inv => inv.status !== 'PAID');

      return {
        totalRevenue: revenue,
        paidRevenue,
        unpaidAmount: revenue - paidRevenue,
        totalPatients: patients.length,
        newPatients: patients.filter(p => new Date(p.created_date) >= startDate).length,
        totalAppointments: filteredAppointments.length,
        completedAppointments: filteredAppointments.filter(a => a.statut === 'Terminé').length,
        cancelledAppointments: filteredAppointments.filter(a => a.statut === 'Annulé').length,
        occupationRate: filteredAppointments.length > 0 ? (filteredAppointments.filter(a => a.statut === 'Terminé').length / filteredAppointments.length * 100).toFixed(1) : 0,
        averageRevenuePerDay: revenue / Math.max(differenceInDays(endDate, startDate), 1),
        invoices: filteredInvoices,
        appointments: filteredAppointments,
        unpaidInvoices,
        patients,
        practitioners: users.filter(u => u.role === 'admin')
      };
    }
  });

  const handleExport = (format) => {
    if (!analytics) return;

    const data = {
      period: period === 'month' ? 'Mois en cours' : period === 'lastMonth' ? 'Mois dernier' : 'Année en cours',
      kpi: {
        revenue: analytics.totalRevenue,
        paidRevenue: analytics.paidRevenue,
        unpaidAmount: analytics.unpaidAmount,
        patients: analytics.totalPatients,
        newPatients: analytics.newPatients,
        appointments: analytics.totalAppointments,
        occupationRate: analytics.occupationRate
      }
    };

    if (format === 'pdf') {
      exportToPDF(data, selectedTab);
    } else {
      exportToCSV(data, selectedTab);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Statistiques & Analyses</h1>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mois en cours</SelectItem>
              <SelectItem value="lastMonth">Mois dernier</SelectItem>
              <SelectItem value="year">Année en cours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="kpi">Tableau de bord</TabsTrigger>
          <TabsTrigger value="revenue">Revenus par praticien</TabsTrigger>
          <TabsTrigger value="acts">Actes fréquents</TabsTrigger>
          <TabsTrigger value="unpaid">Factures impayées</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi">
          <KPIDashboard analytics={analytics} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueByPractitioner analytics={analytics} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="acts">
          <FrequentActsReport analytics={analytics} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="unpaid">
          <UnpaidInvoicesReport analytics={analytics} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}