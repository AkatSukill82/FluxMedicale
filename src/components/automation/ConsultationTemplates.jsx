import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Thermometer,
  Stethoscope,
  Pill,
  Heart,
  Activity,
  Baby,
  Brain,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATE_ICONS = {
  general: Stethoscope,
  pediatric: Baby,
  cardio: Heart,
  neuro: Brain,
  ophtalmo: Eye,
  checkup: Activity
};

const DEFAULT_TEMPLATES = [
  {
    id: 'grippe',
    name: 'Syndrome grippal',
    category: 'general',
    motif: 'Syndrome grippal',
    anamnese: 'Fièvre depuis [X] jours, courbatures, céphalées, toux, rhinorrhée.',
    examen: 'T°: [X]°C. Gorge érythémateuse. Pas de râles pulmonaires. ORL sans particularité.',
    diagnostic: 'Syndrome grippal',
    prescription: 'Paracétamol 1g x 3/jour si douleur ou fièvre. Repos. Hydratation.'
  },
  {
    id: 'gastro',
    name: 'Gastro-entérite',
    category: 'general',
    motif: 'Gastro-entérite',
    anamnese: 'Diarrhées et/ou vomissements depuis [X] jours. Douleurs abdominales.',
    examen: 'Abdomen souple, sensible diffusément. Pas de défense. Transit actif.',
    diagnostic: 'Gastro-entérite aiguë',
    prescription: 'Régime sans résidu. Hydratation ++. Smecta si diarrhées. Motilium si vomissements.'
  },
  {
    id: 'angine',
    name: 'Angine',
    category: 'general',
    motif: 'Mal de gorge',
    anamnese: 'Odynophagie depuis [X] jours. Fièvre. Pas de toux.',
    examen: 'Amygdales hypertrophiées, érythémateuses +/- purulent. Adénopathies cervicales.',
    diagnostic: 'Angine [virale/bactérienne]',
    prescription: 'Si TDR+ : Amoxicilline 1g x 2/jour pendant 6 jours. Sinon traitement symptomatique.'
  },
  {
    id: 'lombalgie',
    name: 'Lombalgie',
    category: 'general',
    motif: 'Douleur lombaire',
    anamnese: 'Lombalgie aiguë suite à [effort/faux mouvement]. Pas d\'irradiation.',
    examen: 'Contracture paravertébrale. Lasègue négatif bilatéral. ROT présents symétriques.',
    diagnostic: 'Lombalgie aiguë commune',
    prescription: 'Paracétamol/AINS. Myorelaxant si contracture importante. Repos relatif. Éviter port de charges.'
  },
  {
    id: 'otite',
    name: 'Otite',
    category: 'pediatric',
    motif: 'Otalgie',
    anamnese: 'Douleur auriculaire depuis [X] jours. Fièvre. Rhinite associée.',
    examen: 'Otoscopie : tympan [bombé/mat/perforé]. Gorge érythémateuse.',
    diagnostic: 'Otite moyenne aiguë',
    prescription: 'Amoxicilline [dose selon poids]. Paracétamol. Gouttes auriculaires si perforation.'
  },
  {
    id: 'checkup',
    name: 'Bilan de santé',
    category: 'checkup',
    motif: 'Bilan de santé annuel',
    anamnese: 'Pas de plainte particulière. Contrôle annuel.',
    examen: 'Examen clinique complet sans particularité. PA: [X]/[X] mmHg. FC: [X] bpm.',
    diagnostic: 'Bilan de santé - RAS',
    prescription: 'Bilan sanguin de contrôle à réaliser. Prochain contrôle dans 1 an.'
  }
];

export default function ConsultationTemplates({ patient, onSelectTemplate }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    motif: '',
    anamnese: '',
    examen: '',
    diagnostic: '',
    prescription: ''
  });

  // Load custom templates from user profile
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  React.useEffect(() => {
    if (user?.consultation_templates) {
      setCustomTemplates(user.consultation_templates);
    }
  }, [user]);

  const saveTemplatesMutation = useMutation({
    mutationFn: (templates) => base44.auth.updateMe({ consultation_templates: templates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Modèle sauvegardé');
    }
  });

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  const handleSaveTemplate = () => {
    if (!formData.name) {
      toast.error('Veuillez donner un nom au modèle');
      return;
    }

    const newTemplate = {
      ...formData,
      id: `custom_${Date.now()}`,
      isCustom: true
    };

    let updatedTemplates;
    if (editingTemplate) {
      updatedTemplates = customTemplates.map(t => 
        t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id } : t
      );
    } else {
      updatedTemplates = [...customTemplates, newTemplate];
    }

    setCustomTemplates(updatedTemplates);
    saveTemplatesMutation.mutate(updatedTemplates);
    setShowCreateDialog(false);
    setEditingTemplate(null);
    setFormData({ name: '', category: 'general', motif: '', anamnese: '', examen: '', diagnostic: '', prescription: '' });
  };

  const handleDeleteTemplate = (templateId) => {
    const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
    setCustomTemplates(updatedTemplates);
    saveTemplatesMutation.mutate(updatedTemplates);
  };

  const handleUseTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      toast.success(`Modèle "${template.name}" appliqué`);
    } else {
      // Copy to clipboard
      const text = `Motif: ${template.motif}\n\nAnamnèse: ${template.anamnese}\n\nExamen: ${template.examen}\n\nDiagnostic: ${template.diagnostic}\n\nPrescription: ${template.prescription}`;
      navigator.clipboard.writeText(text);
      toast.success('Modèle copié dans le presse-papier');
    }
  };

  const openEditDialog = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Modèles de consultation</h3>
          <p className="text-sm text-slate-500">Utilisez des modèles pour les consultations fréquentes</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allTemplates.map(template => {
          const Icon = TEMPLATE_ICONS[template.category] || Stethoscope;
          
          return (
            <Card key={template.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-slate-500 line-clamp-1">{template.motif}</p>
                      {template.isCustom && (
                        <Badge variant="secondary" className="mt-1 text-xs">Personnel</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {template.isCustom && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Utiliser ce modèle
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le modèle' : 'Créer un modèle'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du modèle *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Consultation grippe"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="general">Médecine générale</option>
                  <option value="pediatric">Pédiatrie</option>
                  <option value="cardio">Cardiologie</option>
                  <option value="neuro">Neurologie</option>
                  <option value="checkup">Bilan de santé</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Motif de consultation</Label>
              <Input
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                placeholder="Ex: Syndrome grippal"
              />
            </div>

            <div>
              <Label>Anamnèse type</Label>
              <Textarea
                value={formData.anamnese}
                onChange={(e) => setFormData({ ...formData, anamnese: e.target.value })}
                placeholder="Description de l'anamnèse..."
                rows={3}
              />
            </div>

            <div>
              <Label>Examen clinique type</Label>
              <Textarea
                value={formData.examen}
                onChange={(e) => setFormData({ ...formData, examen: e.target.value })}
                placeholder="Description de l'examen..."
                rows={3}
              />
            </div>

            <div>
              <Label>Diagnostic</Label>
              <Input
                value={formData.diagnostic}
                onChange={(e) => setFormData({ ...formData, diagnostic: e.target.value })}
                placeholder="Ex: Syndrome grippal"
              />
            </div>

            <div>
              <Label>Prescription type</Label>
              <Textarea
                value={formData.prescription}
                onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                placeholder="Prescription habituelle..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSaveTemplate} className="flex-1">
                {editingTemplate ? 'Mettre à jour' : 'Créer le modèle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}