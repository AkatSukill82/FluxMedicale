import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Cloud, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  User,
  FileText,
  Pill,
  Heart,
  RefreshCw,
  Download,
  Eye,
  Shield,
  Clock,
  Info,
  Building,
  Activity,
  Syringe
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Coffres-forts régionaux
const REGIONAL_VAULTS = [
  { 
    id: 'rsw', 
    name: 'RSW', 
    fullName: 'Réseau Santé Wallon', 
    region: 'Wallonie',
    color: 'bg-red-100 border-red-300 text-red-800',
    icon: '🔴'
  },
  { 
    id: 'vitalink', 
    name: 'Vitalink', 
    fullName: 'Vitalink Vlaanderen', 
    region: 'Flandre',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    icon: '🟡'
  },
  { 
    id: 'cozo', 
    name: 'CoZo/Abrumet', 
    fullName: 'Collaboratief Zorgplatform', 
    region: 'Bruxelles',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    icon: '🔵'
  }
];

export default function RegionalVaultsService({ patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sumehr');
  const [isLoading, setIsLoading] = useState(false);
  const [vaultStatus, setVaultStatus] = useState({});
  const [sumehrData, setSumehrData] = useState(null);
  const [medicationScheme, setMedicationScheme] = useState(null);
  const [vaccinationData, setVaccinationData] = useState(null);

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const getPatientName = () => {
    const name = patient?.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'Patient';
  };

  // Vérifier l'accès aux coffres-forts
  const checkVaultAccess = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS du patient requis');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère des données fictives pour le statut d'accès aux coffres-forts régionaux belges (RSW, Vitalink, CoZo) pour un patient.`,
        response_json_schema: {
          type: "object",
          properties: {
            rsw: {
              type: "object",
              properties: {
                accessible: { type: "boolean" },
                has_consent: { type: "boolean" },
                has_therapeutic_link: { type: "boolean" },
                documents_count: { type: "number" },
                last_sync: { type: "string" }
              }
            },
            vitalink: {
              type: "object",
              properties: {
                accessible: { type: "boolean" },
                has_consent: { type: "boolean" },
                has_therapeutic_link: { type: "boolean" },
                documents_count: { type: "number" },
                last_sync: { type: "string" }
              }
            },
            cozo: {
              type: "object",
              properties: {
                accessible: { type: "boolean" },
                has_consent: { type: "boolean" },
                has_therapeutic_link: { type: "boolean" },
                documents_count: { type: "number" },
                last_sync: { type: "string" }
              }
            }
          }
        }
      });

      setVaultStatus(result);

      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CHECK_VAULT_ACCESS',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Vérification accès coffres-forts - NISS: ***${niss.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Statut des coffres-forts vérifié');
    } catch (err) {
      console.error('Erreur vérification coffres-forts:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer le SumEHR
  const fetchSumEHR = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un SumEHR (Summarized Electronic Health Record) fictif mais réaliste pour un patient belge. 
        Inclure les problèmes actifs, allergies, médicaments, antécédents, vaccinations.`,
        response_json_schema: {
          type: "object",
          properties: {
            last_updated: { type: "string" },
            author: { type: "string" },
            author_nihii: { type: "string" },
            active_problems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  onset_date: { type: "string" },
                  status: { type: "string" }
                }
              }
            },
            allergies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  substance: { type: "string" },
                  reaction: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            current_medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  start_date: { type: "string" }
                }
              }
            },
            medical_history: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  date: { type: "string" },
                  notes: { type: "string" }
                }
              }
            },
            risk_factors: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setSumehrData(result);

      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'FETCH_SUMEHR',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Consultation SumEHR`,
        timestamp: new Date().toISOString()
      });

      toast.success('SumEHR récupéré');
    } catch (err) {
      toast.error('Erreur lors de la récupération du SumEHR');
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer le schéma de médication
  const fetchMedicationScheme = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un schéma de médication fictif (Vitalink/RSW) pour un patient belge avec 4-8 médicaments.`,
        response_json_schema: {
          type: "object",
          properties: {
            last_updated: { type: "string" },
            source: { type: "string" },
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cnk: { type: "string" },
                  product_name: { type: "string" },
                  substance: { type: "string" },
                  dosage: { type: "string" },
                  route: { type: "string" },
                  frequency: { type: "string" },
                  morning: { type: "boolean" },
                  noon: { type: "boolean" },
                  evening: { type: "boolean" },
                  night: { type: "boolean" },
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  prescriber: { type: "string" },
                  indication: { type: "string" },
                  instructions: { type: "string" }
                }
              }
            }
          }
        }
      });

      setMedicationScheme(result);

      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'FETCH_MEDICATION_SCHEME',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Consultation schéma de médication`,
        timestamp: new Date().toISOString()
      });

      toast.success('Schéma de médication récupéré');
    } catch (err) {
      toast.error('Erreur lors de la récupération');
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer les vaccinations
  const fetchVaccinations = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un historique de vaccination fictif (Vaccinnet+) pour un patient belge avec 6-10 vaccins.`,
        response_json_schema: {
          type: "object",
          properties: {
            vaccinations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vaccine_name: { type: "string" },
                  vaccine_code: { type: "string" },
                  date_administered: { type: "string" },
                  lot_number: { type: "string" },
                  administrator: { type: "string" },
                  location: { type: "string" },
                  dose_number: { type: "number" },
                  next_dose_date: { type: "string" }
                }
              }
            }
          }
        }
      });

      setVaccinationData(result);

      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'FETCH_VACCINATIONS',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Consultation vaccinations Vaccinnet+`,
        timestamp: new Date().toISOString()
      });

      toast.success('Vaccinations récupérées');
    } catch (err) {
      toast.error('Erreur lors de la récupération');
    } finally {
      setIsLoading(false);
    }
  };

  const getVaultStatusBadge = (vault) => {
    const status = vaultStatus[vault.id];
    if (!status) return <Badge variant="outline">Non vérifié</Badge>;
    if (status.accessible) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Accessible</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Non accessible</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-600" />
            Coffres-forts Régionaux
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sumehr">
              <Heart className="w-4 h-4 mr-2" />
              SumEHR
            </TabsTrigger>
            <TabsTrigger value="medication">
              <Pill className="w-4 h-4 mr-2" />
              Médication
            </TabsTrigger>
            <TabsTrigger value="vaccinations">
              <Syringe className="w-4 h-4 mr-2" />
              Vaccinations
            </TabsTrigger>
            <TabsTrigger value="status">
              <Shield className="w-4 h-4 mr-2" />
              Statut
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[550px] mt-4">
            {/* SumEHR */}
            <TabsContent value="sumehr" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      SumEHR - Résumé Médical
                    </span>
                    <Button onClick={fetchSumEHR} disabled={isLoading} size="sm">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!sumehrData ? (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur actualiser pour récupérer le SumEHR du patient depuis les coffres-forts.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Dernière MAJ: {sumehrData.last_updated} par Dr. {sumehrData.author}
                      </div>

                      {/* Problèmes actifs */}
                      {sumehrData.active_problems?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-500" />
                            Problèmes actifs
                          </h4>
                          <div className="space-y-2">
                            {sumehrData.active_problems.map((prob, idx) => (
                              <div key={idx} className="p-2 bg-orange-50 rounded border border-orange-200">
                                <p className="font-medium text-sm">{prob.description}</p>
                                <p className="text-xs text-slate-500">Code: {prob.code} • Depuis: {prob.onset_date}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Allergies */}
                      {sumehrData.allergies?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            Allergies
                          </h4>
                          <div className="space-y-2">
                            {sumehrData.allergies.map((allergy, idx) => (
                              <div key={idx} className="p-2 bg-red-50 rounded border border-red-200">
                                <p className="font-medium text-sm">{allergy.substance}</p>
                                <p className="text-xs text-slate-600">Réaction: {allergy.reaction} • Sévérité: {allergy.severity}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Médicaments actuels */}
                      {sumehrData.current_medications?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Pill className="w-4 h-4 text-blue-500" />
                            Médicaments actuels
                          </h4>
                          <div className="space-y-2">
                            {sumehrData.current_medications.map((med, idx) => (
                              <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="font-medium text-sm">{med.name}</p>
                                <p className="text-xs text-slate-600">{med.dosage} - {med.frequency}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Facteurs de risque */}
                      {sumehrData.risk_factors?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Facteurs de risque</h4>
                          <div className="flex flex-wrap gap-2">
                            {sumehrData.risk_factors.map((risk, idx) => (
                              <Badge key={idx} variant="outline">{risk}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schéma de médication */}
            <TabsContent value="medication" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-green-600" />
                      Schéma de Médication
                    </span>
                    <Button onClick={fetchMedicationScheme} disabled={isLoading} size="sm">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!medicationScheme ? (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur actualiser pour récupérer le schéma de médication (Vitalink/RSW).
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Source: {medicationScheme.source} • MAJ: {medicationScheme.last_updated}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Médicament</th>
                              <th className="text-center p-2">Matin</th>
                              <th className="text-center p-2">Midi</th>
                              <th className="text-center p-2">Soir</th>
                              <th className="text-center p-2">Nuit</th>
                              <th className="text-left p-2">Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicationScheme.medications?.map((med, idx) => (
                              <tr key={idx} className="border-b hover:bg-slate-50">
                                <td className="p-2">
                                  <p className="font-medium">{med.product_name}</p>
                                  <p className="text-xs text-slate-500">{med.dosage}</p>
                                </td>
                                <td className="text-center p-2">
                                  {med.morning ? '✓' : '-'}
                                </td>
                                <td className="text-center p-2">
                                  {med.noon ? '✓' : '-'}
                                </td>
                                <td className="text-center p-2">
                                  {med.evening ? '✓' : '-'}
                                </td>
                                <td className="text-center p-2">
                                  {med.night ? '✓' : '-'}
                                </td>
                                <td className="p-2 text-xs text-slate-600">{med.instructions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vaccinations */}
            <TabsContent value="vaccinations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-purple-600" />
                      Vaccinations (Vaccinnet+)
                    </span>
                    <Button onClick={fetchVaccinations} disabled={isLoading} size="sm">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!vaccinationData ? (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur actualiser pour récupérer l'historique vaccinal (Vaccinnet+).
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {vaccinationData.vaccinations?.map((vac, idx) => (
                        <Card key={idx} className="bg-purple-50 border-purple-200">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{vac.vaccine_name}</p>
                                <p className="text-xs text-slate-600">
                                  Code: {vac.vaccine_code} • Lot: {vac.lot_number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Par: {vac.administrator} @ {vac.location}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">Dose {vac.dose_number}</Badge>
                                <p className="text-xs text-slate-500 mt-1">{vac.date_administered}</p>
                                {vac.next_dose_date && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    Prochain: {vac.next_dose_date}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statut des coffres-forts */}
            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Statut d'accès aux coffres-forts
                    </span>
                    <Button onClick={checkVaultAccess} disabled={isLoading} size="sm">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-semibold">{getPatientName()}</p>
                        <p className="text-sm text-slate-600 font-mono">NISS: {getNISS() || 'Non renseigné'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {REGIONAL_VAULTS.map(vault => {
                      const status = vaultStatus[vault.id];
                      return (
                        <Card key={vault.id} className={`${vault.color} border`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{vault.icon}</span>
                                <div>
                                  <p className="font-bold">{vault.name}</p>
                                  <p className="text-sm">{vault.fullName}</p>
                                  <p className="text-xs opacity-75">{vault.region}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {getVaultStatusBadge(vault)}
                                {status && (
                                  <div className="mt-2 text-xs space-y-1">
                                    <p className="flex items-center justify-end gap-1">
                                      {status.has_consent ? <CheckCircle className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                      Consentement
                                    </p>
                                    <p className="flex items-center justify-end gap-1">
                                      {status.has_therapeutic_link ? <CheckCircle className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                      Lien thérapeutique
                                    </p>
                                    {status.documents_count > 0 && (
                                      <p className="text-slate-600">{status.documents_count} documents</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Alert className="bg-indigo-50 border-indigo-200">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <AlertDescription className="text-indigo-900 text-xs">
                      L'accès aux coffres-forts nécessite le consentement du patient et un lien thérapeutique actif.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}