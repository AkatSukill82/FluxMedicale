import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Send, 
  Clock, 
  Mail, 
  MessageSquare,
  Calendar,
  Pill,
  Stethoscope,
  Syringe,
  Trash2,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const REMINDER_TYPES = [
  { id: 'rdv', name: 'Rendez-vous', icon: Calendar, color: 'blue' },
  { id: 'prescription', name: 'Renouvellement', icon: Pill, color: 'green' },
  { id: 'suivi', name: 'Suivi médical', icon: Stethoscope, color: 'purple' },
  { id: 'vaccination', name: 'Vaccination', icon: Syringe, color: 'orange' },
  { id: 'resultat', name: 'Résultats', icon: AlertCircle, color: 'red' },
  { id: 'custom', name: 'Personnalisé', icon: MessageSquare, color: 'slate' }
];

const MESSAGE_TEMPLATES = {
  rdv: {
    sms: "Rappel: Vous avez RDV le {date} à {heure} avec Dr. {medecin}. En cas d'empêchement, merci de nous prévenir.",
    email: "Bonjour {patient},\n\nNous vous rappelons votre rendez-vous prévu le {date} à {heure} avec Dr. {medecin}.\n\nEn cas d'empêchement, merci de nous contacter.\n\nCordialement,\nLe cabinet médical"
  },
  prescription: {
    sms: "Rappel: Votre ordonnance de {medicament} arrive à échéance. Pensez à prendre RDV pour le renouvellement.",
    email: "Bonjour {patient},\n\nVotre ordonnance de {medicament} arrive à échéance prochainement.\n\nNous vous invitons à prendre rendez-vous pour le renouvellement de votre traitement.\n\nCordialement,\nLe cabinet médical"
  },
  suivi: {
    sms: "Rappel: Il est temps de planifier votre suivi médical. Contactez le cabinet pour prendre RDV.",
    email: "Bonjour {patient},\n\nSelon nos dossiers, il serait opportun de planifier un rendez-vous de suivi.\n\nN'hésitez pas à nous contacter pour convenir d'une date.\n\nCordialement,\nLe cabinet médical"
  },
  vaccination: {
    sms: "Rappel: Votre rappel de vaccination {vaccin} est prévu. Contactez le cabinet pour prendre RDV.",
    email: "Bonjour {patient},\n\nVotre rappel de vaccination ({vaccin}) est maintenant dû.\n\nNous vous invitons à prendre rendez-vous pour procéder à cette vaccination.\n\nCordialement,\nLe cabinet médical"
  },
  resultat: {
    sms: "Info: Vos résultats d'analyses sont disponibles. Contactez le cabinet pour en discuter.",
    email: "Bonjour {patient},\n\nVos résultats d'analyses sont maintenant disponibles.\n\nNous vous invitons à prendre rendez-vous pour en discuter avec le médecin.\n\nCordialement,\nLe cabinet médical"
  },
  custom: {
    sms: "{message}",
    email: "Bonjour {patient},\n\n{message}\n\nCordialement,\nLe cabinet médical"
  }
};

