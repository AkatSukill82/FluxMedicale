import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function FrequentActsReport({ analytics, isLoading }) {
  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoiceLines'],
    queryFn: () => base44.entities.InvoiceLine.list('-created_date', 1000)
  });

  if (isLoading || !analytics) {
    return <div className="text-center py-12">Chargement des données...</div>;
  }

  const actFrequency = invoiceLines.reduce((acc, line) => {
    const code = line.nomenclature_code || 'N/A';
    const label = line.nomenclature_label || 'Acte sans libellé';
    
    if (!acc[code]) {
      acc[code] = {
        code,
        label,
        count: 0,
        totalAmount: 0
      };
    }
    acc[code].count += line.quantity || 1;
    acc[code].totalAmount += line.amount || 0;
    return acc;
  }, {});

  const sortedActs = Object.values(actFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const chartData = sortedActs.map(act => ({
    code: act.code,
    label: act.label.substring(0, 30) + (act.label.length > 30 ? '...' : ''),
    nombre: act.count,
    montant: act.totalAmount
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Top 10 des actes les plus fréquents</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="code" type="category" width={80} />
              <Tooltip 
                formatter={(value, name) => name === 'nombre' ? value : `${value.toFixed(2)}€`}
                labelFormatter={(label) => {
                  const act = sortedActs.find(a => a.code === label);
                  return act ? act.label : label;
                }}
              />
              <Bar dataKey="nombre" fill="#3b82f6" name="Nombre" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {sortedActs.map((act, idx) => (
          <Card key={act.code}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="font-bold text-blue-600">#{idx + 1}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{act.label}</h4>
                      <Badge variant="outline">{act.code}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {act.count} fois • Montant total: {act.totalAmount.toFixed(2)}€
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">{act.count}</p>
                  <p className="text-xs text-slate-500">facturations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}