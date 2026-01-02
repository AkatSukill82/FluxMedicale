import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, formatDistanceToNow, differenceInDays, addDays, isPast, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  Pill, 
  Heart, 
  Activity,
  Clock,
  FileText,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Syringe,
  Stethoscope,
  CreditCard,
  CheckCircle2,
  XCircle,
  Bell
} from 'lucide-react';
import { differenceInYears, isValid } from 'date-fns';
import HubStatusCard from './HubStatusCard';

// Helper to safely parse and validate dates
const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isValid(date) ? date : null;
};

const safeFormat = (dateStr, formatStr, options = {}) => {
  const date = safeDate(dateStr);
  if (!date) return 'Date inconnue';
  return format(date, formatStr, options);
};

export default function PatientDashboard({ patient }) {
  // Fetch all patient-related data
  const { data: consultations = [] } = useQuery({
    queryKey: ['dashboard_consultations', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation', 20)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['dashboard_prescriptions', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-date_prescription', 20)
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['dashboard_appointments', patient.id],
    queryFn: () => base44.entities.RendezVous.filter({ patient_id: patient.id }, '-date', 10)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['dashboard_invoices', patient.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patient.id }, '-invoice_date', 10)
  });

  const { data: vaccinations = [] } = useQuery({
    queryKey: ['dashboard_vaccinations', patient.id],
    queryFn: () => base44.entities.Vaccination.filter({ patient_id: patient.id }, '-vaccination_date', 10)
  });

  // Calculate alerts
  const alerts = [];
  
  // Prescription renewals needed
  const prescriptionsToRenew = prescriptions.filter(p => {
    if (!p.recip_e_validity_end) return false;
    const endDate = safeDate(p.recip_e_validity_end);
    if (!endDate) return false;
    const daysUntilExpiry = differenceInDays(endDate, new Date());
    return daysUntilExpiry <= 14 && daysUntilExpiry >= 0;
  });
  
  if (prescriptionsToRenew.length > 0) {
    alerts.push({
      type: 'warning',
      icon: RefreshCw,
      title: `${prescriptionsToRenew.length} ordonnance(s) à renouveler`,
      description: 'Expirent dans les 14 prochains jours'
    });
  }

  // Upcoming appointments
  const upcomingAppointments = appointments.filter(a => {
    const appointmentDate = safeDate(a.date);
    return appointmentDate && isFuture(appointmentDate) && a.statut !== 'Annulé';
  });

  if (upcomingAppointments.length > 0) {
    const nextAppointment = upcomingAppointments[0];
    alerts.push({
      type: 'info',
      icon: Calendar,
      title: 'Prochain rendez-vous',
      description: `${safeFormat(nextAppointment.date, 'EEEE d MMMM', { locale: fr })} à ${nextAppointment.heure_debut}`
    });
  }

  // Unpaid invoices
  const unpaidInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'NOT_SENT');
  if (unpaidInvoices.length > 0) {
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
    alerts.push({
      type: 'warning',
      icon: CreditCard,
      title: `${unpaidInvoices.length} facture(s) en attente`,
      description: `Total: ${totalUnpaid.toFixed(2)}€`
    });
  }

  // Allergies alert
  if (patient.allergies) {
    alerts.push({
      type: 'danger',
      icon: AlertTriangle,
      title: 'Allergies déclarées',
      description: patient.allergies
    });
  }

  // Patient age for specific alerts
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;

  // Parse medications from string
  const currentMedications = patient.medicaments_actuels 
    ? patient.medicaments_actuels.split(',').map(m => m.trim()).filter(Boolean)
    : [];

  // Parse antecedents
  const antecedents = patient.antecedents_medicaux
    ? patient.antecedents_medicaux.split(',').map(a => a.trim()).filter(Boolean)
    : [];

  // Stats
  const totalConsultations = consultations.length;
  const consultationsThisYear = consultations.filter(c => {
    const date = safeDate(c.date_consultation);
    if (!date) return false;
    return date.getFullYear() === new Date().getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <Alert 
              key={idx} 
              className={
                alert.type === 'danger' ? 'border-red-200 bg-red-50' :
                alert.type === 'warning' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }
            >
              <alert.icon className={`w-4 h-4 ${
                alert.type === 'danger' ? 'text-red-600' :
                alert.type === 'warning' ? 'text-orange-600' :
                'text-blue-600'
              }`} />
              <AlertDescription>
                <span className="font-semibold">{alert.title}</span>
                <span className="text-muted-foreground ml-2">— {alert.description}</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* HUB Access Card */}
      <HubStatusCard patient={patient} />

      {/* Key Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Antécédents */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-purple-600" />
              Antécédents médicaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            {antecedents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {antecedents.map((ant, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-800">
                    {ant}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun antécédent renseigné</p>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className={`border-l-4 ${patient.allergies ? 'border-l-red-500 bg-red-50/50' : 'border-l-green-500'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${patient.allergies ? 'text-red-600' : 'text-green-600'}`} />
              Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patient.allergies ? (
              <div className="flex flex-wrap gap-2">
                {patient.allergies.split(',').map((allergy, idx) => (
                  <Badge key={idx} className="bg-red-100 text-red-800 border-red-200">
                    ⚠️ {allergy.trim()}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Aucune allergie connue</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Médicaments actuels */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-blue-600" />
              Médicaments actuels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMedications.length > 0 ? (
              <div className="space-y-1">
                {currentMedications.slice(0, 5).map((med, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {med}
                  </div>
                ))}
                {currentMedications.length > 5 && (
                  <p className="text-xs text-muted-foreground">+ {currentMedications.length - 5} autres</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun médicament renseigné</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Consultations</p>
                <p className="text-2xl font-bold">{totalConsultations}</p>
                <p className="text-xs text-muted-foreground">{consultationsThisYear} cette année</p>
              </div>
              <Stethoscope className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ordonnances</p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
                <p className="text-xs text-orange-600">{prescriptionsToRenew.length} à renouveler</p>
              </div>
              <Pill className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vaccinations</p>
                <p className="text-2xl font-bold">{vaccinations.length}</p>
                <p className="text-xs text-muted-foreground">enregistrées</p>
              </div>
              <Syringe className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">RDV à venir</p>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-xs text-muted-foreground">planifiés</p>
              </div>
              <Calendar className="w-8 h-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Consultations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Consultations récentes
              </span>
              <Badge variant="outline">{consultations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consultations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aucune consultation enregistrée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {consultations.slice(0, 5).map(consultation => (
                  <div key={consultation.id} className="p-3 bg-slate-50 rounded-lg border hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {safeFormat(consultation.date_consultation, 'd MMMM yyyy', { locale: fr })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {consultation.statut || 'Completee'}
                          </Badge>
                        </div>
                        {consultation.motif && (
                          <p className="text-sm text-muted-foreground">{consultation.motif}</p>
                        )}
                        {consultation.diagnostic && (
                          <p className="text-sm font-medium text-blue-700 mt-1">
                            → {consultation.diagnostic}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments & Renewals */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Prochains rendez-vous
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucun rendez-vous prévu</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 3).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {safeFormat(apt.date, 'EEEE d MMMM', { locale: fr })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.heure_debut} - {apt.type_consultation || 'Consultation'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-800">{apt.statut}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription Renewals */}
          <Card className={prescriptionsToRenew.length > 0 ? 'border-orange-200' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className={`w-5 h-5 ${prescriptionsToRenew.length > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                Renouvellements à prévoir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptionsToRenew.length === 0 ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Aucun renouvellement urgent</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {prescriptionsToRenew.map(p => {
                    const endDate = safeDate(p.recip_e_validity_end);
                    const daysLeft = endDate ? differenceInDays(endDate, new Date()) : 0;
                    return (
                      <div key={p.id} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {p.medicaments?.[0]?.nom || 'Ordonnance'}
                              {p.medicaments?.length > 1 && ` (+${p.medicaments.length - 1})`}
                            </p>
                            <p className="text-xs text-orange-700">
                              Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" className="text-orange-700 border-orange-300">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Renouveler
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Vaccinations */}
      {vaccinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-purple-600" />
              Historique vaccinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vaccinations.slice(0, 8).map(vacc => (
                <div key={vacc.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="font-medium text-sm text-purple-900">{vacc.vaccine_name}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {safeFormat(vacc.vaccination_date, 'dd/MM/yyyy')}
                  </p>
                  {vacc.lot_number && (
                    <p className="text-xs text-muted-foreground">Lot: {vacc.lot_number}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Patient Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mutuelle Info */}
        {patient.mutuelle && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Assurance maladie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{patient.mutuelle}</p>
              {patient.numero_mutuelle && (
                <p className="text-sm text-muted-foreground font-mono">{patient.numero_mutuelle}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Blood Type & Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Informations complémentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patient.groupe_sanguin && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">{patient.groupe_sanguin}</Badge>
                  <span className="text-sm text-muted-foreground">Groupe sanguin</span>
                </div>
              )}
              {patient.notes_importantes && (
                <p className="text-sm text-muted-foreground">{patient.notes_importantes}</p>
              )}
              {!patient.groupe_sanguin && !patient.notes_importantes && (
                <p className="text-sm text-muted-foreground italic">Aucune information complémentaire</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}