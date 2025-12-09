import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Target, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function BudgetForecasting() {
  const [forecastMonths, setForecastMonths] = useState(6);

  const { data: forecastData, isLoading } = useQuery({
    queryKey: ['budgetForecast', forecastMonths],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.list('-invoice_date', 2000);

      // Calculer les revenus des 12 derniers mois
      const historicalData = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate >= monthStart && invDate <= monthEnd;
        });
        
        const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
        const monthPaid = monthInvoices
          .filter(inv => inv.status === 'PAID')
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
        
        historicalData.push({
          month: format(monthDate, 'MMM yyyy', { locale: fr }),
          revenue: monthRevenue,
          paid: monthPaid,
          invoiceCount: monthInvoices.length
        });
      }

      // Calcul des moyennes et tendances
      const averageRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0) / historicalData.length;
      const last3MonthsAvg = historicalData.slice(-3).reduce((sum, d) => sum + d.revenue, 0) / 3;
      const last6MonthsAvg = historicalData.slice(-6).reduce((sum, d) => sum + d.revenue, 0) / 6;

      // Calcul du taux de croissance (régression linéaire simple)
      const revenues = historicalData.map(d => d.revenue);
      const n = revenues.length;
      const xMean = (n - 1) / 2;
      const yMean = revenues.reduce((a, b) => a + b, 0) / n;
      
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (revenues[i] - yMean);
        denominator += Math.pow(i - xMean, 2);
      }
      const growthRate = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - growthRate * xMean;

      // Prévisions
      const forecastedData = [];
      for (let i = 1; i <= forecastMonths; i++) {
        const futureMonth = addMonths(now, i);
        const forecastedRevenue = Math.max(0, intercept + growthRate * (n + i - 1));
        
        // Ajouter une marge d'erreur (± 15%)
        const lowerBound = forecastedRevenue * 0.85;
        const upperBound = forecastedRevenue * 1.15;
        
        forecastedData.push({
          month: format(futureMonth, 'MMM yyyy', { locale: fr }),
          forecasted: forecastedRevenue,
          lowerBound,
          upperBound,
          type: 'forecast'
        });
      }

      // Combiner données historiques et prévisions
      const combinedData = [
        ...historicalData.slice(-6).map(d => ({ ...d, type: 'historical' })),
        ...forecastedData
      ];

      // Calcul des objectifs
      const monthlyTarget = averageRevenue * 1.1; // Objectif: +10% de la moyenne
      const yearlyTarget = monthlyTarget * 12;
      const projectedYearTotal = forecastedData.reduce((sum, d) => sum + d.forecasted, 0);
      const targetAchievement = (projectedYearTotal / yearlyTarget) * 100;

      // Analyse de tendance
      const trendAnalysis = {
        direction: growthRate > 0 ? 'positive' : growthRate < 0 ? 'negative' : 'stable',
        strength: Math.abs(growthRate) > 500 ? 'forte' : Math.abs(growthRate) > 200 ? 'modérée' : 'faible',
        monthlyGrowth: growthRate,
        percentageGrowth: averageRevenue > 0 ? ((growthRate / averageRevenue) * 100).toFixed(2) : 0
      };

      // Recommandations
      const recommendations = [];
      if (trendAnalysis.direction === 'negative') {
        recommendations.push({
          type: 'warning',
          message: 'Tendance baissière détectée. Envisagez d\'analyser les causes et d\'ajuster la stratégie.'
        });
      }
      if (targetAchievement < 90) {
        recommendations.push({
          type: 'warning',
          message: `Risque de ne pas atteindre l'objectif annuel (${targetAchievement.toFixed(1)}% projeté).`
        });
      }
      if (last3MonthsAvg > last6MonthsAvg * 1.1) {
        recommendations.push({
          type: 'success',
          message: 'Accélération récente des revenus. Maintenez cette dynamique!'
        });
      }

      return {
        historicalData,
        forecastedData,
        combinedData,
        averageRevenue,
        last3MonthsAvg,
        growthRate,
        trendAnalysis,
        monthlyTarget,
        yearlyTarget,
        projectedYearTotal,
        targetAchievement,
        recommendations
      };
    }
  });

  if (isLoading || !forecastData) {
    return <div className="text-center py-12">Calcul des prévisions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Résumé du prévisionnel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Revenu moyen</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">
              {forecastData.averageRevenue.toFixed(2)}€
            </p>
            <p className="text-xs text-slate-500 mt-1">Sur 12 mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Tendance</p>
              {forecastData.trendAnalysis.direction === 'positive' ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <p className="text-2xl font-bold capitalize">
              {forecastData.trendAnalysis.strength}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {forecastData.trendAnalysis.percentageGrowth}% par mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Prévision annuelle</p>
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">
              {forecastData.projectedYearTotal.toFixed(2)}€
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Prochain {forecastMonths} mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Atteinte objectif</p>
              {forecastData.targetAchievement >= 100 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <p className="text-2xl font-bold">
              {forecastData.targetAchievement.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Objectif: {forecastData.yearlyTarget.toFixed(0)}€
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommandations */}
      {forecastData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forecastData.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    rec.type === 'warning'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {rec.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <p className="text-sm">{rec.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graphique prévisionnel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prévisionnel sur {forecastMonths} mois</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={forecastMonths === 3 ? 'default' : 'outline'}
                onClick={() => setForecastMonths(3)}
              >
                3 mois
              </Button>
              <Button
                size="sm"
                variant={forecastMonths === 6 ? 'default' : 'outline'}
                onClick={() => setForecastMonths(6)}
              >
                6 mois
              </Button>
              <Button
                size="sm"
                variant={forecastMonths === 12 ? 'default' : 'outline'}
                onClick={() => setForecastMonths(12)}
              >
                12 mois
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={forecastData.combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value?.toFixed(2)}€`} />
              <Legend />
              <ReferenceLine y={forecastData.monthlyTarget} stroke="#8b5cf6" strokeDasharray="3 3" label="Objectif" />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Réel"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="forecasted"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Prévision"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="upperBound"
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="2 2"
                name="Fourchette haute"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lowerBound"
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="2 2"
                name="Fourchette basse"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Historique récent */}
      <Card>
        <CardHeader>
          <CardTitle>Performance récente (6 derniers mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={forecastData.historicalData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value?.toFixed(2)}€`} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenus" />
              <Bar dataKey="paid" fill="#10b981" name="Encaissé" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}