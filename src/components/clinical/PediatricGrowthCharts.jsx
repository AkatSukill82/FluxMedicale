import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import {
  Baby,
  TrendingUp,
  Ruler,
  Scale,
  Activity,
  Info,
  Loader2
} from 'lucide-react';
import { differenceInMonths, differenceInYears } from 'date-fns';

// Données OMS simplifiées pour courbes de croissance (garçons 0-5 ans)
const WHO_DATA_BOYS = {
  weight: {
    // Poids en kg par âge en mois [P3, P15, P50, P85, P97]
    data: [
      { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
      { month: 3, p3: 4.4, p15: 5.1, p50: 6.0, p85: 6.9, p97: 7.7 },
      { month: 6, p3: 5.9, p15: 6.7, p50: 7.9, p85: 9.0, p97: 10.0 },
      { month: 9, p3: 6.9, p15: 7.9, p50: 9.2, p85: 10.5, p97: 11.6 },
      { month: 12, p3: 7.7, p15: 8.8, p50: 10.2, p85: 11.5, p97: 12.7 },
      { month: 18, p3: 8.9, p15: 10.1, p50: 11.5, p85: 13.0, p97: 14.3 },
      { month: 24, p3: 9.8, p15: 11.1, p50: 12.7, p85: 14.3, p97: 15.7 },
      { month: 36, p3: 11.3, p15: 12.8, p50: 14.6, p85: 16.5, p97: 18.2 },
      { month: 48, p3: 12.7, p15: 14.4, p50: 16.5, p85: 18.7, p97: 20.7 },
      { month: 60, p3: 14.0, p15: 15.9, p50: 18.3, p85: 20.9, p97: 23.2 },
    ]
  },
  height: {
    // Taille en cm par âge en mois
    data: [
      { month: 0, p3: 46.3, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.4 },
      { month: 3, p3: 57.6, p15: 59.5, p50: 61.4, p85: 63.4, p97: 65.3 },
      { month: 6, p3: 63.6, p15: 65.7, p50: 67.6, p85: 69.6, p97: 71.6 },
      { month: 9, p3: 68.0, p15: 70.1, p50: 72.0, p85: 74.2, p97: 76.2 },
      { month: 12, p3: 71.7, p15: 73.8, p50: 76.0, p85: 78.1, p97: 80.2 },
      { month: 18, p3: 77.5, p15: 79.9, p50: 82.3, p85: 84.6, p97: 87.0 },
      { month: 24, p3: 82.5, p15: 85.0, p50: 87.6, p85: 90.2, p97: 92.7 },
      { month: 36, p3: 90.3, p15: 93.1, p50: 96.0, p85: 99.0, p97: 101.8 },
      { month: 48, p3: 96.9, p15: 100.0, p50: 103.3, p85: 106.6, p97: 109.7 },
      { month: 60, p3: 102.7, p15: 106.1, p50: 109.7, p85: 113.3, p97: 116.7 },
    ]
  },
  headCircumference: {
    // Périmètre crânien en cm (0-36 mois)
    data: [
      { month: 0, p3: 32.4, p15: 33.5, p50: 34.5, p85: 35.5, p97: 36.6 },
      { month: 3, p3: 38.3, p15: 39.3, p50: 40.5, p85: 41.7, p97: 42.7 },
      { month: 6, p3: 41.0, p15: 42.1, p50: 43.3, p85: 44.6, p97: 45.6 },
      { month: 9, p3: 43.0, p15: 44.1, p50: 45.3, p85: 46.5, p97: 47.6 },
      { month: 12, p3: 44.3, p15: 45.4, p50: 46.5, p85: 47.7, p97: 48.8 },
      { month: 18, p3: 45.9, p15: 46.9, p50: 48.1, p85: 49.2, p97: 50.3 },
      { month: 24, p3: 46.9, p15: 47.9, p50: 49.0, p85: 50.1, p97: 51.2 },
      { month: 36, p3: 48.0, p15: 49.0, p50: 50.0, p85: 51.1, p97: 52.1 },
    ]
  }
};

// Données OMS pour filles
const WHO_DATA_GIRLS = {
  weight: {
    data: [
      { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
      { month: 3, p3: 4.0, p15: 4.6, p50: 5.4, p85: 6.2, p97: 7.0 },
      { month: 6, p3: 5.4, p15: 6.2, p50: 7.3, p85: 8.4, p97: 9.4 },
      { month: 9, p3: 6.4, p15: 7.3, p50: 8.5, p85: 9.8, p97: 10.9 },
      { month: 12, p3: 7.1, p15: 8.1, p50: 9.5, p85: 10.9, p97: 12.1 },
      { month: 18, p3: 8.2, p15: 9.4, p50: 10.9, p85: 12.5, p97: 13.9 },
      { month: 24, p3: 9.2, p15: 10.4, p50: 12.1, p85: 13.9, p97: 15.5 },
      { month: 36, p3: 10.8, p15: 12.2, p50: 14.1, p85: 16.2, p97: 18.0 },
      { month: 48, p3: 12.3, p15: 13.9, p50: 16.0, p85: 18.5, p97: 20.6 },
      { month: 60, p3: 13.7, p15: 15.5, p50: 17.9, p85: 20.8, p97: 23.3 },
    ]
  },
  height: {
    data: [
      { month: 0, p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.7 },
      { month: 3, p3: 56.2, p15: 57.9, p50: 59.8, p85: 61.8, p97: 63.5 },
      { month: 6, p3: 62.0, p15: 63.9, p50: 65.7, p85: 67.6, p97: 69.4 },
      { month: 9, p3: 66.1, p15: 68.1, p50: 70.1, p85: 72.1, p97: 74.1 },
      { month: 12, p3: 69.8, p15: 71.9, p50: 74.0, p85: 76.2, p97: 78.2 },
      { month: 18, p3: 75.8, p15: 78.1, p50: 80.7, p85: 83.2, p97: 85.5 },
      { month: 24, p3: 81.0, p15: 83.5, p50: 86.4, p85: 89.2, p97: 91.7 },
      { month: 36, p3: 89.2, p15: 92.1, p50: 95.1, p85: 98.2, p97: 101.1 },
      { month: 48, p3: 96.1, p15: 99.3, p50: 102.7, p85: 106.2, p97: 109.4 },
      { month: 60, p3: 102.2, p15: 105.7, p50: 109.4, p85: 113.2, p97: 116.6 },
    ]
  },
  headCircumference: {
    data: [
      { month: 0, p3: 31.7, p15: 32.7, p50: 33.9, p85: 35.1, p97: 36.1 },
      { month: 3, p3: 37.3, p15: 38.4, p50: 39.5, p85: 40.7, p97: 41.7 },
      { month: 6, p3: 40.0, p15: 41.1, p50: 42.2, p85: 43.4, p97: 44.5 },
      { month: 9, p3: 41.9, p15: 43.0, p50: 44.2, p85: 45.3, p97: 46.4 },
      { month: 12, p3: 43.1, p15: 44.2, p50: 45.4, p85: 46.5, p97: 47.6 },
      { month: 18, p3: 44.6, p15: 45.7, p50: 46.8, p85: 48.0, p97: 49.0 },
      { month: 24, p3: 45.6, p15: 46.6, p50: 47.8, p85: 48.9, p97: 49.9 },
      { month: 36, p3: 46.7, p15: 47.7, p50: 48.9, p85: 50.0, p97: 51.0 },
    ]
  }
};

const CHART_TYPES = {
  weight: { label: 'Poids', unit: 'kg', icon: Scale, color: '#3b82f6' },
  height: { label: 'Taille', unit: 'cm', icon: Ruler, color: '#22c55e' },
  headCircumference: { label: 'Périmètre crânien', unit: 'cm', icon: Baby, color: '#a855f7' }
};

const getPercentile = (value, whoData, month) => {
  const dataPoint = whoData.find(d => d.month === month) || whoData[whoData.length - 1];
  if (!dataPoint) return null;
  
  if (value <= dataPoint.p3) return '< P3';
  if (value <= dataPoint.p15) return 'P3-P15';
  if (value <= dataPoint.p50) return 'P15-P50';
  if (value <= dataPoint.p85) return 'P50-P85';
  if (value <= dataPoint.p97) return 'P85-P97';
  return '> P97';
};

const getPercentileColor = (percentile) => {
  if (!percentile) return 'bg-slate-100 text-slate-800';
  if (percentile === '< P3' || percentile === '> P97') return 'bg-red-100 text-red-800';
  if (percentile === 'P3-P15' || percentile === 'P85-P97') return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

export default function PediatricGrowthCharts({ patient }) {
  const [chartType, setChartType] = useState('weight');
  
  const birthDate = patient.birthDate ? new Date(patient.birthDate) : null;
  const ageInMonths = birthDate ? differenceInMonths(new Date(), birthDate) : 0;
  const ageInYears = birthDate ? differenceInYears(new Date(), birthDate) : 0;
  const isMale = patient.gender === 'male';

  // Vérifier si c'est un enfant (< 18 ans)
  const isChild = ageInYears < 18;
  const isPediatric = ageInMonths <= 60; // Courbes OMS jusqu'à 5 ans

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['growthMeasurements', patient.id],
    queryFn: () => base44.entities.GrowthMeasurement.filter(
      { patient_id: patient.id },
      'date_mesure',
      100
    ),
    enabled: isChild
  });

  const whoData = isMale ? WHO_DATA_BOYS : WHO_DATA_GIRLS;
  const chartConfig = CHART_TYPES[chartType];
  const ChartIcon = chartConfig.icon;

  // Préparer les données du graphique
  const chartData = useMemo(() => {
    const baseData = whoData[chartType]?.data || [];
    
    // Ajouter les mesures du patient
    const patientData = measurements.map(m => {
      const measureDate = new Date(m.date_mesure);
      const monthAge = birthDate ? differenceInMonths(measureDate, birthDate) : 0;
      
      let value = null;
      if (chartType === 'weight') value = m.poids_kg;
      else if (chartType === 'height') value = m.taille_cm;
      else if (chartType === 'headCircumference') value = m.perimetre_cranien_cm;
      
      return { month: monthAge, patientValue: value, date: m.date_mesure };
    }).filter(d => d.patientValue !== null);

    // Fusionner avec les courbes OMS
    return baseData.map(d => {
      const patientPoint = patientData.find(p => Math.abs(p.month - d.month) <= 1);
      return {
        ...d,
        patientValue: patientPoint?.patientValue,
        patientDate: patientPoint?.date
      };
    });
  }, [measurements, chartType, whoData, birthDate]);

  // Dernière mesure
  const latestMeasurement = measurements[measurements.length - 1];
  const currentValue = latestMeasurement ? 
    (chartType === 'weight' ? latestMeasurement.poids_kg : 
     chartType === 'height' ? latestMeasurement.taille_cm : 
     latestMeasurement.perimetre_cranien_cm) : null;

  const currentPercentile = currentValue && whoData[chartType] ? 
    getPercentile(currentValue, whoData[chartType].data, ageInMonths) : null;

  if (!isChild) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Les courbes de croissance sont disponibles uniquement pour les patients pédiatriques.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Courbes de croissance OMS
            <Badge variant="outline" className="ml-2">
              {ageInMonths} mois ({isMale ? '♂' : '♀'})
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Sélecteur de type */}
        <Tabs value={chartType} onValueChange={setChartType} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(CHART_TYPES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Valeur actuelle */}
        {currentValue && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ChartIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{chartConfig.label} actuel:</span>
              <span className="font-bold text-lg">{currentValue} {chartConfig.unit}</span>
            </div>
            {currentPercentile && (
              <Badge className={getPercentileColor(currentPercentile)}>
                {currentPercentile}
              </Badge>
            )}
          </div>
        )}

        {/* Graphique */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isPediatric ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Courbes OMS disponibles jusqu'à 5 ans</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  label={{ value: 'Âge (mois)', position: 'insideBottom', offset: -5 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: chartConfig.unit, angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    const labels = {
                      p3: 'P3', p15: 'P15', p50: 'P50 (médiane)', 
                      p85: 'P85', p97: 'P97', patientValue: 'Patient'
                    };
                    return [`${value} ${chartConfig.unit}`, labels[name] || name];
                  }}
                  labelFormatter={(month) => `${month} mois`}
                />
                
                {/* Zones de percentiles */}
                <Area type="monotone" dataKey="p97" stackId="1" fill="#fee2e2" stroke="none" />
                <Area type="monotone" dataKey="p85" stackId="2" fill="#fef3c7" stroke="none" />
                <Area type="monotone" dataKey="p50" stackId="3" fill="#dcfce7" stroke="none" />
                <Area type="monotone" dataKey="p15" stackId="4" fill="#fef3c7" stroke="none" />
                <Area type="monotone" dataKey="p3" stackId="5" fill="#fee2e2" stroke="none" />
                
                {/* Lignes de percentiles */}
                <Line type="monotone" dataKey="p97" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="p85" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p15" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="p3" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                
                {/* Données du patient */}
                <Line 
                  type="monotone" 
                  dataKey="patientValue" 
                  stroke={chartConfig.color} 
                  strokeWidth={3}
                  dot={{ fill: chartConfig.color, strokeWidth: 2, r: 5 }}
                  connectNulls
                />
                
                {/* Ligne de l'âge actuel */}
                <ReferenceLine x={ageInMonths} stroke="#6366f1" strokeDasharray="5 5" label={{ value: 'Aujourd\'hui', fill: '#6366f1', fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Légende */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>P50 (médiane)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-yellow-500 border-dashed"></div>
            <span>P15 / P85</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-red-500 border-dashed"></div>
            <span>P3 / P97</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartConfig.color }}></div>
            <span>Patient</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}