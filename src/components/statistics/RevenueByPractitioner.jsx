import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

export default function RevenueByPractitioner({ analytics, isLoading }) {
  if (isLoading || !analytics) {
    return <div className="text-center py-12">Chargement des données...</div>;
  }

  const revenueByPractitioner = analytics.invoices.reduce((acc, inv) => {
    const practitioner = inv.provider_id || inv.created_by || 'Inconnu';
    if (!acc[practitioner]) {
      acc[practitioner] = {
        total: 0,
        paid: 0,
        unpaid: 0,
        count: 0
      };
    }
    acc[practitioner].total += (inv.total_amount || 0) / 100;
    if (inv.status === 'PAID') {
      acc[practitioner].paid += (inv.total_amount || 0) / 100;
    } else {
      acc[practitioner].unpaid += (inv.total_amount || 0) / 100;
    }
    acc[practitioner].count += 1;
    return acc;
  }, {});

  const chartData = Object.entries(revenueByPractitioner).map(([name, data]) => ({
    name: name.split('@')[0],
    total: data.total,
    payé: data.paid,
    impayé: data.unpaid
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Revenus par praticien</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
              <Legend />
              <Bar dataKey="payé" fill="#10b981" />
              <Bar dataKey="impayé" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {Object.entries(revenueByPractitioner).map(([name, data]) => (
          <Card key={name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-lg">{name.split('@')[0]}</h4>
                  <p className="text-sm text-slate-600">{data.count} factures</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{data.total.toFixed(2)}€</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-800">
                      Payé: {data.paid.toFixed(2)}€
                    </Badge>
                    <Badge className="bg-red-100 text-red-800">
                      Impayé: {data.unpaid.toFixed(2)}€
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}