import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Syringe,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  Loader2,
  Download,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears, differenceInMonths, addMonths, addYears, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

// Calendrier vaccinal belge (simplifié)
const VACCINE_SCHEDULE = [
  { name: 'Hexavalent (DTPa-IPV-Hib-HepB)', ages: ['2m', '3m', '4m', '15m'], type: 'ENFANT' },
  { name: 'Pneumocoque (PCV)', ages: ['2m', '4m', '12m'], type: 'ENFANT' },
  { name: 'Méningocoque C', ages: ['15m'], type: 'ENFANT' },
  { name: 'RRO (Rougeole-Rubéole-Oreillons)', ages: ['12m', '10-12a'], type: 'ENFANT' },
  { name: 'HPV', ages: ['12-13a'], type: 'ADO' },
  { name: 'Rappel dTpa', ages: ['14-16a', 'chaque 10a'], type: 'ADULTE' },
  { name: 'Grippe', ages: ['annuel 65+', 'annuel risque'], type: 'ADULTE' },
  { name: 'Pneumocoque (PPV23)', ages: ['65a', 'risque'], type: 'ADULTE' },
  { name: 'Zona', ages: ['65a+'], type: 'ADULTE' },
  { name: 'COVID-19', ages: ['selon recommandations'], type: 'TOUS' }
];

const VACCINE_TYPES = [
  { id: 'COVID', label: 'COVID-19' },
  { id: 'GRIPPE', label: 'Grippe saisonnière' },
  { id: 'TETANOS', label: 'Tétanos/Diphtérie' },
  { id: 'HEPATITE_B', label: 'Hépatite B' },
  { id: 'PNEUMOCOQUE', label: 'Pneumocoque' },
  { id: 'HPV', label: 'Papillomavirus (HPV)' },
  { id: 'RRO', label: 'Rougeole-Rubéole-Oreillons' },
  { id: 'ZONA', label: 'Zona' },
  { id: 'MENINGOCOQUE', label: 'Méningocoque' },
  { id: 'AUTRE', label: 'Autre' }
];

