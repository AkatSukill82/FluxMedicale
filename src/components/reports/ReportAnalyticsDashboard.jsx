import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
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
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  Stethoscope,
  Pill,
  Activity,
  Target,
  Calendar
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportAnalyticsDashboard() {
  const [period, setPeriod] = useState('6months');

  // Charger toutes les données nécessaires
  const { data: consultations = [] } = useQuery({
    queryKey: ['analyticsConsultations'],
    queryFn: () => base44.entities.Consultation.list('-date_consultation', 500)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['analyticsPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-date_prescription', 500)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['analyticsPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500)
  });

  const { data: treatmentPlans = [] } = useQuery({
    queryKey: ['analyticsTreatmentPlans'],
    queryFn: () => base44.entities.TreatmentPlan.list('-created_date', 200)
  });

  // Calculer la période
  const getDateRange = () => {
    const end = new Date();
    let start;
    switch (period) {
      case '1month': start = subMonths(end, 1); break;
      case '3months': start = subMonths(end, 3); break;
      case '6months': start = subMonths(end, 6); break;
      case '12months': start = subMonths(end, 12); break;
      default: start = subMonths(end, 6);
    }
    return { start, end };
  };

  const { start, end } = getDateRange();

  // Filtrer par période
  const filterByPeriod = (items, dateField) => items.filter(item => {
    const date = new Date(item[dateField]);
    return date >= start && date <= end;
  });

  const periodConsultations = filterByPeriod(consultations, 'date_consultation');
  const periodPrescriptions = filterByPeriod(prescriptions, 'date_prescription');

  // Données pour graphique évolution mensuelle
  const monthlyData = React.useMemo(() => {
    const months = eachMonthOfInterval({ start, end });
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthConsults = consultations.filter(c => {
        const date = new Date(c.date_consultation);
        return date >= monthStart && date <= monthEnd;
      });
      
      const monthPrescriptions = prescriptions.filter(p => {
        const date = new Date(p.date_prescription);
        return date >= monthStart && date <= monthEnd;
      });

      return {
        month: format(month, 'MMM', { locale: fr }),
        consultations: monthConsults.length,
        prescriptions: monthPrescriptions.length
      };
    });
  }, [consultations, prescriptions, start, end]);

  // Pathologies les plus fréquentes (basé sur diagnostics)
  const topPathologies = React.useMemo(() => {
    const pathologyCount = {};
    periodConsultations.forEach(c => {
      if (c.diagnostic) {
        const diag = c.diagnostic.split(',')[0].trim().substring(0, 30);
        pathologyCount[diag] = (pathologyCount[diag] || 0) + 1;
      }
    });
    
    return Object.entries(pathologyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [periodConsultations]);

  // Taux de réussite des traitements
  const treatmentStats = React.useMemo(() => {
    const completed = treatmentPlans.filter(p => p.status === 'termine').length;
    const abandoned = treatmentPlans.filter(p => p.status === 'abandonne').length;
    const active = treatmentPlans.filter(p => p.status === 'actif').length;
    const total = treatmentPlans.length;

    return {
      data: [
        { name: 'Terminés', value: completed, color: '#10b981' },
        { name: 'En cours', value: active, color: '#3b82f6' },
        { name: 'Abandonnés', value: abandoned, color: '#ef4444' }
      ],
      successRate: total > 0 ? Math.round((completed / (completed + abandoned)) * 100) || 0 : 0
    };
  }, [treatmentPlans]);

  // Médicaments les plus prescrits
  const topMedications = React.useMemo(() => {
    const medCount = {};
    periodPrescriptions.forEach(p => {
      p.medicaments?.forEach(med => {
        const name = med.nom_produit?.substring(0, 25) || 'Inconnu';
        medCount[name] = (medCount[name] || 0) + 1;
      });
    });
    
    return Object.entries(medCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [periodPrescriptions]);

  // Stats globales
  const stats = {
    totalConsultations: periodConsultations.length,
    totalPrescriptions: periodPrescriptions.length,
    activePatients: new Set(periodConsultations.map(c => c.patient_id)).size,
    avgConsultPerPatient: periodConsultations.length > 0 
      ? (periodConsultations.length / new Set(periodConsultations.map(c => c.patient_id)).size).toFixed(1)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Tableau de bord analytique</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Dernier mois</SelectItem>
            <SelectItem value="3months">3 derniers mois</SelectItem>
            <SelectItem value="6months">6 derniers mois</SelectItem>
            <SelectItem value="12months">12 derniers mois</SelectItem>
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
                <p className="text-2xl font-bold">{stats.totalConsultations}</p>
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
                <p className="text-2xl font-bold">{stats.totalPrescriptions}</p>
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
                <p className="text-2xl font-bold">{stats.activePatients}</p>
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
                <p className="text-xs text-muted-foreground">Taux réussite</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Évolution mensuelle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Évolution mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="consultations" stroke="#3b82f6" name="Consultations" />
                <Line type="monotone" dataKey="prescriptions" stroke="#10b981" name="Prescriptions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Taux de réussite traitements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
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
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {treatmentStats.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pathologies fréquentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pathologies les plus fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            {topPathologies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Pas assez de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topPathologies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Médicaments les plus prescrits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Médicaments les plus prescrits</CardTitle>
          </CardHeader>
          <CardContent>
            {topMedications.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Pas assez de données</p>
            ) : (
              <div className="space-y-3">
                {topMedications.map((med, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{med.name}</p>
                      <div className="h-2 bg-slate-100 rounded-full mt-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(med.value / topMedications[0].value) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="secondary">{med.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}