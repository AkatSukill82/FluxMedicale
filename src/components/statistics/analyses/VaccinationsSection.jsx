import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Syringe, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const VACC_TYPE_LABELS = {
  'COVID': 'COVID-19', 'GRIPPE': 'Grippe', 'TETANOS': 'Tétanos/dTpa',
  'HEPATITE_B': 'Hépatite B', 'PNEUMOCOQUE': 'Pneumocoque', 'HPV': 'HPV', 'AUTRE': 'Autres'
};

export default function VaccinationsSection({ vaccinations, patients, showCoverage }) {
  const totalPatients = patients?.length || 0;

  const vaccStats = useMemo(() => {
    const byType = {};
    const vaccinatedIds = new Set();
    (vaccinations || []).forEach(v => {
      const type = v.vaccine_type || 'AUTRE';
      byType[type] = (byType[type] || 0) + 1;
      vaccinatedIds.add(v.patient_id);
    });
    return { byType, vaccinatedCount: vaccinatedIds.size };
  }, [vaccinations]);

  const vaccChartData = Object.entries(vaccStats.byType)
    .map(([key, value]) => ({ name: VACC_TYPE_LABELS[key] || key, value, rawType: key }))
    .sort((a, b) => b.value - a.value);

  // Coverage per type
  const coverageData = useMemo(() => {
    return vaccChartData.map(vacc => {
      const patientsVaccinated = new Set(
        (vaccinations || [])
          .filter(v => (VACC_TYPE_LABELS[v.vaccine_type] || v.vaccine_type) === vacc.name)
          .map(v => v.patient_id)
      ).size;
      const pct = totalPatients > 0 ? Math.round((patientsVaccinated / totalPatients) * 100) : 0;
      return { ...vacc, patients: patientsVaccinated, pct };
    });
  }, [vaccChartData, vaccinations, totalPatients]);

  // Tendance par mois (derniers 12 mois)
  const trendData = useMemo(() => {
    const months = {};
    (vaccinations || []).forEach(v => {
      if (!v.vaccination_date) return;
      const d = new Date(v.vaccination_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, value]) => {
        const [y, m] = key.split('-');
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return { name: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`, value };
      });
  }, [vaccinations]);

  return (
    <div className="space-y-6">
      {/* Vaccinations par type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="w-5 h-5 text-blue-600" />
              Vaccinations par type
              <Badge variant="secondary" className="ml-auto">{vaccinations?.length || 0} doses</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vaccChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vaccChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={60} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" name="Doses" radius={[4, 4, 0, 0]}>
                    {vaccChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Aucune vaccination enregistrée" />
            )}
          </CardContent>
        </Card>

        {/* Tendance vaccinale */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Tendance vaccinale (12 mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" name="Vaccinations" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Aucune donnée de tendance" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Couverture vaccinale */}
      {showCoverage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Couverture vaccinale par maladie
              <Badge variant="outline" className="ml-auto">{totalPatients} patients</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coverageData.map((vacc, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{vacc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{vacc.patients}/{totalPatients}</span>
                      <Badge variant={vacc.pct > 50 ? 'default' : vacc.pct > 25 ? 'secondary' : 'destructive'}>
                        {vacc.pct}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={vacc.pct} className="h-2" />
                </div>
              ))}
              {coverageData.length === 0 && (
                <EmptyState text="Aucune donnée de vaccination" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{text}</div>;
}