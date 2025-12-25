import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  BookTemplate, 
  Plus, 
  Star, 
  StarOff, 
  Copy, 
  Trash2, 
  Edit, 
  Pill,
  Search,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Templates prédéfinis du système
const SYSTEM_TEMPLATES = [
  {
    id: 'sys-1',
    name: 'Infection urinaire simple',
    category: 'Infectiologie',
    medications: [
      { nom_produit: 'FOSFOMYCINE 3g', posologie: '1 sachet dose unique', duree_traitement: '1 jour', quantite: 1 }
    ],
    isSystem: true
  },
  {
    id: 'sys-2',
    name: 'Hypertension - Initiation',
    category: 'Cardiologie',
    medications: [
      { nom_produit: 'RAMIPRIL 5mg', posologie: '1 comprimé le matin', duree_traitement: '30 jours', quantite: 1 }
    ],
    isSystem: true
  },
  {
    id: 'sys-3',
    name: 'Diabète type 2 - Initiation',
    category: 'Endocrinologie',
    medications: [
      { nom_produit: 'METFORMINE 500mg', posologie: '1 comprimé matin et soir', duree_traitement: '30 jours', quantite: 2 }
    ],
    isSystem: true
  },
  {
    id: 'sys-4',
    name: 'Douleur chronique',
    category: 'Antalgique',
    medications: [
      { nom_produit: 'PARACETAMOL 1000mg', posologie: '1 comprimé 3x/jour si douleur', duree_traitement: '30 jours', quantite: 3 },
      { nom_produit: 'TRAMADOL 50mg', posologie: '1 comprimé si douleur intense (max 4/jour)', duree_traitement: '7 jours', quantite: 1 }
    ],
    isSystem: true
  },
  {
    id: 'sys-5',
    name: 'Reflux gastro-œsophagien',
    category: 'Gastro-entérologie',
    medications: [
      { nom_produit: 'OMEPRAZOLE 20mg', posologie: '1 gélule le matin à jeun', duree_traitement: '28 jours', quantite: 1 }
    ],
    isSystem: true
  },
  {
    id: 'sys-6',
    name: 'Anxiété légère',
    category: 'Psychiatrie',
    medications: [
      { nom_produit: 'ALPRAZOLAM 0.25mg', posologie: '1 comprimé si besoin (max 3/jour)', duree_traitement: '14 jours', quantite: 1 }
    ],
    isSystem: true
  },
  {
    id: 'sys-7',
    name: 'Bronchite aiguë',
    category: 'Pneumologie',
    medications: [
      { nom_produit: 'AMOXICILLINE 1g', posologie: '1 comprimé 3x/jour', duree_traitement: '7 jours', quantite: 1 },
      { nom_produit: 'ACETYLCYSTEINE 200mg', posologie: '1 sachet 3x/jour', duree_traitement: '7 jours', quantite: 1 }
    ],
    isSystem: true
  }
];