export default function ReminderSystem({ patient }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    type: 'rdv',
    canal: 'email',
    date_rappel: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    heure_rappel: '09:00',
    message_personnalise: '',
    // Champs contextuels
    date_rdv: '',
    heure_rdv: '',
    medicament: '',
    vaccin: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch reminders for this patient
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['patientReminders', patient?.id],
    queryFn: () => base44.entities.PatientReminder.filter({ patient_id: patient?.id }, '-date_rappel'),
    enabled: !!patient?.id
  });

  const createReminderMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientReminder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders', patient?.id] });
      toast.success('Rappel créé');
      setShowCreateDialog(false);
      resetForm();
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientReminder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders', patient?.id] });
      toast.success('Rappel supprimé');
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (reminder) => {
      const patientName = getPatientName();
      const patientEmail = patient?.telecom?.find(t => t.system === 'email')?.value;
      
      if (!patientEmail) {
        throw new Error('Aucune adresse email pour ce patient');
      }

      // Build message
      let message = reminder.message || MESSAGE_TEMPLATES[reminder.type]?.email || '';
      message = message
        .replace('{patient}', patientName)
        .replace('{date}', reminder.date_rdv || '')
        .replace('{heure}', reminder.heure_rdv || '')
        .replace('{medecin}', user?.full_name || 'votre médecin')
        .replace('{medicament}', reminder.medicament || '')
        .replace('{vaccin}', reminder.vaccin || '')
        .replace('{message}', reminder.message_personnalise || '');

      await base44.integrations.Core.SendEmail({
        to: patientEmail,
        subject: `Rappel - ${REMINDER_TYPES.find(t => t.id === reminder.type)?.name || 'Information'}`,
        body: message
      });

      // Update reminder status
      await base44.entities.PatientReminder.update(reminder.id, {
        statut: 'envoye',
        date_envoi: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders', patient?.id] });
      toast.success('Rappel envoyé par email');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const getPatientName = () => {
    const name = patient?.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
  };

  const getPatientEmail = () => {
    return patient?.telecom?.find(t => t.system === 'email')?.value;
  };

  const getPatientPhone = () => {
    return patient?.telecom?.find(t => t.system === 'phone')?.value;
  };

  const resetForm = () => {
    setFormData({
      type: 'rdv',
      canal: 'email',
      date_rappel: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      heure_rappel: '09:00',
      message_personnalise: '',
      date_rdv: '',
      heure_rdv: '',
      medicament: '',
      vaccin: ''
    });
  };

  const handleCreateReminder = () => {
    const selectedType = REMINDER_TYPES.find(t => t.id === formData.type);
    
    createReminderMutation.mutate({
      patient_id: patient.id,
      patient_name: getPatientName(),
      type: formData.type,
      canal: formData.canal,
      titre: selectedType?.name || 'Rappel',
      message: formData.message_personnalise || MESSAGE_TEMPLATES[formData.type]?.[formData.canal] || '',
      date_rappel: `${formData.date_rappel}T${formData.heure_rappel}:00`,
      statut: 'planifie',
      contact_email: getPatientEmail(),
      contact_phone: getPatientPhone(),
      medecin_email: user?.email,
      // Données contextuelles
      date_rdv: formData.date_rdv,
      heure_rdv: formData.heure_rdv,
      medicament: formData.medicament,
      vaccin: formData.vaccin
    });
  };

  const pendingReminders = reminders.filter(r => r.statut === 'planifie');
  const sentReminders = reminders.filter(r => r.statut === 'envoye');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Rappels automatiques</h3>
          <p className="text-sm text-slate-500">Gérez les rappels SMS et email pour vos patients</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau rappel
        </Button>
      </div>

      {/* Patient Contact Info */}
      {patient && (
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <p className="font-medium mb-2">{getPatientName()}</p>
            <div className="flex gap-4 text-sm">
              {getPatientEmail() ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Mail className="w-4 h-4" />
                  {getPatientEmail()}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <Mail className="w-4 h-4" />
                  Pas d'email
                </span>
              )}
              {getPatientPhone() ? (
                <span className="flex items-center gap-1 text-green-600">
                  <MessageSquare className="w-4 h-4" />
                  {getPatientPhone()}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <MessageSquare className="w-4 h-4" />
                  Pas de téléphone
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Reminders */}
      {pendingReminders.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Rappels planifiés ({pendingReminders.length})
          </h4>
          <div className="space-y-2">
            {pendingReminders.map(reminder => {
              const typeInfo = REMINDER_TYPES.find(t => t.id === reminder.type);
              const Icon = typeInfo?.icon || MessageSquare;
              
              return (
                <Card key={reminder.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${typeInfo?.color || 'slate'}-100 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${typeInfo?.color || 'slate'}-600`} />
                      </div>
                      <div>
                        <p className="font-medium">{reminder.titre}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(reminder.date_rappel), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          {' • '}{reminder.canal === 'email' ? 'Email' : 'SMS'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendReminderMutation.mutate(reminder)}
                        disabled={sendReminderMutation.isPending}
                      >
                        {sendReminderMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteReminderMutation.mutate(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent Reminders */}
      {sentReminders.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Rappels envoyés ({sentReminders.length})
          </h4>
          <div className="space-y-2">
            {sentReminders.slice(0, 5).map(reminder => (
              <div key={reminder.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{reminder.titre}</p>
                  <p className="text-xs text-slate-500">
                    Envoyé le {format(new Date(reminder.date_envoi), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {reminders.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">Aucun rappel</p>
            <p className="text-sm text-slate-500">Créez un rappel pour ce patient</p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un rappel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <Label>Type de rappel</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {REMINDER_TYPES.map(type => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, type: type.id })}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <p className="text-xs font-medium">{type.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canal */}
            <div>
              <Label>Canal d'envoi</Label>
              <Select
                value={formData.canal}
                onValueChange={(v) => setFormData({ ...formData, canal: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </span>
                  </SelectItem>
                  <SelectItem value="sms" disabled={!getPatientPhone()}>
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> SMS
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date/Heure */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date d'envoi</Label>
                <Input
                  type="date"
                  value={formData.date_rappel}
                  onChange={(e) => setFormData({ ...formData, date_rappel: e.target.value })}
                />
              </div>
              <div>
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={formData.heure_rappel}
                  onChange={(e) => setFormData({ ...formData, heure_rappel: e.target.value })}
                />
              </div>
            </div>

            {/* Contextual Fields */}
            {formData.type === 'rdv' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date du RDV</Label>
                  <Input
                    type="date"
                    value={formData.date_rdv}
                    onChange={(e) => setFormData({ ...formData, date_rdv: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Heure du RDV</Label>
                  <Input
                    type="time"
                    value={formData.heure_rdv}
                    onChange={(e) => setFormData({ ...formData, heure_rdv: e.target.value })}
                  />
                </div>
              </div>
            )}

            {formData.type === 'prescription' && (
              <div>
                <Label>Médicament concerné</Label>
                <Input
                  value={formData.medicament}
                  onChange={(e) => setFormData({ ...formData, medicament: e.target.value })}
                  placeholder="Ex: Metformine 500mg"
                />
              </div>
            )}

            {formData.type === 'vaccination' && (
              <div>
                <Label>Vaccin concerné</Label>
                <Input
                  value={formData.vaccin}
                  onChange={(e) => setFormData({ ...formData, vaccin: e.target.value })}
                  placeholder="Ex: Rappel tétanos"
                />
              </div>
            )}

            {formData.type === 'custom' && (
              <div>
                <Label>Message personnalisé</Label>
                <Textarea
                  value={formData.message_personnalise}
                  onChange={(e) => setFormData({ ...formData, message_personnalise: e.target.value })}
                  placeholder="Votre message..."
                  rows={4}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleCreateReminder} 
                className="flex-1"
                disabled={createReminderMutation.isPending}
              >
                {createReminderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Créer le rappel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}