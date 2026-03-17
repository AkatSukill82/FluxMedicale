import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const ANALYSIS_TYPES = [
  { value: 'vaccination_coverage', label: 'Couverture vaccinale', placeholder: 'Ex: GRIPPE, COVID, TETANOS...' },
  { value: 'diagnosis_prevalence', label: 'Prévalence d\'un diagnostic', placeholder: 'Ex: Diabète, Hypertension...' },
  { value: 'allergy_tracking', label: 'Suivi d\'allergie', placeholder: 'Ex: Pénicilline, Arachide...' },
  { value: 'medication_usage', label: 'Utilisation de médicament', placeholder: 'Ex: Metformine, Amlodipine...' },
  { value: 'age_group_metric', label: 'Tranche d\'âge', placeholder: 'Optionnel - mot-clé supplémentaire' },
];

export default function CreateAnalysisDialog({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', type: '', description: '', searchTerm: '', ageMin: '', ageMax: '', gender: ''
  });

  const selectedType = ANALYSIS_TYPES.find(t => t.value === form.type);

  const handleSave = () => {
    if (!form.name || !form.type) return;
    const id = 'custom_' + Date.now();
    onSave({ ...form, id });
    setForm({ name: '', type: '', description: '', searchTerm: '', ageMin: '', ageMax: '', gender: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une analyse personnalisée</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nom de l'analyse *</Label>
            <Input
              placeholder="Ex: Couverture grippe patients > 65 ans"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Type d'analyse *</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir le type..." /></SelectTrigger>
              <SelectContent>
                {ANALYSIS_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.type && form.type !== 'age_group_metric' && (
            <div>
              <Label>Critère de recherche *</Label>
              <Input
                placeholder={selectedType?.placeholder || 'Mot-clé'}
                value={form.searchTerm}
                onChange={e => setForm({ ...form, searchTerm: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Le système cherchera ce terme dans vos données patients
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Âge min</Label>
              <Input type="number" placeholder="0" value={form.ageMin} onChange={e => setForm({ ...form, ageMin: e.target.value })} />
            </div>
            <div>
              <Label>Âge max</Label>
              <Input type="number" placeholder="∞" value={form.ageMax} onChange={e => setForm({ ...form, ageMax: e.target.value })} />
            </div>
            <div>
              <Label>Genre</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="male">Hommes</SelectItem>
                  <SelectItem value="female">Femmes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Notes optionnelles..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.type || (form.type !== 'age_group_metric' && !form.searchTerm)}>
            <Plus className="w-4 h-4 mr-1" />
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}