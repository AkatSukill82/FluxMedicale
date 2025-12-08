import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function TemplateCreator({ onClose, onSaved, editTemplate = null }) {
  const [formData, setFormData] = useState({
    name: editTemplate?.name || '',
    category: editTemplate?.category || 'DEMANDE_EXAMEN',
    subcategory: editTemplate?.subcategory || '',
    content_html: editTemplate?.content_html || `<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Titre du document</h2>
  <p><strong>Date:</strong> {{current_date}}</p>
  <p><strong>Patient:</strong> {{patient.nom}} {{patient.prenom}}</p>
  <p><strong>NISS:</strong> {{patient.niss}}</p>
  
  <p>Votre contenu ici...</p>
  
  <p><strong>Dr. {{medecin.nom}}</strong><br/>
  INAMI: {{medecin.inami}}<br/>
  {{medecin.adresse}}</p>
</div>`,
    tags: editTemplate?.tags?.join(', ') || '',
    is_public: editTemplate?.is_public || false
  });
  
  const [variables, setVariables] = useState(editTemplate?.variables || []);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    { value: 'DEMANDE_EXAMEN', label: 'Demande d\'examen' },
    { value: 'LETTRE_LIAISON', label: 'Lettre de liaison' },
    { value: 'CERTIFICAT_MEDICAL', label: 'Certificat médical' },
    { value: 'RAPPORT_CONSULTATION', label: 'Rapport de consultation' },
    { value: 'ATTESTATION', label: 'Attestation' },
    { value: 'ORDONNANCE', label: 'Ordonnance' },
    { value: 'AUTRE', label: 'Autre' }
  ];

  const handleAddVariable = () => {
    setVariables([...variables, {
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: []
    }]);
  };

  const handleRemoveVariable = (index) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleVariableChange = (index, field, value) => {
    const updated = [...variables];
    if (field === 'options') {
      updated[index][field] = value.split(',').map(o => o.trim()).filter(Boolean);
    } else {
      updated[index][field] = value;
    }
    setVariables(updated);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nom du template requis';
    }

    if (!formData.category) {
      newErrors.category = 'Catégorie requise';
    }

    if (!formData.content_html?.trim()) {
      newErrors.content_html = 'Contenu HTML requis';
    }

    variables.forEach((v, i) => {
      if (!v.name?.trim()) {
        newErrors[`variable_${i}_name`] = 'Nom de variable requis';
      }
      if (!v.label?.trim()) {
        newErrors[`variable_${i}_label`] = 'Label requis';
      }
      if (v.type === 'select' && (!v.options || v.options.length === 0)) {
        newErrors[`variable_${i}_options`] = 'Options requises pour select';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setIsSaving(true);

    try {
      const currentUser = await base44.auth.me();

      const templateData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        variables: variables,
        created_by: currentUser.email,
        usage_count: editTemplate?.usage_count || 0
      };

      if (editTemplate) {
        await base44.entities.DocumentTemplate.update(editTemplate.id, templateData);
        toast.success('Template mis à jour');
      } else {
        await base44.entities.DocumentTemplate.create(templateData);
        toast.success('Template créé avec succès');
      }

      if (onSaved) {
        onSaved();
      }

    } catch (error) {
      console.error('Erreur sauvegarde template:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const getPreview = () => {
    let html = formData.content_html;
    html = html.replace(/{{current_date}}/g, new Date().toLocaleDateString('fr-BE'));
    html = html.replace(/{{patient\.nom}}/g, 'DUPONT');
    html = html.replace(/{{patient\.prenom}}/g, 'Jean');
    html = html.replace(/{{patient\.niss}}/g, '85.01.15-123.45');
    html = html.replace(/{{medecin\.nom}}/g, 'Dr. Martin');
    html = html.replace(/{{medecin\.inami}}/g, '1-23456-78-901');
    html = html.replace(/{{medecin\.adresse}}/g, 'Avenue Example 45, 1000 Bruxelles');
    
    variables.forEach(v => {
      const regex = new RegExp(`{{${v.name}}}`, 'g');
      html = html.replace(regex, `[${v.label}]`);
    });
    
    return html;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {editTemplate ? 'Éditer le template' : 'Créer un template'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Masquer' : 'Prévisualiser'}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulaire */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Nom du template *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Demande ECG"
                      className="mt-2"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label>Catégorie *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sous-catégorie</Label>
                    <Input
                      value={formData.subcategory}
                      onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                      placeholder="Ex: ECG, IRM, Incapacité..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Tags (séparés par virgules)</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="Ex: cardiologie, urgent, examen"
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({...formData, is_public: checked})}
                    />
                    <Label className="cursor-pointer">
                      Template public (partagé avec tous les médecins)
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Variables personnalisables</h3>
                
                {variables.map((variable, index) => (
                  <Card key={index} className="p-4 mb-3">
                    <div className="flex items-start justify-between mb-3">
                      <Badge>{variable.type || 'text'}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVariable(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nom de variable *</Label>
                        <Input
                          value={variable.name}
                          onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                          placeholder="indication"
                          className="mt-1"
                          size="sm"
                        />
                        {errors[`variable_${index}_name`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`variable_${index}_name`]}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs">Label *</Label>
                        <Input
                          value={variable.label}
                          onChange={(e) => handleVariableChange(index, 'label', e.target.value)}
                          placeholder="Indication clinique"
                          className="mt-1"
                          size="sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={variable.type}
                          onValueChange={(value) => handleVariableChange(index, 'type', value)}
                        >
                          <SelectTrigger className="mt-1" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texte</SelectItem>
                            <SelectItem value="textarea">Texte long</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Liste déroulante</SelectItem>
                            <SelectItem value="checkbox">Case à cocher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox
                          checked={variable.required}
                          onCheckedChange={(checked) => handleVariableChange(index, 'required', checked)}
                        />
                        <Label className="text-xs cursor-pointer">Requis</Label>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={variable.placeholder || ''}
                          onChange={(e) => handleVariableChange(index, 'placeholder', e.target.value)}
                          placeholder="Texte d'aide..."
                          className="mt-1"
                          size="sm"
                        />
                      </div>

                      {variable.type === 'select' && (
                        <div className="col-span-2">
                          <Label className="text-xs">Options (séparées par virgules) *</Label>
                          <Input
                            value={variable.options?.join(', ') || ''}
                            onChange={(e) => handleVariableChange(index, 'options', e.target.value)}
                            placeholder="Option 1, Option 2, Option 3"
                            className="mt-1"
                            size="sm"
                          />
                          {errors[`variable_${index}_options`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`variable_${index}_options`]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={handleAddVariable}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une variable
                </Button>

                <Alert className="mt-4">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    <strong>Astuce:</strong> Utilisez les variables dans votre contenu HTML avec la syntaxe{' '}
                    <code className="bg-slate-100 px-1 rounded">{'{{nom_variable}}'}</code>
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Éditeur HTML + Prévisualisation */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Contenu HTML *</h3>
                <ReactQuill
                  value={formData.content_html}
                  onChange={(value) => setFormData({...formData, content_html: value})}
                  className="bg-white"
                  style={{ height: '400px', marginBottom: '60px' }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                />
                {errors.content_html && (
                  <p className="text-sm text-red-500 mt-1">{errors.content_html}</p>
                )}
              </div>

              {showPreview && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Prévisualisation</h3>
                  <div 
                    className="bg-white border-2 border-slate-200 rounded-lg p-6 max-h-[500px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: getPreview() }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <div className="border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />{editTemplate ? 'Mettre à jour' : 'Créer le template'}</>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}