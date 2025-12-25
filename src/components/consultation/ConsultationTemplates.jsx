import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Star, 
  StarOff,
  Trash2, 
  Edit2,
  Copy,
  Loader2,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';

// Templates par défaut
const DEFAULT_TEMPLATES = [
  {
    id: 'default_grippe',
    name: 'Syndrome grippal',
    category: 'Infectiologie',
    is_default: true,
    content: {
      motif: 'Syndrome grippal',
      anamnese: 'Fièvre depuis [durée], toux, céphalées, myalgies. Pas de signes de gravité.',
      examen_clinique: 'T°: [temp]°C, FC: [fc]/min, FR: [fr]/min\nORL: pharynx érythémateux\nPoumons: MV bilatéraux, pas de foyer',
      diagnostic: 'Syndrome grippal probable',
      prescriptions: 'Repos, hydratation\nParacétamol 1g x3/j si douleur ou fièvre'
    }
  },
  {
    id: 'default_hypertension',
    name: 'Suivi HTA',
    category: 'Cardiologie',
    is_default: true,
    content: {
      motif: 'Suivi hypertension artérielle',
      anamnese: 'Patient suivi pour HTA. Traitement actuel: [traitement]. Observance: [bonne/moyenne/mauvaise].',
      examen_clinique: 'PA: [pa] mmHg (assis, repos 5min)\nFC: [fc]/min régulier\nAuscultation cardiaque: B1B2 réguliers, pas de souffle',
      diagnostic: 'HTA [équilibrée/non équilibrée]',
      prescriptions: ''
    }
  },
  {
    id: 'default_diabetes',
    name: 'Suivi Diabète',
    category: 'Endocrinologie',
    is_default: true,
    content: {
      motif: 'Suivi diabète type 2',
      anamnese: 'Diabète type 2 connu depuis [année]. Traitement: [traitement]. Dernière HbA1c: [valeur]%.',
      examen_clinique: 'Poids: [poids]kg, IMC: [imc]\nExamen pieds: [normal/anomalies]\nPouls pédieux: [perçus/diminués]',
      diagnostic: 'Diabète type 2 [équilibré/déséquilibré]',
      prescriptions: 'Contrôle HbA1c dans 3 mois\nBilan lipidique annuel'
    }
  },
  {
    id: 'default_certificat',
    name: 'Certificat médical',
    category: 'Administratif',
    is_default: true,
    content: {
      motif: 'Demande de certificat médical',
      anamnese: '',
      examen_clinique: '',
      diagnostic: '',
      prescriptions: ''
    }
  }
];

export default function ConsultationTemplates({ isOpen, onClose, onSelectTemplate }) {
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les templates personnalisés depuis le user
  const { data: userTemplates = [], isLoading } = useQuery({
    queryKey: ['consultationTemplates'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.consultation_templates || [];
    }
  });

  const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];

  const saveMutation = useMutation({
    mutationFn: async (templates) => {
      await base44.auth.updateMe({ consultation_templates: templates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationTemplates'] });
      toast.success('Template sauvegardé');
    }
  });

  const handleSaveTemplate = (template) => {
    const newTemplates = editingTemplate?.id && !editingTemplate.id.startsWith('default_')
      ? userTemplates.map(t => t.id === editingTemplate.id ? template : t)
      : [...userTemplates, { ...template, id: `custom_${Date.now()}` }];
    
    saveMutation.mutate(newTemplates);
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId) => {
    if (templateId.startsWith('default_')) {
      toast.error('Impossible de supprimer un template par défaut');
      return;
    }
    const newTemplates = userTemplates.filter(t => t.id !== templateId);
    saveMutation.mutate(newTemplates);
  };

  const handleDuplicateTemplate = (template) => {
    setEditingTemplate({
      ...template,
      id: null,
      name: `${template.name} (copie)`,
      is_default: false
    });
    setShowEditor(true);
  };

  const filteredTemplates = allTemplates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(allTemplates.map(t => t.category).filter(Boolean))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Templates de consultation
          </DialogTitle>
        </DialogHeader>

        {showEditor ? (
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        ) : (
          <>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="Rechercher un template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => {
                setEditingTemplate(null);
                setShowEditor(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {categories.map(category => {
                const categoryTemplates = filteredTemplates.filter(t => t.category === category);
                if (categoryTemplates.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {categoryTemplates.map(template => (
                        <Card 
                          key={template.id}
                          className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div 
                                className="flex-1"
                                onClick={() => {
                                  onSelectTemplate(template);
                                  onClose();
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-blue-600" />
                                  <h4 className="font-medium">{template.name}</h4>
                                </div>
                                {template.is_default && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    Par défaut
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateTemplate(template);
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                {!template.is_default && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTemplate(template);
                                        setShowEditor(true);
                                      }}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTemplate(template.id);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'Général',
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom du template</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Suivi diabète"
          />
        </div>
        <div>
          <Label>Catégorie</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Ex: Endocrinologie"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Motif de consultation</Label>
          <Input
            value={formData.content.motif}
            onChange={(e) => handleContentChange('motif', e.target.value)}
            placeholder="Motif pré-rempli"
          />
        </div>
        <div>
          <Label>Anamnèse</Label>
          <Textarea
            value={formData.content.anamnese}
            onChange={(e) => handleContentChange('anamnese', e.target.value)}
            placeholder="Template d'anamnèse avec [variables]"
            rows={3}
          />
        </div>
        <div>
          <Label>Examen clinique</Label>
          <Textarea
            value={formData.content.examen_clinique}
            onChange={(e) => handleContentChange('examen_clinique', e.target.value)}
            placeholder="Template d'examen clinique"
            rows={3}
          />
        </div>
        <div>
          <Label>Diagnostic</Label>
          <Input
            value={formData.content.diagnostic}
            onChange={(e) => handleContentChange('diagnostic', e.target.value)}
            placeholder="Diagnostic type"
          />
        </div>
        <div>
          <Label>Prescriptions</Label>
          <Textarea
            value={formData.content.prescriptions}
            onChange={(e) => handleContentChange('prescriptions', e.target.value)}
            placeholder="Prescriptions habituelles"
            rows={2}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Utilisez [nom_variable] pour créer des champs à remplir (ex: [température], [poids])
      </p>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button 
          onClick={() => onSave(formData)}
          disabled={!formData.name}
        >
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}