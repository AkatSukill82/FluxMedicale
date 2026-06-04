import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Network,
  Settings,
  RefreshCw,
  History,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Play,
  Save,
  Loader2,
  FileText,
  CreditCard,
  Users,
  Stethoscope,
  Shield,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format as dateFnsFormat } from 'date-fns';

const MYCARENET_SERVICES = [
  { id: 'memberdata', label: 'MemberData', description: 'Vérification assurabilité', icon: Users },
  { id: 'efact', label: 'eFact', description: 'Facturation électronique', icon: FileText },
  { id: 'eattest', label: 'eAttest', description: 'Attestations électroniques', icon: CreditCard },
  { id: 'eagreement', label: 'eAgreement', description: 'Accords médecin-conseil', icon: Stethoscope },
  { id: 'chapter4', label: 'Chapitre IV', description: 'Demandes remboursement', icon: Shield },
  { id: 'dmg', label: 'DMG', description: 'Dossier Médical Global', icon: FileText },
  { id: 'tarification', label: 'Tarification', description: 'Consultation tarifs', icon: CreditCard }
];

export default function MyCareNetManager() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [config, setConfig] = useState({
    nihii: '',
    environment: 'sandbox',
    services_enabled: []
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  // Fetch existing config
  const { data: existingConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['mycarenet-config', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const configs = await base44.entities.MyCareNetConfig.filter({ medecin_email: currentUser.email });
      return configs[0] || null;
    },
    enabled: !!currentUser?.email
  });

  // Fetch sync logs
  const { data: syncLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['mycarenet-logs', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return base44.entities.MyCareNetSyncLog.filter(
        { medecin_email: currentUser.email },
        '-created_date',
        50
      );
    },
    enabled: !!currentUser?.email
  });

  useEffect(() => {
    if (existingConfig) {
      setConfig({
        nihii: existingConfig.nihii || '',
        environment: existingConfig.environment || 'sandbox',
        services_enabled: existingConfig.services_enabled || []
      });
    }
  }, [existingConfig]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (existingConfig) {
        return base44.entities.MyCareNetConfig.update(existingConfig.id, {
          ...data,
          medecin_email: currentUser.email,
          connection_status: 'configured'
        });
      } else {
        return base44.entities.MyCareNetConfig.create({
          ...data,
          medecin_email: currentUser.email,
          connection_status: 'configured'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mycarenet-config'] });
      toast.success('Configuration sauvegardée');
    },
    onError: (err) => toast.error(err.message)
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // Create a log entry for the test
      const log = await base44.entities.MyCareNetSyncLog.create({
        medecin_email: currentUser.email,
        sync_type: 'connection_test',
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

      // Simulate connection test (in production, this would call the actual MyCareNet endpoint)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const success = config.nihii && config.nihii.length === 11;
      
      await base44.entities.MyCareNetSyncLog.update(log.id, {
        status: success ? 'success' : 'failed',
        completed_at: new Date().toISOString(),
        error_message: success ? null : 'NIHII invalide ou certificat manquant',
        error_code: success ? null : 'AUTH_FAILED'
      });

      if (existingConfig) {
        await base44.entities.MyCareNetConfig.update(existingConfig.id, {
          last_connection_test: new Date().toISOString(),
          connection_status: success ? 'connected' : 'error',
          error_message: success ? null : 'Test de connexion échoué'
        });
      }

      return success;
    },
    onSuccess: (success) => {
      queryClient.invalidateQueries({ queryKey: ['mycarenet-config'] });
      queryClient.invalidateQueries({ queryKey: ['mycarenet-logs'] });
      if (success) {
        toast.success('Connexion MyCareNet réussie');
      } else {
        toast.error('Échec de la connexion MyCareNet');
      }
    },
    onError: (err) => toast.error(err.message)
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (syncType) => {
      const log = await base44.entities.MyCareNetSyncLog.create({
        medecin_email: currentUser.email,
        sync_type: syncType,
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

      // Simulate sync (in production, this would call actual MyCareNet services)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const success = Math.random() > 0.2; // 80% success rate for demo
      const recordsProcessed = Math.floor(Math.random() * 50) + 10;
      
      await base44.entities.MyCareNetSyncLog.update(log.id, {
        status: success ? 'success' : 'failed',
        completed_at: new Date().toISOString(),
        records_processed: recordsProcessed,
        records_success: success ? recordsProcessed : Math.floor(recordsProcessed * 0.5),
        records_failed: success ? 0 : Math.floor(recordsProcessed * 0.5),
        error_message: success ? null : 'Erreur de communication avec MyCareNet',
        error_code: success ? null : 'MCN_COMM_ERROR',
        request_id: `MCN-${Date.now()}`
      });

      return { success, syncType };
    },
    onSuccess: ({ success, syncType }) => {
      queryClient.invalidateQueries({ queryKey: ['mycarenet-logs'] });
      const service = MYCARENET_SERVICES.find(s => s.id === syncType);
      if (success) {
        toast.success(`Synchronisation ${service?.label} terminée`);
      } else {
        toast.error(`Échec synchronisation ${service?.label}`);
      }
    },
    onError: (err) => toast.error(err.message)
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate(config);
  };

  const toggleService = (serviceId) => {
    setConfig(prev => ({
      ...prev,
      services_enabled: prev.services_enabled.includes(serviceId)
        ? prev.services_enabled.filter(s => s !== serviceId)
        : [...prev.services_enabled, serviceId]
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { bg: 'bg-red-100 text-red-800', icon: XCircle },
      partial: { bg: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      in_progress: { bg: 'bg-blue-100 text-blue-800', icon: Loader2 },
      pending: { bg: 'bg-gray-100 text-gray-800', icon: Clock }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <Badge className={style.bg}>
        <Icon className={`w-3 h-3 mr-1 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  const getConnectionStatusBadge = (status) => {
    const styles = {
      connected: { bg: 'bg-green-100 text-green-800', label: 'Connecté', icon: CheckCircle },
      configured: { bg: 'bg-blue-100 text-blue-800', label: 'Configuré', icon: Settings },
      error: { bg: 'bg-red-100 text-red-800', label: 'Erreur', icon: XCircle },
      not_configured: { bg: 'bg-gray-100 text-gray-800', label: 'Non configuré', icon: AlertTriangle }
    };
    const style = styles[status] || styles.not_configured;
    const Icon = style.icon;
    return (
      <Badge className={style.bg}>
        <Icon className="w-3 h-3 mr-1" />
        {style.label}
      </Badge>
    );
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config"><Settings className="w-4 h-4 mr-2" /> Configuration</TabsTrigger>
          <TabsTrigger value="sync"><RefreshCw className="w-4 h-4 mr-2" /> Synchronisation</TabsTrigger>
          <TabsTrigger value="logs"><History className="w-4 h-4 mr-2" /> Historique</TabsTrigger>
          <TabsTrigger value="help"><HelpCircle className="w-4 h-4 mr-2" /> Aide</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Configuration MyCareNet
                  </CardTitle>
                  <CardDescription>Paramètres de connexion aux services MyCareNet</CardDescription>
                </div>
                {existingConfig && getConnectionStatusBadge(existingConfig.connection_status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  <strong>Important :</strong> Pour utiliser MyCareNet en production, vous devez disposer d'un certificat eHealth valide 
                  et être homologué. L'environnement sandbox permet de tester sans certificat.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nihii">Numéro INAMI (NIHII)</Label>
                  <Input
                    id="nihii"
                    value={config.nihii}
                    onChange={(e) => setConfig(prev => ({ ...prev, nihii: e.target.value }))}
                    placeholder="12345678901"
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground">11 chiffres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">Environnement</Label>
                  <Select
                    value={config.environment}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, environment: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                      <SelectItem value="acceptance">Acceptance (Pré-prod)</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Services activés</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {MYCARENET_SERVICES.map((service) => {
                    const Icon = service.icon;
                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{service.label}</div>
                            <div className="text-xs text-muted-foreground">{service.description}</div>
                          </div>
                        </div>
                        <Switch
                          checked={config.services_enabled.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
                  {saveConfigMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sauvegarde...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Sauvegarder</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending || !config.nihii}
                >
                  {testConnectionMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test en cours...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Tester la connexion</>
                  )}
                </Button>
              </div>

              {existingConfig?.last_connection_test && (
                <p className="text-sm text-muted-foreground">
                  Dernier test: {dateFnsFormat(new Date(existingConfig.last_connection_test), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Synchronisation MyCareNet
              </CardTitle>
              <CardDescription>Lancez une synchronisation avec les services MyCareNet</CardDescription>
            </CardHeader>
            <CardContent>
              {!existingConfig || existingConfig.connection_status === 'not_configured' ? (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Veuillez d'abord configurer votre connexion MyCareNet dans l'onglet Configuration.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {MYCARENET_SERVICES.filter(s => config.services_enabled.includes(s.id)).map((service) => {
                    const Icon = service.icon;
                    const isRunning = syncMutation.isPending && syncMutation.variables === service.id;
                    return (
                      <Card key={service.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-50">
                                <Icon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium">{service.label}</div>
                                <div className="text-xs text-muted-foreground">{service.description}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => syncMutation.mutate(service.id)}
                              disabled={syncMutation.isPending}
                            >
                              {isRunning ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {config.services_enabled.length === 0 && (
                    <p className="text-muted-foreground col-span-2 text-center py-8">
                      Aucun service activé. Activez des services dans l'onglet Configuration.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique des synchronisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {loadingLogs ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : syncLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun historique</p>
                ) : (
                  <div className="space-y-3">
                    {syncLogs.map((log) => {
                      const service = MYCARENET_SERVICES.find(s => s.id === log.sync_type);
                      return (
                        <div key={log.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{service?.label || log.sync_type}</Badge>
                              {getStatusBadge(log.status)}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {dateFnsFormat(new Date(log.started_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          
                          {log.status === 'success' || log.status === 'partial' ? (
                            <div className="text-sm">
                              <span className="text-green-600">{log.records_success} réussis</span>
                              {log.records_failed > 0 && (
                                <span className="text-red-600 ml-2">{log.records_failed} échoués</span>
                              )}
                              <span className="text-muted-foreground ml-2">/ {log.records_processed} traités</span>
                            </div>
                          ) : log.status === 'failed' && (
                            <div className="text-sm text-red-600">
                              {log.error_code && <Badge variant="destructive" className="mr-2">{log.error_code}</Badge>}
                              {log.error_message}
                            </div>
                          )}
                          
                          {log.request_id && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Ref: {log.request_id}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Comment obtenir l'accès MyCareNet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  MyCareNet est la plateforme d'échange électronique entre prestataires de soins et mutuelles en Belgique.
                  L'accès en production nécessite une homologation officielle.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm">1</span>
                    Prérequis techniques
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-8">
                    <li>• Certificat eHealth valide (authentification + signature)</li>
                    <li>• Numéro INAMI actif</li>
                    <li>• Convention avec les organismes assureurs</li>
                    <li>• Logiciel homologué par l'INAMI</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm">2</span>
                    Processus d'homologation
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-8">
                    <li>• Demande d'homologation auprès de l'INAMI</li>
                    <li>• Tests dans l'environnement d'acceptance</li>
                    <li>• Audit de sécurité et conformité</li>
                    <li>• Validation et mise en production</li>
                  </ul>
                  <p className="text-sm text-muted-foreground ml-8 mt-2">
                    <strong>Durée estimée:</strong> 6-12 mois
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm">3</span>
                    Services disponibles
                  </h3>
                  <div className="ml-8 space-y-2 text-sm">
                    <div><strong>MemberData:</strong> Vérification assurabilité patient</div>
                    <div><strong>eFact:</strong> Facturation électronique tiers payant</div>
                    <div><strong>eAttest:</strong> Attestations de soins électroniques</div>
                    <div><strong>eAgreement:</strong> Demandes d'accord médecin-conseil</div>
                    <div><strong>Chapitre IV:</strong> Demandes de remboursement spécial</div>
                    <div><strong>DMG:</strong> Gestion Dossier Médical Global</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button variant="outline" asChild>
                  <a href="https://www.mycarenet.be" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    MyCareNet.be
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://www.ehealth.fgov.be/ehealthplatform/fr/service-mycarenet" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Documentation eHealth
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://www.inami.fgov.be/fr/professionnels/autres/Pages/mycarenet.aspx" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    INAMI - MyCareNet
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}