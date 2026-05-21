import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function FormationDialog({ open, onClose, formation, userEmail, onSaved }) {
  const [data, setData] = useState({
    title: '', organizer: '', category: 'congres', credits_cp: 0, credits_ea: 0,
    date: new Date().toISOString().split('T')[0], duration_hours: 0, accreditation_number: '',
    status: 'planifiee', notes: '', certificate_url: '',
    medecin_email: userEmail, period_year: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formation) {
      setData({ ...formation, medecin_email: formation.medecin_email || userEmail });
    } else {
      setData({
        title: '', organizer: '', category: 'congres', credits_cp: 0, credits_ea: 0,
        date: new Date().toISOString().split('T')[0], duration_hours: 0, accreditation_number: '',
        status: 'planifiee', notes: '', certificate_url: '',
        medecin_email: userEmail, period_year: new Date().getFullYear(),
      });
    }
  }, [formation, userEmail, open]);

  const handleSave = async () => {
    setSaving(true);
    if (formation?.id) {
      await base44.entities.FormationCredit.update(formation.id, data);
    } else {
      await base44.entities.FormationCredit.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const updateField = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formation ? 'Modifier la formation' : 'Ajouter une formation'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={data.title} onChange={e => updateField('title', e.target.value)} placeholder="Titre de la formation" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={data.category} onValueChange={v => updateField('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethique">Éthique</SelectItem>
                  <SelectItem value="peer_review">Peer Review</SelectItem>
                  <SelectItem value="congres">Congrès</SelectItem>
                  <SelectItem value="elearning">E-Learning</SelectItem>
                  <SelectItem value="seminaire">Séminaire</SelectItem>
                  <SelectItem value="glem">GLEM</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={data.status} onValueChange={v => updateField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifiee">Planifiée</SelectItem>
                  <SelectItem value="completee">Complétée</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                  <SelectItem value="en_attente_validation">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={data.date} onChange={e => updateField('date', e.target.value)} />
            </div>
            <div>
              <Label>Durée (heures)</Label>
              <Input type="number" value={data.duration_hours} onChange={e => updateField('duration_hours', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Organisateur</Label>
            <Input value={data.organizer} onChange={e => updateField('organizer', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Crédits CP</Label>
              <Input type="number" value={data.credits_cp} onChange={e => updateField('credits_cp', Number(e.target.value))} />
            </div>
            <div>
              <Label>Crédits EA</Label>
              <Input type="number" value={data.credits_ea} onChange={e => updateField('credits_ea', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>N° Accréditation INAMI</Label>
            <Input value={data.accreditation_number} onChange={e => updateField('accreditation_number', e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={data.notes} onChange={e => updateField('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} disabled={!data.title || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {formation ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}