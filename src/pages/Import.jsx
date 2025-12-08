import React, { useState, useEffect } from 'react';
import { ImportSession } from '@/entities/ImportSession';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Users,
  Activity,
  Archive,
  Shield,
  Eye
} from 'lucide-react';

import ImportUploader from '../components/import/ImportUploader';
import ValidationReport from '../components/import/ValidationReport';
import PatientMatching from '../components/import/PatientMatching';
import ImportDashboard from '../components/import/ImportDashboard';

export default function ImportPage() {
  const [importSessions, setImportSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadImportSessions();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const loadImportSessions = async () => {
    try {
      const sessions = await ImportSession.list('-created_date');
      setImportSessions(sessions);
    } catch (error) {
      console.error('Erreur chargement sessions:', error);
    }
  };

  const handleFileUploaded = async (sessionId) => {
    await loadImportSessions();
    const session = importSessions.find(s => s.id === sessionId);
    setCurrentSession(session);
    setActiveTab('validation');
  };

  const handleValidationComplete = (sessionId) => {
    setActiveTab('matching');
  };

  const handleMatchingComplete = (sessionId) => {
    setActiveTab('dashboard');
    loadImportSessions();
  };

  // Vérification des permissions
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Accès restreint</h3>
          <p className="text-slate-600">Seuls les médecins peuvent importer des données médicales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Import de Données Médicales</h1>
          <p className="text-slate-600 mt-1">
            Import PMF/SMF/KMEHR avec validation et matching automatisé
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            KMEHR 1.28
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            PMF/SMF Compatible
          </Badge>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Sessions Actives</p>
                <p className="text-2xl font-bold text-slate-900">
                  {importSessions.filter(s => s.status !== 'Completed').length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Imports Réussis</p>
                <p className="text-2xl font-bold text-slate-900">
                  {importSessions.filter(s => s.status === 'Completed').length}
                </p>
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
                <p className="text-2xl font-bold text-slate-900">
                  {importSessions.reduce((sum, s) => sum + (s.import_statistics?.imported_patients || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Fichiers Archivés</p>
                <p className="text-2xl font-bold text-slate-900">
                  {importSessions.length}
                </p>
              </div>
              <Archive className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface à onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="matching" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Matching
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Tableau de bord
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <ImportUploader 
            currentUser={currentUser}
            onFileUploaded={handleFileUploaded}
            onSessionSelected={setCurrentSession}
          />
        </TabsContent>

        <TabsContent value="validation">
          {currentSession && (
            <ValidationReport 
              session={currentSession}
              onValidationComplete={handleValidationComplete}
            />
          )}
        </TabsContent>

        <TabsContent value="matching">
          {currentSession && (
            <PatientMatching 
              session={currentSession}
              onMatchingComplete={handleMatchingComplete}
            />
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <ImportDashboard 
            sessions={importSessions}
            onRefresh={loadImportSessions}
          />
        </TabsContent>
      </Tabs>

      {/* Avertissement de conformité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Conformité et Sécurité</h4>
              <p className="text-sm text-blue-700">
                Tous les fichiers importés sont chiffrés au repos et en transit. 
                Les fichiers originaux sont conservés de manière sécurisée pour preuve.
                L'accès est restreint par rôle et toutes les actions sont auditées.
                Respect du consentement patient et des obligations RGPD.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}