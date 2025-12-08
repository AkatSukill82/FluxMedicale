import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplateEditor({ template, onClose, onSave }) {
  const [formData, setFormData] = useState(template || {
    name: '',
    category: 'CONSULTATION',
    subcategory: '',
    description: '',
    documents_bundle: [],
    consultation_notes_template: '',
    is_public: false,
    tags: []
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template?.id) {
        return base44.entities.DocumentTemplate.update(template.id, data);
      } else {
        return base44.entities.DocumentTemplate.create(data);
      }
    },
    onSuccess: () => {
      toast.success(template ? 'Modèle mis à jour' : 'Modèle créé');
      onSave();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const handleAddDocument = () => {
    setFormData({
      ...formData,
      documents_bundle: [
        ...(formData.documents_bundle || []),
        {
          document_type: 'LETTER',
          title: '',
          content_template: '',
          auto_medications: [],
          auto_codes: []
        }
      ]
    });
  };

  const handleRemoveDocument = (index) => {
    setFormData({
      ...formData,
      documents_bundle: formData.documents_bundle.filter((_, i) => i !== index)
    });
  };

  const handleUpdateDocument = (index, field, value) => {
    const updated = [...formData.documents_bundle];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, documents_bundle: updated });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Modifier le modèle' : 'Nouveau modèle'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du modèle *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Consultation Grippe"
              />
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSULTATION">Consultation</SelectItem>
                  <SelectItem value="CERTIFICAT">Certificat</SelectItem>
                  <SelectItem value="ORDONNANCE">Ordonnance</SelectItem>
                  <SelectItem value="COURRIER">Courrier</SelectItem>
                  <SelectItem value="POST_OP">Post-opératoire</SelectItem>
                  <SelectItem value="PATHOLOGIE">Pathologie</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Sous-catégorie</Label>
            <Input
              value={formData.subcategory || ''}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              placeholder="Ex: Grippe, Sport, Grossesse..."
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du modèle..."
              rows={3}
            />
          </div>

          <div>
            <Label>Notes de consultation (template)</Label>
            <Textarea
              value={formData.consultation_notes_template || ''}
              onChange={(e) => setFormData({ ...formData, consultation_notes_template: e.target.value })}
              placeholder="Variables disponibles: {{patient.name}}, {{patient.age}}, {{today}}, {{doctor.name}}"
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Les notes seront pré-remplies lors de l'utilisation du modèle
            </p>
          </div>

          {/* Documents Bundle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Documents à générer</Label>
              <Button size="sm" variant="outline" onClick={handleAddDocument}>
                <Plus className="w-3 h-3 mr-1" />
                Ajouter document
              </Button>
            </div>

            <div className="space-y-4">
              {(formData.documents_bundle || []).map((doc, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Document {index + 1}</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveDocument(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={doc.document_type}
                        onValueChange={(value) => handleUpdateDocument(index, 'document_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ATTESTATION">Attestation</SelectItem>
                          <SelectItem value="PRESCRIPTION">Prescription</SelectItem>
                          <SelectItem value="LETTER">Lettre</SelectItem>
                          <SelectItem value="CERTIFICATE">Certificat</SelectItem>
                          <SelectItem value="LAB_ORDER">Ordre labo</SelectItem>
                          <SelectItem value="IMAGING_ORDER">Ordre imagerie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Titre</Label>
                      <Input
                        value={doc.title}
                        onChange={(e) => handleUpdateDocument(index, 'title', e.target.value)}
                        placeholder="Titre du document"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Contenu (template)</Label>
                    <Textarea
                      value={doc.content_template}
                      onChange={(e) => handleUpdateDocument(index, 'content_template', e.target.value)}
                      placeholder="Contenu avec variables {{patient.name}}, {{today}}..."
                      rows={4}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Modèle public</Label>
              <p className="text-xs text-muted-foreground">
                Partager ce modèle avec tous les médecins
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.name || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}