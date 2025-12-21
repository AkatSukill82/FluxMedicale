import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart,
  Pill,
  Shield,
  FileText
} from 'lucide-react';
import { useMyHealthAtHand } from './useMyHealthAtHand';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyHealthSyncPanel({ patient }) {
  const [syncData, setSyncData] = useState(null);
  const [activeTab, setActiveTab] = useState('import');

  const {
    fetchPatientData,
    syncAllergies,
    syncVaccinations,
    updateMedications,
    pushToMyHealth
  } = useMyHealthAtHand(patient);

  const handleFetchData = async () => {
    const niss = patient?.identifier?.find(id => id.system.includes('ssin'))?.value;
    
    if (!niss) {
      return;
    }

    const result = await fetchPatientData.mutateAsync({ patientNISS: niss });
    setSyncData(result);
  };

  const handleImportAll = async () => {
    if (!syncData) return;

    // Importer les allergies
    if (syncData.allergies?.length > 0) {
      await syncAllergies.mutateAsync({ allergies: syncData.allergies });
    }

    // Importer les vaccinations
    if (syncData.vaccinations?.length > 0) {
      await syncVaccinations.mutateAsync({ vaccinations: syncData.vaccinations });
    }

    // Mettre à jour les traitements
    if (syncData.medications?.length > 0) {
      await updateMedications.mutateAsync({ medications: syncData.medications });
    }

    setSyncData(null);
  };

  const handlePushData = async () => {
    await pushToMyHealth.mutateAsync();
  };

  const isLoading = fetchPatientData.isPending || 
                    syncAllergies.isPending || 
                    syncVaccinations.isPending || 
                    updateMedications.isPending ||
                    pushToMyHealth.isPending;

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          MyHealth@Hand
        </CardTitle>
        <p className="text-sm text-slate-600">
          Synchronisation avec le portail de santé belge
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="import">
              <Download className="w-4 h-4 mr-2" />
              Importer
            </TabsTrigger>
            <TabsTrigger value="export">
              <Upload className="w-4 h-4 mr-2" />
              Exporter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Récupère automatiquement les données médicales du patient depuis MyHealth@Hand
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleFetchData}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {fetchPatientData.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Récupération en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Récupérer les données patient
                </>
              )}
            </Button>

            {syncData && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    Données disponibles
                  </h3>
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {syncData.last_updated || 'Maintenant'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-900">Allergies</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {syncData.allergies?.length || 0}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">Traitements</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {syncData.medications?.length || 0}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-900">Vaccinations</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {syncData.vaccinations?.length || 0}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">Diagnostics</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {syncData.diagnoses?.length || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Détails des données */}
                {syncData.allergies?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Allergies détectées:
                    </h4>
                    <div className="space-y-2">
                      {syncData.allergies.map((allergy, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded border text-sm">
                          <p className="font-semibold text-slate-900">{allergy.allergen}</p>
                          <p className="text-slate-600 text-xs mt-1">
                            Type: {allergy.allergen_type} • Sévérité: {allergy.severity}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncData.medications?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Traitements en cours:
                    </h4>
                    <div className="space-y-2">
                      {syncData.medications.map((med, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded border text-sm">
                          <p className="font-semibold text-slate-900">{med.drug_name}</p>
                          <p className="text-slate-600 text-xs mt-1">{med.posology}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleImportAll}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importation...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Importer toutes les données
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Partage les données médicales de votre cabinet vers MyHealth@Hand pour que le patient y ait accès
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-slate-900 mb-4">
                Données qui seront partagées:
              </h3>
              
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">Allergies actives</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Vaccinations récentes</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Consultations récentes (5 dernières)</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </div>

            <Button 
              onClick={handlePushData}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {pushToMyHealth.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Synchroniser vers MyHealth@Hand
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Le patient pourra consulter ces données sur son portail MyHealth@Hand
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}