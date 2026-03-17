import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, Percent, BarChart3, MapPin, Activity } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const GENDER_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6'];
const AGE_COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const INSURANCE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function PopulationStats({ stats, medicalStats }) {
  if (!stats) return null;
  const { total, matched, percentage, genderBreakdown, ageBreakdown, insuranceBreakdown, cityBreakdown } = stats;

  const genderData = [
    { name: 'Hommes', value: genderBreakdown.male },
    { name: 'Femmes', value: genderBreakdown.female },
    ...(genderBreakdown.other > 0 ? [{ name: 'Autre', value: genderBreakdown.other }] : []),
  ].filter(d => d.value > 0);

  const ageData = Object.entries(ageBreakdown).map(([name, value]) => ({ name: name + ' ans', value })).filter(d => d.value > 0);

  const insuranceData = Object.entries(insuranceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const topCities = Object.entries(cityBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Vaccination radar
  const vacRadar = medicalStats?.vaccinationCoverage
    ? Object.entries(medicalStats.vaccinationCoverage)
        .filter(([, v]) => v.total > 0)
        .map(([name, v]) => ({
          name,
          couverture: Math.round((v.vaccinated / v.total) * 100),
        }))
    : [];

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard icon={Users} label="Population totale" value={total} color="bg-slate-600" />
        <KPICard icon={UserCheck} label="Cohorte extraite" value={matched} color="bg-blue-600" />
        <KPICard icon={Percent} label="Proportion" value={`${percentage}%`} color="bg-green-600" />
        <KPICard icon={Activity} label="Âge moyen" value={medicalStats?.avgAge ? `${medicalStats.avgAge} ans` : '–'} color="bg-amber-600" />
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ratio</span>
            </div>
            <Progress value={percentage} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1.5">{matched} sur {total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      {matched > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {genderData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Répartition par sexe</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {genderData.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

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
                      {ageData.map((_, i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {insuranceData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Régimes d'assurance</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={insuranceData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                      {insuranceData.map((_, i) => <Cell key={i} fill={INSURANCE_COLORS[i % INSURANCE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {insuranceData.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      <span className="w-2 h-2 rounded-full mr-1 inline-block" style={{ backgroundColor: INSURANCE_COLORS[i % INSURANCE_COLORS.length] }} />
                      {d.name} ({d.value})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts row 2: vaccination radar + top cities */}
      {matched > 0 && (vacRadar.length > 0 || topCities.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vacRadar.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Couverture vaccinale de la cohorte</p>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={vacRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" fontSize={11} />
                    <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                    <Radar name="Couverture %" dataKey="couverture" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip formatter={v => `${v}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {topCities.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Répartition géographique
                </p>
                <div className="space-y-2">
                  {topCities.map(([city, count], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-28 truncate font-medium">{city}</span>
                      <div className="flex-1">
                        <Progress value={(count / matched) * 100} className="h-2" />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">{count} ({Math.round((count / matched) * 100)}%)</span>
                    </div>
                  ))}
                </div>
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