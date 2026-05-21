import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const categories = [
  { value: 'ethique', label: 'Éthique' },
  { value: 'peer_review', label: 'Peer Review' },
  { value: 'congres', label: 'Congrès' },
  { value: 'elearning', label: 'E-Learning' },
  { value: 'seminaire', label: 'Séminaire' },
  { value: 'glem', label: 'GLEM' },
  { value: 'autre', label: 'Autre' },
];

export default function FormationForm({ formation, onSubmit, onClose }) {
  const [form, setForm] = useState({
    title: formation?.title || '',
    organizer: formation?.organizer || '',
    category: formation?.category || 'congres',
    credits_cp: formation?.credits_cp || 0,
    credits_ea: formation?.credits_ea || 0,
    date: formation?.date || new Date().toISOString().slice(0, 10),
    duration_hours: formation?.duration_hours || 0,
    accreditation_number: formation?.accreditation_number || '',
    status: formation?.status || 'planifiee',
    notes: formation?.notes || '',
  });
  const [uploading, setUploading] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState(formation?.certificate_url || '');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCertificateUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = () => {
    onSubmit({ ...form, certificate_url: certificateUrl || undefined });
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formation ? 'Modifier la formation' : 'Nouvelle formation'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titre de la formation" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifiee">Planifiée</SelectItem>
                  <SelectItem value="completee">Complétée</SelectItem>
                  <SelectItem value="en_attente_validation">En attente</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Organisateur</Label>
            <Input value={form.organizer} onChange={e => set('organizer', e.target.value)} placeholder="Nom de l'organisateur" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <Label>Durée (h)</Label>
              <Input type="number" value={form.duration_hours} onChange={e => set('duration_hours', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>N° Accréditation</Label>
              <Input value={form.accreditation_number} onChange={e => set('accreditation_number', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Crédits CP</Label>
              <Input type="number" step="0.5" value={form.credits_cp} onChange={e => set('credits_cp', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Crédits EA (Éthique)</Label>
              <Input type="number" step="0.5" value={form.credits_ea} onChange={e => set('credits_ea', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label>Certificat</Label>
            <Input type="file" accept=".pdf,.jpg,.png" onChange={handleFileUpload} disabled={uploading} />
            {certificateUrl && <p className="text-xs text-green-600 mt-1">Certificat chargé</p>}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.title || !form.date}>
              {formation ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}