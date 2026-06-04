import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Link2,
  CreditCard,
  Edit,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { addYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TherapeuticLinkModal({ patient, isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('eid');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualNihii, setManualNihii] = useState('');

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('eid');
      setIsProcessing(false);
      setManualNihii('');
    }
  }, [isOpen]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const patientName = patient ? 
    `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() : 
    'Patient';

  const createLinkMutation = useMutation({
    mutationFn: async (method) => {
      // Lien thérapeutique médecin généraliste : validité 1 an (AR 6 juin 2010)
      // Pour les spécialistes : validité par épisode de soins (non définie ici)
      const expiryDate = addYears(new Date(), 1);

      await base44.entities.Patient.update(patient.id, {
        therapeutic_link: {
          active: true,
          medecin_email: currentUser?.email,
          medecin_nihii: manualNihii || currentUser?.inami || currentUser?.numero_inami || '',
          created_at: new Date().toISOString(),
          expires_at: expiryDate.toISOString(),
          // AR 6 juin 2010 : le lien thérapeutique GP est valable 1 an, renouvelable
          legal_basis: 'AR 6 juin 2010 – Lien thérapeutique médecin généraliste',
          method, // 'eid' ou 'manual'
        },
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email,
        action: 'CREATE_THERAPEUTIC_LINK',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Création lien thérapeutique via ${method === 'eid' ? 'carte eID' : 'saisie manuelle'} - Valide jusqu'au ${format(expiryDate, 'dd/MM/yyyy')}`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      // Invalider toutes les queries liées au patient pour forcer le rafraîchissement
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patientHubStatus', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['allPatients'] });
      toast.success('Lien thérapeutique créé — valide 1 an (AR 6 juin 2010)');
      onClose();
      // Appeler onSuccess après la fermeture pour que le parent puisse refetch
      setTimeout(() => onSuccess?.(), 100);
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const handleEidRead = async () => {
    setIsProcessing(true);
    // Simulation lecture carte eID médecin
    await new Promise(resolve => setTimeout(resolve, 2000));
    createLinkMutation.mutate('eid');
    setIsProcessing(false);
  };

  const handleManualCreate = () => {
    if (!manualNihii) {
      toast.error('Veuillez entrer votre numéro INAMI');
      return;
    }
    createLinkMutation.mutate('manual');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            Créer un lien thérapeutique
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Shield className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              Le lien thérapeutique avec <strong>{patientName}</strong> sera valide pendant <strong>1 an</strong> (AR 6 juin 2010 — médecin généraliste).
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
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                <p className="text-sm text-muted-foreground mb-4">
                  Insérez votre carte d'identité électronique (eID) dans le lecteur pour créer automatiquement le lien thérapeutique.
                </p>
                <Button 
                  onClick={handleEidRead} 
                  disabled={isProcessing || createLinkMutation.isPending}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Lecture de la carte...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Lire ma carte eID
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Votre numéro INAMI/NIHII</Label>
                <Input
                  value={manualNihii}
                  onChange={(e) => setManualNihii(e.target.value)}
                  placeholder="X-XXXXX-XX-XXX"
                  className="font-mono"
                />
              </div>
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  En confirmant, vous attestez être le médecin traitant de ce patient.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleManualCreate} 
                disabled={createLinkMutation.isPending}
                className="w-full"
              >
                {createLinkMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirmer le lien thérapeutique
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