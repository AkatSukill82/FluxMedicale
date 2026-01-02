import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, X, Target, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

const STEP_TYPES = [
  { value: 'medication', label: 'Médicament' },
  { value: 'lifestyle', label: 'Mode de vie' },
  { value: 'appointment', label: 'Rendez-vous' },
  { value: 'exam', label: 'Examen' },
  { value: 'exercise', label: 'Exercice' },
  { value: 'diet', label: 'Régime alimentaire' },
  { value: 'other', label: 'Autre' }
];

export default function TreatmentPlanForm({ isOpen, onClose, patient = null, plan = null }) {
  const queryClient = useQueryClient();
  const isEditing = !!plan;

  // Si pas de patient fourni, permettre la sélection
  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForPlan'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100),
    enabled: !patient
  });

  const [formData, setFormData] = useState({
    patient_id: plan?.patient_id || patient?.id || '',
    patient_name: plan?.patient_name || (patient ? `${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}` : ''),
    title: plan?.title || '',
    description: plan?.description || '',
    condition: plan?.condition || '',
    start_date: plan?.start_date || new Date().toISOString().split('T')[0],
    target_end_date: plan?.target_end_date || '',
    priority: plan?.priority || 'moyenne',
    objectives: plan?.objectives || [],
    steps: plan?.steps || [],
    notes: plan?.notes || ''
  });

  const [newObjective, setNewObjective] = useState({ title: '', target_value: '', unit: '' });
  const [newStep, setNewStep] = useState({ title: '', type: 'other', frequency: '' });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      const payload = {
        ...data,
        medecin_email: currentUser.email,
        status: 'actif',
        overall_progress: 0
      };

      if (isEditing) {
        await base44.entities.TreatmentPlan.update(plan.id, payload);
      } else {
        await base44.entities.TreatmentPlan.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatmentPlans'] });
      toast.success(isEditing ? 'Plan mis à jour' : 'Plan créé');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const handlePatientSelect = (patientId) => {
    const selectedPatient = patients.find(p => p.id === patientId);
    if (selectedPatient) {
      setFormData({
        ...formData,
        patient_id: patientId,
        patient_name: `${selectedPatient.name?.[0]?.given?.[0] || ''} ${selectedPatient.name?.[0]?.family || ''}`.trim()
      });
    }
  };

  const addObjective = () => {
    if (!newObjective.title) return;
    setFormData({
      ...formData,
      objectives: [...formData.objectives, {
        id: `obj_${Date.now()}`,
        ...newObjective,
        status: 'en_cours',
        progress_percent: 0
      }]
    });
    setNewObjective({ title: '', target_value: '', unit: '' });
  };

  const removeObjective = (id) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter(o => o.id !== id)
    });
  };

  const addStep = () => {
    if (!newStep.title) return;
    setFormData({
      ...formData,
      steps: [...formData.steps, {
        id: `step_${Date.now()}`,
        order: formData.steps.length + 1,
        ...newStep,
        status: 'a_faire'
      }]
    });
    setNewStep({ title: '', type: 'other', frequency: '' });
  };

  const removeStep = (id) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter(s => s.id !== id)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.title) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {isEditing ? 'Modifier le plan' : 'Nouveau plan de traitement'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient */}
          {!patient && (
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select value={formData.patient_id} onValueChange={handlePatientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name?.[0]?.given?.[0]} {p.name?.[0]?.family}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Titre du plan *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Prise en charge diabète type 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Condition / Pathologie</Label>
              <Input
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="Ex: Diabète type 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="moyenne">Moyenne</SelectItem>
                  <SelectItem value="basse">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date cible de fin</Label>
              <Input
                type="date"
                value={formData.target_end_date}
                onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Objectifs */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Objectifs
            </Label>
            
            {formData.objectives.map(obj => (
              <Card key={obj.id} className="bg-slate-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{obj.title}</p>
                    {obj.target_value && (
                      <p className="text-xs text-muted-foreground">
                        Cible: {obj.target_value} {obj.unit}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeObjective(obj.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Input
                placeholder="Titre de l'objectif"
                value={newObjective.title}
                onChange={(e) => setNewObjective({ ...newObjective, title: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Valeur cible"
                value={newObjective.target_value}
                onChange={(e) => setNewObjective({ ...newObjective, target_value: e.target.value })}
                className="w-24"
              />
              <Input
                placeholder="Unité"
                value={newObjective.unit}
                onChange={(e) => setNewObjective({ ...newObjective, unit: e.target.value })}
                className="w-20"
              />
              <Button type="button" variant="outline" onClick={addObjective}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Étapes */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Étapes du traitement
            </Label>

            {formData.steps.map((step, idx) => (
              <Card key={step.id} className="bg-slate-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {STEP_TYPES.find(t => t.value === step.type)?.label}
                        {step.frequency && ` • ${step.frequency}`}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(step.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Input
                placeholder="Titre de l'étape"
                value={newStep.title}
                onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                className="flex-1"
              />
              <Select value={newStep.type} onValueChange={(v) => setNewStep({ ...newStep, type: v })}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Fréquence"
                value={newStep.frequency}
                onChange={(e) => setNewStep({ ...newStep, frequency: e.target.value })}
                className="w-28"
              />
              <Button type="button" variant="outline" onClick={addStep}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Mettre à jour' : 'Créer le plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}