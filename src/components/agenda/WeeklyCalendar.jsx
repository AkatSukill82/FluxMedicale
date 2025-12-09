import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Clock, MoreHorizontal } from "lucide-react";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


const getAppointmentStyle = (type, statut) => {
  const styles = {
    'Urgence': 'bg-red-100 text-red-900 border-red-600',
    'Téléconsultation': 'bg-blue-100 text-blue-900 border-blue-500',
    'Contrôle': 'bg-purple-100 text-purple-900 border-purple-500',
    'Vaccination': 'bg-teal-100 text-teal-900 border-teal-500',
    'Bilan': 'bg-indigo-100 text-indigo-900 border-indigo-500',
    'Consultation': statut === 'Confirmé' ? 'bg-green-100 text-green-900 border-green-500' : 'bg-orange-100 text-orange-900 border-orange-500'
  };
  return styles[type] || styles['Consultation'];
};

const AppointmentCard = ({ rdv, patientName, onEdit, onCancel }) => (
  <Popover>
    <PopoverTrigger asChild>
      <div className={cn(
        'p-2 rounded-lg text-xs cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-l-4',
        getAppointmentStyle(rdv.type_consultation, rdv.statut)
      )}>
        <div className="flex items-center justify-between font-medium">
          <span>{rdv.heure_debut}</span>
          <MoreHorizontal className="w-4 h-4 opacity-50" />
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 font-semibold">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{patientName}</span>
        </div>
        {rdv.type_consultation === 'Urgence' && (
          <div className="mt-1 text-[10px] font-bold uppercase">🚨 Urgent</div>
        )}
      </div>
    </PopoverTrigger>
    <PopoverContent className="w-64" side="right" align="start">
      <div className="space-y-3 text-sm">
        <h4 className="font-semibold">{patientName}</h4>
        <div className="text-muted-foreground">
          <p><strong>Heure:</strong> {rdv.heure_debut}</p>
          <p><strong>Type:</strong> {rdv.type_consultation}</p>
          <p><strong>Statut:</strong> {rdv.statut}</p>
          {rdv.motif && <p><strong>Motif:</strong> {rdv.motif}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onEdit(rdv)}>Modifier</Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => onCancel(rdv.id)}>Annuler</Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export default function WeeklyCalendar({ 
  currentDate, 
  rendezVous, 
  patients, 
  slots,
  onNewAppointment, 
  onEditAppointment,
  onCancelAppointment,
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 8).padStart(2, '0')); // 08 à 19

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const officialName = patient.name?.find(n => n.use === 'official') || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  };

  return (
    <Card className="shadow-lg border-0 bg-card overflow-x-auto">
      <div className="grid grid-cols-[auto_repeat(7,minmax(140px,1fr))] min-w-[1200px]">
        {/* En-tête vide */}
        <div className="sticky top-0 bg-card border-b p-4 z-10"></div>
        
        {/* En-têtes des jours */}
        {days.map((day) => (
          <div 
            key={day.toISOString()} 
            className={cn("sticky top-0 bg-card border-b p-4 z-10 text-center", isToday(day) && "bg-primary/10")}
          >
            <div className={cn("font-semibold uppercase text-xs", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className={cn("text-2xl font-bold", isToday(day) ? 'text-primary' : 'text-foreground')}>
              {format(day, 'd')}
            </div>
          </div>
        ))}

        {/* Grille horaire */}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Colonne des heures */}
            <div className="p-4 border-r text-center bg-muted/30 font-medium text-muted-foreground text-sm sticky left-0">
              {hour}:00
            </div>
            
            {days.map((day) => {
              const dayString = format(day, 'yyyy-MM-dd');
              const dayHourId = `day-${format(day, 'yyyyMMdd')}-${hour}`;

              const appointmentsInSlot = rendezVous.filter(rdv => 
                rdv.date === dayString && rdv.heure_debut?.startsWith(hour)
              );

              const slotTime = `${hour}:00:00`;
              const unavailableSlot = slots?.find(s => 
                format(new Date(s.start_time), 'yyyy-MM-dd') === dayString && 
                format(new Date(s.start_time), 'HH:00:00') === slotTime &&
                s.type === 'Bloque'
              );

              return (
                <Droppable key={dayHourId} droppableId={dayHourId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[100px] p-1.5 border-b border-r relative group",
                        snapshot.isDraggingOver && "bg-primary/10 ring-2 ring-primary",
                        unavailableSlot && "bg-slate-200 opacity-50"
                      )}
                    >
                      {unavailableSlot ? (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600 font-semibold">
                          Indisponible
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => onNewAppointment(dayString, `${hour}:00`)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>

                          <div className="space-y-1.5">
                            {appointmentsInSlot.map((rdv, index) => (
                              <Draggable key={rdv.id} draggableId={rdv.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{ ...provided.draggableProps.style }}
                                    className={cn(snapshot.isDragging && "shadow-2xl scale-105")}
                                  >
                                    <AppointmentCard 
                                      rdv={rdv} 
                                      patientName={getPatientName(rdv.patient_id)} 
                                      onEdit={onEditAppointment}
                                      onCancel={onCancelAppointment}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        </>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}