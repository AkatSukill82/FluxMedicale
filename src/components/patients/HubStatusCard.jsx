import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database,
  Link2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TherapeuticLinkModal from '../ehealth/TherapeuticLinkModal';
import ConsentModal from '../ehealth/ConsentModal';

export default function HubStatusCard({ patient: initialPatient }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hubAccessAttempted, setHubAccessAttempted] = useState(false);

  // Récupérer les données du patient en temps réel
  const { data: patient, refetch } = useQuery({
    queryKey: ['patientHubStatus', initialPatient?.id],
    queryFn: async () => {
      const patients = await base44.entities.Patient.list();
      return patients.find(p => p.id === initialPatient?.id) || initialPatient;
    },
    initialData: initialPatient,
    enabled: !!initialPatient?.id,
    refetchOnWindowFocus: false
  });

  // Vérifier le lien thérapeutique
  const therapeuticLink = patient?.therapeutic_link;
  const hasValidLink = therapeuticLink?.active && 
    therapeuticLink?.expires_at && 
    isAfter(new Date(therapeuticLink.expires_at), new Date());

  // Vérifier le consentement
  const consent = patient?.gdpr_consent;
  const hasValidConsent = consent?.has_consented && 
    !consent?.revoked &&
    consent?.expires_at && 
    isAfter(new Date(consent.expires_at), new Date());

  // Les deux sont requis pour accéder au HUB
  const canAccessHub = hasValidLink && hasValidConsent;

  // Gérer le clic sur "Accéder au HUB"
  const handleHubAccess = () => {
    if (!hasValidLink) {
      setShowLinkModal(true);
      setHubAccessAttempted(true);
      return;
    }
    if (!hasValidConsent) {
      setShowConsentModal(true);
      setHubAccessAttempted(true);
      return;
    }
    // Naviguer vers l'onglet HUB
    navigate(createPageUrl(`Patients?patient=${patient.id}&tab=hubs`));
  };

  // Callback après création du lien
  const handleLinkSuccess = async () => {
    // Rafraîchir les données immédiatement
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['patient', patient?.id] });
    if (hubAccessAttempted) {
      setTimeout(() => setShowConsentModal(true), 300);
    }
  };

  // Callback après création du consentement
  const handleConsentSuccess = async () => {
    // Rafraîchir les données immédiatement
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['patient', patient?.id] });
    setHubAccessAttempted(false);
  };

  const formatExpiryDate = (dateStr) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr });
  };

  return (
    <>
      <Card className={`border-l-4 ${canAccessHub ? 'border-l-green-500' : 'border-l-orange-500'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Accès HUB Santé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Boutons de statut */}
          <div className="flex flex-wrap gap-2">
            {/* Bouton Lien Thérapeutique */}
            <Button
              size="sm"
              variant={hasValidLink ? "outline" : "destructive"}
              className={hasValidLink ? "border-green-500 text-green-700 hover:bg-green-50 h-8" : "h-8"}
              onClick={() => !hasValidLink && setShowLinkModal(true)}
            >
              {hasValidLink ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                  <span className="text-green-700 text-xs">Lien thérapeutique</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3 h-3 mr-1" />
                  <span className="text-xs">Lien thérapeutique</span>
                </>
              )}
            </Button>

            {/* Bouton Consentement */}
            <Button
              size="sm"
              variant={hasValidConsent ? "outline" : "destructive"}
              className={hasValidConsent ? "border-green-500 text-green-700 hover:bg-green-50 h-8" : "h-8"}
              onClick={() => !hasValidConsent && setShowConsentModal(true)}
            >
              {hasValidConsent ? (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1 text-green-600" />
                  <span className="text-green-700 text-xs">Consentement</span>
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  <span className="text-xs">Consentement</span>
                </>
              )}
            </Button>
          </div>

          {/* Détails des validités */}
          {(hasValidLink || hasValidConsent) && (
            <div className="space-y-1 text-xs">
              {hasValidLink && therapeuticLink?.expires_at && (
                <div className="flex items-center gap-1 text-green-700">
                  <Calendar className="w-3 h-3" />
                  Lien jusqu'au {formatExpiryDate(therapeuticLink.expires_at)}
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-300">
                    {therapeuticLink.method === 'eid' ? 'eID' : 'manuel'}
                  </Badge>
                </div>
              )}
              {hasValidConsent && consent?.expires_at && (
                <div className="flex items-center gap-1 text-green-700">
                  <Calendar className="w-3 h-3" />
                  Consentement jusqu'au {formatExpiryDate(consent.expires_at)}
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-300">
                    {consent.method === 'eid' ? 'eID' : 'manuel'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Bouton d'accès au HUB */}
          <Button
            size="sm"
            onClick={handleHubAccess}
            className={`w-full ${canAccessHub ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400'}`}
          >
            <Database className="w-4 h-4 mr-2" />
            {canAccessHub ? 'Accéder au HUB' : 'Configurer l\'accès HUB'}
            {canAccessHub && <ExternalLink className="w-3 h-3 ml-2" />}
          </Button>

          {/* Message si accès non autorisé */}
          {!canAccessHub && (
            <p className="text-xs text-muted-foreground text-center">
              {!hasValidLink && !hasValidConsent ? (
                "Lien thérapeutique et consentement requis"
              ) : !hasValidLink ? (
                "Lien thérapeutique requis"
              ) : (
                "Consentement patient requis"
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TherapeuticLinkModal
        patient={patient}
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSuccess={handleLinkSuccess}
      />

      <ConsentModal
        patient={patient}
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onSuccess={handleConsentSuccess}
      />
    </>
  );
}