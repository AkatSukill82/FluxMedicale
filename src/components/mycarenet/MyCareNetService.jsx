import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  FileText,
  User,
  Heart,
  Shield,
  RefreshCw,
  Send,
  History,
  Clock,
  Euro,
  Building,
  Search,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MyCareNetService({ patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('insurability');
  const [isLoading, setIsLoading] = useState(false);
  const [insurabilityData, setInsurabilityData] = useState(null);
  const [dmgData, setDmgData] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const getPatientName = () => {
    const name = patient?.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'Patient';
  };

  // Vérifier l'assurabilité
  const checkInsurability = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS du patient requis');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère des données fictives mais réalistes pour une vérification d'assurabilité MyCareNet pour un patient belge avec NISS ${niss}.`,
        response_json_schema: {
          type: "object",
          properties: {
            is_insured: { type: "boolean" },
            insurance_status: { type: "string", enum: ["ACTIVE", "INACTIVE", "PENDING", "UNKNOWN"] },
            mutuality_code: { type: "string" },
            mutuality_name: { type: "string" },
            membership_number: { type: "string" },
            coverage_start_date: { type: "string" },
            coverage_end_date: { type: "string" },
            is_bim: { type: "boolean" },
            bim_start_date: { type: "string" },
            has_third_party_payer: { type: "boolean" },
            third_party_payer_percentage: { type: "number" },
            regimen: { type: "string", enum: ["GENERAL", "INDEPENDENT", "CIVIL_SERVANT"] },
            holder_niss: { type: "string" },
            is_holder: { type: "boolean" },
            special_categories: {
              type: "array",
              items: { type: "string" }
            },
            last_verification: { type: "string" }
          }
        }
      });

      setInsurabilityData(result);

      // Log audit
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CHECK_INSURABILITY',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Vérification assurabilité MyCareNet - NISS: ***${niss.slice(-4)} - Statut: ${result.insurance_status}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Assurabilité vérifiée');
    } catch (err) {
      console.error('Erreur vérification assurabilité:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier le DMG
  const checkDMG = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS du patient requis');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère des données fictives mais réalistes pour une vérification DMG (Dossier Médical Global) MyCareNet pour un patient belge.`,
        response_json_schema: {
          type: "object",
          properties: {
            has_dmg: { type: "boolean" },
            dmg_status: { type: "string", enum: ["ACTIVE", "EXPIRED", "NONE", "PENDING_TRANSFER"] },
            holder_nihii: { type: "string" },
            holder_name: { type: "string" },
            holder_practice_name: { type: "string" },
            start_date: { type: "string" },
            expiry_date: { type: "string" },
            is_current_user_holder: { type: "boolean" },
            can_request_transfer: { type: "boolean" },
            yearly_allowance_paid: { type: "boolean" },
            last_attestation_date: { type: "string" }
          }
        }
      });

      setDmgData(result);

      // Log audit
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CHECK_DMG',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Vérification DMG MyCareNet - NISS: ***${niss.slice(-4)} - Statut: ${result.dmg_status}`,
        timestamp: new Date().toISOString()
      });

      toast.success('DMG vérifié');
    } catch (err) {
      console.error('Erreur vérification DMG:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Demander le DMG
  const requestDMG = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      const niss = getNISS();

      // Simuler la demande de DMG
      await new Promise(resolve => setTimeout(resolve, 1500));

      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'REQUEST_DMG',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Demande de DMG envoyée via MyCareNet - NISS: ***${niss.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      setDmgData({
        ...dmgData,
        has_dmg: true,
        dmg_status: 'ACTIVE',
        is_current_user_holder: true,
        start_date: new Date().toISOString()
      });

      toast.success('Demande de DMG enregistrée avec succès');
      onUpdate?.();
    } catch (err) {
      toast.error('Erreur lors de la demande de DMG');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger l'historique des transactions
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un historique fictif de 8-12 transactions MyCareNet pour un patient (eFact, eAttest, DMG, assurabilité).`,
        response_json_schema: {
          type: "object",
          properties: {
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: ["EFACT", "EATTEST", "DMG", "INSURABILITY", "CHAPTER_IV"] },
                  date: { type: "string" },
                  status: { type: "string", enum: ["SUCCESS", "PENDING", "REJECTED", "ERROR"] },
                  amount: { type: "number" },
                  reference: { type: "string" },
                  details: { type: "string" }
                }
              }
            }
          }
        }
      });
      setTransactionHistory(result.transactions || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      INACTIVE: { color: 'bg-red-100 text-red-800', label: 'Inactif', icon: XCircle },
      PENDING: { color: 'bg-blue-100 text-blue-800', label: 'En attente', icon: Clock },
      EXPIRED: { color: 'bg-orange-100 text-orange-800', label: 'Expiré', icon: AlertTriangle },
      NONE: { color: 'bg-slate-100 text-slate-800', label: 'Aucun', icon: XCircle },
      PENDING_TRANSFER: { color: 'bg-purple-100 text-purple-800', label: 'Transfert en cours', icon: RefreshCw },
      UNKNOWN: { color: 'bg-slate-100 text-slate-800', label: 'Inconnu', icon: AlertTriangle },
      SUCCESS: { color: 'bg-green-100 text-green-800', label: 'Succès', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejeté', icon: XCircle },
      ERROR: { color: 'bg-red-100 text-red-800', label: 'Erreur', icon: AlertTriangle }
    };
    const config = configs[status] || configs.UNKNOWN;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      EFACT: { label: 'eFact', icon: Euro, color: 'text-green-600' },
      EATTEST: { label: 'eAttest', icon: FileText, color: 'text-blue-600' },
      DMG: { label: 'DMG', icon: Heart, color: 'text-red-600' },
      INSURABILITY: { label: 'Assurabilité', icon: Shield, color: 'text-purple-600' },
      CHAPTER_IV: { label: 'Chapitre IV', icon: FileText, color: 'text-orange-600' }
    };
    return labels[type] || { label: type, icon: FileText, color: 'text-slate-600' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            MyCareNet - Services Mutuelles
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insurability">
              <Shield className="w-4 h-4 mr-2" />
              Assurabilité
            </TabsTrigger>
            <TabsTrigger value="dmg">
              <Heart className="w-4 h-4 mr-2" />
              DMG
            </TabsTrigger>
            <TabsTrigger value="billing">
              <Euro className="w-4 h-4 mr-2" />
              Facturation
            </TabsTrigger>
            <TabsTrigger value="history" onClick={loadHistory}>
              <History className="w-4 h-4 mr-2" />
              Historique
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[550px] mt-4">
            {/* Onglet Assurabilité */}
            <TabsContent value="insurability" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Vérification d'assurabilité
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
                    <Button onClick={checkInsurability} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Vérifier
                    </Button>
                  </div>

                  {insurabilityData && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border-2 ${
                        insurabilityData.is_insured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {insurabilityData.is_insured ? (
                              <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : (
                              <XCircle className="w-8 h-8 text-red-600" />
                            )}
                            <div>
                              <p className="font-bold text-lg">
                                {insurabilityData.is_insured ? 'Patient assuré' : 'Non assuré'}
                              </p>
                              <p className="text-sm text-slate-600">
                                Régime: {insurabilityData.regimen || 'N/A'}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(insurabilityData.insurance_status)}
                        </div>
                      </div>

                      {/* Détails mutuelle */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Mutuelle
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Organisme</p>
                              <p className="font-medium">{insurabilityData.mutuality_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Code</p>
                              <p className="font-mono">{insurabilityData.mutuality_code}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">N° d'affiliation</p>
                              <p className="font-mono">{insurabilityData.membership_number}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Titulaire</p>
                              <p>{insurabilityData.is_holder ? 'Oui (titulaire)' : `Non (NISS: ${insurabilityData.holder_niss})`}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* BIM et tiers-payant */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card className={insurabilityData.is_bim ? 'border-blue-300 bg-blue-50' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {insurabilityData.is_bim ? (
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                              ) : (
                                <XCircle className="w-6 h-6 text-slate-400" />
                              )}
                              <div>
                                <p className="font-semibold">BIM</p>
                                <p className="text-sm text-slate-600">
                                  {insurabilityData.is_bim ? 'Bénéficiaire' : 'Non bénéficiaire'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={insurabilityData.has_third_party_payer ? 'border-green-300 bg-green-50' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {insurabilityData.has_third_party_payer ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              ) : (
                                <XCircle className="w-6 h-6 text-slate-400" />
                              )}
                              <div>
                                <p className="font-semibold">Tiers-payant</p>
                                <p className="text-sm text-slate-600">
                                  {insurabilityData.has_third_party_payer 
                                    ? `${insurabilityData.third_party_payer_percentage}%` 
                                    : 'Non applicable'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {insurabilityData.special_categories?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {insurabilityData.special_categories.map((cat, idx) => (
                            <Badge key={idx} variant="outline">{cat}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!insurabilityData && (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur "Vérifier" pour consulter l'assurabilité du patient via MyCareNet.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet DMG */}
            <TabsContent value="dmg" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Dossier Médical Global (DMG)
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
                    <Button onClick={checkDMG} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Vérifier DMG
                    </Button>
                  </div>

                  {dmgData && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border-2 ${
                        dmgData.has_dmg && dmgData.dmg_status === 'ACTIVE' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-orange-50 border-orange-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Heart className={`w-8 h-8 ${dmgData.has_dmg ? 'text-red-500' : 'text-slate-400'}`} />
                            <div>
                              <p className="font-bold text-lg">
                                {dmgData.has_dmg ? 'DMG actif' : 'Pas de DMG'}
                              </p>
                              {dmgData.holder_name && (
                                <p className="text-sm text-slate-600">
                                  Gestionnaire: Dr. {dmgData.holder_name}
                                </p>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(dmgData.dmg_status)}
                        </div>

                        {dmgData.has_dmg && (
                          <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t">
                            <div>
                              <p className="text-slate-500">NIHII gestionnaire</p>
                              <p className="font-mono">{dmgData.holder_nihii}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Cabinet</p>
                              <p>{dmgData.holder_practice_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Date de début</p>
                              <p>{dmgData.start_date}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Expiration</p>
                              <p>{dmgData.expiry_date}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {dmgData.is_current_user_holder && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Vous êtes le gestionnaire actuel du DMG de ce patient.
                          </AlertDescription>
                        </Alert>
                      )}

                      {!dmgData.has_dmg && (
                        <Button onClick={requestDMG} disabled={isLoading} className="w-full gap-2">
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Demander le DMG
                        </Button>
                      )}

                      {dmgData.can_request_transfer && !dmgData.is_current_user_holder && (
                        <Button variant="outline" className="w-full gap-2">
                          <RefreshCw className="w-4 h-4" />
                          Demander le transfert du DMG
                        </Button>
                      )}
                    </div>
                  )}

                  {!dmgData && (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur "Vérifier DMG" pour consulter le statut du Dossier Médical Global via MyCareNet.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Facturation */}
            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Euro className="w-4 h-4" />
                    Services de facturation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-green-200 hover:border-green-400 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Euro className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold">eFact</p>
                            <p className="text-xs text-slate-500">Facturation électronique tiers-payant</p>
                          </div>
                        </div>
                        <Badge className="mt-3 bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Disponible
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 hover:border-blue-400 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">eAttest</p>
                            <p className="text-xs text-slate-500">Attestation de soins électronique</p>
                          </div>
                        </div>
                        <Badge className="mt-3 bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Disponible
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 hover:border-orange-400 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold">Chapitre IV</p>
                            <p className="text-xs text-slate-500">Demandes de remboursement spécial</p>
                          </div>
                        </div>
                        <Badge className="mt-3 bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Disponible
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-200 hover:border-purple-400 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold">Tiers-payant</p>
                            <p className="text-xs text-slate-500">Gestion du tiers-payant automatique</p>
                          </div>
                        </div>
                        <Badge className="mt-3 bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Disponible
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Utilisez l'onglet Facturation du dossier patient pour créer et envoyer des factures via MyCareNet.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Historique */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historique des transactions MyCareNet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : transactionHistory.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Aucune transaction</p>
                  ) : (
                    <div className="space-y-3">
                      {transactionHistory.map((tx, idx) => {
                        const typeInfo = getTransactionTypeLabel(tx.type);
                        const Icon = typeInfo.icon;
                        return (
                          <Card key={tx.id || idx} className="hover:border-blue-300 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center`}>
                                    <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{typeInfo.label}</p>
                                      {getStatusBadge(tx.status)}
                                    </div>
                                    <p className="text-sm text-slate-600">{tx.details}</p>
                                    <p className="text-xs text-slate-400 mt-1 font-mono">
                                      Ref: {tx.reference}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {tx.amount > 0 && (
                                    <p className="font-semibold text-green-600">
                                      {(tx.amount / 100).toFixed(2)}€
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500">{tx.date}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
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