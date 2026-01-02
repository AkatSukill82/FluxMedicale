import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const ENTRY_TYPES = [
  { value: 'measurement', label: 'Mesure / Valeur' },
  { value: 'milestone', label: 'Jalon atteint' },
  { value: 'note', label: 'Note de suivi' },
  { value: 'symptom', label: 'Symptôme' },
  { value: 'side_effect', label: 'Effet secondaire' },
  { value: 'feedback', label: 'Retour patient' }
];

const MOODS = [
  { value: 'excellent', label: '😄 Excellent' },
  { value: 'bien', label: '🙂 Bien' },
  { value: 'moyen', label: '😐 Moyen' },
  { value: 'difficile', label: '😟 Difficile' },
  { value: 'tres_difficile', label: '😢 Très difficile' }
];

export default function ProgressEntryForm({ isOpen, onClose, plan }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    type: 'measurement',
    date: new Date().toISOString().split('T')[0],
    objective_id: '',
    numeric_value: '',
    unit: '',
    notes: '',
    mood: '',
    adherence_score: ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      await base44.entities.TreatmentProgress.create({
        plan_id: plan.id,
        patient_id: plan.patient_id,
        ...data,
        numeric_value: data.numeric_value ? Number(data.numeric_value) : null,
        adherence_score: data.adherence_score ? Number(data.adherence_score) : null,
        reported_by: 'medecin',
        medecin_email: currentUser.email
      });

      // Si lié à un objectif, mettre à jour la valeur actuelle
      if (data.objective_id && data.numeric_value) {
        const updatedObjectives = plan.objectives.map(obj => {
          if (obj.id === data.objective_id) {
            return { ...obj, current_value: data.numeric_value };
          }
          return obj;
        });
        await base44.entities.TreatmentPlan.update(plan.id, { objectives: updatedObjectives });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatmentProgress'] });
      queryClient.invalidateQueries({ queryKey: ['treatmentPlans'] });
      toast.success('Progression enregistrée');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ajouter une mesure
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {plan.objectives?.length > 0 && (
            <div className="space-y-2">
              <Label>Objectif concerné (optionnel)</Label>
              <Select value={formData.objective_id} onValueChange={(v) => setFormData({ ...formData, objective_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Aucun</SelectItem>
                  {plan.objectives.map(obj => (
                    <SelectItem key={obj.id} value={obj.id}>{obj.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.type === 'measurement' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.numeric_value}
                  onChange={(e) => setFormData({ ...formData, numeric_value: e.target.value })}
                  placeholder="Ex: 7.2"
                />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Ex: %, mmHg, kg"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Humeur du patient</Label>
            <Select value={formData.mood} onValueChange={(v) => setFormData({ ...formData, mood: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {MOODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Score d'adhérence (0-100)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.adherence_score}
              onChange={(e) => setFormData({ ...formData, adherence_score: e.target.value })}
              placeholder="Ex: 85"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Observations, commentaires..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}