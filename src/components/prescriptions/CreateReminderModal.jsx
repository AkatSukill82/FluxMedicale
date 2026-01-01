import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { Bell, Loader2, Pill } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export default function CreateReminderModal({ prescription, patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  
  // Calculer date suggérée (fin du traitement - 7 jours)
  const suggestRenewalDate = () => {
    if (!prescription.medicaments?.length) return format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const firstMed = prescription.medicaments[0];
    const days = parseInt(firstMed.duree_traitement) || 30;
    const startDate = new Date(prescription.date_prescription);
    return format(addDays(startDate, days - 7), 'yyyy-MM-dd');
  };

  const [formData, setFormData] = useState({
    type: 'renewal',
    medication_name: prescription.medicaments?.[0]?.nom_produit || '',
    reminder_date: suggestRenewalDate(),
    reminder_time: '09:00',
    frequency: 'once',
    notes: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.PrescriptionReminder.create({
      patient_id: prescription.patient_id,
      prescription_id: prescription.id,
      type: formData.type,
      medication_name: formData.medication_name,
      reminder_date: formData.reminder_date,
      reminder_time: formData.reminder_time,
      frequency: formData.frequency,
      notes: formData.notes,
      status: 'active',
      medecin_email: currentUser?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPrescriptionReminders'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptionReminders'] });
      toast.success('Rappel créé avec succès');
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const patientName = patient ? 
    `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() : 
    'Patient';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Créer un rappel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p><strong>Patient:</strong> {patientName}</p>
          </div>

          <div className="space-y-2">
            <Label>Type de rappel</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renewal">Renouvellement d'ordonnance</SelectItem>
                <SelectItem value="medication_intake">Prise de médicament</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Médicament concerné</Label>
            <Select 
              value={formData.medication_name} 
              onValueChange={(v) => setFormData({ ...formData, medication_name: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {prescription.medicaments?.map((med, idx) => (
                  <SelectItem key={idx} value={med.nom_produit}>
                    <span className="flex items-center gap-2">
                      <Pill className="w-4 h-4" />
                      {med.nom_produit}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date du rappel</Label>
              <Input
                type="date"
                value={formData.reminder_date}
                onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure</Label>
              <Input
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
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

          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instructions supplémentaires..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
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