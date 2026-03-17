import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, Percent, BarChart3 } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6'];
const AGE_COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PopulationStats({ stats }) {
  if (!stats) return null;

  const { total, matched, percentage, genderBreakdown, ageBreakdown } = stats;

  const genderData = [
    { name: 'Hommes', value: genderBreakdown.male },
    { name: 'Femmes', value: genderBreakdown.female },
    ...(genderBreakdown.other > 0 ? [{ name: 'Autre', value: genderBreakdown.other }] : []),
  ].filter(d => d.value > 0);

  const ageData = Object.entries(ageBreakdown)
    .map(([name, value]) => ({ name: name + ' ans', value }))
    .filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={Users} label="Population totale" value={total} color="bg-slate-600" />
        <KPICard icon={UserCheck} label="Cohorte extraite" value={matched} color="bg-blue-600" />
        <KPICard icon={Percent} label="Proportion" value={`${percentage}%`} color="bg-green-600" />
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ratio</span>
            </div>
            <Progress value={percentage} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1.5">{matched} sur {total} patients</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {matched > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gender pie */}
          {genderData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Répartition par sexe</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Age bar */}
          {ageData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Répartition par âge</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ageData}>
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {ageData.map((_, i) => (
                        <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}