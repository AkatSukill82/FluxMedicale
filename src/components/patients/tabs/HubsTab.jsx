import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert,
  Link2,
  Shield,
  Database,
  Calendar,
  FileText
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { format, isAfter } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import HubAccessPanel from '../../hub/HubAccessPanel';
import ConsultRNPanel from '../../ehealth/ConsultRNPanel';
import MyCareNetDataPanel from '../../ehealth/MyCareNetDataPanel';
import EHealthDocumentSender from '../../ehealth/EHealthDocumentSender';
import TherapeuticLinkModal from '../../ehealth/TherapeuticLinkModal';
import ConsentModal from '../../ehealth/ConsentModal';
import VIDISPanel from '../../vidis/VIDISPanel';
import MediPrimaCheck from '../../mediprima/MediPrimaCheck';
import VaccinationsPanel from '../../vaccinations/VaccinationsPanel';

export default function HubsTab({ patient, onOpenSumehr }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hubAccessAttempted, setHubAccessAttempted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    import('@/api/base44Client').then(({ base44 }) => {
      base44.auth.me().then(setCurrentUser);
    });
  }, []);
  
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
    // Accès autorisé - scroll vers le panneau HUB
    document.getElementById('hub-access-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Callback après création du lien - ouvrir le modal consentement si nécessaire
  const handleLinkSuccess = () => {
    if (hubAccessAttempted && !hasValidConsent) {
      setTimeout(() => setShowConsentModal(true), 300);
    }
  };

  const formatExpiryDate = (dateStr) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: dateLocale });
  };

  return (
    <div className="space-y-6">
      {/* Statut Lien Thérapeutique et Consentement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            {t('hub.accessTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('hub.accessDescription')}
          </p>

          {/* Boutons de statut */}
          <div className="flex flex-wrap gap-3">
            {/* Bouton Lien Thérapeutique */}
            <Button
              variant={hasValidLink ? "outline" : "destructive"}
              className={hasValidLink ? "border-green-500 text-green-700 hover:bg-green-50" : ""}
              onClick={() => !hasValidLink && setShowLinkModal(true)}
            >
              {hasValidLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  <span className="text-green-700">{t('hub.therapeuticLink')}</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  {t('hub.therapeuticLink')}
                </>
              )}
            </Button>

            {/* Bouton Consentement */}
            <Button
              variant={hasValidConsent ? "outline" : "destructive"}
              className={hasValidConsent ? "border-green-500 text-green-700 hover:bg-green-50" : ""}
              onClick={() => !hasValidConsent && setShowConsentModal(true)}
            >
              {hasValidConsent ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />
                  <span className="text-green-700">{t('hub.consent')}</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  {t('hub.consent')}
                </>
              )}
            </Button>

            {/* Bouton Accéder au HUB */}
            <Button
              onClick={handleHubAccess}
              className={canAccessHub ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-400"}
            >
              <Database className="w-4 h-4 mr-2" />
              {t('hub.accessHub')}
            </Button>

            {/* Bouton Sumehr */}
            <Button
              onClick={onOpenSumehr}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('hub.editSumehr')}
            </Button>
          </div>

          {/* Détails des validités */}
          {(hasValidLink || hasValidConsent) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {hasValidLink && therapeuticLink?.expires_at && (
                <div className="flex items-center gap-2 text-green-700">
                  <Calendar className="w-4 h-4" />
                  {t('hub.linkValidUntil')} {formatExpiryDate(therapeuticLink.expires_at)}
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    {therapeuticLink.method === 'eid' ? t('hub.viaEid') : t('hub.manual')}
                  </Badge>
                </div>
              )}
              {hasValidConsent && consent?.expires_at && (
                <div className="flex items-center gap-2 text-green-700">
                  <Calendar className="w-4 h-4" />
                  {t('hub.consentValidUntil')} {formatExpiryDate(consent.expires_at)}
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    {consent.method === 'eid' ? t('hub.viaEid') : t('hub.manual')}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Message si accès non autorisé */}
          {!canAccessHub && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                {!hasValidLink && !hasValidConsent ? (
                  t('hub.linkAndConsentRequired')
                ) : !hasValidLink ? (
                  t('hub.linkRequired')
                ) : (
                  t('hub.consentRequired')
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Message si accès autorisé */}
          {canAccessHub && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900 text-sm">
                {t('hub.accessGranted')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Consultation Registre National */}
      <ConsultRNPanel patient={patient} />

      {/* Données MyCareNet */}
      <MyCareNetDataPanel patient={patient} />

      {/* Envoi sécurisé eHealthBox */}
      <EHealthDocumentSender patient={patient} />

      {/* Panneau d'accès HUB (visible uniquement si autorisé) */}
      {canAccessHub && (
        <div id="hub-access-panel">
          <HubAccessPanel patient={patient} />
        </div>
      )}

      {/* VIDIS - Schéma de Médication Partagé (Vitalink) */}
      <VIDISPanel patient={patient} currentUser={currentUser} />

      {/* Vaccinet - Vaccinations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💉 {t('hub.vaccinetTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VaccinationsPanel patient={patient} showVaccinetSync={true} />
        </CardContent>
      </Card>

      {/* MediPrima - CPAS */}
      <MediPrimaCheck patient={patient} currentUser={currentUser} />

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
        onSuccess={() => setHubAccessAttempted(false)}
      />
    </div>
  );
}