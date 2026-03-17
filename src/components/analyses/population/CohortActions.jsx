import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Mail, Bell, FileText, Printer, Send, Loader2, CheckCircle2,
  Download, Users, Calendar
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function getPatientName(patient) {
  const n = (patient.name || [])[0];
  if (!n) return 'Patient';
  return `${n.family || ''} ${(n.given || []).join(' ')}`.trim() || 'Patient';
}

function getPatientEmail(patient) {
  return (patient.telecom || []).find(t => t.system === 'email')?.value || '';
}

export default function CohortActions({ patients, filters }) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  const patientsWithEmail = patients.filter(p => getPatientEmail(p));

  const handleBulkEmail = async () => {
    if (!emailSubject || !emailBody || patientsWithEmail.length === 0) return;
    setSending(true);
    let sent = 0;
    for (const p of patientsWithEmail) {
      const email = getPatientEmail(p);
      const personalizedBody = emailBody
        .replace(/\{nom\}/g, getPatientName(p))
        .replace(/\{prenom\}/g, ((p.name || [])[0]?.given || [])[0] || '');
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: emailSubject,
        body: personalizedBody,
      }).catch(() => {});
      sent++;
    }
    setSending(false);
    setShowEmailDialog(false);
    toast.success(`${sent} emails envoyés avec succès`);
  };

  const handleBulkReminder = async () => {
    if (!reminderTitle || !reminderMessage) return;
    setSending(true);
    const reminders = patients.map(p => ({
      recipient_email: p.created_by || '',
      type: 'follow_up',
      priority: 'normal',
      title: reminderTitle,
      message: reminderMessage.replace(/\{nom\}/g, getPatientName(p)),
      patient_id: p.id,
      patient_name: getPatientName(p),
      action_required: true,
    }));
    for (const r of reminders) {
      await base44.entities.Notification.create(r).catch(() => {});
    }
    setSending(false);
    setShowReminderDialog(false);
    toast.success(`${reminders.length} rappels créés`);
  };

  const handleExportDetailedCSV = () => {
    const headers = ['Nom', 'Prénom', 'NISS', 'Date naissance', 'Âge', 'Sexe', 'Téléphone', 'Email', 'Ville', 'Code postal', 'Assurance', 'Statut assurance', 'Mutuelle', 'N° mutuelle'];
    const rows = patients.map(p => {
      const n = (p.name || [])[0] || {};
      const addr = (p.address || [])[0] || {};
      const phone = (p.telecom || []).find(t => t.system === 'phone')?.value || '';
      const email = getPatientEmail(p);
      const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '';
      return [
        n.family || '', (n.given || []).join(' '), ((p.identifier || [])[0]?.value) || '',
        p.birthDate || '', age, p.gender || '', phone, email,
        addr.city || '', addr.postalCode || '', p.insurance_regime || '',
        p.insurance_status || '', p.mutuelle || '', p.numero_mutuelle || '',
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohorte_detaillee_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintList = () => {
    window.print();
  };

  if (patients.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Actions sur la cohorte</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowEmailDialog(true)}>
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Email groupé
              <Badge variant="secondary" className="ml-1.5 text-[10px]">{patientsWithEmail.length}</Badge>
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowReminderDialog(true)}>
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Créer rappels
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={handleExportDetailedCSV}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV détaillé
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={handlePrintList}>
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email groupé à la cohorte</DialogTitle>
            <DialogDescription>{patientsWithEmail.length} patients avec adresse email</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Objet de l'email" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            <Textarea
              placeholder="Corps du message. Utilisez {nom} et {prenom} pour personnaliser."
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              className="h-32"
            />
            <p className="text-xs text-muted-foreground">Variables disponibles : {'{nom}'}, {'{prenom}'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Annuler</Button>
            <Button onClick={handleBulkEmail} disabled={sending || !emailSubject || !emailBody}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              Envoyer à {patientsWithEmail.length} patients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer des rappels de suivi</DialogTitle>
            <DialogDescription>Un rappel sera créé pour chacun des {patients.length} patients</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Titre du rappel" value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} />
            <Textarea
              placeholder="Message du rappel. Utilisez {nom} pour personnaliser."
              value={reminderMessage}
              onChange={e => setReminderMessage(e.target.value)}
              className="h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>Annuler</Button>
            <Button onClick={handleBulkReminder} disabled={sending || !reminderTitle || !reminderMessage}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Bell className="w-4 h-4 mr-1.5" />}
              Créer {patients.length} rappels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}