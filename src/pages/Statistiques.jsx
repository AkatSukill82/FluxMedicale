import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Calendar as CalendarIcon,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Stethoscope,
  Pill,
  FileText,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import ClinicalStatistics from '../components/statistics/ClinicalStatistics';
import AnalysesMedicales from '../components/statistics/AnalysesMedicales';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Statistiques() {
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 3)),
    end: endOfMonth(new Date())
  });
  const [selectedPraticien, setSelectedPraticien] = useState('all');

  // Fetch all data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['statisticsData', dateRange, selectedPraticien],
    queryFn: async () => {
      const [consultations, prescriptions, users, patients, vaccinations, allergies, medicalHistories, dmgs] = await Promise.all([
        base44.entities.Consultation.list('-date_consultation', 1000),
        base44.entities.Prescription.list('-date_prescription', 1000),
        base44.entities.User.list().catch(() => []),
        base44.entities.Patient.list('-created_date', 2000).catch(() => []),
        base44.entities.Vaccination.list('-vaccination_date', 5000).catch(() => []),
        base44.entities.Allergy.list('-created_date', 5000).catch(() => []),
        base44.entities.MedicalHistory.list('-created_date', 5000).catch(() => []),
        base44.entities.DMG.list('-created_date', 5000).catch(() => [])
      ]);
      return { consultations, prescriptions, users: users.filter(u => u.role === 'admin' || u.role === 'editor'), patients, vaccinations, allergies, medicalHistories, dmgs };
    }
  });

  // Filter data by date range and praticien
  const filteredConsultations = data?.consultations?.filter(c => {
    const date = parseISO(c.date_consultation);
    const inRange = isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
    const matchPraticien = selectedPraticien === 'all' || c.medecin_email === selectedPraticien;
    return inRange && matchPraticien;
  }) || [];

  const filteredPrescriptions = data?.prescriptions?.filter(p => {
    const date = parseISO(p.date_prescription);
    const inRange = isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
    const matchPraticien = selectedPraticien === 'all' || p.medecin_email === selectedPraticien;
    return inRange && matchPraticien;
  }) || [];

  // Consultations by status
  const consultationsByStatus = filteredConsultations.reduce((acc, c) => {
    const status = c.statut || 'Non défini';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(consultationsByStatus).map(([name, value]) => ({
    name,
    value
  }));

  // Consultations by month (trend)
  const consultationsByMonth = filteredConsultations.reduce((acc, c) => {
    const month = format(parseISO(c.date_consultation), 'MMM yyyy', { locale: fr });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const trendChartData = Object.entries(consultationsByMonth)
    .map(([name, consultations]) => ({ name, consultations }))
    .reverse();

  // Consultations by praticien
  const consultationsByPraticien = filteredConsultations.reduce((acc, c) => {
    const praticien = data?.users?.find(u => u.email === c.medecin_email)?.full_name || c.medecin_email || 'Non assigné';
    acc[praticien] = (acc[praticien] || 0) + 1;
    return acc;
  }, {});

  const praticienChartData = Object.entries(consultationsByPraticien).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    consultations: value
  }));

  // Top diagnostics
  const diagnosticCounts = filteredConsultations.reduce((acc, c) => {
    if (c.diagnostic) {
      const diag = c.diagnostic.substring(0, 50);
      acc[diag] = (acc[diag] || 0) + 1;
    }
    return acc;
  }, {});

  const topDiagnostics = Object.entries(diagnosticCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // Top medications
  const medicationCounts = filteredPrescriptions.reduce((acc, p) => {
    p.medicaments?.forEach(m => {
      const name = m.nom_produit || 'Inconnu';
      acc[name] = (acc[name] || 0) + 1;
    });
    return acc;
  }, {});

  const topMedications = Object.entries(medicationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name: name.length > 25 ? name.substring(0, 25) + '...' : name, prescriptions: value }));

  // Prescriptions by status
  const prescriptionsByStatus = filteredPrescriptions.reduce((acc, p) => {
    const status = p.statut_recip_e || 'Brouillon';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const prescriptionStatusData = Object.entries(prescriptionsByStatus).map(([name, value]) => ({
    name,
    value
  }));

  // Stats summary
  const totalConsultations = filteredConsultations.length;
  const totalPrescriptions = filteredPrescriptions.length;
  const uniquePatients = new Set(filteredConsultations.map(c => c.patient_id)).size;
  const avgPrescriptionsPerConsult = totalConsultations > 0 
    ? (totalPrescriptions / totalConsultations).toFixed(2) 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Statistiques</h1>
          <p className="text-muted-foreground">Analyse des données médicales</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-sm mb-2 block">Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.start, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => date && setDateRange({ ...dateRange, start: date })}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.end, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => date && setDateRange({ ...dateRange, end: date })}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Praticien</Label>
              <Select value={selectedPraticien} onValueChange={setSelectedPraticien}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les praticiens</SelectItem>
                  {data?.users?.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRange({
                  start: startOfMonth(subMonths(new Date(), 1)),
                  end: endOfMonth(subMonths(new Date(), 1))
                })}
              >
                Mois dernier
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRange({
                  start: startOfMonth(subMonths(new Date(), 3)),
                  end: endOfMonth(new Date())
                })}
              >
                3 mois
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRange({
                  start: startOfMonth(subMonths(new Date(), 12)),
                  end: endOfMonth(new Date())
                })}
              >
                1 an
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consultations</p>
                <p className="text-2xl font-bold">{totalConsultations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Pill className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prescriptions</p>
                <p className="text-2xl font-bold">{totalPrescriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patients uniques</p>
                <p className="text-2xl font-bold">{uniquePatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prescr./Consult.</p>
                <p className="text-2xl font-bold">{avgPrescriptionsPerConsult}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="consultations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consultations" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            Consultations
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Diagnostics
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-2">
            <Pill className="w-4 h-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="clinique" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Clinique
          </TabsTrigger>
          <TabsTrigger value="analyses" className="gap-2" onClick={() => window.location.href = '/Analyses'}>
            <TrendingUp className="w-4 h-4" />
            Analyses →
          </TabsTrigger>
        </TabsList>

        {/* Consultations Tab */}
        <TabsContent value="consultations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Évolution des consultations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="consultations" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Répartition par statut
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By Praticien */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Consultations par praticien
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={praticienChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="name" fontSize={12} width={120} />
                    <Tooltip />
                    <Bar dataKey="consultations" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top 10 des diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topDiagnostics.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topDiagnostics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={200} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      {topDiagnostics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Aucun diagnostic enregistré pour cette période
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liste détaillée des diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topDiagnostics.map((diag, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{diag.name}</span>
                    </div>
                    <Badge>{diag.value} cas</Badge>
                  </div>
                ))}
                {topDiagnostics.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun diagnostic enregistré
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Medications */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="w-5 h-5" />
                  Médicaments les plus prescrits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topMedications.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topMedications}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={100} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="prescriptions" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                        {topMedications.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Aucune prescription pour cette période
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prescription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Statut des prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prescriptionStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prescriptionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Medication List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 10 médicaments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topMedications.map((med, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className="w-8 h-8 flex items-center justify-center rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}
                        >
                          {index + 1}
                        </Badge>
                        <span className="font-medium text-sm">{med.name}</span>
                      </div>
                      <Badge variant="secondary">{med.prescriptions}</Badge>
                    </div>
                  ))}
                  {topMedications.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune prescription enregistrée
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clinical Statistics Tab */}
        <TabsContent value="clinique" className="space-y-6">
          <ClinicalStatistics
            consultations={filteredConsultations}
            prescriptions={filteredPrescriptions}
            patients={data?.patients || []}
          />
        </TabsContent>

        {/* Analyses médicales Tab */}
        <TabsContent value="analyses" className="space-y-6">
          <AnalysesMedicales
            patients={data?.patients || []}
            vaccinations={data?.vaccinations || []}
            allergies={data?.allergies || []}
            medicalHistories={data?.medicalHistories || []}
            dmgs={data?.dmgs || []}
            prescriptions={data?.prescriptions || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}