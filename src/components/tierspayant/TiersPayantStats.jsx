import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TiersPayantStats({ factures }) {
  // Stats par statut
  const statsByStatus = factures.reduce((acc, f) => {
    acc[f.statut] = (acc[f.statut] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statsByStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Stats par mutuelle
  const statsByMutuelle = factures.reduce((acc, f) => {
    const key = f.mutuelle_nom || f.mutuelle_code || 'Autre';
    if (!acc[key]) {
      acc[key] = { count: 0, total: 0, paye: 0 };
    }
    acc[key].count++;
    acc[key].total += f.montant_a_recevoir_mutuelle || 0;
    if (f.statut === 'payee') {
      acc[key].paye += f.montant_paye || 0;
    }
    return acc;
  }, {});

  const mutuelleData = Object.entries(statsByMutuelle)
    .map(([name, data]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      total: data.total,
      paye: data.paye,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Evolution mensuelle (6 derniers mois)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    
    const monthFactures = factures.filter(f => {
      if (!f.date_facturation) return false;
      const factDate = new Date(f.date_facturation);
      return isWithinInterval(factDate, { start, end });
    });

    monthlyData.push({
      month: format(monthDate, 'MMM yy', { locale: fr }),
      envoye: monthFactures.filter(f => f.statut !== 'brouillon').reduce((s, f) => s + (f.montant_a_recevoir_mutuelle || 0), 0),
      recu: monthFactures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.montant_paye || 0), 0),
      count: monthFactures.length
    });
  }

  // Calculs globaux
  const totalEnvoye = factures.filter(f => f.statut !== 'brouillon').reduce((s, f) => s + (f.montant_a_recevoir_mutuelle || 0), 0);
  const totalRecu = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.montant_paye || 0), 0);
  const totalEnAttente = factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.montant_a_recevoir_mutuelle || 0), 0);
  const tauxRecouvrement = totalEnvoye > 0 ? (totalRecu / totalEnvoye * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total envoyé</p>
            <p className="text-2xl font-bold text-blue-600">{totalEnvoye.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total reçu</p>
            <p className="text-2xl font-bold text-emerald-600">{totalRecu.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold text-orange-600">{totalEnAttente.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Taux recouvrement</p>
            <p className="text-2xl font-bold text-purple-600">{tauxRecouvrement.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="w-4 h-4" />
              Répartition par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Par mutuelle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Montants par mutuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mutuelleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}€`} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
                  <Bar dataKey="total" fill="#3b82f6" name="Total facturé" />
                  <Bar dataKey="paye" fill="#10b981" name="Payé" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolution mensuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4" />
            Évolution mensuelle (6 derniers mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${v}€`} />
                <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="envoye" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Facturé" 
                />
                <Line 
                  type="monotone" 
                  dataKey="recu" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Reçu" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}