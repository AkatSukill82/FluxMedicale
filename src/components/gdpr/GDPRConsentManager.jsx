import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  History
} from 'lucide-react';
import { format, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const CONSENT_VERSION = '2.1';

const CONSENT_TYPES = [
  {
    id: 'data_processing',
    label: 'Traitement des données médicales',
    description: 'Autorisation de collecter et traiter vos données médicales dans le cadre de votre prise en charge.',
    required: true
  },
  {
    id: 'data_sharing',
    label: 'Partage avec professionnels de santé',
    description: 'Autorisation de partager vos données avec les autres professionnels de santé impliqués dans votre suivi.',
    required: false
  },
  {
    id: 'hub_access',
    label: 'Accès aux réseaux de santé (RSW, Vitalink, CoZo)',
    description: 'Autorisation d\'accéder à vos données via les réseaux de santé belges.',
    required: false
  },
  {
    id: 'research',
    label: 'Utilisation pour la recherche médicale',
    description: 'Autorisation d\'utiliser vos données anonymisées à des fins de recherche médicale.',
    required: false
  },
  {
    id: 'communication',
    label: 'Communications électroniques',
    description: 'Autorisation de vous contacter par email ou SMS pour des rappels et informations médicales.',
    required: false
  }
];

export default function GDPRConsentManager({ patient, onUpdate }) {
  const queryClient = useQueryClient();
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [consents, setConsents] = useState({
    data_processing: patient?.gdpr_consent?.data_processing_consent || false,
    data_sharing: patient?.gdpr_consent?.data_sharing_consent || false,
    hub_access: patient?.gdpr_consent?.hub_access_consent || false,
    research: patient?.gdpr_consent?.research_consent || false,
    communication: patient?.gdpr_consent?.communication_consent || false
  });

  const gdprConsent = patient?.gdpr_consent || {};
  const hasConsent = gdprConsent.has_consented && !gdprConsent.revoked;
  const isExpired = gdprConsent.expires_at && new Date(gdprConsent.expires_at) < new Date();
  const isRevoked = gdprConsent.revoked;

  // Sauvegarder le consentement
  const saveConsentMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const expiryDate = addYears(new Date(), 3);

      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: CONSENT_VERSION,
          expires_at: expiryDate.toISOString(),
          data_processing_consent: consents.data_processing,
          data_sharing_consent: consents.data_sharing,
          hub_access_consent: consents.hub_access,
          research_consent: consents.research,
          communication_consent: consents.communication,
          revoked: false,
          revoked_date: null,
          revoke_reason: null,
          recorded_by: currentUser.email,
          method: 'manual'
        }
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'UPDATE_GDPR_CONSENT',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Consentement RGPD enregistré (v${CONSENT_VERSION})`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Consentement enregistré');
      onUpdate?.();
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  // Révoquer le consentement
  const revokeConsentMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();

      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          ...patient.gdpr_consent,
          revoked: true,
          revoked_date: new Date().toISOString(),
          revoke_reason: revokeReason,
          revoked_by: currentUser.email
        }
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'REVOKE_GDPR_CONSENT',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Consentement RGPD révoqué. Motif: ${revokeReason || 'Non spécifié'}`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Consentement révoqué');
      setShowRevokeDialog(false);
      setRevokeReason('');
      onUpdate?.();
    },
    onError: () => {
      toast.error('Erreur lors de la révocation');
    }
  });

  const canSave = consents.data_processing; // Le traitement des données est requis

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Consentement RGPD
          </CardTitle>
          <GDPRStatusBadge 
            hasConsent={hasConsent} 
            isExpired={isExpired} 
            isRevoked={isRevoked} 
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut actuel */}
        {hasConsent && !isExpired && (
          <Alert className="bg-green-50 border-green-200">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Consentement actif</strong> (version {gdprConsent.consent_version})
              <br />
              <span className="text-sm">
                Enregistré le {format(new Date(gdprConsent.consent_date), 'dd MMMM yyyy', { locale: fr })}
                {gdprConsent.expires_at && (
                  <> • Expire le {format(new Date(gdprConsent.expires_at), 'dd MMMM yyyy', { locale: fr })}</>
                )}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isExpired && !isRevoked && (
          <Alert className="bg-orange-50 border-orange-200">
            <ShieldAlert className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Consentement expiré</strong>
              <br />
              <span className="text-sm">
                Le consentement a expiré le {format(new Date(gdprConsent.expires_at), 'dd MMMM yyyy', { locale: fr })}.
                Veuillez le renouveler.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isRevoked && (
          <Alert className="bg-red-50 border-red-200">
            <ShieldX className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Consentement révoqué</strong>
              <br />
              <span className="text-sm">
                Révoqué le {format(new Date(gdprConsent.revoked_date), 'dd MMMM yyyy', { locale: fr })}
                {gdprConsent.revoke_reason && <> • Motif: {gdprConsent.revoke_reason}</>}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {!hasConsent && !isRevoked && !isExpired && (
          <Alert className="bg-slate-50 border-slate-200">
            <AlertTriangle className="w-4 h-4 text-slate-600" />
            <AlertDescription className="text-slate-700">
              <strong>Aucun consentement enregistré</strong>
              <br />
              <span className="text-sm">
                Veuillez recueillir le consentement du patient.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Options de consentement */}
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-muted-foreground">
            Options de consentement :
          </p>
          
          {CONSENT_TYPES.map(type => (
            <div key={type.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
              <Checkbox
                id={type.id}
                checked={consents[type.id]}
                onCheckedChange={(checked) => setConsents({ ...consents, [type.id]: checked })}
                disabled={isRevoked}
              />
              <div className="flex-1">
                <Label htmlFor={type.id} className="cursor-pointer font-medium">
                  {type.label}
                  {type.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
              </div>
              {hasConsent && gdprConsent[`${type.id}_consent`] && (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>

        {/* Version */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <FileText className="w-3 h-3" />
          Version du formulaire : {CONSENT_VERSION}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => saveConsentMutation.mutate()}
            disabled={!canSave || saveConsentMutation.isPending || isRevoked}
            className="flex-1"
          >
            {saveConsentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            {hasConsent ? 'Mettre à jour' : 'Enregistrer le consentement'}
          </Button>

          {hasConsent && !isRevoked && (
            <Button
              variant="outline"
              onClick={() => setShowRevokeDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Révoquer
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistoryDialog(true)}
            title="Historique"
          >
            <History className="w-4 h-4" />
          </Button>
        </div>

        {/* Dialog révocation */}
        <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <ShieldX className="w-5 h-5" />
                Révoquer le consentement
              </DialogTitle>
              <DialogDescription>
                Cette action révoquera tous les consentements du patient. Les données existantes seront conservées mais ne pourront plus être partagées.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Label>Motif de la révocation (optionnel)</Label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ex: Demande du patient..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => revokeConsentMutation.mutate()}
                disabled={revokeConsentMutation.isPending}
              >
                {revokeConsentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmer la révocation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog historique */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique du consentement
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {gdprConsent.consent_date && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Consentement enregistré</p>
                    <p className="text-sm text-green-700">
                      {format(new Date(gdprConsent.consent_date), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    <p className="text-xs text-green-600">
                      Version {gdprConsent.consent_version} • Méthode: {gdprConsent.method || 'manuel'}
                    </p>
                  </div>
                </div>
              )}

              {gdprConsent.revoked && gdprConsent.revoked_date && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Consentement révoqué</p>
                    <p className="text-sm text-red-700">
                      {format(new Date(gdprConsent.revoked_date), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    {gdprConsent.revoke_reason && (
                      <p className="text-xs text-red-600">Motif: {gdprConsent.revoke_reason}</p>
                    )}
                  </div>
                </div>
              )}

              {!gdprConsent.consent_date && (
                <p className="text-center text-muted-foreground py-4">
                  Aucun historique disponible
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Composant badge de statut exporté pour utilisation ailleurs
export function GDPRStatusBadge({ hasConsent, isExpired, isRevoked, size = 'default' }) {
  if (isRevoked) {
    return (
      <Badge className="bg-red-100 text-red-800 gap-1">
        <ShieldX className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {size !== 'sm' && 'Révoqué'}
      </Badge>
    );
  }
  
  if (isExpired) {
    return (
      <Badge className="bg-orange-100 text-orange-800 gap-1">
        <ShieldAlert className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {size !== 'sm' && 'Expiré'}
      </Badge>
    );
  }
  
  if (hasConsent) {
    return (
      <Badge className="bg-green-100 text-green-800 gap-1">
        <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {size !== 'sm' && 'Actif'}
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-slate-100 text-slate-800 gap-1">
      <Shield className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {size !== 'sm' && 'Non consenti'}
    </Badge>
  );
}