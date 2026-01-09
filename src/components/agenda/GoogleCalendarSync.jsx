import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleCalendarSync } from '@/functions/googleCalendarSync';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  RefreshCw,
  Check,
  X,
  Upload,
  Download,
  Clock,
  User,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function GoogleCalendarSync({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [syncDirection, setSyncDirection] = useState('both'); // 'toGoogle', 'fromGoogle', 'both'
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [autoSync, setAutoSync] = useState(false);

  // Récupérer les calendriers Google
  const { data: calendarsData, isLoading: loadingCalendars, error: calendarsError } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const response = await googleCalendarSync({ action: 'list_calendars' });
      return response.data || response;
    },
    enabled: isOpen,
    retry: 1
  });

  // Récupérer les événements Google
  const { data: googleEventsData, isLoading: loadingEvents, refetch: refetchEvents, error: eventsError } = useQuery({
    queryKey: ['googleEvents', selectedCalendar],
    queryFn: async () => {
      const response = await googleCalendarSync({ 
        action: 'list_events',
        data: { calendarId: selectedCalendar }
      });
      return response.data || response;
    },
    enabled: isOpen && !!selectedCalendar,
    retry: 1
  });

  // Récupérer les RDV locaux
  const { data: localAppointments = [] } = useQuery({
    queryKey: ['rendezVous'],
    queryFn: () => base44.entities.RendezVous.list('-date', 100),
    enabled: isOpen
  });

  // Récupérer les patients pour les noms
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    enabled: isOpen
  });

  // Synchroniser un RDV vers Google
  const syncToGoogleMutation = useMutation({
    mutationFn: async (appointment) => {
      const patient = patients.find(p => p.id === appointment.patient_id);
      const response = await googleCalendarSync({
        action: 'sync_appointment',
        data: { appointment, patient }
      });
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleEvents'] });
      queryClient.invalidateQueries({ queryKey: ['rendezVous'] });
      toast.success('RDV synchronisé avec Google Calendar');
    },
    onError: (error) => {
      toast.error('Erreur de synchronisation: ' + error.message);
    }
  });

  // Synchroniser tous les RDV non synchronisés
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const unsyncedAppointments = localAppointments.filter(
        apt => !apt.google_calendar_event_id && apt.statut !== 'Annulé'
      );
      
      for (const apt of unsyncedAppointments) {
        const patient = patients.find(p => p.id === apt.patient_id);
        await googleCalendarSync({
          action: 'sync_appointment',
          data: { appointment: apt, patient }
        });
      }
      return unsyncedAppointments.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['googleEvents'] });
      queryClient.invalidateQueries({ queryKey: ['rendezVous'] });
      toast.success(`${count} rendez-vous synchronisés`);
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const name = patient.name?.[0] || {};
    return `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
  };

  const unsyncedCount = localAppointments.filter(
    apt => !apt.google_calendar_event_id && apt.statut !== 'Annulé'
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Synchronisation Google Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Afficher les erreurs si présentes */}
          {(calendarsError || eventsError) && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">Erreur de connexion</p>
                    <p className="text-sm text-red-600">
                      {calendarsError?.message || eventsError?.message || 'Impossible de se connecter à Google Calendar'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statut de connexion */}
          <Card className={loadingCalendars ? "bg-slate-50" : calendarsError ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {loadingCalendars ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-800">Connexion en cours...</p>
                        <p className="text-sm text-slate-600">Récupération des calendriers</p>
                      </div>
                    </>
                  ) : calendarsError ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-800">Erreur de connexion</p>
                        <p className="text-sm text-red-600">Vérifiez l'autorisation Google</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">Connecté à Google Calendar</p>
                        <p className="text-sm text-green-600">
                          {calendarsData?.calendars?.length || 0} calendrier(s) disponible(s)
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchEvents()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sélection du calendrier */}
          {calendarsData?.calendars && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Calendrier cible</Label>
              <div className="flex flex-wrap gap-2">
                {calendarsData.calendars.map(cal => (
                  <Button
                    key={cal.id}
                    variant={selectedCalendar === cal.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCalendar(cal.id)}
                  >
                    {cal.summary}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions de synchronisation */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Vers Google Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {unsyncedCount} rendez-vous non synchronisés
                </p>
                <Button 
                  onClick={() => syncAllMutation.mutate()}
                  disabled={syncAllMutation.isPending || unsyncedCount === 0}
                  className="w-full"
                >
                  {syncAllMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Synchroniser tout ({unsyncedCount})
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4 text-green-600" />
                  Depuis Google Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {googleEventsData?.events?.length || 0} événements trouvés
                </p>
                <Button variant="outline" className="w-full" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Importer (bientôt)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Liste des RDV à synchroniser */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rendez-vous récents</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {localAppointments.slice(0, 20).map(apt => (
                    <div 
                      key={apt.id} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          apt.google_calendar_event_id ? 'bg-green-500' : 'bg-orange-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">
                            {getPatientName(apt.patient_id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.date), 'dd/MM/yyyy', { locale: fr })} à {apt.heure_debut}
                            {' • '}{apt.type_consultation}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apt.google_calendar_event_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <Check className="w-3 h-3 mr-1" />
                            Synchronisé
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => syncToGoogleMutation.mutate(apt)}
                            disabled={syncToGoogleMutation.isPending}
                          >
                            {syncToGoogleMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Événements Google */}
          {googleEventsData?.events && googleEventsData.events.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Événements Google Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {googleEventsData.events.slice(0, 10).map(event => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{event.summary}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.start?.dateTime 
                              ? format(parseISO(event.start.dateTime), 'dd/MM/yyyy HH:mm', { locale: fr })
                              : event.start?.date}
                          </p>
                        </div>
                        <a 
                          href={event.htmlLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}