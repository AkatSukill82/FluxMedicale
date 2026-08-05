import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Link2, Unlink, Settings, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Calendar, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';

const providerInfo = {
  doctolib: { name: 'Doctolib', color: 'bg-blue-100 text-blue-700', description: 'Synchronisez vos rendez-vous Doctolib automatiquement.' },
  doctena: { name: 'Doctena', color: 'bg-green-100 text-green-700', description: 'Synchronisez vos rendez-vous Doctena automatiquement.' },
  google_calendar: { name: 'Google Calendar', color: 'bg-red-100 text-red-700', description: 'Déjà intégré via le module Agenda.' },
};

const statusIcons = {
  synced: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  pending: <Clock className="w-4 h-4 text-yellow-600" />,
  error: <XCircle className="w-4 h-4 text-red-600" />,
  conflict: <AlertTriangle className="w-4 h-4 text-orange-600" />,
};

export default function IntegrationDoctolib() {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configProvider, setConfigProvider] = useState('doctolib');
  const [configData, setConfigData] = useState({ api_key: '', calendar_id: '', auto_sync: true, sync_interval_minutes: 15 });
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: syncs = [], isLoading } = useQuery({
    queryKey: ['calendarSyncs'],
    queryFn: () => base44.entities.ExternalCalendarSync.list('-last_synced_at', 100),
  });

  const createSyncMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalCalendarSync.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendarSyncs'] }); setShowConfigDialog(false); },
  });

  const deleteSyncMutation = useMutation({
    mutationFn: (id) => base44.entities.ExternalCalendarSync.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendarSyncs'] }),
  });

  const activeSyncs = syncs.filter(s => s.medecin_email === user?.email);
  const connectedProviders = new Set(activeSyncs.map(s => s.provider));

  const handleConnect = () => {
    createSyncMutation.mutate({
      provider: configProvider,
      medecin_email: user?.email,
      sync_direction: 'bidirectional',
      sync_status: 'pending',
      config: configData,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-7 h-7" />
          Intégration Doctolib / Doctena
        </h1>
        <p className="text-muted-foreground">Synchronisation bidirectionnelle de vos rendez-vous externes</p>
      </div>

      {/* Provider cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {['doctolib', 'doctena'].map(provider => {
          const info = providerInfo[provider];
          const isConnected = connectedProviders.has(provider);
          const syncRecord = activeSyncs.find(s => s.provider === provider);

          return (
            <Card key={provider} className={isConnected ? 'border-green-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={info.color}>{info.name}</Badge>
                    {isConnected && <Badge variant="outline" className="text-green-600 border-green-300">Connecté</Badge>}
                  </div>
                  {isConnected && statusIcons[syncRecord?.sync_status]}
                </div>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p>Direction: <Badge variant="outline">{syncRecord?.sync_direction === 'bidirectional' ? 'Bidirectionnelle' : syncRecord?.sync_direction}</Badge></p>
                      {syncRecord?.last_synced_at && (
                        <p className="text-muted-foreground mt-1">
                          Dernière sync: {format(new Date(syncRecord.last_synced_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                      {syncRecord?.error_message && (
                        <p className="text-red-600 text-xs mt-1">{syncRecord.error_message}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        base44.entities.ExternalCalendarSync.update(syncRecord.id, {
                          sync_status: 'pending',
                          last_synced_at: new Date().toISOString(),
                        }).then(() => queryClient.invalidateQueries({ queryKey: ['calendarSyncs'] }));
                      }}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Sync maintenant
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteSyncMutation.mutate(syncRecord.id)}>
                        <Unlink className="w-4 h-4 mr-1" /> Déconnecter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => { setConfigProvider(provider); setConfigData({ api_key: '', calendar_id: '', auto_sync: true, sync_interval_minutes: 15 }); setShowConfigDialog(true); }}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Connecter {info.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync history */}
      {activeSyncs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique de synchronisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSyncs.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {statusIcons[s.sync_status]}
                    <div>
                      <Badge className={providerInfo[s.provider]?.color}>{providerInfo[s.provider]?.name}</Badge>
                      <span className="text-sm ml-2">{s.sync_status}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.last_synced_at ? format(new Date(s.last_synced_at), 'dd/MM HH:mm') : 'Jamais'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer {providerInfo[configProvider]?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clé API / Token</Label>
              <Input
                type="password"
                value={configData.api_key}
                onChange={e => setConfigData({ ...configData, api_key: e.target.value })}
                placeholder="Votre clé API"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Trouvez votre clé dans les paramètres de votre compte {providerInfo[configProvider]?.name}.
              </p>
            </div>
            <div>
              <Label>ID Calendrier (optionnel)</Label>
              <Input
                value={configData.calendar_id}
                onChange={e => setConfigData({ ...configData, calendar_id: e.target.value })}
                placeholder="ID du calendrier à synchroniser"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Synchronisation automatique</Label>
              <Switch checked={configData.auto_sync} onCheckedChange={v => setConfigData({ ...configData, auto_sync: v })} />
            </div>
            {configData.auto_sync && (
              <div>
                <Label>Intervalle de sync (minutes)</Label>
                <Select value={configData.sync_interval_minutes.toString()} onValueChange={v => setConfigData({ ...configData, sync_interval_minutes: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Annuler</Button>
              <Button onClick={handleConnect} disabled={createSyncMutation.isPending}>
                {createSyncMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connecter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}