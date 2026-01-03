import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Users,
  Stethoscope,
  Pill,
  Target,
  Calendar,
  Activity
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsAnalyticsDashboard() {
  const [periodMonths, setPeriodMonths] = useState('6');

  // Charger les données
  const { data: consultations = [] } = useQuery({
    queryKey: ['analyticsConsultations'],
    queryFn: () => base44.entities.Consultation.list('-date_consultation', 1000)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['analyticsPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-date_prescription', 1000)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['analyticsPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500)
  });

  const { data: treatmentPlans = [] } = useQuery({
    queryKey: ['analyticsTreatmentPlans'],
    queryFn: () => base44.entities.TreatmentPlan.list('-created_date', 300)
  });

  // Filtrer par période
  const periodStart = subMonths(new Date(), parseInt(periodMonths));

  const filteredConsultations = useMemo(() => 
    consultations.filter(c => new Date(c.date_consultation) >= periodStart),
    [consultations, periodStart]
  );

  const filteredPrescriptions = useMemo(() =>
    prescriptions.filter(p => new Date(p.date_prescription) >= periodStart),
    [prescriptions, periodStart]
  );

  // 1. Évolution mensuelle consultations/prescriptions
  const monthlyTrends = useMemo(() => {
    const months = [];
    for (let i = parseInt(periodMonths) - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(monthStart);
      
      const monthConsults = consultations.filter(c => {
        const d = new Date(c.date_consultation);
        return d >= monthStart && d <= monthEnd;
      }).length;

      const monthPrescs = prescriptions.filter(p => {
        const d = new Date(p.date_prescription);
        return d >= monthStart && d <= monthEnd;
      }).length;

      months.push({
        month: format(monthStart, 'MMM yy', { locale: fr }),
        consultations: monthConsults,
        prescriptions: monthPrescs
      });
    }
    return months;
  }, [consultations, prescriptions, periodMonths]);

  // 2. Pathologies fréquentes
  const topPathologies = useMemo(() => {
    const diagCounts = {};
    filteredConsultations.forEach(c => {
      if (c.diagnostic) {
        const diag = c.diagnostic.split(',')[0].split('.')[0].trim().substring(0, 30);
        if (diag.length > 3) {
          diagCounts[diag] = (diagCounts[diag] || 0) + 1;
        }
      }
    });
    return Object.entries(diagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filteredConsultations]);

  // 3. Répartition par âge
  const ageDistribution = useMemo(() => {
    const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    const activePatientIds = new Set(filteredConsultations.map(c => c.patient_id));
    
    patients.forEach(p => {
      if (!activePatientIds.has(p.id)) return;
      if (!p.birthDate) return;
      
      const age = differenceInYears(new Date(), new Date(p.birthDate));
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    });

    return Object.entries(ageGroups).map(([name, value]) => ({ name, value }));
  }, [patients, filteredConsultations]);

  // 4. Taux de succès des traitements
  const treatmentStats = useMemo(() => {
    const stats = { termine: 0, actif: 0, abandonne: 0, en_pause: 0 };
    treatmentPlans.forEach(plan => {
      if (stats[plan.status] !== undefined) {
        stats[plan.status]++;
      }
    });
    
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const successRate = total > 0 ? Math.round((stats.termine / total) * 100) : 0;
    
    return {
      data: [
        { name: 'Terminés', value: stats.termine, color: '#10b981' },
        { name: 'Actifs', value: stats.actif, color: '#3b82f6' },
        { name: 'En pause', value: stats.en_pause, color: '#f59e0b' },
        { name: 'Abandonnés', value: stats.abandonne, color: '#ef4444' }
      ].filter(d => d.value > 0),
      successRate,
      total
    };
  }, [treatmentPlans]);

  // 5. Médicaments les plus prescrits
  const topMedications = useMemo(() => {
    const medCounts = {};
    filteredPrescriptions.forEach(p => {
      p.medicaments?.forEach(med => {
        const name = med.nom_produit?.split(' ')[0]?.toUpperCase() || 'Inconnu';
        medCounts[name] = (medCounts[name] || 0) + 1;
      });
    });
    return Object.entries(medCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [filteredPrescriptions]);

  // Stats rapides
  const quickStats = {
    totalConsultations: filteredConsultations.length,
    totalPrescriptions: filteredPrescriptions.length,
    activePatients: new Set(filteredConsultations.map(c => c.patient_id)).size,
    avgConsultPerPatient: filteredConsultations.length > 0 
      ? (filteredConsultations.length / Math.max(1, new Set(filteredConsultations.map(c => c.patient_id)).size)).toFixed(1)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Tableau de bord analytique
          </h2>
          <p className="text-sm text-muted-foreground">Vue d'ensemble des tendances médicales</p>
        </div>
        <Select value={periodMonths} onValueChange={setPeriodMonths}>
          <SelectTrigger className="w-40">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 derniers mois</SelectItem>
            <SelectItem value="6">6 derniers mois</SelectItem>
            <SelectItem value="12">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.totalConsultations}</p>
                <p className="text-xs text-muted-foreground">Consultations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Pill className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.totalPrescriptions}</p>
                <p className="text-xs text-muted-foreground">Prescriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.activePatients}</p>
                <p className="text-xs text-muted-foreground">Patients actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{treatmentStats.successRate}%</p>
                <p className="text-xs text-muted-foreground">Succès traitements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Évolution mensuelle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Évolution mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="consultations" name="Consultations" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="prescriptions" name="Prescriptions" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition traitements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Résultats des traitements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={treatmentStats.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {treatmentStats.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pathologies fréquentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pathologies les plus fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topPathologies} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par âge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Répartition par tranche d'âge</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {ageDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Médicaments les plus prescrits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Top 10 des médicaments prescrits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topMedications.map((med, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                {med.name} <span className="ml-1 text-muted-foreground">({med.count})</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}