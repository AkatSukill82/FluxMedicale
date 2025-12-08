import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Heart, Droplet, Wind, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function VitalSignsChart({ patientId }) {
  const [activeTab, setActiveTab] = useState('blood_pressure');

  const { data: vitalSigns = [], isLoading } = useQuery({
    queryKey: ['vital-signs', patientId],
    queryFn: () => base44.entities.VitalSigns.filter({ patient_id: patientId }, '-measured_at'),
    enabled: !!patientId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (vitalSigns.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun paramètre vital enregistré</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const chartData = vitalSigns.map(vs => ({
    date: format(parseISO(vs.measured_at), 'dd/MM', { locale: fr }),
    fullDate: format(parseISO(vs.measured_at), 'dd MMM yyyy HH:mm', { locale: fr }),
    systolic: vs.blood_pressure_systolic,
    diastolic: vs.blood_pressure_diastolic,
    heart_rate: vs.heart_rate,
    temperature: vs.temperature,
    weight: vs.weight,
    oxygen_saturation: vs.oxygen_saturation,
    glucose: vs.glucose_level
  })).reverse();

  // Calculate trends
  const calculateTrend = (field) => {
    const values = chartData.map(d => d[field]).filter(v => v);
    if (values.length < 2) return null;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    const diff = latest - previous;
    return { value: diff, isUp: diff > 0, percentage: Math.abs((diff / previous) * 100).toFixed(1) };
  };

  const tabs = [
    {
      value: 'blood_pressure',
      label: 'Tension',
      icon: Heart,
      color: '#ef4444',
      dataKeys: ['systolic', 'diastolic'],
      unit: 'mmHg'
    },
    {
      value: 'heart_rate',
      label: 'Pouls',
      icon: Activity,
      color: '#3b82f6',
      dataKeys: ['heart_rate'],
      unit: 'bpm'
    },
    {
      value: 'temperature',
      label: 'Température',
      icon: Wind,
      color: '#f59e0b',
      dataKeys: ['temperature'],
      unit: '°C'
    },
    {
      value: 'oxygen',
      label: 'SpO2',
      icon: Droplet,
      color: '#10b981',
      dataKeys: ['oxygen_saturation'],
      unit: '%'
    }
  ];

  const activeTabData = tabs.find(t => t.value === activeTab);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Évolution des Paramètres Vitaux
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map(tab => {
            const trend = calculateTrend(tab.dataKeys[0]);
            return (
              <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                {/* Trend Indicator */}
                {trend && (
                  <div className="flex items-center justify-end gap-2 text-sm">
                    {trend.isUp ? (
                      <TrendingUp className="w-4 h-4 text-red-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-600" />
                    )}
                    <span className={trend.isUp ? 'text-red-600' : 'text-green-600'}>
                      {trend.isUp ? '+' : ''}{trend.value.toFixed(1)} {tab.unit} ({trend.percentage}%)
                    </span>
                  </div>
                )}

                {/* Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullDate;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    {tab.dataKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={idx === 0 ? tab.color : '#9333ea'}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name={key === 'systolic' ? 'Systolique' : key === 'diastolic' ? 'Diastolique' : tab.label}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Latest Values */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {chartData.slice(-4).reverse().map((d, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">{d.fullDate}</p>
                      {tab.dataKeys.map(key => (
                        d[key] && (
                          <p key={key} className="font-semibold">
                            {d[key]} {tab.unit}
                          </p>
                        )
                      ))}
                    </div>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}