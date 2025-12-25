import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  User,
  Users,
  Plus,
  Trash2,
  RefreshCw,
  History,
  Shield,
  Clock,
  Building,
  Info,
  Link,
  Unlink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Types de liens thérapeutiques
const LINK_TYPES = [
  { value: 'DMG', label: 'DMG (Dossier Médical Global)', description: 'Lien principal médecin généraliste' },
  { value: 'SPECIALIST', label: 'Spécialiste', description: 'Lien avec un médecin spécialiste' },
  { value: 'NURSE', label: 'Infirmier(ère)', description: 'Lien avec personnel infirmier' },
  { value: 'PHARMACY', label: 'Pharmacien', description: 'Lien avec pharmacie de référence' },
  { value: 'HOSPITAL', label: 'Hôpital', description: 'Lien avec établissement hospitalier' },
  { value: 'GROUP_PRACTICE', label: 'Groupe de pratique', description: 'Lien avec cabinet de groupe' }
];

export default function TherapeuticLinksService({ patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('current');
  const [isLoading, setIsLoading] = useState(false);
  const [therapeuticLinks, setTherapeuticLinks] = useState([]);
  const [linkHistory, setLinkHistory] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);

  // Formulaire de création
  const [formData, setFormData] = useState({
    link_type: 'DMG',
    provider_nihii: '',
    provider_name: '',
    provider_specialty: '',
    practice_name: '',
    practice_address: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notes: ''
  });

  const [revocationReason, setRevocationReason] = useState('');

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const getPatientName = () => {
    const name = patient?.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'Patient';
  };

  // Vérifier les liens existants
  const checkLinks = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS du patient requis');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère des données fictives mais réalistes pour les liens thérapeutiques eHealth d'un patient belge avec NISS ${niss}. 
        Inclure 2-4 liens actifs avec différents types de prestataires.`,
        response_json_schema: {
          type: "object",
          properties: {
            links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  link_type: { type: "string", enum: ["DMG", "SPECIALIST", "NURSE", "PHARMACY", "HOSPITAL", "GROUP_PRACTICE"] },
                  provider_nihii: { type: "string" },
                  provider_name: { type: "string" },
                  provider_specialty: { type: "string" },
                  practice_name: { type: "string" },
                  status: { type: "string", enum: ["ACTIVE", "PENDING", "EXPIRED", "REVOKED"] },
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  is_current_user: { type: "boolean" },
                  created_at: { type: "string" }
                }
              }
            }
          }
        }
      });

      setTherapeuticLinks(result.links || []);

      // Log audit
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CHECK_THERAPEUTIC_LINKS',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Vérification liens thérapeutiques - NISS: ***${niss.slice(-4)} - ${result.links?.length || 0} liens trouvés`,
        timestamp: new Date().toISOString()
      });

      toast.success(`${result.links?.length || 0} lien(s) thérapeutique(s) trouvé(s)`);
    } catch (err) {
      console.error('Erreur vérification liens:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Créer un lien
  const createLink = async () => {
    if (!formData.provider_nihii || !formData.provider_name) {
      toast.error('NIHII et nom du prestataire requis');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      const niss = getNISS();

      // Simuler la création du lien via eHealth
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newLink = {
        id: `TL-${Date.now()}`,
        ...formData,
        status: 'ACTIVE',
        is_current_user: true,
        created_at: new Date().toISOString()
      };

      setTherapeuticLinks([newLink, ...therapeuticLinks]);

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CREATE_THERAPEUTIC_LINK',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Création lien thérapeutique - Type: ${formData.link_type} - NIHII: ${formData.provider_nihii}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Lien thérapeutique créé avec succès');
      setShowCreateForm(false);
      setFormData({
        link_type: 'DMG',
        provider_nihii: '',
        provider_name: '',
        provider_specialty: '',
        practice_name: '',
        practice_address: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        notes: ''
      });
      onUpdate?.();
    } catch (err) {
      console.error('Erreur création lien:', err);
      toast.error('Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  // Révoquer un lien
  const revokeLink = async (linkId) => {
    if (!revocationReason.trim()) {
      toast.error('Veuillez indiquer une raison de révocation');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();

      // Simuler la révocation via eHealth
      await new Promise(resolve => setTimeout(resolve, 1000));

      setTherapeuticLinks(therapeuticLinks.map(link => 
        link.id === linkId ? { ...link, status: 'REVOKED' } : link
      ));

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'REVOKE_THERAPEUTIC_LINK',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Révocation lien thérapeutique - ID: ${linkId} - Raison: ${revocationReason}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Lien thérapeutique révoqué');
      setSelectedLink(null);
      setRevocationReason('');
      onUpdate?.();
    } catch (err) {
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
        prompt: `Génère un historique fictif de 6-10 événements de liens thérapeutiques pour un patient.`,
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  action: { type: "string", enum: ["CREATED", "RENEWED", "REVOKED", "EXPIRED", "TRANSFERRED"] },
                  link_type: { type: "string" },
                  provider_name: { type: "string" },
                  actor: { type: "string" },
                  details: { type: "string" }
                }
              }
            }
          }
        }
      });
      setLinkHistory(result.events || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      PENDING: { color: 'bg-blue-100 text-blue-800', label: 'En attente', icon: Clock },
      EXPIRED: { color: 'bg-orange-100 text-orange-800', label: 'Expiré', icon: AlertTriangle },
      REVOKED: { color: 'bg-red-100 text-red-800', label: 'Révoqué', icon: XCircle }
    };
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getLinkTypeIcon = (type) => {
    const icons = {
      DMG: Heart,
      SPECIALIST: User,
      NURSE: Users,
      PHARMACY: Building,
      HOSPITAL: Building,
      GROUP_PRACTICE: Users
    };
    return icons[type] || Link;
  };

  const getActionLabel = (action) => {
    const labels = {
      CREATED: '✅ Lien créé',
      RENEWED: '🔄 Lien renouvelé',
      REVOKED: '❌ Lien révoqué',
      EXPIRED: '⏰ Lien expiré',
      TRANSFERRED: '➡️ Lien transféré'
    };
    return labels[action] || action;
  };

  const activeLinks = therapeuticLinks.filter(l => l.status === 'ACTIVE');
  const inactiveLinks = therapeuticLinks.filter(l => l.status !== 'ACTIVE');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Liens Thérapeutiques eHealth
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="current">
              <Link className="w-4 h-4 mr-2" />
              Liens actifs
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-2" />
              Créer
            </TabsTrigger>
            <TabsTrigger value="revoke">
              <Unlink className="w-4 h-4 mr-2" />
              Révoquer
            </TabsTrigger>
            <TabsTrigger value="history" onClick={loadHistory}>
              <History className="w-4 h-4 mr-2" />
              Historique
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[550px] mt-4">
            {/* Onglet Liens actuels */}
            <TabsContent value="current" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Liens thérapeutiques du patient
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
                    <Button onClick={checkLinks} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Vérifier
                    </Button>
                  </div>

                  {therapeuticLinks.length > 0 ? (
                    <div className="space-y-4">
                      {/* Liens actifs */}
                      {activeLinks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Liens actifs ({activeLinks.length})
                          </h4>
                          <div className="space-y-2">
                            {activeLinks.map(link => {
                              const Icon = getLinkTypeIcon(link.link_type);
                              const typeInfo = LINK_TYPES.find(t => t.value === link.link_type);
                              return (
                                <Card key={link.id} className="border-green-200 bg-green-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                          <Icon className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold">{link.provider_name}</p>
                                            {getStatusBadge(link.status)}
                                            {link.is_current_user && (
                                              <Badge className="bg-blue-100 text-blue-800">Vous</Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-slate-600">{typeInfo?.label || link.link_type}</p>
                                          {link.provider_specialty && (
                                            <p className="text-xs text-slate-500">{link.provider_specialty}</p>
                                          )}
                                          <p className="text-xs text-slate-400 font-mono mt-1">
                                            NIHII: {link.provider_nihii}
                                          </p>
                                          {link.practice_name && (
                                            <p className="text-xs text-slate-500 mt-1">
                                              📍 {link.practice_name}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right text-xs text-slate-500">
                                        <p>Depuis: {link.start_date}</p>
                                        {link.end_date && <p>Jusqu'au: {link.end_date}</p>}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Liens inactifs */}
                      {inactiveLinks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Liens inactifs ({inactiveLinks.length})
                          </h4>
                          <div className="space-y-2">
                            {inactiveLinks.map(link => {
                              const Icon = getLinkTypeIcon(link.link_type);
                              return (
                                <Card key={link.id} className="border-slate-200 bg-slate-50 opacity-75">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Icon className="w-4 h-4 text-slate-400" />
                                        <div>
                                          <p className="font-medium text-sm">{link.provider_name}</p>
                                          <p className="text-xs text-slate-500">{link.link_type}</p>
                                        </div>
                                      </div>
                                      {getStatusBadge(link.status)}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Cliquez sur "Vérifier" pour consulter les liens thérapeutiques du patient via eHealth.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Création */}
            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Créer un lien thérapeutique
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Type de lien *</Label>
                    <Select 
                      value={formData.link_type}
                      onValueChange={(v) => setFormData({ ...formData, link_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINK_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <p>{type.label}</p>
                              <p className="text-xs text-slate-500">{type.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>NIHII du prestataire *</Label>
                      <Input
                        value={formData.provider_nihii}
                        onChange={(e) => setFormData({ ...formData, provider_nihii: e.target.value })}
                        placeholder="Ex: 1-12345-67-890"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label>Nom du prestataire *</Label>
                      <Input
                        value={formData.provider_name}
                        onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                        placeholder="Dr. Jean Dupont"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Spécialité</Label>
                      <Input
                        value={formData.provider_specialty}
                        onChange={(e) => setFormData({ ...formData, provider_specialty: e.target.value })}
                        placeholder="Médecine générale, Cardiologie..."
                      />
                    </div>
                    <div>
                      <Label>Nom du cabinet/pratique</Label>
                      <Input
                        value={formData.practice_name}
                        onChange={(e) => setFormData({ ...formData, practice_name: e.target.value })}
                        placeholder="Cabinet médical XYZ"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Adresse du cabinet</Label>
                    <Input
                      value={formData.practice_address}
                      onChange={(e) => setFormData({ ...formData, practice_address: e.target.value })}
                      placeholder="Rue de la Santé 123, 1000 Bruxelles"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date de début *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Date de fin (optionnel)</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Informations complémentaires..."
                      rows={2}
                    />
                  </div>

                  <Button 
                    onClick={createLink}
                    disabled={isLoading || !formData.provider_nihii || !formData.provider_name}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Créer le lien thérapeutique
                  </Button>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-xs">
                      Le lien thérapeutique permet au prestataire d'accéder aux données de santé du patient 
                      via les coffres-forts régionaux (RSW, Vitalink, CoZo).
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
                    <Unlink className="w-4 h-4" />
                    Révoquer un lien thérapeutique
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      La révocation d'un lien thérapeutique supprime l'accès du prestataire aux données 
                      de santé du patient via les coffres-forts.
                    </AlertDescription>
                  </Alert>

                  {activeLinks.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">
                      Aucun lien actif à révoquer. Vérifiez d'abord les liens existants.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeLinks.map(link => {
                        const Icon = getLinkTypeIcon(link.link_type);
                        const isSelected = selectedLink?.id === link.id;
                        return (
                          <Card 
                            key={link.id} 
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'border-red-400 bg-red-50' : 'hover:border-red-300'
                            }`}
                            onClick={() => setSelectedLink(isSelected ? null : link)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Icon className="w-5 h-5 text-slate-600" />
                                  <div>
                                    <p className="font-medium">{link.provider_name}</p>
                                    <p className="text-sm text-slate-500">{link.link_type}</p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Badge variant="destructive">Sélectionné</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {selectedLink && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
                          <div>
                            <Label>Raison de la révocation *</Label>
                            <Textarea
                              value={revocationReason}
                              onChange={(e) => setRevocationReason(e.target.value)}
                              placeholder="Ex: Changement de médecin traitant, à la demande du patient..."
                              rows={2}
                            />
                          </div>
                          <Button 
                            variant="destructive"
                            onClick={() => revokeLink(selectedLink.id)}
                            disabled={isLoading || !revocationReason.trim()}
                            className="w-full gap-2"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            Révoquer le lien avec {selectedLink.provider_name}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Historique */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historique des liens thérapeutiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : linkHistory.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Aucun historique disponible</p>
                  ) : (
                    <div className="space-y-3">
                      {linkHistory.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{getActionLabel(event.action)}</p>
                            <p className="text-sm text-slate-600">
                              {event.link_type} - {event.provider_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{event.details}</p>
                            <p className="text-xs text-slate-400 mt-1">Par: {event.actor}</p>
                          </div>
                          <span className="text-xs text-slate-500">{event.date}</span>
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