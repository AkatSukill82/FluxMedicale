import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Mail, MessageSquare, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ReminderSettings({ onSave }) {
  const [settings, setSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    timing: '24', // heures avant RDV
    email_template: 'Bonjour {{patient_name}},\n\nCeci est un rappel pour votre rendez-vous le {{date}} à {{time}}.\n\nCordialement,\nDr. {{doctor_name}}',
    sms_template: 'Rappel RDV: {{date}} à {{time}}. Dr. {{doctor_name}}'
  });

  const handleSave = () => {
    onSave(settings);
    toast.success('Paramètres de rappel enregistrés');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Paramètres des rappels automatiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium">Rappels par email</p>
              <p className="text-sm text-slate-600">Envoyer un email de rappel aux patients</p>
            </div>
          </div>
          <Switch
            checked={settings.email_enabled}
            onCheckedChange={(v) => setSettings({...settings, email_enabled: v})}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium">Rappels par SMS</p>
              <p className="text-sm text-slate-600">Envoyer un SMS de rappel (nécessite configuration)</p>
            </div>
          </div>
          <Switch
            checked={settings.sms_enabled}
            onCheckedChange={(v) => setSettings({...settings, sms_enabled: v})}
          />
        </div>

        <div>
          <Label>Délai avant le rendez-vous</Label>
          <Select value={settings.timing} onValueChange={(v) => setSettings({...settings, timing: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 heure avant</SelectItem>
              <SelectItem value="2">2 heures avant</SelectItem>
              <SelectItem value="24">24 heures avant</SelectItem>
              <SelectItem value="48">48 heures avant</SelectItem>
              <SelectItem value="72">3 jours avant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.email_enabled && (
          <div>
            <Label>Template email</Label>
            <Textarea
              value={settings.email_template}
              onChange={(e) => setSettings({...settings, email_template: e.target.value})}
              className="h-32 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              Variables disponibles: {'{'}{'{'} patient_name {'}'}{'}'},  {'{'}{'{'} date {'}'}{'}'},  {'{'}{'{'} time {'}'}{'}'},  {'{'}{'{'} doctor_name {'}'}{'}'} 
            </p>
          </div>
        )}

        {settings.sms_enabled && (
          <div>
            <Label>Template SMS (160 caractères max)</Label>
            <Textarea
              value={settings.sms_template}
              onChange={(e) => setSettings({...settings, sms_template: e.target.value})}
              maxLength={160}
              className="h-20 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              {settings.sms_template.length}/160 caractères
            </p>
          </div>
        )}

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les paramètres
        </Button>
      </CardContent>
    </Card>
  );
}