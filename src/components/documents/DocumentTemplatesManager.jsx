import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Download,
  Save,
  X,
  FileSignature,
  Mail,
  Stethoscope,
  Heart,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const TEMPLATE_CATEGORIES = [
  { value: 'certificat', label: 'Certificat médical', icon: FileSignature },
  { value: 'lettre_specialiste', label: 'Lettre pour spécialiste', icon: Mail },
  { value: 'attestation', label: 'Attestation', icon: FileText },
  { value: 'rapport', label: 'Rapport médical', icon: Stethoscope },
  { value: 'ordonnance', label: 'Ordonnance spéciale', icon: Heart },
  { value: 'autre', label: 'Autre document', icon: Briefcase }
];

const DEFAULT_TEMPLATES = [
  {
    name: 'Certificat d\'incapacité de travail',
    category: 'certificat',
    content: `CERTIFICAT MÉDICAL

Je soussigné(e), Dr {{medecin_nom}}, certifie avoir examiné ce jour {{date}} :

{{patient_civilite}} {{patient_nom}} {{patient_prenom}}
Né(e) le : {{patient_date_naissance}}
NISS : {{patient_niss}}

Et constate que son état de santé nécessite une incapacité de travail du {{date_debut}} au {{date_fin}} inclus.

{{#si prolongation}}
Il s'agit d'une prolongation de l'arrêt précédent.
{{/si}}

Sortie autorisée : {{sortie_autorisee}}

Fait à {{lieu}}, le {{date}}

Dr {{medecin_nom}}
N° INAMI : {{medecin_inami}}`,
    variables: ['medecin_nom', 'date', 'patient_civilite', 'patient_nom', 'patient_prenom', 'patient_date_naissance', 'patient_niss', 'date_debut', 'date_fin', 'sortie_autorisee', 'lieu', 'medecin_inami']
  },
  {
    name: 'Lettre pour cardiologue',
    category: 'lettre_specialiste',
    content: `{{lieu}}, le {{date}}

Dr {{medecin_nom}}
Médecin généraliste
{{medecin_adresse}}
N° INAMI : {{medecin_inami}}

À l'attention de notre Confrère Cardiologue,

Cher Confrère,

Je vous adresse {{patient_civilite}} {{patient_nom}} {{patient_prenom}}, {{patient_age}} ans, pour avis et prise en charge spécialisée.

MOTIF DE LA CONSULTATION :
{{motif}}

ANTÉCÉDENTS :
{{antecedents}}

TRAITEMENT ACTUEL :
{{traitement_actuel}}

EXAMEN CLINIQUE :
{{examen_clinique}}

EXAMENS COMPLÉMENTAIRES RÉALISÉS :
{{examens_realises}}

Je vous remercie de bien vouloir recevoir ce patient et reste à votre disposition pour tout renseignement complémentaire.

Confraternellement,

Dr {{medecin_nom}}`,
    variables: ['lieu', 'date', 'medecin_nom', 'medecin_adresse', 'medecin_inami', 'patient_civilite', 'patient_nom', 'patient_prenom', 'patient_age', 'motif', 'antecedents', 'traitement_actuel', 'examen_clinique', 'examens_realises']
  },
  {
    name: 'Certificat d\'aptitude sportive',
    category: 'certificat',
    content: `CERTIFICAT MÉDICAL D'APTITUDE À LA PRATIQUE SPORTIVE

Je soussigné(e), Dr {{medecin_nom}}, certifie avoir examiné ce jour {{date}} :

{{patient_civilite}} {{patient_nom}} {{patient_prenom}}
Né(e) le : {{patient_date_naissance}}

Et n'avoir constaté, ce jour, aucune contre-indication apparente à la pratique :
{{#si competition}}
☑ En compétition
{{/si}}
{{#si loisir}}
☑ En loisir
{{/si}}

Du sport suivant : {{sport}}

Ce certificat est valable pour la saison sportive {{saison}}.

Fait à {{lieu}}, le {{date}}

Dr {{medecin_nom}}
N° INAMI : {{medecin_inami}}`,
    variables: ['medecin_nom', 'date', 'patient_civilite', 'patient_nom', 'patient_prenom', 'patient_date_naissance', 'sport', 'saison', 'lieu', 'medecin_inami']
  },
  {
    name: 'Attestation de bonne santé',
    category: 'attestation',
    content: `ATTESTATION DE BONNE SANTÉ

Je soussigné(e), Dr {{medecin_nom}}, médecin généraliste, certifie avoir examiné ce jour :

{{patient_civilite}} {{patient_nom}} {{patient_prenom}}
Né(e) le : {{patient_date_naissance}}
NISS : {{patient_niss}}

Et atteste que l'état de santé de cette personne est compatible avec :
{{objet_attestation}}

Cette attestation est établie à la demande de l'intéressé(e) pour faire valoir ce que de droit.

Fait à {{lieu}}, le {{date}}

Dr {{medecin_nom}}
N° INAMI : {{medecin_inami}}`,
    variables: ['medecin_nom', 'patient_civilite', 'patient_nom', 'patient_prenom', 'patient_date_naissance', 'patient_niss', 'objet_attestation', 'lieu', 'date', 'medecin_inami']
  }
];

