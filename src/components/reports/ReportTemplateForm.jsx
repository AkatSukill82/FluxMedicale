import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X, GripVertical, Settings } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_SECTIONS = [
  { id: 'header', title: 'En-tête', type: 'text', enabled: true, order: 1 },
  { id: 'patient_info', title: 'Informations patient', type: 'text', enabled: true, order: 2 },
  { id: 'consultations', title: 'Consultations', type: 'consultations', enabled: true, order: 3 },
  { id: 'prescriptions', title: 'Prescriptions', type: 'prescriptions', enabled: true, order: 4 },
  { id: 'vitals', title: 'Constantes vitales', type: 'vitals', enabled: false, order: 5 },
  { id: 'objectives', title: 'Objectifs thérapeutiques', type: 'objectives', enabled: false, order: 6 },
  { id: 'conclusions', title: 'Conclusions', type: 'text', enabled: true, order: 7 }
];

export default function ReportTemplateForm({ isOpen, onClose, template = null }) {
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'consultation_summary',
    frequency: template?.frequency || 'manual',
    sections: template?.sections || DEFAULT_SECTIONS,
    header_text: template?.header_text || '',
    footer_text: template?.footer_text || '',
    include_logo: template?.include_logo ?? true,
    include_signature: template?.include_signature ?? true,
    auto_send: template?.auto_send || false,
    recipients: template?.recipients || [],
    is_default: template?.is_default || false
  });

  const [newRecipient, setNewRecipient] = useState({ type: 'patient', email: '', name: '' });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      const payload = { ...data, medecin_email: currentUser.email };
      
      if (isEditing) {
        await base44.entities.ReportTemplate.update(template.id, payload);
      } else {
        await base44.entities.ReportTemplate.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success(isEditing ? 'Modèle mis à jour' : 'Modèle créé');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const toggleSection = (sectionId) => {
    setFormData({
      ...formData,
      sections: formData.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    });
  };

  const addRecipient = () => {
    if (!newRecipient.email) return;
    setFormData({
      ...formData,
      recipients: [...formData.recipients, { ...newRecipient }]
    });
    setNewRecipient({ type: 'patient', email: '', name: '' });
  };

  const removeRecipient = (index) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {isEditing ? 'Modifier le modèle' : 'Nouveau modèle de rapport'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nom du modèle *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Rapport mensuel de suivi"
              />
            </div>

            <div className="space-y-2">
              <Label>Type de rapport</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation_summary">Résumé consultations</SelectItem>
                  <SelectItem value="prescription_report">Rapport prescriptions</SelectItem>
                  <SelectItem value="treatment_progress">Suivi traitement</SelectItem>
                  <SelectItem value="patient_overview">Vue d'ensemble patient</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="quarterly">Trimestriel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Sections du rapport</Label>
            <div className="space-y-2">
              {formData.sections.map(section => (
                <div 
                  key={section.id} 
                  className="flex items-center gap-3 p-2 border rounded-lg hover:bg-slate-50"
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Checkbox
                    checked={section.enabled}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <span className={section.enabled ? '' : 'text-muted-foreground'}>{section.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{section.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Textes personnalisés */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Texte d'en-tête</Label>
              <Textarea
                value={formData.header_text}
                onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                rows={2}
                placeholder="Texte à afficher en haut du rapport..."
              />
            </div>
            <div className="space-y-2">
              <Label>Texte de pied de page</Label>
              <Textarea
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                rows={2}
                placeholder="Texte à afficher en bas du rapport..."
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Inclure le logo</Label>
              <Switch
                checked={formData.include_logo}
                onCheckedChange={(c) => setFormData({ ...formData, include_logo: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Inclure la signature</Label>
              <Switch
                checked={formData.include_signature}
                onCheckedChange={(c) => setFormData({ ...formData, include_signature: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Modèle par défaut</Label>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(c) => setFormData({ ...formData, is_default: c })}
              />
            </div>
          </div>

          {/* Envoi automatique */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Envoi automatique</Label>
                <p className="text-xs text-muted-foreground">Envoyer automatiquement selon la fréquence</p>
              </div>
              <Switch
                checked={formData.auto_send}
                onCheckedChange={(c) => setFormData({ ...formData, auto_send: c })}
              />
            </div>

            {formData.auto_send && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                <Label className="text-sm">Destinataires</Label>
                
                {formData.recipients.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{r.type}:</span>
                    <span>{r.name || r.email}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => removeRecipient(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Select value={newRecipient.type} onValueChange={(v) => setNewRecipient({ ...newRecipient, type: v })}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Médecin</SelectItem>
                      <SelectItem value="specialist">Spécialiste</SelectItem>
                      <SelectItem value="custom">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Email"
                    value={newRecipient.email}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={addRecipient}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name || saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}