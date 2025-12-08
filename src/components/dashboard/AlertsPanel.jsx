import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  Bell,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { differenceInMinutes, isPast } from 'date-fns';

export default function AlertsPanel({ appointments, patients }) {
  const alerts = useMemo(() => {
    const now = new Date();
    const alerts = [];

    // Check for upcoming appointments in next 30 minutes
    const upcomingAppointments = appointments.filter(apt => {
      if (apt.statut === 'Annulé' || apt.statut === 'Terminé') return false;
      if (!apt.date || !apt.heure_debut) return false;
      const aptDateTime = new Date(`${apt.date}T${apt.heure_debut}`);
      if (isNaN(aptDateTime.getTime())) return false;
      const minutesUntil = differenceInMinutes(aptDateTime, now);
      return minutesUntil > 0 && minutesUntil <= 30;
    });

    upcomingAppointments.forEach(apt => {
      const patient = patients.find(p => p.id === apt.patient_id);
      const aptDateTime = new Date(`${apt.date}T${apt.heure_debut}`);
      const minutesUntil = differenceInMinutes(aptDateTime, now);
      
      alerts.push({
        type: 'warning',
        priority: 'high',
        icon: Clock,
        title: 'RDV imminent',
        message: `${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0]?.family} dans ${minutesUntil} min`,
        time: apt.heure_debut,
        action: 'Voir patient'
      });
    });

    // Check for late appointments
    const lateAppointments = appointments.filter(apt => {
      if (apt.statut === 'Annulé' || apt.statut === 'Terminé' || apt.statut === 'En cours') return false;
      if (!apt.date || !apt.heure_debut) return false;
      const aptDateTime = new Date(`${apt.date}T${apt.heure_debut}`);
      if (isNaN(aptDateTime.getTime())) return false;
      return isPast(aptDateTime);
    });

    lateAppointments.forEach(apt => {
      const patient = patients.find(p => p.id === apt.patient_id);
      alerts.push({
        type: 'error',
        priority: 'urgent',
        icon: AlertTriangle,
        title: 'RDV en retard',
        message: `${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0]?.family} devait être à ${apt.heure_debut}`,
        time: apt.heure_debut,
        action: 'Contacter'
      });
    });

    // Check for patients without recent consultation (simulated)
    const patientsNeedingFollowup = patients
      .filter(p => p.antecedents_medicaux && p.antecedents_medicaux.includes('chronique'))
      .slice(0, 2);

    patientsNeedingFollowup.forEach(patient => {
      alerts.push({
        type: 'info',
        priority: 'medium',
        icon: Bell,
        title: 'Suivi recommandé',
        message: `${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family} - Pathologie chronique`,
        time: null,
        action: 'Planifier RDV'
      });
    });

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [appointments, patients]);

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Alertes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-slate-600 font-medium">Tout est sous contrôle</p>
            <p className="text-sm text-slate-500 mt-1">Aucune alerte pour le moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertStyle = (type) => {
    const styles = {
      error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
      warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' }
    };
    return styles[type] || styles.info;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Alertes et notifications
            <Badge className="ml-2 bg-orange-100 text-orange-800">
              {alerts.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const Icon = alert.icon;
            const style = getAlertStyle(alert.type);
            
            return (
              <div 
                key={index} 
                className={`${style.bg} ${style.border} border rounded-lg p-4 hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${style.badge} p-2 rounded-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${style.text}`}>{alert.title}</h4>
                      {alert.time && (
                        <Badge variant="outline" className="text-xs">
                          {alert.time}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{alert.message}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className={`${style.text} hover:bg-white`}
                  >
                    {alert.action}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}