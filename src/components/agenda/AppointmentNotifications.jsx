import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Composant qui surveille les changements dans les RDV
 * et affiche des notifications en temps réel
 */
export default function AppointmentNotifications() {
  const queryClient = useQueryClient();

  // Surveiller les RDV toutes les 30 secondes
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-notifications'],
    queryFn: () => base44.entities.RendezVous.list('-created_date', 100),
    refetchInterval: 30000, // 30 secondes
    refetchIntervalInBackground: false
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  useEffect(() => {
    // Récupérer les IDs des RDV déjà notifiés
    const notifiedIds = JSON.parse(localStorage.getItem('notified_appointments') || '[]');
    const newAppointments = appointments.filter(rdv => !notifiedIds.includes(rdv.id));

    newAppointments.forEach(rdv => {
      const patient = patients.find(p => p.id === rdv.patient_id);
      const patientName = patient?.name?.[0]
        ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
        : 'Patient inconnu';

      // Notification pour nouveau RDV
      if (new Date(rdv.created_date).getTime() > Date.now() - 60000) {
        toast.success(
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold">Nouveau rendez-vous</p>
              <p className="text-sm text-slate-600">
                {patientName} • {format(new Date(rdv.date), 'dd MMMM', { locale: fr })} à {rdv.heure_debut}
              </p>
            </div>
          </div>,
          { duration: 5000 }
        );
      }

      // Marquer comme notifié
      notifiedIds.push(rdv.id);
    });

    localStorage.setItem('notified_appointments', JSON.stringify(notifiedIds));
  }, [appointments, patients]);

  // Surveiller les modifications
  useEffect(() => {
    const lastUpdate = localStorage.getItem('last_appointment_update');
    const currentUpdate = appointments.map(a => a.updated_date).sort().pop();

    if (lastUpdate && currentUpdate && currentUpdate > lastUpdate) {
      // Quelque chose a changé
      const modifiedIds = JSON.parse(localStorage.getItem('modified_appointments') || '[]');
      const recentlyModified = appointments.filter(rdv => 
        rdv.updated_date > lastUpdate &&
        !modifiedIds.includes(rdv.id)
      );

      recentlyModified.forEach(rdv => {
        const patient = patients.find(p => p.id === rdv.patient_id);
        const patientName = patient?.name?.[0]
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
          : 'Patient inconnu';

        toast.info(
          <div className="flex items-start gap-3">
            <Edit className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-semibold">Rendez-vous modifié</p>
              <p className="text-sm text-slate-600">
                {patientName} • {format(new Date(rdv.date), 'dd MMMM', { locale: fr })} à {rdv.heure_debut}
              </p>
            </div>
          </div>,
          { duration: 5000 }
        );

        modifiedIds.push(rdv.id);
      });

      localStorage.setItem('modified_appointments', JSON.stringify(modifiedIds));
    }

    if (currentUpdate) {
      localStorage.setItem('last_appointment_update', currentUpdate);
    }
  }, [appointments, patients]);

  return null; // Composant invisible
}