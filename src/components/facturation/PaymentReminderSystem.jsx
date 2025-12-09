import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, Send, Settings, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PaymentReminderSystem() {
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    reminder_type: 'FIRST_REMINDER',
    subject: '',
    body_html: '',
    days_after_due: 7
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['reminderTemplates'],
    queryFn: () => base44.entities.ReminderTemplate.list()
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['paymentReminders'],
    queryFn: () => base44.entities.PaymentReminder.list('-scheduled_date', 100)
  });

  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ['overdueInvoices'],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.list('-invoice_date', 500);
      const today = new Date();
      return allInvoices.filter(inv => {
        if (inv.status === 'PAID') return false;
        const dueDate = new Date(inv.invoice_date);
        const daysDue = addDays(dueDate, 30); // 30 jours par défaut
        return today > daysDue;
      });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.ReminderTemplate.create({
        ...data,
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminderTemplates'] });
      toast.success('Modèle créé');
      setShowTemplateDialog(false);
      resetTemplateForm();
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ invoice, template }) => {
      const user = await base44.auth.me();
      const patient = await base44.entities.Patient.list();
      const pat = patient.find(p => p.id === invoice.patient_id);
      const patientName = pat?.name?.[0] ? `${pat.name[0].given?.join(' ')} ${pat.name[0].family}` : 'Patient';
      
      const daysOverdue = differenceInDays(new Date(), addDays(new Date(invoice.invoice_date), 30));
      
      // Replace variables in template
      let subject = template.subject
        .replace('{{patient_name}}', patientName)
        .replace('{{invoice_number}}', invoice.id)
        .replace('{{amount_due}}', `${(invoice.total_amount / 100).toFixed(2)}€`)
        .replace('{{days_overdue}}', daysOverdue);

      let body = template.body_html
        .replace(/{{patient_name}}/g, patientName)
        .replace(/{{invoice_number}}/g, invoice.id)
        .replace(/{{amount_due}}/g, `${(invoice.total_amount / 100).toFixed(2)}€`)
        .replace(/{{due_date}}/g, format(addDays(new Date(invoice.invoice_date), 30), 'dd/MM/yyyy'))
        .replace(/{{days_overdue}}/g, daysOverdue)
        .replace(/{{payment_link}}/g, '#');

      // Send email
      const patientEmail = pat?.telecom?.find(t => t.system === 'email')?.value;
      if (patientEmail) {
        await base44.integrations.Core.SendEmail({
          to: patientEmail,
          subject: subject,
          body: body
        });
      }

      // Create reminder record
      return await base44.entities.PaymentReminder.create({
        invoice_id: invoice.id,
        patient_id: invoice.patient_id,
        reminder_type: template.reminder_type,
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        sent_date: new Date().toISOString(),
        status: 'SENT',
        template_id: template.id,
        email_subject: subject,
        email_body: body,
        days_overdue: daysOverdue,
        amount_due: invoice.total_amount,
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentReminders'] });
      toast.success('Relance envoyée avec succès');
    }
  });

  const scheduleAutoReminders = async () => {
    const user = await base44.auth.me();
    const firstTemplate = templates.find(t => t.reminder_type === 'FIRST_REMINDER' && t.is_active);
    
    if (!firstTemplate) {
      toast.error('Aucun modèle actif pour la première relance');
      return;
    }

    let scheduled = 0;
    for (const invoice of overdueInvoices) {
      const daysOverdue = differenceInDays(new Date(), addDays(new Date(invoice.invoice_date), 30));
      
      if (daysOverdue >= firstTemplate.days_after_due) {
        const existingReminder = reminders.find(r => 
          r.invoice_id === invoice.id && r.reminder_type === 'FIRST_REMINDER'
        );
        
        if (!existingReminder) {
          await base44.entities.PaymentReminder.create({
            invoice_id: invoice.id,
            patient_id: invoice.patient_id,
            reminder_type: 'FIRST_REMINDER',
            scheduled_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'SCHEDULED',
            template_id: firstTemplate.id,
            days_overdue: daysOverdue,
            amount_due: invoice.total_amount,
            created_by: user.email
          });
          scheduled++;
        }
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['paymentReminders'] });
    toast.success(`${scheduled} relances programmées`);
  };

  const resetTemplateForm = () => {
    setTemplateData({
      name: '',
      reminder_type: 'FIRST_REMINDER',
      subject: '',
      body_html: '',
      days_after_due: 7
    });
    setSelectedTemplate(null);
  };

  const defaultTemplates = {
    FIRST_REMINDER: {
      subject: 'Rappel - Facture en attente {{invoice_number}}',
      body: `<p>Bonjour {{patient_name}},</p>
<p>Nous vous rappelons que votre facture n°{{invoice_number}} d'un montant de {{amount_due}} reste impayée.</p>
<p>Date d'échéance dépassée de {{days_overdue}} jours.</p>
<p>Merci de régulariser votre situation dans les plus brefs délais.</p>
<p>Cordialement,</p>`
    },
    SECOND_REMINDER: {
      subject: 'Deuxième rappel - Facture {{invoice_number}}',
      body: `<p>Bonjour {{patient_name}},</p>
<p>Malgré notre premier rappel, votre facture n°{{invoice_number}} reste impayée.</p>
<p>Montant dû: {{amount_due}}</p>
<p>Nous vous prions de bien vouloir régulariser cette situation sous 7 jours.</p>
<p>Cordialement,</p>`
    },
    FINAL_NOTICE: {
      subject: 'Mise en demeure - Facture {{invoice_number}}',
      body: `<p>Bonjour {{patient_name}},</p>
<p>Malgré nos relances, votre facture n°{{invoice_number}} demeure impayée.</p>
<p>Sans règlement sous 5 jours ouvrables, nous serons contraints d'engager des poursuites.</p>
<p>Montant dû: {{amount_due}}</p>
<p>Cordialement,</p>`
    }
  };

  const reminderTypeLabels = {
    FIRST_REMINDER: 'Première relance',
    SECOND_REMINDER: 'Deuxième relance',
    FINAL_NOTICE: 'Mise en demeure'
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="reminders">
        <TabsList>
          <TabsTrigger value="reminders">Relances en cours</TabsTrigger>
          <TabsTrigger value="overdue">Factures impayées ({overdueInvoices.length})</TabsTrigger>
          <TabsTrigger value="templates">Modèles d'emails</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Historique des relances</h3>
            <Button onClick={scheduleAutoReminders}>
              <Clock className="w-4 h-4 mr-2" />
              Programmer les relances auto
            </Button>
          </div>
          
          {reminders.map(reminder => (
            <Card key={reminder.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{reminderTypeLabels[reminder.reminder_type]}</Badge>
                      <Badge variant={reminder.status === 'SENT' ? 'default' : 'outline'}>
                        {reminder.status === 'SENT' ? 'Envoyée' : 'Programmée'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Facture: {reminder.invoice_id} • Montant: {(reminder.amount_due / 100).toFixed(2)}€
                    </p>
                    <p className="text-sm text-slate-600">
                      {reminder.sent_date 
                        ? `Envoyée le ${format(new Date(reminder.sent_date), 'dd MMM yyyy HH:mm', { locale: fr })}`
                        : `Programmée pour le ${format(new Date(reminder.scheduled_date), 'dd MMM yyyy', { locale: fr })}`
                      }
                    </p>
                  </div>
                  {reminder.status === 'SENT' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Factures en retard</h3>
          </div>
          
          {overdueInvoices.map(invoice => {
            const daysOverdue = differenceInDays(new Date(), addDays(new Date(invoice.invoice_date), 30));
            const remindersSent = reminders.filter(r => r.invoice_id === invoice.id && r.status === 'SENT').length;
            const firstTemplate = templates.find(t => t.reminder_type === 'FIRST_REMINDER' && t.is_active);
            
            return (
              <Card key={invoice.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold">Facture {invoice.id}</span>
                        <Badge variant="destructive">{daysOverdue} jours de retard</Badge>
                        {remindersSent > 0 && (
                          <Badge variant="outline">{remindersSent} relance(s) envoyée(s)</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        Montant: {(invoice.total_amount / 100).toFixed(2)}€ • 
                        Date: {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    {firstTemplate && (
                      <Button
                        size="sm"
                        onClick={() => sendReminderMutation.mutate({ invoice, template: firstTemplate })}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer relance
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Modèles d'emails de relance</h3>
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Nouveau modèle
            </Button>
          </div>
          
          {templates.map(template => (
            <Card key={template.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge>{reminderTypeLabels[template.reminder_type]}</Badge>
                      {template.is_active && <Badge variant="outline">Actif</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Envoi après {template.days_after_due} jours de retard
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Objet:</strong> {template.subject}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Créer un modèle de relance</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du modèle</Label>
                <Input
                  value={templateData.name}
                  onChange={(e) => setTemplateData({...templateData, name: e.target.value})}
                  placeholder="Ex: Première relance standard"
                />
              </div>
              
              <div>
                <Label>Type de relance</Label>
                <select
                  className="w-full h-10 px-3 border rounded"
                  value={templateData.reminder_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setTemplateData({
                      ...templateData,
                      reminder_type: type,
                      subject: defaultTemplates[type].subject,
                      body_html: defaultTemplates[type].body
                    });
                  }}
                >
                  <option value="FIRST_REMINDER">Première relance</option>
                  <option value="SECOND_REMINDER">Deuxième relance</option>
                  <option value="FINAL_NOTICE">Mise en demeure</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Jours après échéance</Label>
              <Input
                type="number"
                value={templateData.days_after_due}
                onChange={(e) => setTemplateData({...templateData, days_after_due: parseInt(e.target.value)})}
              />
            </div>

            <div>
              <Label>Objet de l'email</Label>
              <Input
                value={templateData.subject}
                onChange={(e) => setTemplateData({...templateData, subject: e.target.value})}
              />
            </div>

            <div>
              <Label>Corps de l'email (HTML)</Label>
              <Textarea
                value={templateData.body_html}
                onChange={(e) => setTemplateData({...templateData, body_html: e.target.value})}
                rows={10}
              />
              <p className="text-xs text-slate-500 mt-1">
                Variables disponibles: {'{'}{'{'}}patient_name{'}'}{'}'}, {'{'}{'{'}}invoice_number{'}'}{'}'}, 
                {'{'}{'{'}}amount_due{'}'}{'}'}, {'{'}{'{'}}due_date{'}'}{'}'}, {'{'}{'{'}}days_overdue{'}'}{'}'}, 
                {'{'}{'{'}}payment_link{'}'}{'}'}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => createTemplateMutation.mutate(templateData)}
                disabled={!templateData.name || !templateData.subject || !templateData.body_html}
              >
                Créer le modèle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}