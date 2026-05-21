import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const categoryLabels = {
  ethique: 'Éthique', peer_review: 'Peer Review', congres: 'Congrès',
  elearning: 'E-Learning', seminaire: 'Séminaire', glem: 'GLEM', autre: 'Autre'
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

export default function AccreditationProgress({ formations, currentYear, cpTarget, eaTarget, detailed }) {
  const yearFormations = formations.filter(f => f.period_year === currentYear && f.status === 'completee');
  const totalCP = yearFormations.reduce((s, f) => s + (f.credits_cp || 0), 0);
  const totalEA = yearFormations.reduce((s, f) => s + (f.credits_ea || 0), 0);
  
  const cpPercent = Math.min((totalCP / cpTarget) * 100, 100);
  const eaPercent = Math.min((totalEA / eaTarget) * 100, 100);
  const isAccredited = totalCP >= cpTarget && totalEA >= eaTarget;

  // Category breakdown
  const catData = Object.entries(
    yearFormations.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + (f.credits_cp || 0);
      return acc;
    }, {})
  ).map(([cat, cp]) => ({ name: categoryLabels[cat] || cat, value: cp }));

  // Monthly progress
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const monthFormations = yearFormations.filter(f => new Date(f.date).getMonth() === i);
    return {
      month: format(new Date(currentYear, i, 1), 'MMM', { locale: fr }),
      cp: monthFormations.reduce((s, f) => s + (f.credits_cp || 0), 0),
      ea: monthFormations.reduce((s, f) => s + (f.credits_ea || 0), 0),
    };
  });

  // 3-year history
  const historyData = [currentYear - 2, currentYear - 1, currentYear].map(year => {
    const yf = formations.filter(f => f.period_year === year && f.status === 'completee');
    return {
      year: year.toString(),
      cp: yf.reduce((s, f) => s + (f.credits_cp || 0), 0),
      ea: yf.reduce((s, f) => s + (f.credits_ea || 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      {/* Accreditation status */}
      <Card className={isAccredited ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isAccredited ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            )}
            <div>
              <h3 className="font-bold text-lg">
                {isAccredited ? 'Accréditation INAMI validée' : 'Accréditation en cours'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isAccredited
                  ? `Félicitations ! Vous avez atteint les ${cpTarget} CP et ${eaTarget} EA requis pour ${currentYear}.`
                  : `Il vous reste ${Math.max(0, cpTarget - totalCP)} CP et ${Math.max(0, eaTarget - totalEA)} EA pour compléter votre accréditation ${currentYear}.`
                }
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Crédits CP</span>
                <span className="font-medium">{totalCP}/{cpTarget}</span>
              </div>
              <Progress value={cpPercent} className="h-3" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Crédits Éthique</span>
                <span className="font-medium">{totalEA}/{eaTarget}</span>
              </div>
              <Progress value={eaPercent} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly progress chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Progression mensuelle {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cp" fill="#3b82f6" name="CP" radius={[4,4,0,0]} />
                <Bar dataKey="ea" fill="#8b5cf6" name="EA" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4" />
              Répartition par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Aucune formation complétée cette année</div>
            )}
          </CardContent>
        </Card>
      </div>

      {detailed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historique sur 3 ans</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historyData}>
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cp" fill="#3b82f6" name="CP" radius={[4,4,0,0]} />
                <Bar dataKey="ea" fill="#8b5cf6" name="EA" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}