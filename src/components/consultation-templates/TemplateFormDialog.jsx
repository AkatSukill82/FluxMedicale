import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  'Infectiologie', 'Cardiologie', 'Endocrinologie', 'Pneumologie',
  'Pédiatrie', 'Dermatologie', 'Rhumatologie', 'Psychiatrie',
  'Gastro-entérologie', 'Médecine générale', 'Administratif', 'Autre'
];

export default function TemplateFormDialog({ template, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'Médecine générale',
    content: template?.content || {
      motif: '',
      anamnese: '',
      examen_clinique: '',
      diagnostic: '',
      prescriptions: ''
    }
  });

  const handleContentChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      content: { ...prev.content, [field]: value }
    }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Modifier le modèle' : 'Nouveau modèle de consultation'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du modèle</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Suivi diabète type 2"
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Motif de consultation</Label>
            <Input
              value={formData.content.motif}
              onChange={(e) => handleContentChange('motif', e.target.value)}
              placeholder="Ex: Suivi hypertension artérielle"
            />
          </div>
          <div>
            <Label>Anamnèse / Antécédents</Label>
            <Textarea
              value={formData.content.anamnese}
              onChange={(e) => handleContentChange('anamnese', e.target.value)}
              placeholder="Patient suivi pour [pathologie]. Traitement actuel: [traitement]..."
              rows={4}
            />
          </div>
          <div>
            <Label>Examen clinique</Label>
            <Textarea
              value={formData.content.examen_clinique}
              onChange={(e) => handleContentChange('examen_clinique', e.target.value)}
              placeholder="PA: [pa] mmHg, FC: [fc]/min, SpO2: [spo2]%..."
              rows={4}
            />
          </div>
          <div>
            <Label>Diagnostic</Label>
            <Input
              value={formData.content.diagnostic}
              onChange={(e) => handleContentChange('diagnostic', e.target.value)}
              placeholder="Ex: HTA équilibrée"
            />
          </div>
          <div>
            <Label>Prescriptions</Label>
            <Textarea
              value={formData.content.prescriptions}
              onChange={(e) => handleContentChange('prescriptions', e.target.value)}
              placeholder="Prescriptions habituelles pour cette pathologie..."
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
            💡 <strong>Astuce :</strong> Utilisez <code>[variable]</code> pour créer des champs à remplir rapidement (ex: <code>[température]</code>, <code>[poids]</code>, <code>[pa]</code>).
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => onSave(formData)} disabled={!formData.name}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}