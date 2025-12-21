import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TodayAppointmentsWidget() {
  const navigate = useNavigate();
  const today = new Date();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['today-appointments', format(today, 'yyyy-MM-dd')],
    queryFn: async () => {
      const rdvs = await base44.entities.RendezVous.filter({
        date: format(today, 'yyyy-MM-dd')
      }, 'heure_debut');
      return rdvs.slice(0, 5);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucun rendez-vous aujourd'hui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map(rdv => {
        const patient = patients.find(p => p.id === rdv.patient_id);
        const patientName = patient?.name?.[0]
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
          : 'Patient inconnu';

        return (
          <div
            key={rdv.id}
            onClick={() => navigate(createPageUrl(`Patients?patient=${rdv.patient_id}`))}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{patientName}</p>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="w-3 h-3" />
                {rdv.heure_debut}
                {rdv.motif && ` • ${rdv.motif}`}
              </div>
            </div>
            <Badge variant={
              rdv.statut === 'Confirmé' ? 'default' :
              rdv.statut === 'En cours' ? 'secondary' :
              'outline'
            }>
              {rdv.statut}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}