import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Heart,
  Users,
  Euro,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Pill,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Info
} from 'lucide-react';
import { format, subMonths, startOfYear, endOfYear, startOfMonth, endOfMonth, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DoctorAnalytics() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState('year');

  // Récupérer les données
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 10000)
  });

  const { data: consultations = [], isLoading: isLoadingConsults } = useQuery({
    queryKey: ['allConsultations'],
    queryFn: () => base44.entities.Consultation.list('-date_consultation', 10000)
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['allInvoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date', 10000)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['allPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-created_date', 10000)
  });

  const { data: dmgRecords = [] } = useQuery({
    queryKey: ['allDMG'],
    queryFn: async () => {
      try {
        return await base44.entities.DMG.list('-created_date', 10000);
      } catch {
        return [];
      }
    }
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['allAppointments'],
    queryFn: () => base44.entities.RendezVous.list('-date', 10000)
  });

  // Calculs des statistiques
  const stats = useMemo(() => {
    const year = parseInt(selectedYear);
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Filtrer par année
    const yearConsultations = consultations.filter(c => {
      const date = new Date(c.date_consultation);
      return date >= yearStart && date <= yearEnd;
    });

    const yearInvoices = invoices.filter(i => {
      const date = new Date(i.invoice_date);
      return date >= yearStart && date <= yearEnd;
    });

    const yearPrescriptions = prescriptions.filter(p => {
      const date = new Date(p.created_date);
      return date >= yearStart && date <= yearEnd;
    });

    // DMG actifs
    const activeDMG = dmgRecords.filter(d => d.statut === 'ACTIF');
    const dmgExpiringSoon = dmgRecords.filter(d => {
      if (!d.date_expiration) return false;
      const expDate = new Date(d.date_expiration);
      const now = new Date();
      const monthsUntilExpiry = (expDate - now) / (1000 * 60 * 60 * 24 * 30);
      return monthsUntilExpiry > 0 && monthsUntilExpiry <= 3;
    });

    // Chiffre d'affaires
    const totalRevenue = yearInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidInvoices = yearInvoices.filter(i => i.status === 'PAID' || i.status === 'ACCEPTED');
    const paidRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const unpaidInvoices = yearInvoices.filter(i => i.status !== 'PAID' && i.status !== 'ACCEPTED' && i.status !== 'REJECTED');

    // Statistiques patients
    const newPatientsThisYear = patients.filter(p => {
      const date = new Date(p.created_date);
      return date >= yearStart && date <= yearEnd;
    });

    // Age moyen patients
    const patientsWithAge = patients.filter(p => p.birthDate);
    const avgAge = patientsWithAge.length > 0
      ? patientsWithAge.reduce((sum, p) => sum + differenceInYears(new Date(), new Date(p.birthDate)), 0) / patientsWithAge.length
      : 0;

    // Répartition homme/femme
    const malePatients = patients.filter(p => p.gender === 'male').length;
    const femalePatients = patients.filter(p => p.gender === 'female').length;

    // Consultations par mois
    const consultationsByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthStart = startOfMonth(new Date(year, i, 1));
      const monthEnd = endOfMonth(new Date(year, i, 1));
      const monthConsults = yearConsultations.filter(c => {
        const date = new Date(c.date_consultation);
        return date >= monthStart && date <= monthEnd;
      });
      return {
        month: format(new Date(year, i, 1), 'MMM', { locale: fr }),
        consultations: monthConsults.length,
        revenue: yearInvoices.filter(inv => {
          const date = new Date(inv.invoice_date);
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100
      };
    });

    // Types de consultations
    const consultationTypes = {};
    yearConsultations.forEach(c => {
      const type = c.motif || 'Non spécifié';
      consultationTypes[type] = (consultationTypes[type] || 0) + 1;
    });
    const topConsultationTypes = Object.entries(consultationTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // Taux de DMG (critère INAMI: contact 1 an sur 2)
    const dmgRate = patients.length > 0 ? (activeDMG.length / patients.length) * 100 : 0;

    // Prime pratique intégrée (critère INAMI: 25000€ minimum)
    const primeEligible = totalRevenue >= 2500000; // 25000€ en centimes

    // Moyenne consultations/jour
    const workingDays = 220; // ~220 jours ouvrés/an
    const avgConsultsPerDay = yearConsultations.length / workingDays;

    return {
      // DMG
      totalDMG: activeDMG.length,
      dmgExpiringSoon: dmgExpiringSoon.length,
      dmgRate,

      // Patients
      totalPatients: patients.length,
      newPatients: newPatientsThisYear.length,
      avgPatientAge: Math.round(avgAge),
      malePatients,
      femalePatients,

      // Consultations
      totalConsultations: yearConsultations.length,
      avgConsultsPerDay: avgConsultsPerDay.toFixed(1),
      consultationsByMonth,
      topConsultationTypes,

      // Financier
      totalRevenue,
      paidRevenue,
      unpaidCount: unpaidInvoices.length,
      unpaidAmount: unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      primeEligible,

      // Prescriptions
      totalPrescriptions: yearPrescriptions.length,
      avgPrescPerConsult: yearConsultations.length > 0 
        ? (yearPrescriptions.length / yearConsultations.length).toFixed(2) 
        : 0
    };
  }, [patients, consultations, invoices, prescriptions, dmgRecords, selectedYear]);

  const isLoading = isLoadingPatients || isLoadingConsults || isLoadingInvoices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tableau de bord analytique</h2>
          <p className="text-slate-600">
            Analyse de votre activité médicale selon les critères INAMI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2023, 2022, 2021].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Alertes INAMI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.dmgExpiringSoon > 0 && (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>{stats.dmgExpiringSoon} DMG</strong> arrivent à expiration dans les 3 prochains mois. 
              Pensez à recontacter ces patients pour le renouvellement.
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className={stats.primeEligible ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
          <Info className={`w-4 h-4 ${stats.primeEligible ? 'text-green-600' : 'text-blue-600'}`} />
          <AlertDescription className={stats.primeEligible ? 'text-green-900' : 'text-blue-900'}>
            {stats.primeEligible 
              ? "✓ Vous êtes éligible à la prime de pratique intégrée (>25.000€ attestés)"
              : `Objectif prime pratique intégrée: ${((stats.totalRevenue / 100) / 25000 * 100).toFixed(0)}% atteint (${(stats.totalRevenue / 100).toFixed(0)}€ / 25.000€)`
            }
          </AlertDescription>
        </Alert>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">DMG actifs</p>
                <p className="text-3xl font-bold text-red-900">{stats.totalDMG}</p>
                <p className="text-xs text-red-600 mt-1">
                  {stats.dmgRate.toFixed(1)}% de vos patients
                </p>
              </div>
              <Heart className="w-12 h-12 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Patients</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalPatients}</p>
                <p className="text-xs text-blue-600 mt-1">
                  +{stats.newPatients} cette année
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Chiffre d'affaires</p>
                <p className="text-3xl font-bold text-green-900">
                  {(stats.totalRevenue / 100).toLocaleString('fr-BE')}€
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {(stats.paidRevenue / 100).toLocaleString('fr-BE')}€ encaissés
                </p>
              </div>
              <Euro className="w-12 h-12 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Consultations</p>
                <p className="text-3xl font-bold text-purple-900">{stats.totalConsultations}</p>
                <p className="text-xs text-purple-600 mt-1">
                  ~{stats.avgConsultsPerDay}/jour ouvré
                </p>
              </div>
              <Activity className="w-12 h-12 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="dmg">DMG & Patients</TabsTrigger>
          <TabsTrigger value="financial">Financier</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Consultations par mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.consultationsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="consultations" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Motifs de consultation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={stats.topConsultationTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.topConsultationTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dmg" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Statistiques DMG
                </CardTitle>
                <CardDescription>
                  Selon les critères INAMI, le DMG doit être renouvelé tous les 2 ans avec au moins 1 contact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-700">{stats.totalDMG}</p>
                    <p className="text-sm text-green-600">DMG actifs</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-orange-700">{stats.dmgExpiringSoon}</p>
                    <p className="text-sm text-orange-600">Expirent bientôt</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-700">{stats.dmgRate.toFixed(1)}%</p>
                    <p className="text-sm text-blue-600">Taux couverture</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Objectif 80% de couverture DMG</span>
                    <span className="text-sm text-slate-500">{stats.dmgRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(stats.dmgRate / 80 * 100, 100)} className="h-3" />
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>Rappel INAMI:</strong> L'honoraire DMG est payé annuellement en février, 
                    à condition d'avoir eu au moins 1 contact (consultation ou visite) avec le patient 
                    au cours de l'une des 2 années précédentes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Profil patients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-4xl font-bold text-slate-800">{stats.avgPatientAge}</p>
                  <p className="text-sm text-slate-600">Âge moyen</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hommes</span>
                    <span className="font-medium">{stats.malePatients}</span>
                  </div>
                  <Progress 
                    value={stats.totalPatients > 0 ? (stats.malePatients / stats.totalPatients) * 100 : 0} 
                    className="h-2 bg-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Femmes</span>
                    <span className="font-medium">{stats.femalePatients}</span>
                  </div>
                  <Progress 
                    value={stats.totalPatients > 0 ? (stats.femalePatients / stats.totalPatients) * 100 : 0} 
                    className="h-2 bg-pink-100"
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-600">Nouveaux patients {selectedYear}</p>
                  <p className="text-2xl font-bold text-green-600">+{stats.newPatients}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Évolution du chiffre d'affaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.consultationsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString('fr-BE')}€`} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      fill="#D1FAE5"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicateurs financiers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Encaissé</p>
                    <p className="text-2xl font-bold text-green-700">
                      {(stats.paidRevenue / 100).toLocaleString('fr-BE')}€
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">En attente</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {(stats.unpaidAmount / 100).toLocaleString('fr-BE')}€
                    </p>
                    <p className="text-xs text-orange-600">{stats.unpaidCount} factures</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Prime pratique intégrée</span>
                    <Badge className={stats.primeEligible ? 'bg-green-600' : 'bg-orange-600'}>
                      {stats.primeEligible ? 'Éligible' : 'En cours'}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    Objectif INAMI: 25.000€ minimum attestés dans l'année
                  </p>
                  <Progress 
                    value={Math.min((stats.totalRevenue / 100) / 25000 * 100, 100)} 
                    className="h-3"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    {(stats.totalRevenue / 100).toLocaleString('fr-BE')}€ / 25.000€
                  </p>
                </div>

                <Alert className="bg-slate-50">
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    La prime de pratique intégrée récompense les médecins généralistes qui 
                    participent activement à l'amélioration de la qualité des soins.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-500" />
                  Statistiques de prescription
                </CardTitle>
                <CardDescription>
                  L'INAMI analyse vos prescriptions pour encourager une utilisation rationnelle des médicaments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-700">{stats.totalPrescriptions}</p>
                    <p className="text-sm text-purple-600">Prescriptions</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-indigo-700">{stats.avgPrescPerConsult}</p>
                    <p className="text-sm text-indigo-600">Par consultation</p>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>Feed-back INAMI:</strong> L'INAMI envoie régulièrement des rapports 
                    individuels sur vos prescriptions (antibiotiques, antidépresseurs, IPP, AINS, 
                    anticholinergiques) pour encourager une prescription rationnelle.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommandations INAMI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Antibiotiques</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Privilégier les antibiotiques à spectre étroit en première intention
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">IPP</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Réévaluer régulièrement la nécessité du traitement par IPP
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Polymédication</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Attention particulière chez les patients âgés (>5 médicaments)
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Génériques</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Favoriser la prescription de médicaments génériques
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}