export default function VaccinationManager({ patient }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVaccine, setNewVaccine] = useState({
    vaccine_name: '',
    vaccine_type: '',
    vaccination_date: format(new Date(), 'yyyy-MM-dd'),
    lot_number: '',
    expiry_date: '',
    site: 'Deltoïde gauche',
    dose_number: 1,
    next_dose_date: '',
    notes: ''
  });

  // Charger les vaccinations du patient
  const { data: vaccinations = [], isLoading } = useQuery({
    queryKey: ['patientVaccinations', patient.id],
    queryFn: () => base44.entities.Vaccination.filter({ patient_id: patient.id }, '-vaccination_date', 100)
  });

  // Calculer l'âge du patient
  const patientAge = patient.birthDate 
    ? differenceInYears(new Date(), new Date(patient.birthDate))
    : null;

  const patientAgeMonths = patient.birthDate
    ? differenceInMonths(new Date(), new Date(patient.birthDate))
    : null;

  // Déterminer les vaccins recommandés manquants
  const getMissingVaccines = () => {
    const missing = [];
    const administered = vaccinations.map(v => v.vaccine_type);

    if (patientAge !== null) {
      // Grippe pour 65+
      if (patientAge >= 65 && !administered.includes('GRIPPE')) {
        missing.push({ name: 'Grippe saisonnière', priority: 'high', reason: 'Recommandé pour les 65+' });
      }

      // Pneumocoque pour 65+
      if (patientAge >= 65 && !administered.includes('PNEUMOCOQUE')) {
        missing.push({ name: 'Pneumocoque', priority: 'medium', reason: 'Recommandé pour les 65+' });
      }

      // Zona pour 65+
      if (patientAge >= 65 && !administered.includes('ZONA')) {
        missing.push({ name: 'Zona', priority: 'medium', reason: 'Recommandé pour les 65+' });
      }

      // Rappel tétanos tous les 10 ans
      const lastTetanus = vaccinations.find(v => v.vaccine_type === 'TETANOS');
      if (!lastTetanus || differenceInYears(new Date(), new Date(lastTetanus.vaccination_date)) >= 10) {
        missing.push({ name: 'Rappel Tétanos-Diphtérie', priority: 'medium', reason: 'Rappel tous les 10 ans' });
      }
    }

    return missing;
  };

  // Prochaines doses à programmer
  const getUpcomingDoses = () => {
    return vaccinations
      .filter(v => v.next_dose_date && !isPast(new Date(v.next_dose_date)))
      .sort((a, b) => new Date(a.next_dose_date) - new Date(b.next_dose_date));
  };

  // Doses en retard
  const getOverdueDoses = () => {
    return vaccinations
      .filter(v => v.next_dose_date && isPast(new Date(v.next_dose_date)))
      .sort((a, b) => new Date(a.next_dose_date) - new Date(b.next_dose_date));
  };

  const addVaccineMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      return base44.entities.Vaccination.create({
        ...data,
        patient_id: patient.id,
        administered_by: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientVaccinations', patient.id] });
      toast.success('Vaccination enregistrée');
      setShowAddModal(false);
      setNewVaccine({
        vaccine_name: '',
        vaccine_type: '',
        vaccination_date: format(new Date(), 'yyyy-MM-dd'),
        lot_number: '',
        expiry_date: '',
        site: 'Deltoïde gauche',
        dose_number: 1,
        next_dose_date: '',
        notes: ''
      });
    }
  });

  const missingVaccines = getMissingVaccines();
  const upcomingDoses = getUpcomingDoses();
  const overdueDoses = getOverdueDoses();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Syringe className="w-5 h-5 text-blue-600" />
            Carnet de vaccination
          </h2>
          {patientAge !== null && (
            <p className="text-sm text-muted-foreground">
              Patient de {patientAge} ans • {vaccinations.length} vaccination(s) enregistrée(s)
            </p>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Enregistrer vaccination
        </Button>
      </div>

      {/* Alertes */}
      {overdueDoses.length > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{overdueDoses.length} rappel(s) en retard:</strong>
            <ul className="list-disc ml-4 mt-1">
              {overdueDoses.map(v => (
                <li key={v.id}>
                  {v.vaccine_name} - prévu le {format(new Date(v.next_dose_date), 'dd/MM/yyyy')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {missingVaccines.length > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <Bell className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Vaccins recommandés:</strong>
            <ul className="list-disc ml-4 mt-1">
              {missingVaccines.map((v, i) => (
                <li key={i}>{v.name} - {v.reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Prochaines doses */}
      {upcomingDoses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Prochains rappels programmés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDoses.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="font-medium">{v.vaccine_name}</span>
                  <Badge variant="outline">{format(new Date(v.next_dose_date), 'dd/MM/yyyy')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des vaccinations */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : vaccinations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Syringe className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">Aucune vaccination enregistrée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vaccinations.map(vaccine => (
            <Card key={vaccine.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Syringe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{vaccine.vaccine_name}</h4>
                        <Badge variant="secondary">{vaccine.vaccine_type}</Badge>
                        {vaccine.dose_number > 1 && (
                          <Badge variant="outline">Dose {vaccine.dose_number}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(vaccine.vaccination_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        {vaccine.lot_number && <span>Lot: {vaccine.lot_number}</span>}
                        {vaccine.site && <span>Site: {vaccine.site}</span>}
                      </div>
                      {vaccine.notes && (
                        <p className="text-sm text-slate-600 mt-1">{vaccine.notes}</p>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendrier vaccinal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Calendrier vaccinal belge - Référence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VACCINE_SCHEDULE.map((v, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {v.name}
              </Badge>
            ))}
          </div>
          <a 
            href="https://www.vaccination-info.be/calendrier" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-3"
          >
            <ExternalLink className="w-3 h-3" />
            Consulter le calendrier complet
          </a>
        </CardContent>
      </Card>

      {/* Modal ajout */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enregistrer une vaccination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de vaccin</Label>
              <Select
                value={newVaccine.vaccine_type}
                onValueChange={(v) => setNewVaccine({ ...newVaccine, vaccine_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {VACCINE_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nom commercial du vaccin</Label>
              <Input
                value={newVaccine.vaccine_name}
                onChange={(e) => setNewVaccine({ ...newVaccine, vaccine_name: e.target.value })}
                placeholder="Ex: Comirnaty, Vaxigrip..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de vaccination</Label>
                <Input
                  type="date"
                  value={newVaccine.vaccination_date}
                  onChange={(e) => setNewVaccine({ ...newVaccine, vaccination_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Numéro de dose</Label>
                <Select
                  value={newVaccine.dose_number.toString()}
                  onValueChange={(v) => setNewVaccine({ ...newVaccine, dose_number: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>Dose {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numéro de lot</Label>
                <Input
                  value={newVaccine.lot_number}
                  onChange={(e) => setNewVaccine({ ...newVaccine, lot_number: e.target.value })}
                  placeholder="Ex: ABC123"
                />
              </div>
              <div className="space-y-2">
                <Label>Site d'injection</Label>
                <Select
                  value={newVaccine.site}
                  onValueChange={(v) => setNewVaccine({ ...newVaccine, site: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deltoïde gauche">Deltoïde gauche</SelectItem>
                    <SelectItem value="Deltoïde droit">Deltoïde droit</SelectItem>
                    <SelectItem value="Cuisse gauche">Cuisse gauche</SelectItem>
                    <SelectItem value="Cuisse droite">Cuisse droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prochaine dose (optionnel)</Label>
              <Input
                type="date"
                value={newVaccine.next_dose_date}
                onChange={(e) => setNewVaccine({ ...newVaccine, next_dose_date: e.target.value })}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={() => addVaccineMutation.mutate(newVaccine)}
              disabled={!newVaccine.vaccine_name || !newVaccine.vaccine_type || addVaccineMutation.isPending}
            >
              {addVaccineMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Syringe className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}