import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileCheck } from 'lucide-react';

export default function DMGSection({ dmgs, totalPatients }) {
  const stats = useMemo(() => {
    const actifs = (dmgs || []).filter(d => d.statut === 'ACTIF').length;
    const expires = (dmgs || []).filter(d => d.statut === 'EXPIRE').length;
    const suspendus = (dmgs || []).filter(d => d.statut === 'SUSPENDU').length;
    const aucun = Math.max(0, totalPatients - actifs - expires - suspendus);
    return { actifs, expires, suspendus, aucun };
  }, [dmgs, totalPatients]);

  const chartData = [
    { name: 'DMG Actif', value: stats.actifs, fill: '#10b981' },
    { name: 'Expiré', value: stats.expires, fill: '#f59e0b' },
    { name: 'Suspendu', value: stats.suspendus, fill: '#ef4444' },
    { name: 'Sans DMG', value: stats.aucun, fill: '#94a3b8' },
  ].filter(d => d.value > 0);

  const pctActif = totalPatients > 0 ? Math.round((stats.actifs / totalPatients) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-green-600" />
          Statut DMG
          <Badge variant={pctActif > 70 ? 'default' : pctActif > 40 ? 'secondary' : 'destructive'} className="ml-auto">
            {pctActif}% actifs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {[
                { label: 'DMG Actifs', value: stats.actifs, color: '#10b981' },
                { label: 'Expirés', value: stats.expires, color: '#f59e0b' },
                { label: 'Suspendus', value: stats.suspendus, color: '#ef4444' },
                { label: 'Sans DMG', value: stats.aucun, color: '#94a3b8' },
              ].map((item, i) => {
                const pct = totalPatients > 0 ? Math.round((item.value / totalPatients) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value} ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucun DMG enregistré — {totalPatients} patients sans DMG
          </div>
        )}
      </CardContent>
    </Card>
  );
}