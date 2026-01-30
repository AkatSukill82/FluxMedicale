import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
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
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  AlertTriangle,
  Loader2,
  Shield,
  Filter
} from 'lucide-react';
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

const AGE_BRACKETS = [
  { key: '0-18', label: '0-18 ans', min: 0, max: 18 },
  { key: '19-40', label: '19-40 ans', min: 19, max: 40 },
  { key: '41-60', label: '41-60 ans', min: 41, max: 60 },
  { key: '61+', label: '61+ ans', min: 61, max: 150 }
];

export default function ThinEpidemiologyStats() {
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 3)),
    end: endOfMonth(new Date())
  });
  const [selectedSymptom, setSelectedSymptom] = useState('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');

  // Fetch anonymous epidemiological data
  const { data: thinData = [], isLoading } = useQuery({
    queryKey: ['thinEpiData'],
    queryFn: () => base44.entities.AnonymousEpiData.list('-consultation_date', 5000)
  });

  // Filter data by date range
  const filteredData = useMemo(() => {
    return thinData.filter(entry => {
      if (!entry.consultation_date) return false;
      const date = parseISO(entry.consultation_date);
      const inRange = isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
      
      // Age filter
      let ageMatch = true;
      if (selectedAgeGroup !== 'all') {
        const bracket = AGE_BRACKETS.find(b => b.key === selectedAgeGroup);
        if (bracket) {
          ageMatch = entry.age >= bracket.min && entry.age <= bracket.max;
        }
      }

      // Symptom filter
      let symptomMatch = true;
      if (selectedSymptom !== 'all') {
        symptomMatch = entry.symptoms?.includes(selectedSymptom);
      }

      return inRange && ageMatch && symptomMatch;
    });
  }, [thinData, dateRange, selectedAgeGroup, selectedSymptom]);

  // Extract all unique symptoms
  const allSymptoms = useMemo(() => {
    const symptoms = new Set();
    thinData.forEach(entry => {
      entry.symptoms?.forEach(s => symptoms.add(s));
    });
    return Array.from(symptoms).sort();
  }, [thinData]);

  // Symptom frequency
  const symptomCounts = useMemo(() => {
    const counts = {};
    filteredData.forEach(entry => {
      entry.symptoms?.forEach(s => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Age distribution
  const ageDistribution = useMemo(() => {
    const distribution = AGE_BRACKETS.map(b => ({ name: b.label, value: 0 }));
    filteredData.forEach(entry => {
      const bracket = AGE_BRACKETS.find(b => entry.age >= b.min && entry.age <= b.max);
      if (bracket) {
        const idx = distribution.findIndex(d => d.name === bracket.label);
        if (idx !== -1) distribution[idx].value++;
      }
    });
    return distribution;
  }, [filteredData]);

  // Sex distribution
  const sexDistribution = useMemo(() => {
    const counts = { M: 0, F: 0, autre: 0 };
    filteredData.forEach(entry => {
      counts[entry.sex] = (counts[entry.sex] || 0) + 1;
    });
    return [
      { name: 'Hommes', value: counts.M },
      { name: 'Femmes', value: counts.F },
      { name: 'Autre', value: counts.autre }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const weeks = {};
    filteredData.forEach(entry => {
      const date = parseISO(entry.consultation_date);
      const weekStart = format(startOfWeek(date, { locale: fr }), 'dd/MM');
      weeks[weekStart] = (weeks[weekStart] || 0) + 1;
    });
    return Object.entries(weeks)
      .slice(-12)
      .map(([week, count]) => ({ week, consultations: count }));
  }, [filteredData]);

  // Symptom trends over time
  const symptomTrends = useMemo(() => {
    const topSymptoms = symptomCounts.slice(0, 5).map(s => s.name);
    const weeks = {};
    
    filteredData.forEach(entry => {
      const date = parseISO(entry.consultation_date);
      const weekStart = format(startOfWeek(date, { locale: fr }), 'dd/MM');
      if (!weeks[weekStart]) {
        weeks[weekStart] = { week: weekStart };
        topSymptoms.forEach(s => weeks[weekStart][s] = 0);
      }
      entry.symptoms?.forEach(s => {
        if (topSymptoms.includes(s)) {
          weeks[weekStart][s]++;
        }
      });
    });

    return { data: Object.values(weeks).slice(-12), symptoms: topSymptoms };
  }, [filteredData, symptomCounts]);

  // Diagnosis distribution
  const diagnosisDistribution = useMemo(() => {
    const counts = {};
    filteredData.forEach(entry => {
      if (entry.diagnosis) {
        const diag = entry.diagnosis.substring(0, 40);
        counts[diag] = (counts[diag] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Symptoms by age group
  const symptomsByAge = useMemo(() => {
    const result = {};
    AGE_BRACKETS.forEach(b => {
      result[b.label] = {};
    });

    filteredData.forEach(entry => {
      const bracket = AGE_BRACKETS.find(b => entry.age >= b.min && entry.age <= b.max);
      if (bracket) {
        entry.symptoms?.forEach(s => {
          result[bracket.label][s] = (result[bracket.label][s] || 0) + 1;
        });
      }
    });

    // Get top symptoms per age group
    return AGE_BRACKETS.map(b => {
      const symptoms = Object.entries(result[b.label])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      return { ageGroup: b.label, symptoms };
    });
  }, [filteredData]);

  // Calculate trend compared to previous period
  const trendComparison = useMemo(() => {
    const periodLength = dateRange.end - dateRange.start;
    const previousStart = new Date(dateRange.start.getTime() - periodLength);
    const previousEnd = new Date(dateRange.end.getTime() - periodLength);

    const currentCount = filteredData.length;
    const previousCount = thinData.filter(entry => {
      if (!entry.consultation_date) return false;
      const date = parseISO(entry.consultation_date);
      return isWithinInterval(date, { start: previousStart, end: previousEnd });
    }).length;

    if (previousCount === 0) return { change: 0, isUp: true };
    const change = ((currentCount - previousCount) / previousCount) * 100;
    return { change: Math.abs(change).toFixed(1), isUp: change >= 0 };
  }, [filteredData, thinData, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Projet THIN - Données Épidémiologiques</h3>
              <p className="text-sm text-blue-700">
                Statistiques basées sur {thinData.length} entrées anonymisées (âge, sexe, symptômes uniquement)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-sm mb-2 block">Période début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-36">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.start, 'dd/MM/yy')}
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
              <Label className="text-sm mb-2 block">Période fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-36">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.end, 'dd/MM/yy')}
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
              <Label className="text-sm mb-2 block">Tranche d'âge</Label>
              <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les âges</SelectItem>
                  {AGE_BRACKETS.map(b => (
                    <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Symptôme</Label>
              <Select value={selectedSymptom} onValueChange={setSelectedSymptom}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous symptômes</SelectItem>
                  {allSymptoms.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRange({
                  start: subWeeks(new Date(), 2),
                  end: new Date()
                })}
              >
                2 sem
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRange({
                  start: subMonths(new Date(), 1),
                  end: new Date()
                })}
              >
                1 mois
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRange({
                  start: subMonths(new Date(), 3),
                  end: new Date()
                })}
              >
                3 mois
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entrées analysées</p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Symptômes uniques</p>
                <p className="text-2xl font-bold">{allSymptoms.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Âge moyen</p>
                <p className="text-2xl font-bold">
                  {filteredData.length > 0 
                    ? Math.round(filteredData.reduce((acc, e) => acc + (e.age || 0), 0) / filteredData.length)
                    : '-'
                  } ans
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tendance</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{trendComparison.change}%</p>
                  {trendComparison.isUp ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Symptoms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Symptômes les plus fréquents</CardTitle>
          </CardHeader>
          <CardContent>
            {symptomCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={symptomCounts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {symptomCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Aucune donnée pour cette période
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Évolution hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="consultations" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                    name="Cas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Aucune donnée pour cette période
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par âge</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sex Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par sexe</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sexDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {sexDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#ec4899' : '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Symptoms by Age Group */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top symptômes par âge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {symptomsByAge.map((group, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium mb-1">{group.ageGroup}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.symptoms.map(([symptom, count], i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {symptom} ({count})
                      </Badge>
                    ))}
                    {group.symptoms.length === 0 && (
                      <span className="text-xs text-muted-foreground">Aucune donnée</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Symptom Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tendances des principaux symptômes</CardTitle>
        </CardHeader>
        <CardContent>
          {symptomTrends.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={symptomTrends.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                {symptomTrends.symptoms.map((symptom, index) => (
                  <Line
                    key={symptom}
                    type="monotone"
                    dataKey={symptom}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Pas assez de données pour afficher les tendances
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnoses */}
      {diagnosisDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagnostics les plus fréquents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={diagnosisDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={100} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {diagnosisDistribution.map((diag, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm">{diag.name}</span>
                    </div>
                    <Badge variant="secondary">{diag.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}