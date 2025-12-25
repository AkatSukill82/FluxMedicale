import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function GDPRConsentWorkflow({ patient, isOpen, onClose, onConsented }) {
  const [consents, setConsents] = useState({
    data_processing: false,
    data_sharing: false
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!consents.data_processing) {
      toast.error('Le consentement au traitement des données est requis');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: '1.0',
          data_processing_consent: consents.data_processing,
          data_sharing_consent: consents.data_sharing,
          revoked: false
        }
      });
      toast.success('Consentement enregistré');
      onConsented?.();
      onClose();
    } catch (error) {
      console.error('Erreur RGPD:', error);
      toast.error('Erreur lors de l\'enregistrement du consentement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Consentement RGPD
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Conformément au RGPD, le patient doit consentir au traitement de ses données médicales.
          </p>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="data_processing"
                checked={consents.data_processing}
                onCheckedChange={(checked) => setConsents({...consents, data_processing: checked})}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="data_processing" className="font-medium">
                  Traitement des données médicales *
                </Label>
                <p className="text-sm text-muted-foreground">
                  J'autorise le traitement de mes données médicales pour ma prise en charge.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="data_sharing"
                checked={consents.data_sharing}
                onCheckedChange={(checked) => setConsents({...consents, data_sharing: checked})}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="data_sharing" className="font-medium">
                  Partage avec autres professionnels
                </Label>
                <p className="text-sm text-muted-foreground">
                  J'autorise le partage de mes données avec d'autres professionnels de santé.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving || !consents.data_processing}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer le consentement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}