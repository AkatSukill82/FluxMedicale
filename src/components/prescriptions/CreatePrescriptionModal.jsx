import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Pill,
  User,
  Plus,
  Trash2,
  Loader2,
  Check,
  ChevronsUpDown,
  Sparkles,
  Send,
  Calendar,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';

const COMMON_MEDICATIONS = [
  { name: 'Paracétamol 1g', posologie: '1 à 3x/jour', duree: '5' },
  { name: 'Ibuprofène 400mg', posologie: '1 à 3x/jour aux repas', duree: '5' },
  { name: 'Amoxicilline 1g', posologie: '2x/jour', duree: '7' },
  { name: 'Oméprazole 20mg', posologie: '1x/jour avant repas', duree: '30' },
  { name: 'Metformine 500mg', posologie: '2x/jour aux repas', duree: '90' },
  { name: 'Amlodipine 5mg', posologie: '1x/jour', duree: '90' },
  { name: 'Atorvastatine 20mg', posologie: '1x/jour le soir', duree: '90' },
  { name: 'Lévothyroxine 50µg', posologie: '1x/jour à jeun', duree: '90' },
];

export default function CreatePrescriptionModal({ isOpen, onClose, onSuccess, preselectedPatient = null }) {
  const queryClient = useQueryClient();
  const [patientComboOpen, setPatientComboOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient);
  const [datePrescription, setDatePrescription] = useState(new Date().toISOString().split('T')[0]);
  const [medicaments, setMedicaments] = useState([]);
  const [newMed, setNewMed] = useState({ nom_produit: '', posologie: '', duree_traitement: '', quantite: 1, isCustom: false });
  
  // Options d'envoi et rappels
  const [sendToPatient, setSendToPatient] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [createRenewalReminder, setCreateRenewalReminder] = useState(true);
  const [renewalDays, setRenewalDays] = useState(7); // Rappel X jours avant fin

  // Charger les patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100)
  });

  // Charger le médecin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Calculer la durée max pour la date de fin de validité
      const maxDuration = Math.max(...medicaments.map(m => parseInt(m.duree_traitement) || 30));
      const validityEnd = addDays(new Date(datePrescription), maxDuration);
      
      // Créer la prescription
      const prescription = await base44.entities.Prescription.create({
        patient_id: selectedPatient.id,
        medecin_email: currentUser?.email,
        date_prescription: new Date(datePrescription).toISOString(),
        medicaments: medicaments,
        tracking_status: 'ACTIVE',
        statut_recip_e: 'Brouillon',
        recip_e_validity_start: datePrescription,
        recip_e_validity_end: format(validityEnd, 'yyyy-MM-dd')
      });

      const patientName = selectedPatient.name?.find(n => n.use === 'official');
      const patientFullName = `${(patientName?.given || []).join(' ')} ${patientName?.family || ''}`.trim();
      
      // Envoyer via messagerie si demandé
      if (sendToPatient) {
        const medsText = medicaments.map(m => 
          `• ${m.nom_produit}: ${m.posologie} pendant ${m.duree_traitement} jours`
        ).join('\n');
        
        const defaultMessage = `Bonjour,\n\nVoici votre nouvelle ordonnance:\n\n${medsText}\n\n${messageContent ? messageContent + '\n\n' : ''}Cordialement,\nDr ${currentUser.full_name}`;
        
        await base44.entities.PatientMessage.create({
          patient_id: selectedPatient.id,
          patient_name: patientFullName,
          sender_type: 'medecin',
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          subject: 'Nouvelle ordonnance',
          content: defaultMessage,
          category: 'resultat',
          priority: 'normale'
        });
      }
      
      // Créer un rappel de renouvellement si demandé
      if (createRenewalReminder && maxDuration > renewalDays) {
        const reminderDate = addDays(validityEnd, -renewalDays);
        
        await base44.entities.PatientReminder.create({
          patient_id: selectedPatient.id,
          title: `Renouvellement ordonnance - ${patientFullName}`,
          description: `L'ordonnance expire le ${format(validityEnd, 'dd/MM/yyyy')}. Médicaments: ${medicaments.map(m => m.nom_produit).join(', ')}`,
          type: 'prescription_renewal',
          scheduled_date: format(reminderDate, 'yyyy-MM-dd'),
          status: 'pending',
          medecin_email: currentUser.email,
          related_entity_type: 'Prescription',
          related_entity_id: prescription.id
        });
      }
      
      return prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPrescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patientMessages'] });
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success('Prescription créée' + (sendToPatient ? ' et envoyée au patient' : ''));
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const getPatientName = (patient) => {
    return `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() || 'Patient sans nom';
  };

  const addMedicament = () => {
    if (!newMed.nom_produit) {
      toast.error('Nom du médicament requis');
      return;
    }
    setMedicaments([...medicaments, { ...newMed, id: Date.now() }]);
    setNewMed({ nom_produit: '', posologie: '', duree_traitement: '', quantite: 1, isCustom: false });
  };

  const removeMedicament = (id) => {
    setMedicaments(medicaments.filter(m => m.id !== id));
  };

  const selectCommonMed = (med) => {
    setNewMed({
      nom_produit: med.name,
      posologie: med.posologie,
      duree_traitement: med.duree,
      quantite: 1,
      isCustom: false
    });
  };

  const handleCreate = () => {
    if (!selectedPatient) {
      toast.error('Sélectionnez un patient');
      return;
    }
    if (medicaments.length === 0) {
      toast.error('Ajoutez au moins un médicament');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Nouvelle prescription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection patient */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient
            </Label>
            <Popover open={patientComboOpen} onOpenChange={setPatientComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedPatient ? getPatientName(selectedPatient) : "Sélectionner un patient..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher..." />
                  <CommandList>
                    <CommandEmpty>Aucun patient trouvé</CommandEmpty>
                    <CommandGroup>
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={getPatientName(patient)}
                          onSelect={() => {
                            setSelectedPatient(patient);
                            setPatientComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {getPatientName(patient)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date de prescription</Label>
            <Input
              type="date"
              value={datePrescription}
              onChange={(e) => setDatePrescription(e.target.value)}
            />
          </div>

          {/* Médicaments courants */}
          <div className="space-y-2">
            <Label>Médicaments courants</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_MEDICATIONS.map((med, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => selectCommonMed(med)}
                >
                  {med.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Ajouter médicament */}
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCustom"
                checked={newMed.isCustom}
                onChange={(e) => setNewMed({ ...newMed, isCustom: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isCustom" className="flex items-center gap-1 text-sm">
                <Sparkles className="w-3 h-3" />
                Médicament personnalisé
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nom du médicament</Label>
                <Input
                  value={newMed.nom_produit}
                  onChange={(e) => setNewMed({ ...newMed, nom_produit: e.target.value })}
                  placeholder="Ex: Paracétamol 1g"
                />
              </div>
              <div>
                <Label className="text-xs">Posologie</Label>
                <Input
                  value={newMed.posologie}
                  onChange={(e) => setNewMed({ ...newMed, posologie: e.target.value })}
                  placeholder="Ex: 1 à 3x/jour"
                />
              </div>
              <div>
                <Label className="text-xs">Durée (jours)</Label>
                <Input
                  value={newMed.duree_traitement}
                  onChange={(e) => setNewMed({ ...newMed, duree_traitement: e.target.value })}
                  placeholder="Ex: 7"
                />
              </div>
              <div>
                <Label className="text-xs">Quantité</Label>
                <Input
                  type="number"
                  value={newMed.quantite}
                  onChange={(e) => setNewMed({ ...newMed, quantite: Number(e.target.value) })}
                  min={1}
                />
              </div>
            </div>
            <Button size="sm" onClick={addMedicament} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter ce médicament
            </Button>
          </div>

          {/* Liste des médicaments ajoutés */}
          {medicaments.length > 0 && (
            <div className="space-y-2">
              <Label>Médicaments prescrits ({medicaments.length})</Label>
              <div className="space-y-2">
                {medicaments.map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {med.nom_produit}
                        {med.isCustom && (
                          <Badge variant="outline" className="text-purple-600">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Personnalisé
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {med.posologie} • {med.duree_traitement} jours • Qté: {med.quantite}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => removeMedicament(med.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options d'envoi et rappels */}
          {medicaments.length > 0 && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Send className="w-4 h-4" />
                Options de transmission
              </h4>
              
              {/* Envoi au patient */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendToPatient"
                    checked={sendToPatient}
                    onCheckedChange={setSendToPatient}
                  />
                  <label htmlFor="sendToPatient" className="text-sm cursor-pointer">
                    Envoyer l'ordonnance au patient via messagerie sécurisée
                  </label>
                </div>
                
                {sendToPatient && (
                  <Textarea
                    placeholder="Message personnalisé (optionnel)..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                )}
              </div>

              {/* Rappel de renouvellement */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="createReminder"
                    checked={createRenewalReminder}
                    onCheckedChange={setCreateRenewalReminder}
                  />
                  <label htmlFor="createReminder" className="text-sm cursor-pointer flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Créer un rappel de renouvellement
                  </label>
                </div>
                
                {createRenewalReminder && (
                  <div className="flex items-center gap-2 ml-6">
                    <span className="text-sm text-muted-foreground">Rappeler</span>
                    <Select
                      value={String(renewalDays)}
                      onValueChange={(v) => setRenewalDays(Number(v))}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 jours</SelectItem>
                        <SelectItem value="5">5 jours</SelectItem>
                        <SelectItem value="7">7 jours</SelectItem>
                        <SelectItem value="14">14 jours</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">avant expiration</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Pill className="w-4 h-4 mr-2" />
            )}
            Créer la prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}