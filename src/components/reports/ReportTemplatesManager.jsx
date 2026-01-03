import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Star,
  Loader2,
  Save,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

const SECTION_TYPES = [
  { id: 'header', label: 'En-tête', icon: '📋' },
  { id: 'patient_info', label: 'Infos patient', icon: '👤' },
  { id: 'consultations', label: 'Consultations', icon: '🩺' },
  { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
  { id: 'vital_signs', label: 'Constantes', icon: '❤️' },
  { id: 'progress', label: 'Évolution', icon: '📈' },
  { id: 'objectives', label: 'Objectifs', icon: '🎯' },
  { id: 'recommendations', label: 'Recommandations', icon: '💡' },
  { id: 'custom_text', label: 'Texte libre', icon: '✏️' },
  { id: 'footer', label: 'Pied de page', icon: '📝' }
];

export default function ReportTemplatesManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: () => base44.entities.ReportTemplate.list('-created_date', 50)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success('Modèle supprimé');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_date, updated_date, ...rest } = template;
      return base44.entities.ReportTemplate.create({
        ...rest,
        name: `${rest.name} (copie)`,
        is_default: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success('Modèle dupliqué');
    }
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modèles de rapports</h2>
          <p className="text-sm text-muted-foreground">Créez et gérez vos modèles personnalisés</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">Aucun modèle créé</p>
            <Button variant="outline" className="mt-4" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier modèle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className={template.is_default ? 'border-blue-300 bg-blue-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {template.type === 'consultation_summary' && 'Résumé consultation'}
                      {template.type === 'prescription_report' && 'Rapport prescriptions'}
                      {template.type === 'treatment_progress' && 'Suivi traitement'}
                      {template.type === 'patient_overview' && 'Vue d\'ensemble'}
                      {template.type === 'custom' && 'Personnalisé'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.sections?.filter(s => s.enabled).map(section => (
                    <Badge key={section.id} variant="outline" className="text-xs">
                      {SECTION_TYPES.find(t => t.id === section.type)?.icon} {section.title}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(template)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteMutation.mutate(template.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <TemplateFormDialog
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingTemplate(null); }}
          template={editingTemplate}
        />
      )}
    </div>
  );
}

function TemplateFormDialog({ isOpen, onClose, template }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'custom',
    frequency: template?.frequency || 'manual',
    sections: template?.sections || SECTION_TYPES.slice(0, 5).map((s, i) => ({
      id: s.id,
      title: s.label,
      type: s.id,
      enabled: true,
      order: i
    })),
    header_text: template?.header_text || '',
    footer_text: template?.footer_text || '',
    include_logo: template?.include_logo ?? true,
    include_signature: template?.include_signature ?? true,
    auto_send: template?.auto_send || false,
    is_default: template?.is_default || false
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const payload = { ...data, medecin_email: user.email };
      
      if (template?.id) {
        return base44.entities.ReportTemplate.update(template.id, payload);
      }
      return base44.entities.ReportTemplate.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success(template ? 'Modèle mis à jour' : 'Modèle créé');
      onClose();
    }
  });

  const toggleSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const addSection = (type) => {
    const sectionType = SECTION_TYPES.find(t => t.id === type);
    if (!sectionType) return;
    
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, {
        id: `${type}-${Date.now()}`,
        title: sectionType.label,
        type,
        enabled: true,
        order: prev.sections.length
      }]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Modifier le modèle' : 'Nouveau modèle de rapport'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du modèle *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Rapport mensuel"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation_summary">Résumé consultation</SelectItem>
                  <SelectItem value="prescription_report">Rapport prescriptions</SelectItem>
                  <SelectItem value="treatment_progress">Suivi traitement</SelectItem>
                  <SelectItem value="patient_overview">Vue d'ensemble</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            <Label>Sections du rapport</Label>
            <div className="border rounded-lg p-3 space-y-2">
              {formData.sections.map(section => (
                <div key={section.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{SECTION_TYPES.find(t => t.id === section.type)?.icon}</span>
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                </div>
              ))}
              
              <Select onValueChange={addSection}>
                <SelectTrigger className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ajouter une section..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Textes personnalisés */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texte d'en-tête (optionnel)</Label>
              <Textarea
                value={formData.header_text}
                onChange={e => setFormData({ ...formData, header_text: e.target.value })}
                placeholder="Texte affiché en haut du rapport..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Texte de pied de page (optionnel)</Label>
              <Textarea
                value={formData.footer_text}
                onChange={e => setFormData({ ...formData, footer_text: e.target.value })}
                placeholder="Texte affiché en bas du rapport..."
                rows={2}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Inclure le logo</Label>
              <Switch
                checked={formData.include_logo}
                onCheckedChange={v => setFormData({ ...formData, include_logo: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Inclure la signature</Label>
              <Switch
                checked={formData.include_signature}
                onCheckedChange={v => setFormData({ ...formData, include_signature: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Définir par défaut</Label>
              <Switch
                checked={formData.is_default}
                onCheckedChange={v => setFormData({ ...formData, is_default: v })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name || saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {template ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}