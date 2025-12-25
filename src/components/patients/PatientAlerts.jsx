import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertOctagon,
  PackageX,
  Syringe,
  RefreshCw,
  Heart,
  Shield,
  X,
  Bell
} from 'lucide-react';

export default function PatientAlerts({ patient, analysis }) {
  const alerts = [];

  // Allergies
  if (patient?.allergies) {
    alerts.push({
      id: 'allergies',
      severity: 'critical',
      icon: AlertOctagon,
      title: 'Allergies connues',
      message: patient.allergies,
      color: 'border-red-500 bg-red-50'
    });
  }

  // Ruptures de stock
  if (analysis?.stockAlerts?.length > 0) {
    alerts.push({
      id: 'stock',
      severity: 'warning',
      icon: PackageX,
      title: 'Alertes de disponibilité',
      message: analysis.stockAlerts.map(a => `${a.medication}: ${a.message}`).join(', '),
      color: 'border-orange-500 bg-orange-50'
    });
  }

  // Renouvellements
  if (analysis?.prescriptionsToRenew?.length > 0) {
    alerts.push({
      id: 'renewal',
      severity: 'warning',
      icon: RefreshCw,
      title: `${analysis.prescriptionsToRenew.length} ordonnance(s) à renouveler`,
      message: 'Traitements arrivant à terme dans les 7 prochains jours',
      color: 'border-yellow-500 bg-yellow-50'
    });
  }

  // Vaccins
  if (analysis?.vaccinsARappeler?.length > 0) {
    alerts.push({
      id: 'vaccines',
      severity: 'info',
      icon: Syringe,
      title: 'Rappels vaccinaux',
      message: analysis.vaccinsARappeler.map(v => v.message).join(', '),
      color: 'border-blue-500 bg-blue-50'
    });
  }

  // DMG expire bientôt
  if (analysis?.dmgExpiresSoon) {
    alerts.push({
      id: 'dmg',
      severity: 'warning',
      icon: Heart,
      title: 'DMG expire bientôt',
      message: 'Le DMG doit être renouvelé dans les 60 prochains jours',
      color: 'border-purple-500 bg-purple-50'
    });
  }

  // Notes importantes
  if (patient?.notes_importantes) {
    alerts.push({
      id: 'notes',
      severity: 'info',
      icon: Bell,
      title: 'Note importante',
      message: patient.notes_importantes,
      color: 'border-slate-500 bg-slate-50'
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const Icon = alert.icon;
        return (
          <Alert key={alert.id} className={`${alert.color} border-l-4`}>
            <Icon className="w-4 h-4" />
            <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
            <AlertDescription className="text-sm">{alert.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}