import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight, Clock, Loader2, Video, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { handleError, handleSuccess } from '../components/utils/ErrorHandler';
import { useOnlineStatus } from '../components/OfflineIndicator';
import { getCachedRendezVous, getCachedPatients } from '../components/offline/OfflineService';
import OfflineBanner from '../components/offline/OfflineBanner';

import WeeklyCalendar from "../components/agenda/WeeklyCalendar";
import AppointmentForm from "../components/agenda/AppointmentForm";
import RecurringSlotManager from "../components/agenda/RecurringSlotManager";
import UnavailabilityManager from "../components/agenda/UnavailabilityManager";
import ReminderSettings from "../components/agenda/ReminderSettings";
import DoctorAvailabilityView from "../components/agenda/DoctorAvailabilityView";
import AppointmentNotifications from "../components/agenda/AppointmentNotifications";
import TeleconsultationScheduler from "../components/teleconsultation/TeleconsultationScheduler";
import GoogleCalendarSync from "../components/agenda/GoogleCalendarSync";

export default function Agenda() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState("week");
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // { date, time }
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showRecurringSlots, setShowRecurringSlots] = useState(false);
  const [showUnavailability, setShowUnavailability] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showTeleconsultation, setShowTeleconsultation] = useState(false);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [filterPraticien, setFilterPraticien] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: agendaData, isLoading } = useQuery({
    queryKey: ['agendaData'],
    queryFn: async () => {
      const [rendezVous, patients, users, slots] = await Promise.all([
        base44.entities.RendezVous.list("-date"),
        base44.entities.Patient.list(),
        base44.auth.me().then(() => base44.entities.User?.list?.() || []).catch(() => []),
        base44.entities.CalendarSlot.list().catch(() => [])
      ]);
      return { rendezVous, patients, users: users.filter(u => u.role === 'admin'), slots };
    }
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RendezVous.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaData'] });
      handleSuccess("Rendez-vous mis à jour");
    },
    onError: (error) => handleError(error, "Rendez-vous")
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => base44.entities.RendezVous.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaData'] });
      handleSuccess("Rendez-vous créé");
      setShowForm(false);
    },
    onError: (error) => handleError(error, "Création rendez-vous")
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id) => base44.entities.RendezVous.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaData'] });
      handleSuccess("Rendez-vous annulé");
    },
    onError: (error) => handleError(error, "Annulation rendez-vous")
  });

  const handleSaveAppointment = async (appointmentData) => {
    if (editingAppointment) {
      updateAppointmentMutation.mutate({ id: editingAppointment.id, data: appointmentData });
      setShowForm(false);
      setEditingAppointment(null);
    } else {
      createAppointmentMutation.mutate(appointmentData);
    }
  };

  const handleNewAppointment = (date = null, time = null) => {
    setSelectedSlot({ date, time });
    setEditingAppointment(null);
    setShowForm(true);
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setSelectedSlot(null);
    setShowForm(true);
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId } = result;
    const rdv = agendaData.rendezVous.find(r => r.id === draggableId);

    if (!rdv) return;

    // destination.droppableId format: 'day-YYYYMMDD-HH'
    const parts = result.destination.droppableId.split('-');
    const dateStr = parts[1]; // YYYYMMDD
    const time = parts[2]; // HH
    
    const newDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    const newTime = `${time}:00`;
    
    updateAppointmentMutation.mutate({
      id: rdv.id,
      data: {
        ...rdv,
        date: newDate,
        heure_debut: newTime
      }
    });
  };

  const handleSaveRecurringSlots = async (slots) => {
    // Logique pour sauvegarder les créneaux récurrents
    toast.success(`${slots.length} créneaux récurrents configurés`);
  };

  const handleSaveReminderSettings = async (settings) => {
    // Logique pour sauvegarder les paramètres de rappel
    localStorage.setItem('reminder_settings', JSON.stringify(settings));
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const filteredRendezVous = agendaData?.rendezVous.filter(rdv => {
    const practicienMatch = filterPraticien === 'all' || rdv.medecin_assigne === filterPraticien;
    const statusMatch = filterStatus === 'all' || rdv.statut === filterStatus;
    return practicienMatch && statusMatch;
  }) || [];

  const handleCancelAppointment = (appointmentId) => {
    if (confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
      deleteAppointmentMutation.mutate(appointmentId);
    }
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <div className="h-full flex flex-col overflow-hidden">
        <AppointmentNotifications />
        
        {/* Header compact */}
        <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 pb-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Agenda</h1>
            <span className="text-sm text-muted-foreground">
              {format(weekStart, 'MMMM yyyy', { locale: fr })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Select value={filterPraticien} onValueChange={setFilterPraticien}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Praticien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {agendaData?.users?.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="Planifié">Planifié</SelectItem>
                <SelectItem value="Confirmé">Confirmé</SelectItem>
                <SelectItem value="Annulé">Annulé</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden lg:flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setShowRecurringSlots(true)}>
                <Clock className="w-3 h-3 mr-1" />
                Créneaux
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowGoogleSync(true)}>
                <Calendar className="w-3 h-3 mr-1" />
                Sync
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowTeleconsultation(true)}>
                <Video className="w-3 h-3" />
              </Button>
            </div>
            
            <Button 
              onClick={() => handleNewAppointment()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">RDV</span>
            </Button>
          </div>
        </div>

        {showUnavailability && (
          <Card className="flex-shrink-0 mb-2">
            <CardContent className="p-3">
              <UnavailabilityManager />
            </CardContent>
          </Card>
        )}

        {showAvailability && (
          <div className="flex-shrink-0 mb-2">
            <DoctorAvailabilityView currentDate={currentDate} />
          </div>
        )}

        {/* Calendrier - prend tout l'espace restant */}
        <div className="flex-1 min-h-0 overflow-hidden md:overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDate.toString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full w-full">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
              ) : (
                <WeeklyCalendar
                  currentDate={currentDate}
                  rendezVous={filteredRendezVous}
                  patients={agendaData?.patients || []}
                  slots={agendaData?.slots || []}
                  onNewAppointment={handleNewAppointment}
                  onEditAppointment={handleEditAppointment}
                  onCancelAppointment={handleCancelAppointment}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
              onClick={() => setShowForm(false)}
            >
              <motion.div 
                className="bg-card rounded-xl shadow-2xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                  <AppointmentForm
                    appointment={editingAppointment}
                    patients={agendaData?.patients || []}
                    selectedSlot={selectedSlot}
                    onSave={handleSaveAppointment}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingAppointment(null);
                      setSelectedSlot(null);
                    }}
                  />
              </motion.div>
            </motion.div>
          )}

          {showRecurringSlots && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
              onClick={() => setShowRecurringSlots(false)}
            >
              <motion.div 
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <RecurringSlotManager 
                  onSave={handleSaveRecurringSlots}
                  onClose={() => setShowRecurringSlots(false)}
                />
              </motion.div>
            </motion.div>
          )}

          {showReminders && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
              onClick={() => setShowReminders(false)}
            >
              <motion.div 
                className="w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <ReminderSettings 
                  onSave={handleSaveReminderSettings}
                />
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setShowReminders(false)}
                >
                  Fermer
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showTeleconsultation && (
          <TeleconsultationScheduler
            isOpen={showTeleconsultation}
            onClose={() => setShowTeleconsultation(false)}
          />
        )}

        {showGoogleSync && (
          <GoogleCalendarSync
            isOpen={showGoogleSync}
            onClose={() => setShowGoogleSync(false)}
          />
        )}
      </div>
    </DragDropContext>
  );
}