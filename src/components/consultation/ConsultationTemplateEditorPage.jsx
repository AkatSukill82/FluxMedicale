import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CATEGORIES = [
  'Infectiologie', 'Cardiologie', 'Endocrinologie', 'Pédiatrie',
  'Dermatologie', 'Psychiatrie', 'Rhumatologie', 'Pneumologie',
  'Gastro-entérologie', 'Urologie', 'Neurologie', 'ORL',
  'Gynécologie', 'Gériatrie', 'Administratif', 'Autre'
];

export default function ConsultationTemplateEditorPage({ template, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'Autre',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {template ? 'Modifier le modèle' : 'Nouveau modèle de consultation'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pré-remplissez les champs que vous utilisez le plus souvent
          </p>
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Utilisez <code className="bg-muted px-1 rounded">[variable]</code> pour créer des champs à compléter lors de la consultation. 
          Ex: <code className="bg-muted px-1 rounded">[température]</code>, <code className="bg-muted px-1 rounded">[poids]</code>, <code className="bg-muted px-1 rounded">[oui/non]</code>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom du modèle *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Suivi diabète type 2"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={formData.category === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, category: cat })}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Contenu du modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="flex items-center gap-2">
                Motif de consultation
                <Badge variant="secondary" className="text-xs">Ligne unique</Badge>
              </Label>
              <Input
                value={formData.content.motif}
                onChange={(e) => handleContentChange('motif', e.target.value)}
                placeholder="Ex: Suivi hypertension artérielle"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                Anamnèse / Antécédents
                <Badge variant="secondary" className="text-xs">Texte structuré</Badge>
              </Label>
              <Textarea
                value={formData.content.anamnese}
                onChange={(e) => handleContentChange('anamnese', e.target.value)}
                placeholder="Ex: Patient suivi pour HTA depuis [année]. Traitement actuel: [traitement]. Observance: [bonne/moyenne/mauvaise]."
                rows={4}
                className="mt-1.5 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                Examen clinique
                <Badge variant="secondary" className="text-xs">Multi-lignes</Badge>
              </Label>
              <Textarea
                value={formData.content.examen_clinique}
                onChange={(e) => handleContentChange('examen_clinique', e.target.value)}
                placeholder={"Ex:\nPA: [pa] mmHg\nFC: [fc]/min\nAuscultation: B1B2 réguliers\nOMI: [absents/présents]"}
                rows={5}
                className="mt-1.5 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                Diagnostic
                <Badge variant="secondary" className="text-xs">Ligne unique</Badge>
              </Label>
              <Input
                value={formData.content.diagnostic}
                onChange={(e) => handleContentChange('diagnostic', e.target.value)}
                placeholder="Ex: HTA [équilibrée/non équilibrée]"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                Prescriptions / Plan de soins
                <Badge variant="secondary" className="text-xs">Multi-lignes</Badge>
              </Label>
              <Textarea
                value={formData.content.prescriptions}
                onChange={(e) => handleContentChange('prescriptions', e.target.value)}
                placeholder={"Ex:\nContrôle biologique dans 3 mois\nAdaptation traitement si nécessaire"}
                rows={3}
                className="mt-1.5 font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={!formData.name.trim() || isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </form>
    </div>
  );
}