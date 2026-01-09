import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleCalendarSync } from '@/functions/googleCalendarSync';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  RefreshCw,
  Check,
  X,
  Upload,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  Clock,
  User,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function GoogleCalendarSync({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [selectedCalendar, setSelectedCalendar] = useState('primary');

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
  const { data: googleEventsData, isLoading: loadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['googleEvents', selectedCalendar],
    queryFn: async () => {
      const response = await googleCalendarSync({ 
        action: 'list_events',
        data: { calendarId: selectedCalendar }
      });
      return response.data || response;
    },
    enabled: isOpen && !!selectedCalendar && !calendarsError,
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
      toast.error('Erreur: ' + error.message);
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
    if (!patient) return 'Patient';
    const name = patient.name?.[0] || {};
    return `${(name.given || []).join(' ')} ${name.family || ''}`.trim() || 'Patient';
  };

  const unsyncedAppointments = localAppointments.filter(
    apt => !apt.google_calendar_event_id && apt.statut !== 'Annulé'
  );
  const syncedAppointments = localAppointments.filter(apt => apt.google_calendar_event_id);

  const isConnected = !calendarsError && calendarsData?.calendars?.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">Google Calendar</span>
              <p className="text-sm font-normal text-muted-foreground">
                Synchronisez vos rendez-vous
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* État de connexion */}
            {loadingCalendars ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
                  <p className="font-medium text-slate-700">Connexion à Google Calendar...</p>
                  <p className="text-sm text-muted-foreground">Veuillez patienter</p>
                </CardContent>
              </Card>
            ) : calendarsError ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-800">Connexion impossible</p>
                      <p className="text-sm text-red-600 mt-1">
                        Vérifiez que Google Calendar est bien autorisé dans les paramètres de l'application.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['googleCalendars'] })}
                      className="flex-shrink-0 w-full sm:w-auto"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Réessayer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-800">Connecté</p>
                      <p className="text-sm text-green-600">
                        {calendarsData?.calendars?.length || 0} calendrier(s) • {syncedAppointments.length} RDV synchronisés
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => refetchEvents()}
                      className="flex-shrink-0"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions rapides */}
            {isConnected && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    unsyncedAppointments.length > 0 ? 'border-blue-200 bg-blue-50/50' : ''
                  }`}
                  onClick={() => unsyncedAppointments.length > 0 && syncAllMutation.mutate()}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        unsyncedAppointments.length > 0 ? 'bg-blue-500' : 'bg-slate-200'
                      }`}>
                        {syncAllMutation.isPending ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Upload className={`w-5 h-5 ${unsyncedAppointments.length > 0 ? 'text-white' : 'text-slate-400'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Synchroniser tout</p>
                        <p className="text-xs text-muted-foreground">
                          {unsyncedAppointments.length > 0 
                            ? `${unsyncedAppointments.length} RDV en attente` 
                            : 'Tout est synchronisé ✓'}
                        </p>
                      </div>
                      {unsyncedAppointments.length > 0 && (
                        <Badge className="bg-blue-600">{unsyncedAppointments.length}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Download className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-500">Importer</p>
                        <p className="text-xs text-muted-foreground">Bientôt disponible</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Liste des RDV */}
            {isConnected && localAppointments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-slate-700">Vos rendez-vous</h3>
                  <Badge variant="outline" className="text-xs">
                    {syncedAppointments.length}/{localAppointments.length} synchronisés
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {localAppointments.slice(0, 15).map(apt => {
                    const isSynced = !!apt.google_calendar_event_id;
                    const isSyncing = syncToGoogleMutation.isPending && syncToGoogleMutation.variables?.id === apt.id;
                    
                    return (
                      <div 
                        key={apt.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isSynced 
                            ? 'bg-green-50 border border-green-100' 
                            : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {/* Indicateur de statut */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isSynced ? 'bg-green-500' : 'bg-orange-400'
                        }`} />
                        
                        {/* Info RDV */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getPatientName(apt.patient_id)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{format(new Date(apt.date), 'dd MMM', { locale: fr })}</span>
                            <span>•</span>
                            <span>{apt.heure_debut}</span>
                            <span className="hidden sm:inline">• {apt.type_consultation}</span>
                          </div>
                        </div>

                        {/* Badge/Action */}
                        {isSynced ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs flex-shrink-0">
                            <Check className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Synchronisé</span>
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 sm:px-3 flex-shrink-0 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() => syncToGoogleMutation.mutate(apt)}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Zap className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline text-xs">Sync</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {localAppointments.length > 15 && (
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    +{localAppointments.length - 15} autres rendez-vous
                  </p>
                )}
              </div>
            )}

            {/* Événements Google */}
            {isConnected && googleEventsData?.events?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Dans Google Calendar
                </h3>
                <div className="space-y-2">
                  {googleEventsData.events.slice(0, 5).map(event => (
                    <a 
                      key={event.id}
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.start?.dateTime 
                            ? format(new Date(event.start.dateTime), 'dd MMM à HH:mm', { locale: fr })
                            : event.start?.date}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* État vide */}
            {isConnected && localAppointments.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-8 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-600">Aucun rendez-vous</p>
                  <p className="text-sm text-muted-foreground">
                    Créez des rendez-vous pour les synchroniser
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}