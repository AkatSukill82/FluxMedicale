import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Calendar, Users, Loader2, RefreshCw } from 'lucide-react';
import { format, subDays, subMonths, startOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const DISEASE_CATEGORIES = {
  'Grippe/ILI': ['grippe', 'influenza', 'syndrome grippal', 'fièvre', 'myalgie', 'toux'],
  'COVID-19': ['covid', 'sars-cov', 'coronavirus', 'perte odorat', 'perte goût'],
  'Gastro-entérite': ['gastro', 'diarrhée', 'vomissement', 'nausée'],
  'Infections respiratoires': ['bronchite', 'pneumonie', 'sinusite', 'otite', 'angine', 'pharyngite'],
  'Allergies': ['allergie', 'rhinite allergique', 'urticaire', 'eczéma'],
  'Dermatologie': ['varicelle', 'zona', 'impétigo', 'gale'],
  'MST': ['chlamydia', 'gonorrhée', 'syphilis', 'herpès génital'],
  'Santé mentale': ['dépression', 'anxiété', 'burnout', 'insomnie'],
};

export default function Epidemiologie() {
  const [period, setPeriod] = useState('3months');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const startDate = useMemo(() => {
    const now = new Date();
    switch (period) {
      case '1month': return subMonths(now, 1);
      case '3months': return subMonths(now, 3);
      case '6months': return subMonths(now, 6);
      case '1year': return subMonths(now, 12);
      default: return subMonths(now, 3);
    }
  }, [period]);

  const { data: epiData = [], isLoading, refetch } = useQuery({
    queryKey: ['epiData'],
    queryFn: () => base44.entities.AnonymousEpiData.list('-consultation_date', 500),
  });

  const filteredData = useMemo(() => {
    return epiData.filter(d => new Date(d.consultation_date) >= startDate);
  }, [epiData, startDate]);

  const categorizedData = useMemo(() => {
    const counts = {};
    Object.keys(DISEASE_CATEGORIES).forEach(cat => { counts[cat] = 0; });
    counts['Autre'] = 0;

    filteredData.forEach(record => {
      const text = [record.diagnosis, ...(record.symptoms || [])].join(' ').toLowerCase();
      let matched = false;
      for (const [cat, keywords] of Object.entries(DISEASE_CATEGORIES)) {
        if (keywords.some(kw => text.includes(kw))) {
          counts[cat]++;
          matched = true;
          break;
        }
      }
      if (!matched) counts['Autre']++;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const weeklyTrend = useMemo(() => {
    const weeks = {};
    filteredData.forEach(record => {
      const weekStart = format(startOfWeek(new Date(record.consultation_date), { weekStartsOn: 1 }), 'dd/MM');
      if (!weeks[weekStart]) weeks[weekStart] = { week: weekStart, total: 0 };
      weeks[weekStart].total++;
    });
    return Object.values(weeks).sort((a, b) => {
      const [dA, mA] = a.week.split('/').map(Number);
      const [dB, mB] = b.week.split('/').map(Number);
      return mA - mB || dA - dB;
    });
  }, [filteredData]);

  const ageDistribution = useMemo(() => {
    const groups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    filteredData.forEach(r => {
      if (r.age <= 18) groups['0-18']++;
      else if (r.age <= 35) groups['19-35']++;
      else if (r.age <= 50) groups['36-50']++;
      else if (r.age <= 65) groups['51-65']++;
      else groups['65+']++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const sexDistribution = useMemo(() => {
    const counts = { M: 0, F: 0, autre: 0 };
    filteredData.forEach(r => { counts[r.sex] = (counts[r.sex] || 0) + 1; });
    return [
      { name: 'Hommes', value: counts.M },
      { name: 'Femmes', value: counts.F },
      ...(counts.autre > 0 ? [{ name: 'Autre', value: counts.autre }] : []),
    ];
  }, [filteredData]);

  const topSymptoms = useMemo(() => {
    const symptoms = {};
    filteredData.forEach(r => {
      (r.symptoms || []).forEach(s => {
        symptoms[s] = (symptoms[s] || 0) + 1;
      });
    });
    return Object.entries(symptoms)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Épidémiologique</h1>
          <p className="text-muted-foreground">Tendances de votre patientèle — données anonymisées</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 mois</SelectItem>
              <SelectItem value="3months">3 mois</SelectItem>
              <SelectItem value="6months">6 mois</SelectItem>
              <SelectItem value="1year">1 an</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredData.length}</p>
                <p className="text-xs text-muted-foreground">Cas enregistrés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categorizedData[0]?.value || 0}</p>
                <p className="text-xs text-muted-foreground">{categorizedData[0]?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categorizedData.length}</p>
                <p className="text-xs text-muted-foreground">Pathologies distinctes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weeklyTrend.length}</p>
                <p className="text-xs text-muted-foreground">Semaines analysées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="pathologies">Pathologies</TabsTrigger>
          <TabsTrigger value="demographics">Démographie</TabsTrigger>
          <TabsTrigger value="symptoms">Symptômes</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultations par semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pathologies" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition des pathologies</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categorizedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {categorizedData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top pathologies</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categorizedData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" fontSize={11} width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Répartition par âge</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Répartition par sexe</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sexDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                      <Cell fill="#6b7280" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="symptoms" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top 10 symptômes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topSymptoms} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {filteredData.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="font-semibold mb-2">Aucune donnée épidémiologique</h3>
            <p className="text-sm text-muted-foreground">
              Les données sont collectées automatiquement lors des consultations (anonymisées).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}