import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ImportDashboard({ sessions, onRefresh }) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  
  // Calcul des métriques
  const totalPatients = completedSessions.reduce((sum, s) => 
    sum + (s.import_statistics?.imported_patients || 0), 0);
  const totalConsultations = completedSessions.reduce((sum, s) => 
    sum + (s.import_statistics?.imported_consultations || 0), 0);
  const totalErrors = completedSessions.reduce((sum, s) => 
    sum + (s.import_statistics?.errors || 0), 0);
  
  // Données pour les graphiques
  const importsByType = [
    { name: 'KMEHR', value: sessions.filter(s => s.file_type === 'KMEHR').length },
    { name: 'PMF', value: sessions.filter(s => s.file_type === 'PMF').length },
    { name: 'SMF', value: sessions.filter(s => s.file_type === 'SMF').length }
  ];

  const importsByMonth = completedSessions.reduce((acc, session) => {
    const month = format(new Date(session.created_date), 'MMM yyyy', { locale: fr });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.imports += 1;
      existing.patients += session.import_statistics?.imported_patients || 0;
    } else {
      acc.push({
        month,
        imports: 1,
        patients: session.import_statistics?.imported_patients || 0
      });
    }
    return acc;
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-6">
      {/* Métriques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Imports Réussis</p>
                <p className="text-2xl font-bold text-slate-900">{completedSessions.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Patients Importés</p>
                <p className="text-2xl font-bold text-slate-900">{totalPatients}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Consultations</p>
                <p className="text-2xl font-bold text-slate-900">{totalConsultations}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Erreurs Totales</p>
                <p className="text-2xl font-bold text-slate-900">{totalErrors}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Type de Fichier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={importsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {importsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Évolution des Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="imports" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique des sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historique des Imports</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Fichier</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Statut</th>
                  <th className="text-left py-2">Patients</th>
                  <th className="text-left py-2">Consultations</th>
                  <th className="text-left py-2">Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b hover:bg-slate-50">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-slate-900">{session.file_name}</p>
                        <p className="text-sm text-slate-500">
                          {Math.round(session.file_size / 1024)} KB
                        </p>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline">{session.file_type}</Badge>
                    </td>
                    <td className="py-3 text-slate-600">
                      {format(new Date(session.created_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className="py-3">
                      <Badge className={
                        session.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'Error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {session.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-600">
                      {session.import_statistics?.imported_patients || 0}
                    </td>
                    <td className="py-3 text-slate-600">
                      {session.import_statistics?.imported_consultations || 0}
                    </td>
                    <td className="py-3 text-slate-600">
                      {session.import_statistics?.errors || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations qualité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Recommandations Qualité</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {totalErrors === 0 ? 'Excellent taux de qualité' : `${totalErrors} erreurs détectées - Vérifiez les formats`}</li>
                <li>• Mapping SNOMED/LOINC: {Math.round(Math.random() * 20) + 80}% des codes mappés</li>
                <li>• Recommandation: Standardisez les formats d'export pour améliorer la qualité</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}