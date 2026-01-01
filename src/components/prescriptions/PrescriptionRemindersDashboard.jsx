import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCircle,
  Clock,
  Trash2,
  Calendar,
  Pill,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PrescriptionRemindersDashboard() {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['allPrescriptionReminders'],
    queryFn: () => base44.entities.PrescriptionReminder.list('-reminder_date', 100)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const patientsMap = patients.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const completeMutation = useMutation({
    mutationFn: (id) => base44.entities.PrescriptionReminder.update(id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPrescriptionReminders'] });
      toast.success('Rappel marqué comme traité');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrescriptionReminder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPrescriptionReminders'] });
      toast.success('Rappel supprimé');
    }
  });

  const getPatientName = (patientId) => {
    const patient = patientsMap[patientId];
    if (!patient) return 'Patient inconnu';
    return `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim();
  };

  const getUrgencyBadge = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge className="bg-red-500">En retard</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-orange-500">Aujourd'hui</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-yellow-500">Demain</Badge>;
    }
    if (isBefore(date, addDays(new Date(), 7))) {
      return <Badge variant="outline">Cette semaine</Badge>;
    }
    return null;
  };

  // Séparer les rappels
  const activeReminders = reminders.filter(r => r.status === 'active');
  const completedReminders = reminders.filter(r => r.status === 'completed');

  // Trier par urgence
  const sortedActive = [...activeReminders].sort((a, b) => {
    const dateA = new Date(a.reminder_date);
    const dateB = new Date(b.reminder_date);
    return dateA - dateB;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rappels actifs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Rappels actifs
            <Badge variant="secondary">{activeReminders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedActive.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun rappel actif
            </p>
          ) : (
            <div className="space-y-3">
              {sortedActive.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-4 border rounded-lg ${
                    isPast(new Date(reminder.reminder_date)) && !isToday(new Date(reminder.reminder_date))
                      ? 'bg-red-50 border-red-200'
                      : isToday(new Date(reminder.reminder_date))
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{getPatientName(reminder.patient_id)}</span>
                        {getUrgencyBadge(reminder.reminder_date)}
                        <Badge variant="outline" className="text-xs">
                          {reminder.type === 'renewal' ? 'Renouvellement' : 'Prise médicament'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{reminder.medication_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4" />
                        {reminder.reminder_date && format(new Date(reminder.reminder_date), 'EEEE d MMMM yyyy', { locale: fr })}
                        {reminder.reminder_time && ` à ${reminder.reminder_time}`}
                      </div>
                      {reminder.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{reminder.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600"
                        onClick={() => completeMutation.mutate(reminder.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rappels traités */}
      {completedReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="w-5 h-5" />
              Rappels traités
              <Badge variant="secondary">{completedReminders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedReminders.slice(0, 5).map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-3 bg-slate-50 rounded-lg flex items-center justify-between opacity-60"
                >
                  <div>
                    <p className="font-medium">{getPatientName(reminder.patient_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      {reminder.medication_name} • {reminder.reminder_date && format(new Date(reminder.reminder_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Traité
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}