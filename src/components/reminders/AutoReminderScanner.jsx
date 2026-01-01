import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap,
  Calendar,
  Pill,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isBefore, isAfter, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AutoReminderScanner({ isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    scanRdv: true,
    rdvDelai: 1,
    scanPrescriptions: true,
    prescriptionDelai: 7,
    scanResultats: true
  });
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  // Charger les données
  const { data: rdvs = [] } = useQuery({
    queryKey: ['rdvs'],
    queryFn: () => base44.entities.RendezVous.list('-date', 100)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['allPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-date_prescription', 100)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: existingReminders = [] } = useQuery({
    queryKey: ['patientReminders'],
    queryFn: () => base44.entities.PatientReminder.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const patientsMap = patients.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const getPatientName = (patient) => {
    if (!patient) return 'Patient inconnu';
    return `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim();
  };

  const getPatientContact = (patient) => {
    if (!patient) return {};
    const email = patient.telecom?.find(t => t.system === 'email')?.value;
    const phone = patient.telecom?.find(t => t.system === 'phone')?.value;
    return { email, phone };
  };

  const hasExistingReminder = (type, entityId) => {
    return existingReminders.some(r => 
      r.related_entity_type === type && 
      r.related_entity_id === entityId &&
      r.statut === 'planifie'
    );
  };

  const scan = () => {
    setScanning(true);
    const remindersToCreate = [];
    const now = new Date();

    // Scanner les RDV
    if (config.scanRdv) {
      const futureRdvs = rdvs.filter(rdv => {
        if (!rdv.date || rdv.statut === 'Annulé' || rdv.rappel_envoye) return false;
        const rdvDate = new Date(rdv.date);
        const reminderDate = subDays(rdvDate, config.rdvDelai);
        return isAfter(rdvDate, now) && isAfter(reminderDate, now);
      });

      futureRdvs.forEach(rdv => {
        if (hasExistingReminder('RendezVous', rdv.id)) return;
        
        const patient = patientsMap[rdv.patient_id];
        if (!patient) return;
        
        const contact = getPatientContact(patient);
        if (!contact.email && !contact.phone) return;

        const rdvDate = new Date(rdv.date);
        const reminderDate = subDays(rdvDate, config.rdvDelai);

        remindersToCreate.push({
          patient_id: rdv.patient_id,
          patient_name: getPatientName(patient),
          type: 'rdv',
          canal: contact.email ? 'email' : 'sms',
          titre: `Rappel: RDV le ${format(rdvDate, 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
          message: `Bonjour ${getPatientName(patient)},\n\nNous vous rappelons votre rendez-vous prévu le ${format(rdvDate, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}.\n\nType: ${rdv.type_consultation || 'Consultation'}\n${rdv.motif ? `Motif: ${rdv.motif}` : ''}\n\nCordialement,\nVotre cabinet médical`,
          date_rappel: reminderDate.toISOString(),
          related_entity_type: 'RendezVous',
          related_entity_id: rdv.id,
          delai_avant_jours: config.rdvDelai,
          contact_email: contact.email,
          contact_phone: contact.phone,
          statut: 'planifie',
          medecin_email: currentUser?.email
        });
      });
    }

    // Scanner les prescriptions à renouveler
    if (config.scanPrescriptions) {
      const activePrescriptions = prescriptions.filter(p => 
        p.tracking_status === 'ACTIVE' || !p.tracking_status
      );

      activePrescriptions.forEach(prescription => {
        if (hasExistingReminder('Prescription', prescription.id)) return;
        
        const patient = patientsMap[prescription.patient_id];
        if (!patient) return;
        
        const contact = getPatientContact(patient);
        if (!contact.email && !contact.phone) return;

        // Calculer la date de fin
        prescription.medicaments?.forEach(med => {
          if (!med.duree_traitement) return;
          
          const startDate = new Date(prescription.date_prescription);
          const days = parseInt(med.duree_traitement) || 30;
          const endDate = addDays(startDate, days);
          const reminderDate = subDays(endDate, config.prescriptionDelai);

          if (isBefore(endDate, now) || isBefore(reminderDate, now)) return;

          remindersToCreate.push({
            patient_id: prescription.patient_id,
            patient_name: getPatientName(patient),
            type: 'prescription',
            canal: contact.email ? 'email' : 'sms',
            titre: `Rappel: Renouvellement ${med.nom_produit}`,
            message: `Bonjour ${getPatientName(patient)},\n\nVotre traitement "${med.nom_produit}" arrive à terme le ${format(endDate, 'dd/MM/yyyy', { locale: fr })}.\n\nN'oubliez pas de prendre rendez-vous pour le renouvellement de votre ordonnance.\n\nCordialement,\nVotre cabinet médical`,
            date_rappel: reminderDate.toISOString(),
            related_entity_type: 'Prescription',
            related_entity_id: prescription.id,
            delai_avant_jours: config.prescriptionDelai,
            contact_email: contact.email,
            contact_phone: contact.phone,
            statut: 'planifie',
            medecin_email: currentUser?.email
          });
        });
      });
    }

    setResults({
      rdv: remindersToCreate.filter(r => r.type === 'rdv').length,
      prescription: remindersToCreate.filter(r => r.type === 'prescription').length,
      total: remindersToCreate.length,
      reminders: remindersToCreate
    });
    setScanning(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      for (const reminder of results.reminders) {
        await base44.entities.PatientReminder.create(reminder);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success(`${results.total} rappel(s) créé(s) avec succès`);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Scanner automatique de rappels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Settings className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Ce scanner analyse vos rendez-vous et prescriptions pour créer automatiquement des rappels.
            </AlertDescription>
          </Alert>

          {/* Configuration */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium">Configuration du scan</h4>

            {/* RDV */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="scanRdv"
                  checked={config.scanRdv}
                  onCheckedChange={(c) => setConfig({ ...config, scanRdv: c })}
                />
                <Label htmlFor="scanRdv" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Rendez-vous à venir
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.rdvDelai}
                  onChange={(e) => setConfig({ ...config, rdvDelai: Number(e.target.value) })}
                  className="w-16 h-8"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">jour(s) avant</span>
              </div>
            </div>

            {/* Prescriptions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="scanPrescriptions"
                  checked={config.scanPrescriptions}
                  onCheckedChange={(c) => setConfig({ ...config, scanPrescriptions: c })}
                />
                <Label htmlFor="scanPrescriptions" className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-600" />
                  Prescriptions à renouveler
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.prescriptionDelai}
                  onChange={(e) => setConfig({ ...config, prescriptionDelai: Number(e.target.value) })}
                  className="w-16 h-8"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">jour(s) avant</span>
              </div>
            </div>
          </div>

          {/* Résultats */}
          {results && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4" />
                Résultats du scan
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{results.rdv}</p>
                  <p className="text-xs text-muted-foreground">RDV</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{results.prescription}</p>
                  <p className="text-xs text-muted-foreground">Prescriptions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{results.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              {results.total === 0 && (
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Aucun nouveau rappel à créer (déjà existants ou pas de contact)
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {!results ? (
            <Button onClick={scan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Lancer le scan
            </Button>
          ) : results.total > 0 ? (
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Créer {results.total} rappel(s)
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}