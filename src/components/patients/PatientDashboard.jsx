import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Pill,
  AlertTriangle,
  Bell,
  Heart,
  Activity,
  Syringe,
  Clock,
  FileText,
  RefreshCw,
  ChevronRight,
  PackageX,
  Shield,
  Stethoscope,
  User,
  Phone,
  Mail,
  MapPin,
  AlertOctagon
} from 'lucide-react';
import { format, differenceInDays, differenceInYears, addDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PatientAlerts from './PatientAlerts';
import UpcomingReminders from './UpcomingReminders';

// Médicaments avec ruptures connues
const STOCK_ALERTS = {
  'AMOXICILLINE': 'Stock limité',
  'OZEMPIC': 'Rupture de stock',
  'WEGOVY': 'Rupture de stock'
};

export default function PatientDashboard({ patient }) {
  // Données patient
  const officialName = patient?.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  const age = patient?.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const niss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  const phone = patient?.telecom?.find(t => t.system === 'phone')?.value;
  const email = patient?.telecom?.find(t => t.system === 'email')?.value;
  const address = patient?.address?.[0];

  // Prochains RDV
  const { data: appointments = [] } = useQuery({
    queryKey: ['patient-appointments', patient?.id],
    queryFn: () => base44.entities.RendezVous.filter({ 
      patient_id: patient.id,
      statut: 'Planifié'
    }, 'date', 5),
    enabled: !!patient?.id
  });

  // Prescriptions actives
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patient-prescriptions', patient?.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-date_prescription', 20),
    enabled: !!patient?.id
  });

  // Vaccinations
  const { data: vaccinations = [] } = useQuery({
    queryKey: ['patient-vaccinations', patient?.id],
    queryFn: async () => {
      try {
        return await base44.entities.Vaccination.filter({ patient_id: patient.id }, '-date_administration', 50);
      } catch { return []; }
    },
    enabled: !!patient?.id
  });

  // Consultations récentes
  const { data: consultations = [] } = useQuery({
    queryKey: ['patient-consultations-dash', patient?.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation', 5),
    enabled: !!patient?.id
  });

  // DMG
  const { data: dmgData } = useQuery({
    queryKey: ['patient-dmg', patient?.id],
    queryFn: async () => {
      try {
        const dmgs = await base44.entities.DMG.filter({ patient_id: patient.id });
        return dmgs[0];
      } catch { return null; }
    },
    enabled: !!patient?.id
  });

  // Objectifs de soins
  const { data: careGoals = [] } = useQuery({
    queryKey: ['patient-goals', patient?.id],
    queryFn: async () => {
      try {
        return await base44.entities.CareGoal.filter({ patient_id: patient.id, status: 'ACTIVE' });
      } catch { return []; }
    },
    enabled: !!patient?.id
  });

  // Analyse des données
  const analysis = React.useMemo(() => {
    const now = new Date();
    
    // Prescriptions actives et à renouveler
    const activePrescriptions = prescriptions.filter(p => 
      p.tracking_status === 'ACTIVE' || !p.tracking_status
    );
    
    const prescriptionsToRenew = activePrescriptions.filter(p => {
      const startDate = new Date(p.date_prescription);
      const medications = p.medicaments || [];
      const maxDuration = Math.max(...medications.map(m => {
        const match = m.duree_traitement?.match(/(\d+)/);
        if (match) {
          return m.duree_traitement.toLowerCase().includes('mois') 
            ? parseInt(match[1]) * 30 
            : parseInt(match[1]);
        }
        return 30;
      }));
      const endDate = addDays(startDate, maxDuration);
      return differenceInDays(endDate, now) <= 7;
    });

    // Alertes stock
    const stockAlerts = [];
    activePrescriptions.forEach(p => {
      (p.medicaments || []).forEach(m => {
        const name = m.nom_produit?.toUpperCase() || '';
        for (const [drug, message] of Object.entries(STOCK_ALERTS)) {
          if (name.includes(drug)) {
            stockAlerts.push({ medication: m.nom_produit, message });
          }
        }
      });
    });

    // Vaccins à faire
    const vaccinsARappeler = getVaccineReminders(vaccinations, age);

    // Diagnostics actifs (depuis consultations récentes)
    const activeDiagnoses = [...new Set(
      consultations
        .filter(c => c.diagnostic)
        .map(c => c.diagnostic)
    )].slice(0, 5);

    // Prochains RDV
    const upcomingAppointments = appointments
      .filter(a => new Date(a.date) >= now)
      .slice(0, 3);

    return {
      activePrescriptions: activePrescriptions.length,
      prescriptionsToRenew,
      stockAlerts,
      vaccinsARappeler,
      activeDiagnoses,
      upcomingAppointments,
      hasAllergies: !!patient?.allergies,
      hasDMG: dmgData?.statut === 'ACTIF',
      dmgExpiresSoon: dmgData?.date_expiration && 
        differenceInDays(new Date(dmgData.date_expiration), now) <= 60
    };
  }, [prescriptions, vaccinations, consultations, appointments, patient, dmgData, age]);

  // Compteur d'alertes
  const alertCount = 
    (analysis.prescriptionsToRenew?.length || 0) +
    (analysis.stockAlerts?.length || 0) +
    (analysis.vaccinsARappeler?.length || 0) +
    (analysis.hasAllergies ? 1 : 0) +
    (analysis.dmgExpiresSoon ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* En-tête patient */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">
                {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
              </span>
            </div>

            {/* Infos principales */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
                {analysis.hasDMG && (
                  <Badge className="bg-green-600">
                    <Heart className="w-3 h-3 mr-1" /> DMG
                  </Badge>
                )}
                {alertCount > 0 && (
                  <Badge className="bg-red-600">
                    <Bell className="w-3 h-3 mr-1" /> {alertCount} alerte(s)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Âge:</span>
                  <span className="ml-2 font-medium">{age} ans</span>
                </div>
                <div>
                  <span className="text-slate-500">Sexe:</span>
                  <span className="ml-2 font-medium">{patient?.gender === 'male' ? 'Homme' : 'Femme'}</span>
                </div>
                <div>
                  <span className="text-slate-500">NISS:</span>
                  <span className="ml-2 font-mono text-xs">{niss ? `***${niss.slice(-4)}` : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Mutuelle:</span>
                  <span className="ml-2 font-medium">{patient?.mutuelle || '-'}</span>
                </div>
              </div>

              {/* Contact rapide */}
              <div className="flex gap-4 mt-3 text-sm">
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Phone className="w-3 h-3" /> {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail className="w-3 h-3" /> {email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertes critiques */}
      <PatientAlerts 
        patient={patient}
        analysis={analysis}
      />

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Prochains RDV */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Prochains rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.upcomingAppointments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucun RDV planifié</p>
            ) : (
              <div className="space-y-2">
                {analysis.upcomingAppointments.map(rdv => (
                  <div key={rdv.id} className="p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{rdv.type_consultation}</span>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(rdv.date), 'd MMM', { locale: fr })}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {rdv.heure_debut} - {rdv.motif || 'Consultation'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traitements actifs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-500" />
              Traitements actifs
              <Badge variant="outline">{analysis.activePrescriptions}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.activePrescriptions === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucun traitement actif</p>
            ) : (
              <div className="space-y-2">
                {prescriptions
                  .filter(p => p.tracking_status === 'ACTIVE' || !p.tracking_status)
                  .slice(0, 4)
                  .map(p => (
                    <div key={p.id} className="text-sm">
                      {p.medicaments?.slice(0, 2).map((m, idx) => (
                        <Badge key={idx} variant="secondary" className="mr-1 mb-1 text-xs">
                          {m.nom_produit}
                        </Badge>
                      ))}
                    </div>
                  ))}
                {analysis.prescriptionsToRenew.length > 0 && (
                  <div className="pt-2 border-t">
                    <Badge className="bg-orange-500">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {analysis.prescriptionsToRenew.length} à renouveler
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnostics actifs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-red-500" />
              Diagnostics récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.activeDiagnoses.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucun diagnostic enregistré</p>
            ) : (
              <ul className="space-y-1">
                {analysis.activeDiagnoses.map((diag, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                    {diag}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rappels et objectifs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rappels importants */}
        <UpcomingReminders
          patient={patient}
          vaccinations={vaccinations}
          prescriptionsToRenew={analysis.prescriptionsToRenew}
          dmgExpiresSoon={analysis.dmgExpiresSoon}
          dmgData={dmgData}
        />

        {/* Objectifs de soins */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              Objectifs de soins actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {careGoals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucun objectif défini</p>
            ) : (
              <div className="space-y-3">
                {careGoals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="p-2 bg-slate-50 rounded-lg">
                    <p className="font-medium text-sm">{goal.title}</p>
                    {goal.target_value && (
                      <p className="text-xs text-slate-500">Objectif: {goal.target_value}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dernière consultation */}
      {consultations[0] && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Dernière consultation
              <span className="text-sm font-normal text-slate-500">
                {format(new Date(consultations[0].date_consultation), 'd MMMM yyyy', { locale: fr })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {consultations[0].motif && (
                <div>
                  <span className="text-slate-500">Motif:</span>
                  <p className="font-medium">{consultations[0].motif}</p>
                </div>
              )}
              {consultations[0].diagnostic && (
                <div>
                  <span className="text-slate-500">Diagnostic:</span>
                  <p className="font-medium">{consultations[0].diagnostic}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Fonction pour calculer les rappels vaccins
function getVaccineReminders(vaccinations, age) {
  const reminders = [];
  const now = new Date();
  
  // Vaccins recommandés selon l'âge (simplifié)
  const recommendedVaccines = [
    { name: 'Grippe', frequency: 'annual', season: [9, 10, 11] },
    { name: 'COVID-19', frequency: 'annual' },
    { name: 'Tétanos', frequency: 10, unit: 'years' }
  ];

  // Vérifier grippe saisonnière
  const currentMonth = now.getMonth();
  if ([9, 10, 11].includes(currentMonth)) {
    const lastGrippe = vaccinations.find(v => 
      v.nom_vaccin?.toLowerCase().includes('grippe') &&
      new Date(v.date_administration).getFullYear() === now.getFullYear()
    );
    if (!lastGrippe) {
      reminders.push({ type: 'Grippe', message: 'Vaccination grippe recommandée' });
    }
  }

  // Vérifier tétanos (> 10 ans)
  const lastTetanos = vaccinations.find(v => 
    v.nom_vaccin?.toLowerCase().includes('tétan') || 
    v.nom_vaccin?.toLowerCase().includes('dtp')
  );
  if (lastTetanos) {
    const yearsSince = differenceInYears(now, new Date(lastTetanos.date_administration));
    if (yearsSince >= 10) {
      reminders.push({ type: 'Tétanos', message: 'Rappel tétanos nécessaire (>10 ans)' });
    }
  }

  return reminders;
}