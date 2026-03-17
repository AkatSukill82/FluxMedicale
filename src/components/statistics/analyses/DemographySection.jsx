import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Users } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function DemographySection({ patients }) {
  const ageDistribution = useMemo(() => {
    const buckets = { '0-17': 0, '18-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76+': 0 };
    (patients || []).forEach(p => {
      if (!p.birthDate) return;
      const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) buckets['0-17']++;
      else if (age <= 30) buckets['18-30']++;
      else if (age <= 45) buckets['31-45']++;
      else if (age <= 60) buckets['46-60']++;
      else if (age <= 75) buckets['61-75']++;
      else buckets['76+']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [patients]);

  const pyramidData = useMemo(() => {
    const buckets = ['0-17', '18-30', '31-45', '46-60', '61-75', '76+'];
    const result = buckets.map(b => ({ name: b, hommes: 0, femmes: 0 }));
    (patients || []).forEach(p => {
      if (!p.birthDate) return;
      const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      let idx = age < 18 ? 0 : age <= 30 ? 1 : age <= 45 ? 2 : age <= 60 ? 3 : age <= 75 ? 4 : 5;
      if (p.gender === 'male') result[idx].hommes++;
      else if (p.gender === 'female') result[idx].femmes++;
    });
    return result;
  }, [patients]);

  const genderDistribution = useMemo(() => {
    const counts = { male: 0, female: 0, other: 0 };
    (patients || []).forEach(p => {
      if (p.gender === 'male') counts.male++;
      else if (p.gender === 'female') counts.female++;
      else counts.other++;
    });
    return [
      { name: 'Hommes', value: counts.male, fill: '#3b82f6' },
      { name: 'Femmes', value: counts.female, fill: '#ec4899' },
      ...(counts.other > 0 ? [{ name: 'Autre', value: counts.other, fill: '#94a3b8' }] : [])
    ];
  }, [patients]);

  const avgAge = useMemo(() => {
    const ages = (patients || [])
      .filter(p => p.birthDate)
      .map(p => Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
    if (ages.length === 0) return 0;
    return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
  }, [patients]);

  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Users className="w-3.5 h-3.5 mr-1.5" />
          {patients?.length || 0} patients
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3">
          Âge moyen : {avgAge} ans
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3" style={{ color: '#3b82f6' }}>
          ♂ {genderDistribution.find(g => g.name === 'Hommes')?.value || 0}
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3" style={{ color: '#ec4899' }}>
          ♀ {genderDistribution.find(g => g.name === 'Femmes')?.value || 0}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pyramide des âges par genre */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Pyramide des âges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pyramidData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hommes" name="Hommes" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="stack" />
                <Bar dataKey="femmes" name="Femmes" fill="#ec4899" radius={[4, 4, 0, 0]} stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par genre */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Répartition par genre</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={genderDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {genderDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}