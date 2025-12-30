import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Calendar, Save, Loader2, Stethoscope, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ConsultationEditModal({ consultation, isOpen, onClose, onSave }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    date_consultation: '',
    motif: '',
    anamnese: '',
    examen_clinique: '',
    diagnostic: '',
    prescriptions: '',
    statut: 'Completee'
  });

  useEffect(() => {
    if (consultation) {
      const consultDate = consultation.date_consultation 
        ? new Date(consultation.date_consultation)
        : new Date();
      
      setFormData({
        date_consultation: isValid(consultDate) 
          ? format(consultDate, "yyyy-MM-dd'T'HH:mm")
          : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        motif: consultation.motif || '',
        anamnese: consultation.anamnese || '',
        examen_clinique: consultation.examen_clinique || '',
        diagnostic: consultation.diagnostic || '',
        prescriptions: consultation.prescriptions || '',
        statut: consultation.statut || 'Completee'
      });
    }
  }, [consultation]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Consultation.update(consultation.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_consultations'] });
      toast.success('Consultation mise à jour');
      onSave?.();
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      date_consultation: new Date(formData.date_consultation).toISOString()
    });
  };

  if (!consultation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Modifier la consultation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date et statut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date de consultation
              </Label>
              <Input
                type="datetime-local"
                value={formData.date_consultation}
                onChange={(e) => setFormData({ ...formData, date_consultation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(val) => setFormData({ ...formData, statut: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Brouillon">Brouillon</SelectItem>
                  <SelectItem value="Completee">Complétée</SelectItem>
                  <SelectItem value="Verrouillee">Verrouillée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Motif */}
          <div className="space-y-2">
            <Label>Motif de consultation</Label>
            <Input
              value={formData.motif}
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
              placeholder="Ex: Douleurs lombaires, suivi diabète..."
            />
          </div>

          {/* Anamnèse */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Anamnèse
            </Label>
            <Textarea
              value={formData.anamnese}
              onChange={(e) => setFormData({ ...formData, anamnese: e.target.value })}
              placeholder="Histoire de la maladie, antécédents pertinents..."
              rows={3}
            />
          </div>

          {/* Examen clinique */}
          <div className="space-y-2">
            <Label>Examen clinique</Label>
            <Textarea
              value={formData.examen_clinique}
              onChange={(e) => setFormData({ ...formData, examen_clinique: e.target.value })}
              placeholder="Résultats de l'examen physique..."
              rows={3}
            />
          </div>

          {/* Diagnostic */}
          <div className="space-y-2">
            <Label>Diagnostic</Label>
            <Textarea
              value={formData.diagnostic}
              onChange={(e) => setFormData({ ...formData, diagnostic: e.target.value })}
              placeholder="Diagnostic(s) retenu(s)..."
              rows={2}
            />
          </div>

          {/* Prescriptions/Traitement */}
          <div className="space-y-2">
            <Label>Traitement / Prescriptions</Label>
            <Textarea
              value={formData.prescriptions}
              onChange={(e) => setFormData({ ...formData, prescriptions: e.target.value })}
              placeholder="Traitements prescrits, recommandations..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}