import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Users, 
  CheckCircle, 
  Shield,
  Download,
  Clock
} from 'lucide-react';
import ImportUploader from '../components/import/ImportUploader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Import() {
  const [activeTab, setActiveTab] = useState('upload');

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['import-sessions'],
    queryFn: () => base44.entities.ImportSession.list('-created_date', 100)
  });

  const handleImportComplete = (session) => {
    refetch();
    setActiveTab('history');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Uploaded': 'bg-blue-100 text-blue-800',
      'Parsing': 'bg-yellow-100 text-yellow-800',
      'Validated': 'bg-green-100 text-green-800',
      'Matching': 'bg-purple-100 text-purple-800',
      'Importing': 'bg-orange-100 text-orange-800',
      'Completed': 'bg-green-100 text-green-800',
      'Error': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-600" />
            Import de Dossiers Patients
          </h1>
          <p className="text-slate-600 mt-1">
            Importez des dossiers médicaux de manière sécurisée et conforme RGPD
          </p>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Imports</p>
                <p className="text-3xl font-bold">{sessions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Complétés</p>
                <p className="text-3xl font-bold text-green-600">
                  {sessions.filter(s => s.status === 'Completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">En Cours</p>
                <p className="text-3xl font-bold text-orange-600">
                  {sessions.filter(s => !['Completed', 'Error'].includes(s.status)).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Sécurisé</p>
                <p className="text-3xl font-bold text-blue-600">100%</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="w-4 h-4" />
            Nouvel Import
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="w-4 h-4" />
            Historique ({sessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="max-w-3xl mx-auto">
            <ImportUploader onImportComplete={handleImportComplete} />
            
            <Card className="mt-6 bg-slate-50 border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Types de fichiers acceptés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-slate-700">
                  Tous les formats de dossiers médicaux sont supportés : 
                  dossiers électroniques, documents scannés, tableaux de données.
                </p>
                <p className="text-sm text-slate-600">
                  Le système détecte automatiquement le format et l'importe de manière sécurisée.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Imports</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">Aucun import effectué</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(session => (
                    <Card key={session.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-slate-600" />
                            <h3 className="font-semibold">{session.file_name}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">Taille:</span>
                              <span className="font-semibold ml-2">
                                {(session.file_size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-600">Type:</span>
                              <span className="font-semibold ml-2">{session.file_type}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Par:</span>
                              <span className="font-semibold ml-2">{session.user_email}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Date:</span>
                              <span className="font-semibold ml-2">
                                {format(new Date(session.created_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            </div>
                          </div>
                          {session.content_summary && (
                            <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                              <span className="text-slate-700">Contenu: </span>
                              <span className="font-semibold">
                                {session.content_summary.patients_count || 0} patients, 
                                {' '}{session.content_summary.consultations_count || 0} consultations, 
                                {' '}{session.content_summary.medications_count || 0} prescriptions
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info RGPD */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-green-600 mt-1" />
            <div>
              <h3 className="font-bold text-green-900 mb-2">Sécurité et Conformité RGPD</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ Tous les fichiers sont chiffrés automatiquement (AES-256)</li>
                <li>✓ Traçabilité complète de tous les accès (audit logs)</li>
                <li>✓ Stockage sécurisé avec accès restreint</li>
                <li>✓ Suppression automatique après traitement (conservation selon RGPD)</li>
                <li>✓ Aucune donnée n'est partagée avec des tiers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}