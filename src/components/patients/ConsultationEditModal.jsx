import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ConsultationEditModal({ consultation, patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    motif: '',
    anamnese: '',
    examen_clinique: '',
    diagnostic: '',
    prescriptions: ''
  });

  useEffect(() => {
    if (consultation) {
      setFormData({
        motif: consultation.motif || '',
        anamnese: consultation.anamnese || '',
        examen_clinique: consultation.examen_clinique || '',
        diagnostic: consultation.diagnostic || '',
        prescriptions: consultation.prescriptions || ''
      });
    }
  }, [consultation]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Consultation.update(consultation.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations', patient.id] });
      toast.success('Consultation mise à jour');
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const consultDate = consultation?.date_consultation ? new Date(consultation.date_consultation) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modifier la consultation
          </DialogTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
            {consultDate && !isNaN(consultDate.getTime()) && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="w-3 h-3" />
                {format(consultDate, 'dd MMMM yyyy, HH:mm', { locale: fr })}
              </Badge>
            )}
            {consultation?.medecin_email && (
              <Badge variant="outline" className="gap-1">
                <User className="w-3 h-3" />
                Dr. {consultation.medecin_email.split('@')[0]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="motif">Motif de consultation</Label>
            <Input
              id="motif"
              value={formData.motif}
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
              placeholder="Motif de la consultation"
            />
          </div>

          <div>
            <Label htmlFor="anamnese">Anamnèse</Label>
            <Textarea
              id="anamnese"
              value={formData.anamnese}
              onChange={(e) => setFormData({ ...formData, anamnese: e.target.value })}
              placeholder="Histoire de la maladie, symptômes..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="examen_clinique">Examen clinique</Label>
            <Textarea
              id="examen_clinique"
              value={formData.examen_clinique}
              onChange={(e) => setFormData({ ...formData, examen_clinique: e.target.value })}
              placeholder="Résultats de l'examen clinique..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="diagnostic">Diagnostic</Label>
            <Textarea
              id="diagnostic"
              value={formData.diagnostic}
              onChange={(e) => setFormData({ ...formData, diagnostic: e.target.value })}
              placeholder="Diagnostic posé..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="prescriptions">Prescriptions / Traitement</Label>
            <Textarea
              id="prescriptions"
              value={formData.prescriptions}
              onChange={(e) => setFormData({ ...formData, prescriptions: e.target.value })}
              placeholder="Traitement prescrit..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}