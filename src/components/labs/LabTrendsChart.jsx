import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

// Paramètres couramment suivis
const TRACKABLE_PARAMS = [
  { key: 'glycemie', labels: ['Glycémie à jeun', 'Glycémie'], color: '#8884d8' },
  { key: 'hba1c', labels: ['HbA1c'], color: '#82ca9d' },
  { key: 'cholesterol', labels: ['Cholestérol total'], color: '#ffc658' },
  { key: 'ldl', labels: ['LDL'], color: '#ff7300' },
  { key: 'hdl', labels: ['HDL'], color: '#00C49F' },
  { key: 'triglycerides', labels: ['Triglycérides'], color: '#FFBB28' },
  { key: 'creatinine', labels: ['Créatinine'], color: '#FF8042' },
  { key: 'hemoglobine', labels: ['Hémoglobine'], color: '#e74c3c' },
  { key: 'tsh', labels: ['TSH'], color: '#9b59b6' },
  { key: 'crp', labels: ['CRP'], color: '#1abc9c' },
  { key: 'ferritine', labels: ['Ferritine'], color: '#34495e' },
  { key: 'vitd', labels: ['Vitamine D'], color: '#f39c12' },
];

export default function LabTrendsChart({ labResults, patient }) {
  const [selectedParam, setSelectedParam] = useState('glycemie');
  const [timeRange, setTimeRange] = useState('1y');

  // Extraire les paramètres disponibles dans les résultats
  const availableParams = useMemo(() => {
    const allParams = new Set();
    labResults.forEach(result => {
      result.resultats?.forEach(r => {
        allParams.add(r.parametre);
      });
    });
    return Array.from(allParams);
  }, [labResults]);

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    const paramConfig = TRACKABLE_PARAMS.find(p => p.key === selectedParam);
    if (!paramConfig) return { data: [], refMin: null, refMax: null };

    const data = [];
    let refMin = null;
    let refMax = null;

    // Filtrer par période
    const now = new Date();
    const rangeMs = {
      '3m': 90 * 24 * 60 * 60 * 1000,
      '6m': 180 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
      '2y': 730 * 24 * 60 * 60 * 1000,
      'all': Infinity
    }[timeRange];

    labResults
      .filter(result => {
        const date = new Date(result.date_prelevement);
        return now - date <= rangeMs;
      })
      .sort((a, b) => new Date(a.date_prelevement) - new Date(b.date_prelevement))
      .forEach(result => {
        const param = result.resultats?.find(r => 
          paramConfig.labels.some(label => 
            r.parametre.toLowerCase().includes(label.toLowerCase())
          )
        );
        
        if (param && param.valeur) {
          data.push({
            date: result.date_prelevement,
            dateFormatted: format(new Date(result.date_prelevement), 'd MMM yy', { locale: fr }),
            valeur: parseFloat(param.valeur),
            unite: param.unite,
            statut: param.statut,
            laboratoire: result.laboratoire
          });

          if (param.valeur_min !== undefined && refMin === null) {
            refMin = param.valeur_min;
          }
          if (param.valeur_max !== undefined && refMax === null) {
            refMax = param.valeur_max;
          }
        }
      });

    return { data, refMin, refMax };
  }, [labResults, selectedParam, timeRange]);

  // Calculer la tendance
  const trend = useMemo(() => {
    if (chartData.data.length < 2) return null;
    const first = chartData.data[0].valeur;
    const last = chartData.data[chartData.data.length - 1].valeur;
    const diff = last - first;
    const percentChange = ((diff / first) * 100).toFixed(1);
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      value: Math.abs(percentChange)
    };
  }, [chartData.data]);

  const paramConfig = TRACKABLE_PARAMS.find(p => p.key === selectedParam);

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedParam} onValueChange={setSelectedParam}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un paramètre" />
            </SelectTrigger>
            <SelectContent>
              {TRACKABLE_PARAMS.map(param => {
                const hasData = availableParams.some(ap => 
                  param.labels.some(l => ap.toLowerCase().includes(l.toLowerCase()))
                );
                return (
                  <SelectItem key={param.key} value={param.key} disabled={!hasData}>
                    {param.labels[0]} {!hasData && '(pas de données)'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {['3m', '6m', '1y', '2y', 'all'].map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === 'all' ? 'Tout' : range}
            </Button>
          ))}
        </div>
      </div>

      {/* Graphique */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: paramConfig?.color }} />
              Évolution: {paramConfig?.labels[0]}
            </CardTitle>
            
            {trend && (
              <Badge className={
                trend.direction === 'up' ? 'bg-orange-500' :
                trend.direction === 'down' ? 'bg-blue-500' : 'bg-slate-500'
              }>
                {trend.direction === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {trend.direction === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {trend.direction === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                {trend.direction === 'stable' ? 'Stable' : `${trend.value}%`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {chartData.data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Aucune donnée disponible pour ce paramètre</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-medium">{data.dateFormatted}</p>
                          <p className="text-lg font-bold" style={{ color: paramConfig?.color }}>
                            {data.valeur} {data.unite}
                          </p>
                          {data.laboratoire && (
                            <p className="text-xs text-slate-500">{data.laboratoire}</p>
                          )}
                          {data.statut && data.statut !== 'NORMAL' && (
                            <Badge className="mt-1" variant="outline">
                              {data.statut}
                            </Badge>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Zone de référence normale */}
                {chartData.refMin !== null && chartData.refMax !== null && (
                  <Area
                    type="monotone"
                    dataKey={() => chartData.refMax}
                    fill="#22c55e"
                    fillOpacity={0.1}
                    stroke="none"
                  />
                )}
                
                {/* Lignes de référence */}
                {chartData.refMin !== null && (
                  <ReferenceLine 
                    y={chartData.refMin} 
                    stroke="#22c55e" 
                    strokeDasharray="5 5"
                    label={{ value: 'Min', position: 'left', fontSize: 10 }}
                  />
                )}
                {chartData.refMax !== null && (
                  <ReferenceLine 
                    y={chartData.refMax} 
                    stroke="#22c55e" 
                    strokeDasharray="5 5"
                    label={{ value: 'Max', position: 'left', fontSize: 10 }}
                  />
                )}
                
                {/* Ligne des valeurs */}
                <Line
                  type="monotone"
                  dataKey="valeur"
                  stroke={paramConfig?.color || '#8884d8'}
                  strokeWidth={2}
                  dot={{ r: 5, fill: paramConfig?.color || '#8884d8' }}
                  activeDot={{ r: 8 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Légende */}
          {chartData.data.length > 0 && (
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: paramConfig?.color }} />
                <span>Valeur mesurée</span>
              </div>
              {chartData.refMin !== null && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0 border border-dashed border-green-500" />
                  <span className="text-green-600">Normes</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tableau récapitulatif */}
      {chartData.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historique des valeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Valeur</th>
                    <th className="text-center py-2">Statut</th>
                    <th className="text-left py-2">Laboratoire</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.data.slice().reverse().map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2">{item.dateFormatted}</td>
                      <td className="text-right font-medium">
                        {item.valeur} {item.unite}
                      </td>
                      <td className="text-center">
                        <Badge variant="outline" className={
                          item.statut === 'NORMAL' ? 'border-green-500 text-green-700' :
                          item.statut?.includes('CRITIQUE') ? 'border-red-500 text-red-700' :
                          'border-orange-500 text-orange-700'
                        }>
                          {item.statut || 'N/A'}
                        </Badge>
                      </td>
                      <td className="text-slate-600">{item.laboratoire || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}