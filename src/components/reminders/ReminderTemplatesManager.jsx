import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Edit,
  Trash2,
  Mail,
  Smartphone,
  Calendar,
  Pill,
  Bell,
  Syringe,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  rdv: { label: 'Rendez-vous', icon: Calendar, color: 'bg-blue-100 text-blue-800' },
  prescription: { label: 'Prescription', icon: Pill, color: 'bg-purple-100 text-purple-800' },
  resultat: { label: 'Résultat', icon: FileText, color: 'bg-orange-100 text-orange-800' },
  suivi: { label: 'Suivi', icon: Bell, color: 'bg-green-100 text-green-800' },
  vaccination: { label: 'Vaccination', icon: Syringe, color: 'bg-teal-100 text-teal-800' },
  custom: { label: 'Personnalisé', icon: Bell, color: 'bg-slate-100 text-slate-800' }
};

const DEFAULT_TEMPLATES = [
  {
    nom: 'Rappel RDV - 24h avant',
    type: 'rdv',
    canal: 'email',
    sujet_email: 'Rappel de votre rendez-vous',
    contenu_email: 'Bonjour {{patient_name}},\n\nNous vous rappelons votre rendez-vous prévu le {{date}} à {{heure}}.\n\nCordialement,\nDr. {{medecin}}',
    contenu_sms: 'Rappel RDV le {{date}} à {{heure}}. Dr. {{medecin}}',
    delai_defaut_jours: 1
  },
  {
    nom: 'Renouvellement ordonnance',
    type: 'prescription',
    canal: 'email',
    sujet_email: 'Rappel: Renouvellement de votre traitement',
    contenu_email: 'Bonjour {{patient_name}},\n\nVotre traitement "{{medicament}}" arrive à terme.\n\nN\'oubliez pas de prendre rendez-vous pour le renouvellement.\n\nCordialement,\nVotre cabinet médical',
    contenu_sms: 'Rappel: Votre traitement {{medicament}} arrive à terme. Pensez au renouvellement.',
    delai_defaut_jours: 7
  }
];

export default function ReminderTemplatesManager() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['reminderTemplates'],
    queryFn: () => base44.entities.ReminderTemplate.list()
  });

  const [formData, setFormData] = useState({
    nom: '',
    type: 'rdv',
    canal: 'email',
    sujet_email: '',
    contenu_email: '',
    contenu_sms: '',
    delai_defaut_jours: 1,
    actif: true
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate) {
        return base44.entities.ReminderTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.ReminderTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminderTemplates'] });
      toast.success(editingTemplate ? 'Modèle mis à jour' : 'Modèle créé');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReminderTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminderTemplates'] });
      toast.success('Modèle supprimé');
    }
  });

  const initDefaultsMutation = useMutation({
    mutationFn: async () => {
      for (const template of DEFAULT_TEMPLATES) {
        await base44.entities.ReminderTemplate.create({ ...template, actif: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminderTemplates'] });
      toast.success('Modèles par défaut créés');
    }
  });

  const resetForm = () => {
    setFormData({
      nom: '',
      type: 'rdv',
      canal: 'email',
      sujet_email: '',
      contenu_email: '',
      contenu_sms: '',
      delai_defaut_jours: 1,
      actif: true
    });
    setEditingTemplate(null);
    setShowModal(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      nom: template.nom || '',
      type: template.type || 'rdv',
      canal: template.canal || 'email',
      sujet_email: template.sujet_email || '',
      contenu_email: template.contenu_email || '',
      contenu_sms: template.contenu_sms || '',
      delai_defaut_jours: template.delai_defaut_jours || 1,
      actif: template.actif !== false
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Modèles de rappels</h3>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button 
              variant="outline" 
              onClick={() => initDefaultsMutation.mutate()}
              disabled={initDefaultsMutation.isPending}
            >
              {initDefaultsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Créer modèles par défaut
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun modèle configuré</p>
            <p className="text-sm">Créez des modèles pour standardiser vos rappels.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => {
            const typeConfig = TYPE_CONFIG[template.type] || TYPE_CONFIG.custom;
            const TypeIcon = typeConfig.icon;

            return (
              <Card key={template.id} className={!template.actif ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-base">{template.nom}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                    <Badge variant="outline">
                      {template.canal === 'email' ? <Mail className="w-3 h-3 mr-1" /> : 
                       template.canal === 'sms' ? <Smartphone className="w-3 h-3 mr-1" /> :
                       <Bell className="w-3 h-3 mr-1" />}
                      {template.canal === 'both' ? 'Email + SMS' : template.canal?.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{template.delai_defaut_jours}j avant</Badge>
                  </div>
                  {template.sujet_email && (
                    <p className="text-sm text-muted-foreground truncate">
                      Sujet: {template.sujet_email}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du modèle</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Rappel RDV - 24h avant"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={formData.canal} onValueChange={(v) => setFormData({ ...formData, canal: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Email + SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Délai par défaut (jours avant)</Label>
              <Input
                type="number"
                value={formData.delai_defaut_jours}
                onChange={(e) => setFormData({ ...formData, delai_defaut_jours: Number(e.target.value) })}
                min={1}
              />
            </div>

            {(formData.canal === 'email' || formData.canal === 'both') && (
              <>
                <div className="space-y-2">
                  <Label>Sujet de l'email</Label>
                  <Input
                    value={formData.sujet_email}
                    onChange={(e) => setFormData({ ...formData, sujet_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenu de l'email</Label>
                  <Textarea
                    value={formData.contenu_email}
                    onChange={(e) => setFormData({ ...formData, contenu_email: e.target.value })}
                    rows={5}
                    placeholder="Variables: {{patient_name}}, {{date}}, {{heure}}, {{medecin}}, {{medicament}}"
                  />
                </div>
              </>
            )}

            {(formData.canal === 'sms' || formData.canal === 'both') && (
              <div className="space-y-2">
                <Label>Contenu SMS (max 160 car.)</Label>
                <Textarea
                  value={formData.contenu_sms}
                  onChange={(e) => setFormData({ ...formData, contenu_sms: e.target.value })}
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.contenu_sms.length}/160 caractères
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="actif"
                checked={formData.actif}
                onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="actif">Modèle actif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}