import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Heart } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const TYPE_LABELS = {
  'maladie_chronique': 'Maladies chroniques', 'maladie_passee': 'Maladies passées',
  'allergie': 'Allergies', 'chirurgie': 'Chirurgies', 'antecedent_familial': 'Antécédents familiaux'
};

export default function ChronicDiseasesSection({ medicalHistories }) {
  const stats = useMemo(() => {
    const byType = {};
    const chronic = {};
    const chronicPatients = new Set();
    (medicalHistories || []).forEach(h => {
      byType[h.type || 'autre'] = (byType[h.type || 'autre'] || 0) + 1;
      if (h.type === 'maladie_chronique' && h.is_active) {
        chronic[h.title] = (chronic[h.title] || 0) + 1;
        chronicPatients.add(h.patient_id);
      }
    });
    return { byType, chronic, chronicCount: chronicPatients.size };
  }, [medicalHistories]);

  const typeData = Object.entries(stats.byType)
    .map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);

  const topChronic = Object.entries(stats.chronic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Antécédents par catégorie
            <Badge variant="secondary" className="ml-auto">{(medicalHistories || []).length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={70} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucun antécédent</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            Top 10 pathologies chroniques
            <Badge variant="outline" className="ml-auto">{stats.chronicCount} patients</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {topChronic.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
                    style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                    {i + 1}
                  </Badge>
                  <span className="text-sm font-medium">{c.name}</span>
                </div>
                <Badge>{c.value} patients</Badge>
              </div>
            ))}
            {topChronic.length === 0 && (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucune pathologie chronique</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}