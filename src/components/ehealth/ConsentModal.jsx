import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  CreditCard,
  Edit,
  Loader2,
  CheckCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { addYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ConsentModal({ patient, isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('eid');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualConsents, setManualConsents] = useState({
    data_processing: false,
    data_sharing: false,
    hub_access: false
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const patientName = patient ? 
    `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() : 
    'Patient';

  const createConsentMutation = useMutation({
    mutationFn: async (method) => {
      // Créer le consentement avec validité de 3 ans
      const expiryDate = addYears(new Date(), 3);
      
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: '2.0',
          data_processing_consent: true,
          data_sharing_consent: true,
          hub_access_consent: true,
          expires_at: expiryDate.toISOString(),
          method: method, // 'eid' ou 'manual'
          revoked: false
        }
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email,
        action: 'CREATE_CONSENT',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Enregistrement consentement via ${method === 'eid' ? 'carte eID' : 'saisie manuelle'} - Valide jusqu'au ${format(expiryDate, 'dd/MM/yyyy')}`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Consentement enregistré pour 3 ans');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const handleEidRead = async () => {
    setIsProcessing(true);
    // Simulation lecture carte eID patient
    await new Promise(resolve => setTimeout(resolve, 2000));
    createConsentMutation.mutate('eid');
    setIsProcessing(false);
  };

  const handleManualCreate = () => {
    if (!manualConsents.data_processing || !manualConsents.data_sharing || !manualConsents.hub_access) {
      toast.error('Veuillez cocher tous les consentements');
      return;
    }
    createConsentMutation.mutate('manual');
  };

  const allChecked = manualConsents.data_processing && manualConsents.data_sharing && manualConsents.hub_access;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Enregistrer le consentement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <Shield className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900 text-sm">
              Le consentement de <strong>{patientName}</strong> sera valide pendant <strong>3 ans</strong>.
            </AlertDescription>
          </Alert>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="eid" className="flex-1 gap-2">
                <CreditCard className="w-4 h-4" />
                Carte eID
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 gap-2">
                <Edit className="w-4 h-4" />
                Manuel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="eid" className="mt-4">
              <div className="text-center py-6">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <p className="text-sm text-muted-foreground mb-4">
                  Insérez la carte d'identité électronique (eID) du <strong>patient</strong> dans le lecteur pour enregistrer son consentement.
                </p>
                <Button 
                  onClick={handleEidRead} 
                  disabled={isProcessing || createConsentMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Lecture de la carte...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Lire la carte eID du patient
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <p className="text-sm font-medium mb-2">Le patient consent à :</p>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="data_processing"
                    checked={manualConsents.data_processing}
                    onCheckedChange={(c) => setManualConsents({ ...manualConsents, data_processing: c })}
                  />
                  <Label htmlFor="data_processing" className="text-sm leading-tight cursor-pointer">
                    Le traitement de ses données médicales dans le cadre de sa prise en charge
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="data_sharing"
                    checked={manualConsents.data_sharing}
                    onCheckedChange={(c) => setManualConsents({ ...manualConsents, data_sharing: c })}
                  />
                  <Label htmlFor="data_sharing" className="text-sm leading-tight cursor-pointer">
                    Le partage de ses données avec les professionnels de santé impliqués
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="hub_access"
                    checked={manualConsents.hub_access}
                    onCheckedChange={(c) => setManualConsents({ ...manualConsents, hub_access: c })}
                  />
                  <Label htmlFor="hub_access" className="text-sm leading-tight cursor-pointer">
                    L'accès aux données via les réseaux de santé (RSW, Vitalink, CoZo)
                  </Label>
                </div>
              </div>

              <Button 
                onClick={handleManualCreate} 
                disabled={createConsentMutation.isPending || !allChecked}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {createConsentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirmer le consentement
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}