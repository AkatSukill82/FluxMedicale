import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Download, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function FinancialReports() {
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financialReports', period, selectedMonth, selectedYear],
    queryFn: async () => {
      const [invoices, invoiceLines, users] = await Promise.all([
        base44.entities.Invoice.list('-invoice_date', 2000),
        base44.entities.InvoiceLine.list(),
        base44.entities.User.list()
      ]);

      // Déterminer la période
      let startDate, endDate;
      if (period === 'month') {
        startDate = startOfMonth(new Date(selectedYear, selectedMonth, 1));
        endDate = endOfMonth(new Date(selectedYear, selectedMonth, 1));
      } else {
        startDate = startOfYear(new Date(selectedYear, 0, 1));
        endDate = endOfYear(new Date(selectedYear, 0, 1));
      }

      const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= startDate && invDate <= endDate;
      });

      // Revenus totaux
      const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const paidRevenue = filteredInvoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      const pendingRevenue = totalRevenue - paidRevenue;

      // Revenus par praticien
      const revenueByPractitioner = {};
      filteredInvoices.forEach(inv => {
        const practitioner = inv.created_by || 'Non assigné';
        if (!revenueByPractitioner[practitioner]) {
          revenueByPractitioner[practitioner] = { total: 0, paid: 0, pending: 0, count: 0 };
        }
        const amount = (inv.total_amount || 0) / 100;
        revenueByPractitioner[practitioner].total += amount;
        revenueByPractitioner[practitioner].count += 1;
        if (inv.status === 'PAID') {
          revenueByPractitioner[practitioner].paid += amount;
        } else {
          revenueByPractitioner[practitioner].pending += amount;
        }
      });

      // Revenus par service (basé sur les codes nomenclature)
      const revenueByService = {};
      filteredInvoices.forEach(inv => {
        const lines = invoiceLines.filter(line => line.invoice_id === inv.id);
        lines.forEach(line => {
          const serviceCode = line.nomenclature_code?.substring(0, 3) || 'Autre';
          const serviceMap = {
            '101': 'Consultations',
            '102': 'Visites',
            '103': 'Actes techniques',
            '104': 'Imagerie',
            '105': 'Laboratoire'
          };
          const serviceName = serviceMap[serviceCode] || 'Autres services';
          
          if (!revenueByService[serviceName]) {
            revenueByService[serviceName] = 0;
          }
          revenueByService[serviceName] += line.amount || 0;
        });
      });

      // Évolution mensuelle (pour l'année)
      const monthlyEvolution = [];
      if (period === 'year') {
        for (let m = 0; m < 12; m++) {
          const monthStart = new Date(selectedYear, m, 1);
          const monthEnd = endOfMonth(monthStart);
          const monthInvoices = invoices.filter(inv => {
            const invDate = new Date(inv.invoice_date);
            return invDate >= monthStart && invDate <= monthEnd;
          });
          const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
          const monthPaid = monthInvoices
            .filter(inv => inv.status === 'PAID')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
          
          monthlyEvolution.push({
            month: format(monthStart, 'MMM', { locale: fr }),
            total: monthRevenue,
            paid: monthPaid,
            pending: monthRevenue - monthPaid
          });
        }
      }

      // Comparaison avec période précédente
      let previousPeriodRevenue = 0;
      if (period === 'month') {
        const prevStart = startOfMonth(subMonths(startDate, 1));
        const prevEnd = endOfMonth(subMonths(startDate, 1));
        const prevInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate >= prevStart && invDate <= prevEnd;
        });
        previousPeriodRevenue = prevInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      } else {
        const prevStart = startOfYear(subYears(startDate, 1));
        const prevEnd = endOfYear(subYears(startDate, 1));
        const prevInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate >= prevStart && invDate <= prevEnd;
        });
        previousPeriodRevenue = prevInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
      }

      const growthRate = previousPeriodRevenue > 0 
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100).toFixed(1)
        : 0;

      return {
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        invoiceCount: filteredInvoices.length,
        revenueByPractitioner: Object.entries(revenueByPractitioner).map(([name, data]) => ({
          name: name.split('@')[0],
          ...data
        })),
        revenueByService: Object.entries(revenueByService).map(([name, value]) => ({
          name,
          value: value
        })),
        monthlyEvolution,
        previousPeriodRevenue,
        growthRate,
        period: period === 'month' 
          ? format(startDate, 'MMMM yyyy', { locale: fr })
          : `Année ${selectedYear}`
      };
    }
  });

  const exportToPDF = () => {
    if (!financialData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Titre
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RAPPORT FINANCIER', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(financialData.period, pageWidth / 2, 28, { align: 'center' });

    // KPIs principaux
    doc.setFontSize(10);
    let yPos = 45;
    
    const kpiData = [
      ['Revenus totaux', `${financialData.totalRevenue.toFixed(2)}€`],
      ['Revenus encaissés', `${financialData.paidRevenue.toFixed(2)}€`],
      ['En attente', `${financialData.pendingRevenue.toFixed(2)}€`],
      ['Nombre de factures', `${financialData.invoiceCount}`],
      ['Croissance', `${financialData.growthRate}%`]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['Indicateur', 'Valeur']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Revenus par praticien
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFont(undefined, 'bold');
    doc.text('Revenus par praticien', 20, yPos);
    
    const practitionerData = financialData.revenueByPractitioner.map(p => [
      p.name,
      `${p.total.toFixed(2)}€`,
      `${p.paid.toFixed(2)}€`,
      `${p.pending.toFixed(2)}€`,
      p.count
    ]);

    doc.autoTable({
      startY: yPos + 5,
      head: [['Praticien', 'Total', 'Encaissé', 'En attente', 'Factures']],
      body: practitionerData,
      theme: 'striped'
    });

    // Revenus par service
    if (financialData.revenueByService.length > 0) {
      yPos = doc.lastAutoTable.finalY + 15;
      doc.setFont(undefined, 'bold');
      doc.text('Revenus par service', 20, yPos);
      
      const serviceData = financialData.revenueByService.map(s => [
        s.name,
        `${s.value.toFixed(2)}€`
      ]);

      doc.autoTable({
        startY: yPos + 5,
        head: [['Service', 'Montant']],
        body: serviceData,
        theme: 'striped'
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 285, { align: 'center' });

    doc.save(`rapport_financier_${financialData.period.replace(/ /g, '_')}.pdf`);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading || !financialData) {
    return <div className="text-center py-12">Chargement des données...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensuel</SelectItem>
                  <SelectItem value="year">Annuel</SelectItem>
                </SelectContent>
              </Select>

              {period === 'month' && (
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {format(new Date(2024, i, 1), 'MMMM', { locale: fr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Revenus totaux</p>
            <p className="text-3xl font-bold text-blue-600">
              {financialData.totalRevenue.toFixed(2)}€
            </p>
            <div className="flex items-center gap-1 mt-2">
              {parseFloat(financialData.growthRate) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${parseFloat(financialData.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {financialData.growthRate}%
              </span>
              <span className="text-xs text-slate-500 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Encaissé</p>
            <p className="text-3xl font-bold text-green-600">
              {financialData.paidRevenue.toFixed(2)}€
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {((financialData.paidRevenue / financialData.totalRevenue) * 100).toFixed(1)}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">En attente</p>
            <p className="text-3xl font-bold text-orange-600">
              {financialData.pendingRevenue.toFixed(2)}€
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {((financialData.pendingRevenue / financialData.totalRevenue) * 100).toFixed(1)}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Factures</p>
            <p className="text-3xl font-bold text-slate-900">
              {financialData.invoiceCount}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Ticket moyen: {(financialData.totalRevenue / financialData.invoiceCount).toFixed(2)}€
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenus par praticien */}
        <Card>
          <CardHeader>
            <CardTitle>Revenus par praticien</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financialData.revenueByPractitioner}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Legend />
                <Bar dataKey="paid" fill="#10b981" name="Encaissé" />
                <Bar dataKey="pending" fill="#f59e0b" name="En attente" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenus par service */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par service</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={financialData.revenueByService}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}€`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {financialData.revenueByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Évolution mensuelle (pour période annuelle) */}
      {period === 'year' && financialData.monthlyEvolution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={financialData.monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" stroke="#10b981" name="Encaissé" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="En attente" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}