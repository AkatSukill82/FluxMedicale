import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Calendar,
  Pill,
  FileText,
  Mail,
  Smartphone,
  MoreVertical,
  Send,
  Trash2,
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Syringe
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  rdv: { label: 'Rendez-vous', icon: Calendar, color: 'bg-blue-100 text-blue-800' },
  prescription: { label: 'Prescription', icon: Pill, color: 'bg-purple-100 text-purple-800' },
  resultat: { label: 'Résultat', icon: FileText, color: 'bg-orange-100 text-orange-800' },
  suivi: { label: 'Suivi', icon: Bell, color: 'bg-green-100 text-green-800' },
  vaccination: { label: 'Vaccination', icon: Syringe, color: 'bg-teal-100 text-teal-800' },
  custom: { label: 'Personnalisé', icon: Bell, color: 'bg-slate-100 text-slate-800' }
};

const CANAL_CONFIG = {
  email: { label: 'Email', icon: Mail },
  sms: { label: 'SMS', icon: Smartphone },
  both: { label: 'Email + SMS', icon: Bell }
};

export default function RemindersList({ reminders, onRefresh, showActions = false, showRetry = false }) {
  const queryClient = useQueryClient();

  // Mutation pour envoyer un rappel
  const sendMutation = useMutation({
    mutationFn: async (reminder) => {
      // Simuler l'envoi
      if (reminder.canal === 'email' || reminder.canal === 'both') {
        if (reminder.contact_email) {
          await base44.integrations.Core.SendEmail({
            to: reminder.contact_email,
            subject: reminder.titre || 'Rappel de votre médecin',
            body: reminder.message || 'Ceci est un rappel automatique.'
          });
        }
      }
      
      // Mettre à jour le statut
      await base44.entities.PatientReminder.update(reminder.id, {
        statut: 'envoye',
        date_envoi: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success('Rappel envoyé avec succès');
      onRefresh?.();
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi: ' + error.message);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientReminder.update(id, { statut: 'annule' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success('Rappel annulé');
      onRefresh?.();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientReminder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success('Rappel supprimé');
      onRefresh?.();
    }
  });

  const retryMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientReminder.update(id, { 
      statut: 'planifie',
      erreur_envoi: null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success('Rappel remis en file d\'attente');
      onRefresh?.();
    }
  });

  if (reminders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun rappel dans cette catégorie</p>
        </CardContent>
      </Card>
    );
  }

  // Trier par date
  const sortedReminders = [...reminders].sort((a, b) => 
    new Date(a.date_rappel) - new Date(b.date_rappel)
  );

  return (
    <div className="space-y-3">
      {sortedReminders.map((reminder) => {
        const typeConfig = TYPE_CONFIG[reminder.type] || TYPE_CONFIG.custom;
        const TypeIcon = typeConfig.icon;
        const canalConfig = CANAL_CONFIG[reminder.canal] || CANAL_CONFIG.email;
        const CanalIcon = canalConfig.icon;
        const isOverdue = isPast(new Date(reminder.date_rappel)) && reminder.statut === 'planifie';
        const isForToday = isToday(new Date(reminder.date_rappel));

        return (
          <Card
            key={reminder.id}
            className={`${isOverdue ? 'border-red-300 bg-red-50/50' : isForToday ? 'border-orange-300 bg-orange-50/50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Patient et type */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{reminder.patient_name || 'Patient'}</span>
                    </div>
                    <Badge className={typeConfig.color}>
                      <TypeIcon className="w-3 h-3 mr-1" />
                      {typeConfig.label}
                    </Badge>
                    <Badge variant="outline">
                      <CanalIcon className="w-3 h-3 mr-1" />
                      {canalConfig.label}
                    </Badge>
                    {isOverdue && (
                      <Badge className="bg-red-500">En retard</Badge>
                    )}
                    {isForToday && !isOverdue && (
                      <Badge className="bg-orange-500">Aujourd'hui</Badge>
                    )}
                  </div>

                  {/* Titre et message */}
                  {reminder.titre && (
                    <p className="font-medium text-sm">{reminder.titre}</p>
                  )}
                  {reminder.message && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{reminder.message}</p>
                  )}

                  {/* Date et contact */}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(reminder.date_rappel), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    {reminder.contact_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {reminder.contact_email}
                      </span>
                    )}
                  </div>

                  {/* Erreur */}
                  {reminder.erreur_envoi && (
                    <p className="text-sm text-red-600 mt-2">
                      Erreur: {reminder.erreur_envoi}
                    </p>
                  )}

                  {/* Date d'envoi */}
                  {reminder.date_envoi && (
                    <p className="text-xs text-green-600 mt-1">
                      Envoyé le {format(new Date(reminder.date_envoi), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {showActions && (
                      <DropdownMenuItem 
                        onClick={() => sendMutation.mutate(reminder)}
                        disabled={sendMutation.isPending}
                      >
                        <Send className="w-4 h-4 mr-2 text-green-600" />
                        Envoyer maintenant
                      </DropdownMenuItem>
                    )}
                    {showRetry && (
                      <DropdownMenuItem onClick={() => retryMutation.mutate(reminder.id)}>
                        <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                        Réessayer
                      </DropdownMenuItem>
                    )}
                    {showActions && (
                      <DropdownMenuItem onClick={() => cancelMutation.mutate(reminder.id)}>
                        <XCircle className="w-4 h-4 mr-2 text-orange-600" />
                        Annuler
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}