import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  FileText,
  Clock,
  User,
  History,
  Send,
  Ban,
  RefreshCw,
  Info,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EHealthConsentService({ patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('status');
  const [isLoading, setIsLoading] = useState(false);
  const [consentData, setConsentData] = useState(null);
  const [consentHistory, setConsentHistory] = useState([]);

  // Consentements spécifiques
  const [specificConsents, setSpecificConsents] = useState({
    hub_access: true,
    sumehr_access: true,
    medication_scheme: true,
    vaccination_access: true,
    lab_results: true,
    hospital_reports: true
  });

  const [revocationReason, setRevocationReason] = useState('');

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  // Vérifier le consentement actuel
  const checkConsent = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS requis pour vérifier le consentement');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère des données fictives mais réalistes pour une vérification de consentement eHealth pour un patient belge avec NISS ${niss}.
        Le consentement eHealth permet le partage de données de santé entre professionnels via les coffres-forts régionaux.`,
        response_json_schema: {
          type: "object",
          properties: {
            has_consent: { type: "boolean" },
            consent_status: { type: "string", enum: ["ACTIVE", "REVOKED", "NEVER_GIVEN", "EXPIRED", "PENDING"] },
            consent_date: { type: "string" },
            consent_type: { type: "string", enum: ["GENERAL", "SPECIFIC", "TEMPORARY"] },
            expiry_date: { type: "string" },
            specific_consents: {
              type: "object",
              properties: {
                hub_access: { type: "boolean" },
                sumehr_access: { type: "boolean" },
                medication_scheme: { type: "boolean" },
                vaccination_access: { type: "boolean" },
                lab_results: { type: "boolean" },
                hospital_reports: { type: "boolean" }
              }
            },
            therapeutic_links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  provider_nihii: { type: "string" },
                  provider_name: { type: "string" },
                  link_type: { type: "string" },
                  start_date: { type: "string" },
                  is_active: { type: "boolean" }
                }
              }
            },
            last_verification: { type: "string" }
          }
        }
      });

      setConsentData(result);

      // Log audit
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CHECK_EHEALTH_CONSENT',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Vérification consentement eHealth - NISS: ***${niss.slice(-4)} - Statut: ${result.consent_status}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Consentement vérifié');
    } catch (err) {
      console.error('Erreur vérification consentement:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Demander le consentement
  const requestConsent = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS requis');
      return;
    }

    setIsLoading(true);
    try {
      // Simuler l'envoi de la demande de consentement
      await new Promise(resolve => setTimeout(resolve, 1500));

      const user = await base44.auth.me();
      
      // Mettre à jour le patient avec le consentement RGPD local
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: '2.0',
          data_processing_consent: true,
          data_sharing_consent: true,
          revoked: false
        }
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'REQUEST_EHEALTH_CONSENT',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Demande de consentement eHealth envoyée - NISS: ***${niss.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      setConsentData({
        ...consentData,
        has_consent: true,
        consent_status: 'ACTIVE',
        consent_date: new Date().toISOString(),
        specific_consents: specificConsents
      });

      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Consentement enregistré avec succès');
      onUpdate?.();
    } catch (err) {
      console.error('Erreur demande consentement:', err);
      toast.error('Erreur lors de la demande');
    } finally {
      setIsLoading(false);
    }
  };

  // Révoquer le consentement
  const revokeConsent = async () => {
    if (!revocationReason.trim()) {
      toast.error('Veuillez indiquer une raison de révocation');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      const niss = getNISS();

      // Mettre à jour le patient
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          ...patient.gdpr_consent,
          revoked: true,
          revoked_date: new Date().toISOString(),
          data_sharing_consent: false
        }
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'REVOKE_EHEALTH_CONSENT',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Révocation consentement eHealth - NISS: ***${niss.slice(-4)} - Raison: ${revocationReason}`,
        timestamp: new Date().toISOString()
      });

      setConsentData({
        ...consentData,
        has_consent: false,
        consent_status: 'REVOKED'
      });

      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Consentement révoqué');
      setRevocationReason('');
      onUpdate?.();
    } catch (err) {
      console.error('Erreur révocation:', err);
      toast.error('Erreur lors de la révocation');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger l'historique
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un historique fictif mais réaliste de 5-8 événements de consentement eHealth pour un patient.`,
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  action: { type: "string", enum: ["CONSENT_GIVEN", "CONSENT_REVOKED", "CONSENT_MODIFIED", "CONSENT_RENEWED", "VERIFICATION"] },
                  actor: { type: "string" },
                  details: { type: "string" }
                }
              }
            }
          }
        }
      });
      setConsentHistory(result.events || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      REVOKED: { color: 'bg-red-100 text-red-800', label: 'Révoqué', icon: XCircle },
      NEVER_GIVEN: { color: 'bg-slate-100 text-slate-800', label: 'Jamais donné', icon: AlertTriangle },
      EXPIRED: { color: 'bg-orange-100 text-orange-800', label: 'Expiré', icon: Clock },
      PENDING: { color: 'bg-blue-100 text-blue-800', label: 'En attente', icon: Loader2 }
    };
    const config = configs[status] || configs.NEVER_GIVEN;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getActionLabel = (action) => {
    const labels = {
      CONSENT_GIVEN: '✅ Consentement donné',
      CONSENT_REVOKED: '❌ Consentement révoqué',
      CONSENT_MODIFIED: '✏️ Consentement modifié',
      CONSENT_RENEWED: '🔄 Consentement renouvelé',
      VERIFICATION: '🔍 Vérification'
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            eHealthConsent - Gestion du consentement
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Statut</TabsTrigger>
            <TabsTrigger value="request">Demander</TabsTrigger>
            <TabsTrigger value="revoke">Révoquer</TabsTrigger>
            <TabsTrigger value="history" onClick={loadHistory}>Historique</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* Onglet Statut */}
            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Vérification du consentement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">Patient</p>
                      <p className="text-sm text-slate-600">
                        {patient?.name?.[0]?.given?.join(' ')} {patient?.name?.[0]?.family}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        NISS: ***{getNISS().slice(-4) || '----'}
                      </p>
                    </div>
                    <Button onClick={checkConsent} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Vérifier
                    </Button>
                  </div>

                  {consentData && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border-2 ${
                        consentData.has_consent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {consentData.has_consent ? (
                              <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : (
                              <XCircle className="w-8 h-8 text-red-600" />
                            )}
                            <div>
                              <p className="font-bold text-lg">
                                {consentData.has_consent ? 'Consentement actif' : 'Pas de consentement'}
                              </p>
                              <p className="text-sm text-slate-600">
                                Type: {consentData.consent_type || 'N/A'}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(consentData.consent_status)}
                        </div>

                        {consentData.consent_date && (
                          <p className="text-sm text-slate-600">
                            📅 Donné le: {format(new Date(consentData.consent_date), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        )}
                        {consentData.expiry_date && (
                          <p className="text-sm text-slate-600">
                            ⏰ Expire le: {format(new Date(consentData.expiry_date), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>

                      {/* Consentements spécifiques */}
                      {consentData.specific_consents && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Accès autorisés</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(consentData.specific_consents).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 text-sm">
                                  {value ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                  <span className={value ? '' : 'text-slate-400'}>
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Liens thérapeutiques */}
                      {consentData.therapeutic_links?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Heart className="w-4 h-4 text-red-500" />
                              Liens thérapeutiques actifs
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {consentData.therapeutic_links.filter(l => l.is_active).map((link, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                  <div>
                                    <p className="font-medium text-sm">{link.provider_name}</p>
                                    <p className="text-xs text-slate-500">NIHII: {link.provider_nihii}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">{link.link_type}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {!consentData && (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur "Vérifier" pour consulter le statut du consentement eHealth du patient.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Demande */}
            <TabsContent value="request" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Demander le consentement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Le consentement eHealth permet le partage sécurisé des données de santé entre professionnels 
                      via les coffres-forts régionaux (RSW, Vitalink, CoZo).
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Label className="font-semibold">Types d'accès à autoriser:</Label>
                    
                    {Object.entries({
                      hub_access: 'Accès aux coffres-forts régionaux (Hubs)',
                      sumehr_access: 'Accès au SumEHR (résumé médical)',
                      medication_scheme: 'Schéma de médication',
                      vaccination_access: 'Données de vaccination',
                      lab_results: 'Résultats de laboratoire',
                      hospital_reports: 'Rapports hospitaliers'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={specificConsents[key]}
                          onCheckedChange={(checked) => 
                            setSpecificConsents({ ...specificConsents, [key]: checked })
                          }
                        />
                        <label htmlFor={key} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={requestConsent} 
                      disabled={isLoading}
                      className="w-full gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enregistrer le consentement
                    </Button>
                  </div>

                  <Alert>
                    <Shield className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      Le patient doit donner son accord explicite. Ce consentement est enregistré 
                      dans la plateforme eHealth et peut être révoqué à tout moment.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Révocation */}
            <TabsContent value="revoke" className="space-y-4">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <Ban className="w-4 h-4" />
                    Révoquer le consentement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Attention:</strong> La révocation du consentement empêchera le partage 
                      des données de santé avec les autres professionnels via les coffres-forts.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="revocation-reason">Raison de la révocation *</Label>
                    <Textarea
                      id="revocation-reason"
                      value={revocationReason}
                      onChange={(e) => setRevocationReason(e.target.value)}
                      placeholder="Ex: À la demande du patient..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <Button 
                    variant="destructive"
                    onClick={revokeConsent}
                    disabled={isLoading || !revocationReason.trim()}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    Révoquer le consentement
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Historique */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historique des consentements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : consentHistory.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Aucun historique disponible</p>
                  ) : (
                    <div className="space-y-3">
                      {consentHistory.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{getActionLabel(event.action)}</p>
                            <p className="text-xs text-slate-600 mt-1">{event.details}</p>
                            <p className="text-xs text-slate-400 mt-1">Par: {event.actor}</p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {event.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}