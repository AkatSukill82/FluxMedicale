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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Bell,
  User,
  Loader2,
  Check,
  ChevronsUpDown,
  Mail,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function CreateReminderModal({ isOpen, onClose, onSuccess, preselectedPatient = null }) {
  const queryClient = useQueryClient();
  const [patientComboOpen, setPatientComboOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient);

  const [formData, setFormData] = useState({
    type: 'custom',
    canal: 'email',
    titre: '',
    message: '',
    date_rappel: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    recurrence: 'once'
  });

  // Charger les patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100)
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const getPatientName = (patient) => {
    return `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() || 'Patient sans nom';
  };

  const getPatientContact = (patient) => {
    const email = patient.telecom?.find(t => t.system === 'email')?.value;
    const phone = patient.telecom?.find(t => t.system === 'phone')?.value;
    return { email, phone };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const contact = getPatientContact(selectedPatient);
      
      return base44.entities.PatientReminder.create({
        patient_id: selectedPatient.id,
        patient_name: getPatientName(selectedPatient),
        type: formData.type,
        canal: formData.canal,
        titre: formData.titre,
        message: formData.message,
        date_rappel: new Date(formData.date_rappel).toISOString(),
        recurrence: formData.recurrence,
        statut: 'planifie',
        contact_email: contact.email,
        contact_phone: contact.phone,
        medecin_email: currentUser?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReminders'] });
      toast.success('Rappel créé avec succès');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const handleCreate = () => {
    if (!selectedPatient) {
      toast.error('Sélectionnez un patient');
      return;
    }
    if (!formData.titre) {
      toast.error('Entrez un titre');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Nouveau rappel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* Info contact patient */}
          {selectedPatient && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              {getPatientContact(selectedPatient).email ? (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  {getPatientContact(selectedPatient).email}
                </p>
              ) : (
                <p className="text-orange-600">⚠️ Pas d'email renseigné</p>
              )}
              {getPatientContact(selectedPatient).phone && (
                <p className="flex items-center gap-2 mt-1">
                  <Smartphone className="w-4 h-4 text-green-600" />
                  {getPatientContact(selectedPatient).phone}
                </p>
              )}
            </div>
          )}

          {/* Type et canal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rdv">Rendez-vous</SelectItem>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="resultat">Résultat d'examen</SelectItem>
                  <SelectItem value="suivi">Suivi</SelectItem>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={formData.canal} onValueChange={(v) => setFormData({ ...formData, canal: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Email + SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date et heure */}
          <div className="space-y-2">
            <Label>Date et heure du rappel</Label>
            <Input
              type="datetime-local"
              value={formData.date_rappel}
              onChange={(e) => setFormData({ ...formData, date_rappel: e.target.value })}
            />
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <Label>Titre du rappel</Label>
            <Input
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              placeholder="Ex: Rappel de rendez-vous"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Contenu du message..."
              rows={3}
            />
          </div>

          {/* Récurrence */}
          <div className="space-y-2">
            <Label>Récurrence</Label>
            <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Une seule fois</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            Créer le rappel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}