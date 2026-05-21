import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const providerLabels = { doctolib: 'Doctolib', doctena: 'Doctena', google_calendar: 'Google Calendar' };

export default function SyncConfigPanel({ provider, onSubmit, onClose }) {
  const [form, setForm] = useState({
    provider: provider || 'doctolib',
    sync_direction: 'bidirectional',
    config: { api_key: '', calendar_id: '', auto_sync: true, sync_interval_minutes: 15 }
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setConfig = (key, val) => setForm(prev => ({ ...prev, config: { ...prev.config, [key]: val } }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurer {providerLabels[form.provider] || form.provider}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fournisseur</Label>
            <Select value={form.provider} onValueChange={v => set('provider', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="doctolib">Doctolib</SelectItem>
                <SelectItem value="doctena">Doctena</SelectItem>
                <SelectItem value="google_calendar">Google Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Clé API / Token</Label>
            <Input
              type="password"
              placeholder="Votre clé API ou token d'accès"
              value={form.config.api_key}
              onChange={e => setConfig('api_key', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Retrouvez votre clé dans les paramètres de votre compte {providerLabels[form.provider]}
            </p>
          </div>
          <div>
            <Label>ID du calendrier (optionnel)</Label>
            <Input
              placeholder="Identifiant du calendrier"
              value={form.config.calendar_id}
              onChange={e => setConfig('calendar_id', e.target.value)}
            />
          </div>
          <div>
            <Label>Direction de synchronisation</Label>
            <Select value={form.sync_direction} onValueChange={v => set('sync_direction', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bidirectional">Bidirectionnelle</SelectItem>
                <SelectItem value="inbound">Entrante uniquement</SelectItem>
                <SelectItem value="outbound">Sortante uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Synchronisation automatique</Label>
            <Switch checked={form.config.auto_sync} onCheckedChange={v => setConfig('auto_sync', v)} />
          </div>
          {form.config.auto_sync && (
            <div>
              <Label>Intervalle (minutes)</Label>
              <Select value={String(form.config.sync_interval_minutes)} onValueChange={v => setConfig('sync_interval_minutes', parseInt(v))}>
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
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => onSubmit(form)} disabled={!form.config.api_key}>
              Connecter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}