export default function DocumentTemplatesManager({ isOpen, onClose, patient, onDocumentGenerated }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});
  const [previewContent, setPreviewContent] = useState('');

  // Charger les templates personnalisés
  const { data: customTemplates = [], isLoading } = useQuery({
    queryKey: ['documentTemplates'],
    queryFn: () => base44.entities.DocumentTemplate.list()
  });

  // Charger infos médecin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const allTemplates = [
    ...DEFAULT_TEMPLATES.map(t => ({ ...t, isDefault: true })),
    ...customTemplates.map(t => ({ ...t, isDefault: false }))
  ];

  // Mutation pour créer/modifier un template
  const saveMutation = useMutation({
    mutationFn: async (template) => {
      if (template.id) {
        return base44.entities.DocumentTemplate.update(template.id, template);
      } else {
        return base44.entities.DocumentTemplate.create(template);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      toast.success('Modèle enregistré');
      setIsEditing(false);
      setEditingTemplate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      toast.success('Modèle supprimé');
    }
  });

  // Pré-remplir les variables avec les données du patient et médecin
  const initializeVariables = (template) => {
    const vars = {};
    const today = new Date().toLocaleDateString('fr-BE');
    
    // Variables médecin
    vars.medecin_nom = currentUser?.full_name || '';
    vars.medecin_inami = currentUser?.numero_inami || '';
    vars.medecin_adresse = currentUser?.adresse_cabinet || '';
    vars.date = today;
    vars.lieu = currentUser?.ville_cabinet || 'Bruxelles';

    // Variables patient si disponible
    if (patient) {
      const patientName = patient.name?.[0];
      vars.patient_nom = patientName?.family || '';
      vars.patient_prenom = patientName?.given?.join(' ') || '';
      vars.patient_civilite = patient.gender === 'male' ? 'M.' : patient.gender === 'female' ? 'Mme' : '';
      vars.patient_date_naissance = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('fr-BE') : '';
      vars.patient_niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
      
      // Calculer l'âge
      if (patient.birthDate) {
        const birth = new Date(patient.birthDate);
        const now = new Date();
        const age = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));
        vars.patient_age = `${age}`;
      }

      // Antécédents et traitements
      vars.antecedents = patient.antecedents_medicaux || '';
      vars.traitement_actuel = patient.medicaments_actuels || '';
    }

    setVariableValues(vars);
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    initializeVariables(template);
    setPreviewContent(template.content);
  };

  const updatePreview = () => {
    if (!selectedTemplate) return;
    
    let content = selectedTemplate.content;
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value || `[${key}]`);
    });
    
    // Nettoyer les variables conditionnelles non remplies
    content = content.replace(/{{#si \w+}}[\s\S]*?{{\/si}}/g, '');
    
    setPreviewContent(content);
  };

  React.useEffect(() => {
    updatePreview();
  }, [variableValues, selectedTemplate]);

  const generatePDF = () => {
    if (!previewContent) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(previewContent, maxWidth);
    
    let yPos = margin;
    lines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 6;
    });

    const fileName = `${selectedTemplate?.name || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('Document PDF généré');

    if (onDocumentGenerated) {
      onDocumentGenerated({
        template: selectedTemplate?.name,
        content: previewContent,
        date: new Date().toISOString()
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewContent);
    toast.success('Copié dans le presse-papiers');
  };

  const startNewTemplate = () => {
    setEditingTemplate({
      name: '',
      category: 'autre',
      content: '',
      variables: []
    });
    setIsEditing(true);
  };

  const editTemplate = (template) => {
    if (template.isDefault) {
      // Copier le template par défaut pour le personnaliser
      setEditingTemplate({
        name: `${template.name} (personnalisé)`,
        category: template.category,
        content: template.content,
        variables: template.variables || []
      });
    } else {
      setEditingTemplate({ ...template });
    }
    setIsEditing(true);
  };

  const extractVariables = (content) => {
    const regex = /{{(\w+)}}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Modèles de documents
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="templates">Modèles disponibles</TabsTrigger>
            <TabsTrigger value="generate">Générer un document</TabsTrigger>
            {isEditing && <TabsTrigger value="edit">Édition</TabsTrigger>}
          </TabsList>

          {/* Liste des modèles */}
          <TabsContent value="templates" className="px-6 pb-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Sélectionnez un modèle pour générer un document
              </p>
              <Button onClick={startNewTemplate} className="gap-2">
                <Plus className="w-4 h-4" />
                Nouveau modèle
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="grid md:grid-cols-2 gap-4">
                {TEMPLATE_CATEGORIES.map(category => {
                  const templates = allTemplates.filter(t => t.category === category.value);
                  if (templates.length === 0) return null;
                  
                  const Icon = category.icon;
                  
                  return (
                    <div key={category.value} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <Icon className="w-4 h-4" />
                        {category.label}
                      </div>
                      {templates.map((template, idx) => (
                        <Card 
                          key={template.id || idx}
                          className="p-4 hover:border-blue-300 cursor-pointer transition-colors"
                          onClick={() => {
                            selectTemplate(template);
                            setActiveTab('generate');
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Modèle par défaut
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editTemplate(template);
                                  setActiveTab('edit');
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {!template.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Supprimer ce modèle ?')) {
                                      deleteMutation.mutate(template.id);
                                    }
                                  }}
                                  className="text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Génération de document */}
          <TabsContent value="generate" className="px-6 pb-6">
            {selectedTemplate ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Variables */}
                <div>
                  <h3 className="font-semibold mb-4">Remplir les champs</h3>
                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-3">
                      {(selectedTemplate.variables || extractVariables(selectedTemplate.content)).map(variable => (
                        <div key={variable}>
                          <Label className="text-sm capitalize">
                            {variable.replace(/_/g, ' ')}
                          </Label>
                          {variable.includes('content') || variable.includes('motif') || variable.includes('antecedents') || variable.includes('examen') ? (
                            <Textarea
                              value={variableValues[variable] || ''}
                              onChange={(e) => setVariableValues({
                                ...variableValues,
                                [variable]: e.target.value
                              })}
                              className="mt-1"
                              rows={3}
                            />
                          ) : (
                            <Input
                              value={variableValues[variable] || ''}
                              onChange={(e) => setVariableValues({
                                ...variableValues,
                                [variable]: e.target.value
                              })}
                              className="mt-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Aperçu */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Aperçu</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copier
                      </Button>
                      <Button size="sm" onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700">
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  <Card className="p-4 bg-white h-[450px] overflow-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {previewContent}
                    </pre>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Sélectionnez un modèle dans l'onglet "Modèles disponibles"</p>
              </div>
            )}
          </TabsContent>

          {/* Édition de modèle */}
          {isEditing && (
            <TabsContent value="edit" className="px-6 pb-6">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du modèle</Label>
                    <Input
                      value={editingTemplate?.name || ''}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Select
                      value={editingTemplate?.category || 'autre'}
                      onValueChange={(value) => setEditingTemplate({
                        ...editingTemplate,
                        category: value
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Contenu du modèle</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Utilisez {"{{variable}}"} pour les champs dynamiques. Ex: {"{{patient_nom}}"}, {"{{date}}"}, {"{{medecin_nom}}"}
                  </p>
                  <Textarea
                    value={editingTemplate?.content || ''}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      content: e.target.value,
                      variables: extractVariables(e.target.value)
                    })}
                    className="mt-1 font-mono text-sm"
                    rows={15}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Variables détectées: {editingTemplate?.variables?.join(', ') || 'aucune'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingTemplate(null);
                        setActiveTab('templates');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => saveMutation.mutate(editingTemplate)}
                      disabled={!editingTemplate?.name || !editingTemplate?.content}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}