import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SecurePatientAccess({ 
  patient, 
  action = 'VIEW',
  resourceType,
  resourceId,
  children,
  requireJustification = false,
  onAccessGranted,
  onAccessDenied
}) {
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [justification, setJustification] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    verifyAccessAndConsent();
  }, [patient?.id]);

  const verifyAccessAndConsent = async () => {
    if (!patient?.id) {
      setIsVerifying(false);
      return;
    }

    try {
      // Vérifier le consentement RGPD
      const consent = patient.gdpr_consent;
      if (!consent?.has_consented || consent?.revoked) {
        setHasConsent(false);
        setIsVerifying(false);
        if (onAccessDenied) onAccessDenied('NO_CONSENT');
        return;
      }

      setHasConsent(true);

      // Pour les actions sensibles, demander justification
      if (requireJustification || ['EXPORT', 'PRINT', 'DELETE'].includes(action)) {
        setShowJustificationDialog(true);
        setIsVerifying(false);
      } else {
        // Logger l'accès automatiquement
        await logAccess();
        setAccessGranted(true);
        setIsVerifying(false);
        if (onAccessGranted) onAccessGranted();
      }
    } catch (error) {
      console.error('Error verifying access:', error);
      setIsVerifying(false);
      if (onAccessDenied) onAccessDenied('ERROR');
    }
  };

  const logAccess = async (justificationText = '') => {
    try {
      const user = await base44.auth.me();
      
      await base44.entities.DataAccessLog.create({
        user_email: user.email,
        patient_id: patient.id,
        action: action,
        resource_type: resourceType || 'Patient',
        resource_id: resourceId || patient.id,
        timestamp: new Date().toISOString(),
        justification: justificationText,
        ip_address: 'N/A', // Sera rempli côté serveur idéalement
        user_agent: navigator.userAgent,
        session_id: `session-${Date.now()}`
      });

      // Mettre à jour le dernier accès sur le patient
      await base44.entities.Patient.update(patient.id, {
        last_accessed_at: new Date().toISOString(),
        last_accessed_by: user.email
      });
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  const handleJustificationSubmit = async () => {
    if (justification.trim().length < 10) {
      toast.error('La justification doit contenir au moins 10 caractères');
      return;
    }

    await logAccess(justification);
    setShowJustificationDialog(false);
    setAccessGranted(true);
    if (onAccessGranted) onAccessGranted();
    toast.success('Accès autorisé et enregistré');
  };

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-slate-600">Vérification des accès sécurisés...</p>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="p-6">
        <Alert className="border-red-500 bg-red-50">
          <Lock className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <h3 className="font-bold mb-2">Accès Refusé - Consentement RGPD Requis</h3>
            <p>Le patient n'a pas donné son consentement pour le traitement de ses données ou l'a révoqué.</p>
            <p className="mt-2 text-sm">
              Vous devez obtenir un consentement RGPD valide avant d'accéder aux données médicales.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!accessGranted) {
    return null;
  }

  return (
    <>
      {children}

      <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-600" />
              Justification d'Accès Requise
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-amber-500 bg-amber-50">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <p className="font-semibold">Accès aux données sensibles</p>
                <p className="text-sm mt-1">
                  Conformément au RGPD, veuillez justifier cet accès. Cette action sera tracée.
                </p>
              </AlertDescription>
            </Alert>

            <div>
              <Label className="font-semibold mb-2 block">
                Raison médicale de l'accès au dossier:
              </Label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Ex: Consultation pour suivi post-opératoire, Urgence médicale, etc."
                className="h-24"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 10 caractères requis
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowJustificationDialog(false);
              if (onAccessDenied) onAccessDenied('CANCELLED');
            }}>
              Annuler
            </Button>
            <Button onClick={handleJustificationSubmit}>
              Confirmer l'Accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}