import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Euro,
  Bell,
  Pill,
  Stethoscope
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  isFuture,
  isPast
} from 'date-fns';
import { fr } from 'date-fns/locale';

const EVENT_TYPES = {
  appointment: { color: 'bg-blue-500', icon: Stethoscope, label: 'RDV' },
  invoice: { color: 'bg-amber-500', icon: Euro, label: 'Échéance facture' },
  reminder: { color: 'bg-purple-500', icon: Bell, label: 'Rappel' },
  prescription: { color: 'bg-green-500', icon: Pill, label: 'Renouvellement' }
};

export default function PatientUnifiedCalendar({ patient }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: appointments = [] } = useQuery({
    queryKey: ['patientCalendarRdv', patient.id],
    queryFn: () => base44.entities.RendezVous.filter({ patient_id: patient.id })
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['patientCalendarInvoices', patient.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patient.id })
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['patientCalendarReminders', patient.id],
    queryFn: () => base44.entities.PatientReminder.filter({ patient_id: patient.id }),
    select: (data) => data || []
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patientCalendarPrescriptions', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id })
  });

  // Construire les événements
  const events = [
    ...appointments.map(a => ({
      id: `rdv-${a.id}`,
      type: 'appointment',
      date: new Date(a.date),
      time: a.heure_debut,
      title: a.type_consultation || 'Rendez-vous',
      status: a.statut,
      data: a
    })),
    ...invoices
      .filter(i => i.due_date && !['PAID', 'CANCELLED'].includes(i.status))
      .map(i => ({
        id: `inv-${i.id}`,
        type: 'invoice',
        date: new Date(i.due_date),
        title: `Échéance: ${((i.amount_due || i.total_amount) / 100).toFixed(2)}€`,
        status: isPast(new Date(i.due_date)) ? 'overdue' : 'pending',
        data: i
      })),
    ...reminders
      .filter(r => r.date_rappel && r.statut !== 'envoye')
      .map(r => ({
        id: `rem-${r.id}`,
        type: r.type === 'prescription' ? 'prescription' : 'reminder',
        date: new Date(r.date_rappel),
        title: r.titre || 'Rappel',
        status: r.statut,
        data: r
      })),
    ...prescriptions
      .filter(p => p.recip_e_validity_end)
      .map(p => ({
        id: `presc-${p.id}`,
        type: 'prescription',
        date: new Date(p.recip_e_validity_end),
        title: 'Renouvellement ordonnance',
        data: p
      }))
  ];

  // Événements du jour sélectionné
  const selectedEvents = selectedDate 
    ? events.filter(e => isSameDay(e.date, selectedDate))
    : [];

  // Événements à venir (7 prochains jours)
  const upcomingEvents = events
    .filter(e => isFuture(e.date) || isToday(e.date))
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  // Jours avec événements
  const daysWithEvents = events.reduce((acc, event) => {
    const dateKey = format(event.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendrier patient
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendrier */}
          <div className="lg:col-span-2">
            {/* Légende */}
            <div className="flex flex-wrap gap-3 mb-4">
              {Object.entries(EVENT_TYPES).map(([key, { color, label }]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Grille calendrier */}
            <div className="grid grid-cols-7 gap-1">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              
              {/* Décalage premier jour */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20" />
              ))}
              
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = daysWithEvents[dateKey] || [];
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={`h-20 p-1 border rounded-lg text-left transition-all hover:border-blue-400 ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    } ${isCurrentDay ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentDay ? 'text-blue-600' : 'text-slate-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => {
                        const config = EVENT_TYPES[event.type];
                        return (
                          <div
                            key={event.id}
                            className={`${config.color} text-white text-xs px-1 py-0.5 rounded truncate`}
                            title={event.title}
                          >
                            {event.time || ''} {event.title.substring(0, 10)}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} autres
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panneau latéral */}
          <div className="space-y-4">
            {/* Événements du jour sélectionné */}
            {selectedDate && (
              <div>
                <h4 className="font-medium mb-2">
                  {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </h4>
                {selectedEvents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents.map(event => {
                      const config = EVENT_TYPES[event.type];
                      const Icon = config.icon;
                      return (
                        <div key={event.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{event.title}</p>
                              {event.time && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {event.time}
                                </p>
                              )}
                              {event.status && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {event.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun événement</p>
                )}
              </div>
            )}

            {/* À venir */}
            <div>
              <h4 className="font-medium mb-2">À venir</h4>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map(event => {
                    const config = EVENT_TYPES[event.type];
                    const Icon = config.icon;
                    return (
                      <div key={event.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => setSelectedDate(event.date)}>
                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.date, 'd MMM', { locale: fr })}
                            {event.time && ` à ${event.time}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun événement à venir</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}