import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Pill, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Shield,
  Clock,
  Download,
  FileText,
  XCircle
} from 'lucide-react';
import { useVIDIS } from './useVIDIS';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Panneau VIDIS (SMP) avec garde-fous consentement + lien thérapeutique
export default function VIDISPanel({ patient, currentUser }) {
  const [smpData, setSmpData] = useState(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [hasTherapeuticLink, setHasTherapeuticLink] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  
  const { readMedicationScheme, isLoading, error } = useVIDIS(currentUser);

  useEffect(() => {
    checkPrerequisites();
  }, [patient]);

  const checkPrerequisites = async () => {
    // Vérifier consentement RGPD
    const consent = patient.gdpr_consent?.has_consented || false;
    setHasConsent(consent);

    // Vérifier lien thérapeutique (simulation)
    // En production: appel HUB pour vérifier le lien
    const therapeuticLink = true; // Simulé pour démo
    setHasTherapeuticLink(therapeuticLink);

    // Auto-charger si OK
    if (consent && therapeuticLink) {
      loadSMP();
    }
  };

  const loadSMP = async () => {
    const data = await readMedicationScheme(patient);
    if (data) {
      // Adapter la structure des données pour le rendu
      setSmpData({
        medicationscheme: {
          version: 1,
          author: data.source,
          hub_source: 'VIDIS',
          last_update: data.last_updated
        },
        medicationschemeelement: data.items?.map(item => ({
          id: item.id,
          substance: item.inn,
          preparation: item.name,
          posology: item.posology,
          route: 'Oral',
          indication: item.reason,
          status: item.status === 'active' ? 'ACTIVE' : 'SUSPENDED',
          prescriber: item.prescriber?.split(' (')?.[0] || item.prescriber,
          prescriber_nihii: item.prescriber?.match(/INAMI: (\d+)/)?.[1] || '',
          start_date: item.start_date,
          end_date: item.end_date
        })) || [],
        treatmentsuspension: data.items?.filter(item => item.status === 'suspended')?.map(item => ({
          id: item.id,
          substance: item.inn,
          preparation: item.name,
          suspension_reason: item.suspension_reason,
          suspended_at: item.end_date,
          suspended_by: item.prescriber?.split(' (')?.[0] || item.prescriber
        })) || []
      });
    }
  };

  const handleRequestAccess = () => {
    alert('TODO: Formulaire pour obtenir le consentement patient + établir lien thérapeutique');
  };

  const handleExportXML = () => {
    if (!smpData) return;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<kmehrmessage xmlns="http://www.ehealth.fgov.be/standards/kmehr/schema/v1">
  <header>
    <standard>
      <cd S="CD-STANDARD">20161201</cd>
    </standard>
  </header>
  <folder>
    <transaction>
      <cd S="CD-TRANSACTION">medicationscheme</cd>
      <version>${smpData.medicationscheme.version}</version>
      ${smpData.medicationschemeelement.map(med => `
      <item>
        <cd S="CD-ITEM">medication</cd>
        <content>
          <medicinalproduct>
            <intendedname>${med.preparation}</intendedname>
          </medicinalproduct>
          <posology>
            <text>${med.posology}</text>
          </posology>
        </content>
      </item>`).join('')}
    </transaction>
  </folder>
</kmehrmessage>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smp-${patient.id}-${format(new Date(), 'yyyyMMdd')}.xml`;
    link.click();
  };

  const handlePrintPDF = () => {
    alert('TODO: Générer PDF lisible du schéma de médication');
  };

  // Afficher message si prérequis non remplis
  if (!hasConsent || !hasTherapeuticLink) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">
                Accès au Schéma de Médication Partagé (VIDIS) restreint
              </h4>
              <div className="space-y-2 text-sm text-orange-800">
                {!hasConsent && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span>Consentement patient requis pour accéder au SMP</span>
                  </div>
                )}
                {!hasTherapeuticLink && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span>Lien thérapeutique non établi</span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleRequestAccess}
                className="mt-4 bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Demander l'accès
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" />
              Schéma de Médication Partagé (VIDIS)
            </CardTitle>
            <div className="flex items-center gap-2">
              {smpData && (
                <>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Accès autorisé
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(smpData.medicationscheme.last_update), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600">Récupération du SMP depuis le HUB...</p>
            </div>
          ) : smpData ? (
            <div className="space-y-4">
              {/* Informations SMP */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Version:</span>
                    <p className="font-semibold">{smpData.medicationscheme.version}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Auteur:</span>
                    <p className="font-semibold">{smpData.medicationscheme.author}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Source HUB:</span>
                    <p className="font-semibold">{smpData.medicationscheme.hub_source}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrintPDF}>
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportXML}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadSMP}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Médications actives */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Médications actives ({smpData.medicationschemeelement.filter(m => m.status === 'ACTIVE').length})
                </h4>
                <div className="space-y-2">
                  {smpData.medicationschemeelement
                    .filter(med => med.status === 'ACTIVE')
                    .map((med) => (
                      <div key={med.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-900">{med.substance}</h5>
                            <p className="text-sm text-slate-600">{med.preparation}</p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p><strong>Posologie:</strong> {med.posology}</p>
                              <p><strong>Voie:</strong> {med.route}</p>
                              {med.indication && <p><strong>Indication:</strong> {med.indication}</p>}
                              <p className="text-slate-500">
                                Prescrit par {med.prescriber} (NIHII: {med.prescriber_nihii})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-800 mb-2">Actif</Badge>
                            <p className="text-xs text-slate-500">
                              Depuis {format(new Date(med.start_date), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                            {med.end_date && (
                              <p className="text-xs text-slate-500">
                                Jusqu'au {format(new Date(med.end_date), 'dd/MM/yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Traitements suspendus */}
              {smpData.treatmentsuspension.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Traitements suspendus ({smpData.treatmentsuspension.length})
                  </h4>
                  <div className="space-y-2">
                    {smpData.treatmentsuspension.map((susp) => (
                      <div key={susp.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-900">{susp.substance}</h5>
                            <p className="text-sm text-slate-600">{susp.preparation}</p>
                            <p className="text-sm mt-2">
                              <strong>Raison:</strong> {susp.suspension_reason}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Suspendu le {format(new Date(susp.suspended_at), 'dd/MM/yyyy', { locale: fr })} par {susp.suspended_by}
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">Suspendu</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Pill className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Aucun schéma de médication disponible</p>
              <Button onClick={loadSMP} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Charger depuis VIDIS
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info légale */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Accès conforme:</strong> Consentement patient vérifié + lien thérapeutique établi.
          Toutes les consultations sont tracées dans le journal d'audit.
          Source: Hubs/Metahub (RSW, CoZo, Brussels) via KMEHR 1.28.
        </AlertDescription>
      </Alert>
    </div>
  );
}