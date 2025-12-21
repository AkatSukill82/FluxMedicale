import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { handleError, handleSuccess } from '../components/utils/ErrorHandler';

import WeeklyCalendar from "../components/agenda/WeeklyCalendar";
import AppointmentForm from "../components/agenda/AppointmentForm";
import RecurringSlotManager from "../components/agenda/RecurringSlotManager";
import UnavailabilityManager from "../components/agenda/UnavailabilityManager";
import ReminderSettings from "../components/agenda/ReminderSettings";
import DoctorAvailabilityView from "../components/agenda/DoctorAvailabilityView";
import AppointmentNotifications from "../components/agenda/AppointmentNotifications";

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
      <div className="space-y-6">
        <AppointmentNotifications />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground mt-1">
              {format(weekStart, 'MMMM yyyy', { locale: fr })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
             <Button
              variant="outline"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowRecurringSlots(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              Créneaux récurrents
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowUnavailability(!showUnavailability)}
            >
              Indisponibilités
            </Button>

            <Button 
              variant="outline"
              onClick={() => setShowReminders(true)}
            >
              Rappels
            </Button>

            <Button 
              variant="outline"
              onClick={() => setShowAvailability(!showAvailability)}
            >
              Disponibilités
            </Button>
            
            <Button 
              onClick={() => handleNewAppointment()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau RDV
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm mb-2 block">Filtrer par praticien</Label>
                <Select value={filterPraticien} onValueChange={setFilterPraticien}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les praticiens</SelectItem>
                    {agendaData?.users?.map(user => (
                      <SelectItem key={user.email} value={user.email}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-sm mb-2 block">Filtrer par statut</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="Planifié">Planifié</SelectItem>
                    <SelectItem value="Confirmé">Confirmé</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                    <SelectItem value="Annulé">Annulé</SelectItem>
                    <SelectItem value="Report">Reporté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    setFilterPraticien('all'); 
                    setFilterStatus('all'); 
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {filteredRendezVous.length} rendez-vous affichés
          </div>
        </div>

        {showUnavailability && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <UnavailabilityManager />
            </CardContent>
          </Card>
        )}

        {showAvailability && (
          <DoctorAvailabilityView currentDate={currentDate} />
        )}

        <AnimatePresence mode="wait">
           <motion.div
             key={currentDate.toString()}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.3 }}
           >
              {isLoading ? (
                <div className="flex items-center justify-center h-[500px] w-full">
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
      </div>
    </DragDropContext>
  );
}