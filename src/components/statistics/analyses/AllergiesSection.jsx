import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const TYPE_LABELS = { 'MEDICATION': 'Médicaments', 'FOOD': 'Alimentaires', 'ENVIRONMENTAL': 'Environnementales', 'OTHER': 'Autres' };
const SEVERITY_LABELS = { 'MILD': 'Légère', 'MODERATE': 'Modérée', 'SEVERE': 'Sévère', 'LIFE_THREATENING': 'Vitale' };
const SEVERITY_COLORS = { 'MILD': '#10b981', 'MODERATE': '#f59e0b', 'SEVERE': '#f97316', 'LIFE_THREATENING': '#ef4444' };

export default function AllergiesSection({ allergies }) {
  const stats = useMemo(() => {
    const byType = {};
    const bySeverity = {};
    const topAllergens = {};
    const patientsSet = new Set();
    (allergies || []).filter(a => a.status === 'ACTIVE').forEach(a => {
      byType[a.allergen_type || 'OTHER'] = (byType[a.allergen_type || 'OTHER'] || 0) + 1;
      bySeverity[a.severity || 'MILD'] = (bySeverity[a.severity || 'MILD'] || 0) + 1;
      topAllergens[a.allergen] = (topAllergens[a.allergen] || 0) + 1;
      patientsSet.add(a.patient_id);
    });
    return { byType, bySeverity, topAllergens, patientsCount: patientsSet.size };
  }, [allergies]);

  const typeData = Object.entries(stats.byType).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }));
  const sevData = Object.entries(stats.bySeverity).map(([k, v]) => ({ name: SEVERITY_LABELS[k] || k, value: v, fill: SEVERITY_COLORS[k] || '#94a3b8' }));
  const topData = Object.entries(stats.topAllergens).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Par type
            <Badge variant="secondary" className="ml-auto">{stats.patientsCount} patients</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sévérité</CardTitle>
        </CardHeader>
        <CardContent>
          {sevData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sevData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {sevData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top 10 allergènes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {topData.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
                    style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                    {i + 1}
                  </Badge>
                  <span className="text-sm font-medium">{a.name}</span>
                </div>
                <Badge variant="secondary">{a.value}</Badge>
              </div>
            ))}
            {topData.length === 0 && <Empty />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucune allergie active</div>;
}