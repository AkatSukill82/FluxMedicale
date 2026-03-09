import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Heart, Calendar, Loader2, FlaskConical, Syringe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PatientAlertsWidget() {
  const navigate = useNavigate();

  const { data: allergies = [], isLoading: loadingAllergies } = useQuery({
    queryKey: ['active-allergies'],
    queryFn: async () => {
      const all = await base44.entities.Allergy.filter({ status: 'ACTIVE' }, '-created_date', 50);
      return all.filter(a => a.severity === 'LIFE_THREATENING' || a.severity === 'SEVERE');
    }
  });

  const { data: vaccinations = [], isLoading: loadingVaccinations } = useQuery({
    queryKey: ['vaccination-alerts'],
    queryFn: async () => {
      const all = await base44.entities.Vaccination.list('-vaccination_date', 100);
      return all.filter(v => {
        if (!v.next_dose_date) return false;
        const daysUntil = differenceInDays(new Date(v.next_dose_date), new Date());
        return daysUntil <= 30; // inclut les dates passées (en retard) et proches
      });
    }
  });

  const { data: criticalLabs = [], isLoading: loadingLabs } = useQuery({
    queryKey: ['critical-lab-results'],
    queryFn: async () => {
      const results = await base44.entities.LabResult.list('-result_date', 100);
      return results.filter(r => r.has_critical || (r.has_abnormal && r.status !== 'archived' && !r.read_by));
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const isLoading = loadingAllergies || loadingVaccinations || loadingLabs;

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertes patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient?.name?.[0]) return 'Patient inconnu';
    const name = patient.name.find(n => n.use === 'official') || patient.name[0];
    return `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
  };

  // Build alerts list
  const alerts = [];

  // Résultats labo critiques (priorité maximale)
  criticalLabs.forEach(lab => {
    const criticalResults = (lab.results || []).filter(r => 
      r.flag === 'critical_high' || r.flag === 'critical_low'
    );
    const abnormalResults = (lab.results || []).filter(r => 
      r.flag === 'high' || r.flag === 'low' || r.flag === 'abnormal'
    );

    if (criticalResults.length > 0) {
      alerts.push({
        type: 'lab_critical',
        priority: 1,
        severity: 'CRITICAL',
        patient_id: lab.patient_id,
        message: `Résultat critique: ${criticalResults.map(r => r.name).join(', ')}`,
        detail: lab.laboratory_name,
        icon: <FlaskConical className="w-4 h-4" />,
        date: lab.result_date
      });
    } else if (abnormalResults.length > 0 && !lab.read_by) {
      alerts.push({
        type: 'lab_abnormal',
        priority: 2,
        severity: 'HIGH',
        patient_id: lab.patient_id,
        message: `Résultat anormal non lu: ${abnormalResults.map(r => r.name).slice(0, 3).join(', ')}`,
        detail: lab.laboratory_name,
        icon: <FlaskConical className="w-4 h-4" />,
        date: lab.result_date
      });
    }
  });

  // Vaccins en retard (passés)
  vaccinations.forEach(v => {
    const daysUntil = differenceInDays(new Date(v.next_dose_date), new Date());
    if (daysUntil < 0) {
      alerts.push({
        type: 'vaccination_overdue',
        priority: 2,
        severity: 'HIGH',
        patient_id: v.patient_id,
        message: `Vaccin en retard: ${v.vaccine_name}`,
        detail: `Prévu le ${format(new Date(v.next_dose_date), 'dd/MM/yyyy')} (${Math.abs(daysUntil)}j de retard)`,
        icon: <Syringe className="w-4 h-4" />,
        date: v.next_dose_date
      });
    } else {
      alerts.push({
        type: 'vaccination_upcoming',
        priority: 3,
        severity: 'MODERATE',
        patient_id: v.patient_id,
        message: `Vaccination à planifier: ${v.vaccine_name}`,
        detail: `Prévue le ${format(new Date(v.next_dose_date), 'dd/MM/yyyy')} (dans ${daysUntil}j)`,
        icon: <Syringe className="w-4 h-4" />,
        date: v.next_dose_date
      });
    }
  });

  // Allergies sévères
  allergies.forEach(a => {
    alerts.push({
      type: 'allergy',
      priority: a.severity === 'LIFE_THREATENING' ? 1 : 2,
      severity: a.severity,
      patient_id: a.patient_id,
      message: `Allergie sévère: ${a.allergen}`,
      detail: a.reaction || '',
      icon: <Heart className="w-4 h-4" />,
      date: a.created_date
    });
  });

  // Sort by priority
  alerts.sort((a, b) => a.priority - b.priority);
  const displayAlerts = alerts.slice(0, 8);

  const severityStyles = {
    CRITICAL: { bg: 'bg-red-50 hover:bg-red-100', icon: 'bg-red-200 text-red-700', badge: 'bg-red-600' },
    LIFE_THREATENING: { bg: 'bg-red-50 hover:bg-red-100', icon: 'bg-red-200 text-red-700', badge: 'bg-red-600' },
    HIGH: { bg: 'bg-orange-50 hover:bg-orange-100', icon: 'bg-orange-200 text-orange-700', badge: 'bg-orange-500' },
    SEVERE: { bg: 'bg-orange-50 hover:bg-orange-100', icon: 'bg-orange-200 text-orange-700', badge: 'bg-orange-500' },
    MODERATE: { bg: 'bg-yellow-50 hover:bg-yellow-100', icon: 'bg-yellow-200 text-yellow-700', badge: 'bg-yellow-500' },
  };

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'LIFE_THREATENING').length;
  const overdueCount = alerts.filter(a => a.type === 'vaccination_overdue').length;
  const labCount = alerts.filter(a => a.type === 'lab_critical' || a.type === 'lab_abnormal').length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertes patients
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {alerts.length}
            </Badge>
          )}
        </div>
        {alerts.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-1">
            {labCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1 text-red-700 border-red-200 bg-red-50">
                <FlaskConical className="w-3 h-3" /> {labCount} labo
              </Badge>
            )}
            {overdueCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1 text-orange-700 border-orange-200 bg-orange-50">
                <Syringe className="w-3 h-3" /> {overdueCount} vaccin(s) en retard
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Aucune alerte patient</p>
            <p className="text-xs text-slate-400 mt-1">Tout est en ordre</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayAlerts.map((alert, idx) => {
              const style = severityStyles[alert.severity] || severityStyles.MODERATE;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (alert.type === 'lab_critical' || alert.type === 'lab_abnormal') {
                      navigate(createPageUrl('Laboratoire'));
                    } else {
                      navigate(createPageUrl(`Patients?patient=${alert.patient_id}`));
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${style.bg}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.icon}`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {getPatientName(alert.patient_id)}
                    </p>
                    <p className="text-xs text-slate-700 truncate">{alert.message}</p>
                    {alert.detail && (
                      <p className="text-xs text-slate-500 truncate">{alert.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}