export default function PrescriptionTemplates({ onSelectTemplate, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Templates personnalisés de l'utilisateur
  const { data: userTemplates = [] } = useQuery({
    queryKey: ['prescription-templates'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.prescription_templates || [];
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (templates) => {
      await base44.auth.updateMe({ prescription_templates: templates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const allTemplates = [...SYSTEM_TEMPLATES, ...userTemplates];

  const filteredTemplates = allTemplates.filter(t => 
    searchQuery === '' ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.medications?.some(m => m.nom_produit?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template.medications);
    onClose();
    toast.success(`Template "${template.name}" appliqué`);
  };

  const handleDeleteTemplate = (templateId) => {
    const updated = userTemplates.filter(t => t.id !== templateId);
    saveTemplateMutation.mutate(updated);
    toast.success('Template supprimé');
  };

  const handleToggleFavorite = (template) => {
    if (template.isSystem) {
      // Copier le template système vers les favoris utilisateur
      const newTemplate = {
        ...template,
        id: `user-${Date.now()}`,
        isSystem: false,
        isFavorite: true
      };
      saveTemplateMutation.mutate([...userTemplates, newTemplate]);
      toast.success('Ajouté aux favoris');
    } else {
      const updated = userTemplates.map(t => 
        t.id === template.id ? { ...t, isFavorite: !t.isFavorite } : t
      );
      saveTemplateMutation.mutate(updated);
    }
  };

  // Grouper par catégorie
  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    const cat = t.category || 'Autres';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  // Favoris en premier
  const favorites = filteredTemplates.filter(t => t.isFavorite);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="w-5 h-5 text-blue-600" />
            Templates d'ordonnances
          </DialogTitle>
        </DialogHeader>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, catégorie ou médicament..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Liste scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Favoris */}
          {favorites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" /> Favoris
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {favorites.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleSelectTemplate(template)}
                    onToggleFavorite={() => handleToggleFavorite(template)}
                    onDelete={!template.isSystem ? () => handleDeleteTemplate(template.id) : null}
                    onEdit={!template.isSystem ? () => setEditingTemplate(template) : null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Par catégorie */}
          {Object.entries(groupedTemplates).map(([category, templates]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-500 mb-2">{category}</h3>
              <div className="grid grid-cols-1 gap-2">
                {templates.filter(t => !t.isFavorite).map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleSelectTemplate(template)}
                    onToggleFavorite={() => handleToggleFavorite(template)}
                    onDelete={!template.isSystem ? () => handleDeleteTemplate(template.id) : null}
                    onEdit={!template.isSystem ? () => setEditingTemplate(template) : null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un template
          </Button>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>

        {/* Dialog création */}
        {showCreateDialog && (
          <CreateTemplateDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSave={(template) => {
              const newTemplate = {
                ...template,
                id: `user-${Date.now()}`,
                isSystem: false
              };
              saveTemplateMutation.mutate([...userTemplates, newTemplate]);
              setShowCreateDialog(false);
              toast.success('Template créé');
            }}
          />
        )}

        {/* Dialog édition */}
        {editingTemplate && (
          <CreateTemplateDialog
            isOpen={!!editingTemplate}
            onClose={() => setEditingTemplate(null)}
            template={editingTemplate}
            onSave={(template) => {
              const updated = userTemplates.map(t =>
                t.id === editingTemplate.id ? { ...t, ...template } : t
              );
              saveTemplateMutation.mutate(updated);
              setEditingTemplate(null);
              toast.success('Template mis à jour');
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onSelect, onToggleFavorite, onDelete, onEdit }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{template.name}</span>
              {template.isSystem && (
                <Badge variant="outline" className="text-xs">Système</Badge>
              )}
              {template.isFavorite && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {template.medications?.slice(0, 3).map((med, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Pill className="w-3 h-3 mr-1" />
                  {med.nom_produit}
                </Badge>
              ))}
              {template.medications?.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{template.medications.length - 3}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFavorite}>
              {template.isFavorite ? (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="w-4 h-4 text-slate-400" />
              )}
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="w-4 h-4 text-slate-400" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTemplateDialog({ isOpen, onClose, template, onSave }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || '',
    medications: template?.medications || [{ nom_produit: '', posologie: '', duree_traitement: '', quantite: 1 }]
  });

  const handleAddMedication = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { nom_produit: '', posologie: '', duree_traitement: '', quantite: 1 }]
    });
  };

  const handleRemoveMedication = (index) => {
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index)
    });
  };

  const handleMedicationChange = (index, field, value) => {
    const updated = [...formData.medications];
    updated[index][field] = value;
    setFormData({ ...formData, medications: updated });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Veuillez donner un nom au template');
      return;
    }
    if (formData.medications.some(m => !m.nom_produit.trim())) {
      toast.error('Veuillez remplir tous les médicaments');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? 'Modifier le template' : 'Créer un template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom du template *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Grippe saisonnière"
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Infectiologie"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Médicaments</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.medications.map((med, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nom du médicament"
                      value={med.nom_produit}
                      onChange={(e) => handleMedicationChange(index, 'nom_produit', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleRemoveMedication(index)}
                      disabled={formData.medications.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Posologie"
                      value={med.posologie}
                      onChange={(e) => handleMedicationChange(index, 'posologie', e.target.value)}
                    />
                    <Input
                      placeholder="Durée"
                      value={med.duree_traitement}
                      onChange={(e) => handleMedicationChange(index, 'duree_traitement', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddMedication}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter un médicament
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}