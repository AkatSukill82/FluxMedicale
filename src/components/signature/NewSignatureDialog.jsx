import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Fingerprint, Smartphone, PenTool, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewSignatureDialog({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    document_type: '',
    document_title: '',
    patient_name: '',
    signature_method: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      await base44.entities.SignatureRequest.create({
        ...form,
        signer_email: user.email,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      toast.success('Demande de signature créée');
      setForm({ document_type: '', document_title: '', patient_name: '', signature_method: '', notes: '' });
      onClose();
    },
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle signature</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Type de document</label>
            <Select value={form.document_type} onValueChange={v => update('document_type', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="certificat">Certificat médical</SelectItem>
                <SelectItem value="sumehr">Sumehr</SelectItem>
                <SelectItem value="rapport">Rapport médical</SelectItem>
                <SelectItem value="attestation">Attestation</SelectItem>
                <SelectItem value="courrier">Courrier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Titre du document</label>
            <Input value={form.document_title} onChange={e => update('document_title', e.target.value)} placeholder="Ex: Certificat d'incapacité M. Dupont" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Patient (optionnel)</label>
            <Input value={form.patient_name} onChange={e => update('patient_name', e.target.value)} placeholder="Nom du patient" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Méthode de signature</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'eid', label: 'eID', icon: Fingerprint, color: 'border-blue-300 bg-blue-50' },
                { value: 'itsme', label: 'itsme®', icon: Smartphone, color: 'border-purple-300 bg-purple-50' },
                { value: 'manual', label: 'Manuel', icon: PenTool, color: 'border-gray-300 bg-gray-50' },
              ].map(method => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => update('signature_method', method.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    form.signature_method === method.value ? method.color + ' ring-2 ring-offset-1 ring-primary' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <method.icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Notes optionnelles..." className="h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!form.document_type || !form.document_title || !form.signature_method || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Créer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}