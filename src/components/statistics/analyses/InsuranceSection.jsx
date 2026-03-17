import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Shield } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const REGIME_LABELS = {
  'MUTUELLE_BE': 'Mutuelle belge',
  'RCAM': 'RCAM',
  'SNCB': 'SNCB/HR Rail',
  'CAAMI': 'CAAMI/HZIV',
  'OSSOM': 'OSSOM',
  'ASSURANCE_PRIVEE': 'Assurance privée',
  'AUCUN': 'Aucune couverture'
};

const STATUS_LABELS = {
  'EN_ORDRE': 'En ordre',
  'PAS_EN_ORDRE': 'Pas en ordre',
  'ACTIF': 'Actif',
  'SUSPENDU': 'Suspendu',
  'EXPIRE': 'Expiré',
  'NON_VERIFIE': 'Non vérifié'
};

const STATUS_COLORS = {
  'EN_ORDRE': '#10b981',
  'PAS_EN_ORDRE': '#ef4444',
  'ACTIF': '#10b981',
  'SUSPENDU': '#f59e0b',
  'EXPIRE': '#ef4444',
  'NON_VERIFIE': '#94a3b8'
};

export default function InsuranceSection({ patients }) {
  const regimeData = useMemo(() => {
    const counts = {};
    (patients || []).forEach(p => {
      const regime = p.insurance_regime || 'MUTUELLE_BE';
      counts[regime] = (counts[regime] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, value]) => ({ name: REGIME_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value);
  }, [patients]);

  const statusData = useMemo(() => {
    const counts = {};
    (patients || []).forEach(p => {
      const status = p.insurance_status || 'NON_VERIFIE';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value, fill: STATUS_COLORS[key] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [patients]);

  const mutuelleData = useMemo(() => {
    const counts = {};
    (patients || []).forEach(p => {
      if (p.mutuelle) {
        counts[p.mutuelle] = (counts[p.mutuelle] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [patients]);

  const total = patients?.length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Régime d'assurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {regimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={regimeData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value"
                  label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}>
                  {regimeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucune donnée</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Statut assurabilité</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucune donnée</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top mutuelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mutuelleData.map((m, i) => {
              const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
                      style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium truncate max-w-[140px]">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">{m.value}</Badge>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                </div>
              );
            })}
            {mutuelleData.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">Aucune mutuelle renseignée</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}