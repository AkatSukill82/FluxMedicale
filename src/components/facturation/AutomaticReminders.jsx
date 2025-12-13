import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Send, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AutomaticReminders() {
  const queryClient = useQueryClient();
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(true);

  // Récupérer les factures en retard
  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ['overdue_invoices'],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.list('-invoice_date', 500);
      const today = new Date();
      
      return allInvoices.filter(inv => {
        if (inv.status === 'PAID' || inv.status === 'DRAFT') return false;
        
        const invoiceDate = new Date(inv.invoice_date);
        const daysOverdue = differenceInDays(today, invoiceDate);
        
        return daysOverdue > 30; // Plus de 30 jours
      });
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients_for_reminders'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: existingReminders = [] } = useQuery({
    queryKey: ['payment_reminders'],
    queryFn: () => base44.entities.PaymentReminder.list('-scheduled_date', 200)
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (invoice) => {
      const patient = patients.find(p => p.id === invoice.patient_id);
      const email = patient?.telecom?.find(t => t.system === 'email')?.value;
      
      if (!email) {
        throw new Error('Pas d\'email pour ce patient');
      }

      const currentUser = await base44.auth.me();
      const daysOverdue = differenceInDays(new Date(), new Date(invoice.invoice_date));
      
      // Déterminer le type de relance
      let reminderType = 'FIRST_REMINDER';
      if (daysOverdue > 60) reminderType = 'FINAL_NOTICE';
      else if (daysOverdue > 45) reminderType = 'SECOND_REMINDER';

      // Créer le rappel
      const reminder = await base44.entities.PaymentReminder.create({
        invoice_id: invoice.id,
        patient_id: invoice.patient_id,
        reminder_type: reminderType,
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        sent_date: new Date().toISOString(),
        status: 'SENT',
        days_overdue: daysOverdue,
        amount_due: invoice.total_amount,
        email_subject: `Rappel de paiement - Facture ${invoice.id.substring(0, 8)}`,
        email_body: generateReminderEmail(invoice, patient, daysOverdue, reminderType)
      });

      // Envoyer l'email (simulé)
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: reminder.email_subject,
        body: reminder.email_body
      });

      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payment_reminders']);
      toast.success('Rappel envoyé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const sendAllRemindersMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const invoice of overdueInvoices) {
        try {
          const result = await sendReminderMutation.mutateAsync(invoice);
          results.push({ success: true, invoice, result });
        } catch (error) {
          results.push({ success: false, invoice, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.success(`${successCount} rappel(s) envoyé(s) avec succès`);
    }
  });

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Rappels automatiques
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-reminders">Activer</Label>
              <Switch
                id="auto-reminders"
                checked={autoRemindersEnabled}
                onCheckedChange={setAutoRemindersEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Règles automatiques:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Premier rappel: 30 jours après la date de facture</li>
              <li>• Deuxième rappel: 45 jours après la date de facture</li>
              <li>• Dernier rappel: 60 jours après la date de facture</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Factures en retard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Factures en retard ({overdueInvoices.length})
            </CardTitle>
            {overdueInvoices.length > 0 && (
              <Button
                onClick={() => sendAllRemindersMutation.mutate()}
                disabled={sendAllRemindersMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer tous les rappels
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">
                Aucune facture en retard pour le moment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueInvoices.map(invoice => {
                const patient = patients.find(p => p.id === invoice.patient_id);
                const patientName = patient?.name?.[0] 
                  ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
                  : 'Patient inconnu';
                const daysOverdue = differenceInDays(new Date(), new Date(invoice.invoice_date));
                const hasSentReminder = existingReminders.some(r => r.invoice_id === invoice.id);

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 ${
                        daysOverdue > 60 ? 'text-red-600' : 
                        daysOverdue > 45 ? 'text-orange-600' : 
                        'text-yellow-600'
                      }`} />
                      <div>
                        <p className="font-semibold">{patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          Facture du {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-xs text-red-600 font-semibold">
                          {daysOverdue} jours de retard
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {((invoice.total_amount || 0) / 100).toFixed(2)}€
                        </p>
                        {hasSentReminder && (
                          <Badge variant="outline" className="text-xs">
                            Rappel envoyé
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendReminderMutation.mutate(invoice)}
                        disabled={sendReminderMutation.isPending}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Relancer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function generateReminderEmail(invoice, patient, daysOverdue, reminderType) {
  const patientName = patient?.name?.[0] 
    ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
    : 'Cher patient';
  
  const amount = ((invoice.total_amount || 0) / 100).toFixed(2);
  
  const messages = {
    FIRST_REMINDER: `
      <p>Bonjour ${patientName},</p>
      <p>Nous remarquons qu'une facture d'un montant de <strong>${amount}€</strong> datée du ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')} n'a pas encore été réglée.</p>
      <p>Si vous avez déjà effectué ce paiement, veuillez nous en excuser et ne pas tenir compte de ce message.</p>
      <p>Dans le cas contraire, nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.</p>
    `,
    SECOND_REMINDER: `
      <p>Bonjour ${patientName},</p>
      <p>Malgré notre précédent rappel, nous constatons que la facture d'un montant de <strong>${amount}€</strong> reste impayée depuis ${daysOverdue} jours.</p>
      <p>Nous vous prions de bien vouloir régulariser cette situation rapidement.</p>
    `,
    FINAL_NOTICE: `
      <p>Bonjour ${patientName},</p>
      <p><strong>Dernier rappel avant mise en demeure</strong></p>
      <p>La facture d'un montant de <strong>${amount}€</strong> est en retard de ${daysOverdue} jours.</p>
      <p>Sans règlement sous 15 jours, nous serons contraints d'engager des poursuites.</p>
    `
  };

  return messages[reminderType] || messages.FIRST_REMINDER;
}