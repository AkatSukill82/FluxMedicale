import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Heart, Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays } from 'date-fns';

export default function PatientAlertsWidget() {
  const navigate = useNavigate();

  const { data: allergies = [], isLoading: loadingAllergies } = useQuery({
    queryKey: ['active-allergies'],
    queryFn: async () => {
      const all = await base44.entities.Allergy.filter({ status: 'ACTIVE' }, '-created_date', 50);
      return all.filter(a => a.severity === 'LIFE_THREATENING' || a.severity === 'SEVERE');
    }
  });

  const { data: upcomingVaccinations = [], isLoading: loadingVaccinations } = useQuery({
    queryKey: ['upcoming-vaccinations'],
    queryFn: async () => {
      const all = await base44.entities.Vaccination.list('-vaccination_date', 100);
      return all.filter(v => {
        if (!v.next_dose_date) return false;
        const daysUntil = differenceInDays(new Date(v.next_dose_date), new Date());
        return daysUntil <= 30 && daysUntil >= 0;
      });
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const isLoading = loadingAllergies || loadingVaccinations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const alerts = [
    ...allergies.map(a => ({
      type: 'allergy',
      severity: a.severity,
      patient_id: a.patient_id,
      message: `Allergie sévère: ${a.allergen}`,
      icon: <Heart className="w-4 h-4" />
    })),
    ...upcomingVaccinations.map(v => ({
      type: 'vaccination',
      severity: 'MODERATE',
      patient_id: v.patient_id,
      message: `Vaccination à planifier: ${v.vaccine_name}`,
      icon: <Calendar className="w-4 h-4" />
    }))
  ].slice(0, 6);

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucune alerte patient</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => {
        const patient = patients.find(p => p.id === alert.patient_id);
        const patientName = patient?.name?.[0]
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
          : 'Patient inconnu';

        return (
          <div
            key={idx}
            onClick={() => navigate(createPageUrl(`Patients?patient=${alert.patient_id}`))}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              alert.severity === 'LIFE_THREATENING' ? 'bg-red-50 hover:bg-red-100' :
              alert.severity === 'SEVERE' ? 'bg-orange-50 hover:bg-orange-100' :
              'bg-yellow-50 hover:bg-yellow-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              alert.severity === 'LIFE_THREATENING' ? 'bg-red-200 text-red-700' :
              alert.severity === 'SEVERE' ? 'bg-orange-200 text-orange-700' :
              'bg-yellow-200 text-yellow-700'
            }`}>
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{patientName}</p>
              <p className="text-xs text-slate-600 truncate">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}