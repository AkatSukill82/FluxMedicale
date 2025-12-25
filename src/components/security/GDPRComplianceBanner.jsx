import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  FileCheck,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import GDPRConsentWorkflow from '../gdpr/GDPRConsentWorkflow';

export default function GDPRComplianceBanner({ patient, onConsentUpdated }) {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  
  const consent = patient?.gdpr_consent;
  
  // Déterminer le statut RGPD
  const getGDPRStatus = () => {
    if (!consent || !consent.has_consented) {
      return {
        status: 'missing',
        icon: ShieldX,
        color: 'bg-red-50 border-red-200 text-red-800',
        iconColor: 'text-red-600',
        label: 'Consentement requis',
        description: 'Le patient doit donner son consentement RGPD avant tout traitement de données.'
      };
    }
    
    if (consent.revoked) {
      return {
        status: 'revoked',
        icon: ShieldAlert,
        color: 'bg-orange-50 border-orange-200 text-orange-800',
        iconColor: 'text-orange-600',
        label: 'Consentement révoqué',
        description: 'Le patient a révoqué son consentement. Accès limité aux données.'
      };
    }
    
    // Vérifier si le consentement date de plus d'un an (recommandation de renouvellement)
    const consentDate = new Date(consent.consent_date);
    const daysSinceConsent = differenceInDays(new Date(), consentDate);
    
    if (daysSinceConsent > 365) {
      return {
        status: 'expired',
        icon: Clock,
        color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        iconColor: 'text-yellow-600',
        label: 'Renouvellement conseillé',
        description: `Consentement donné il y a ${Math.floor(daysSinceConsent / 30)} mois. Un renouvellement est recommandé.`
      };
    }
    
    return {
      status: 'valid',
      icon: ShieldCheck,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-600',
      label: 'Conforme RGPD',
      description: `Consentement valide depuis le ${format(consentDate, 'd MMMM yyyy', { locale: fr })}`
    };
  };
  
  const gdprStatus = getGDPRStatus();
  const StatusIcon = gdprStatus.icon;
  
  // Mode compact pour la barre latérale
  if (gdprStatus.status === 'valid') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <StatusIcon className={`w-4 h-4 ${gdprStatus.iconColor}`} />
        <span className="text-green-700 font-medium">RGPD OK</span>
        <Badge variant="outline" className="text-xs bg-green-50">
          v{consent.consent_version}
        </Badge>
      </div>
    );
  }
  
  return (
    <>
      <Alert className={`${gdprStatus.color} border`}>
        <StatusIcon className={`w-5 h-5 ${gdprStatus.iconColor}`} />
        <AlertDescription>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{gdprStatus.label}</p>
              <p className="text-sm mt-1">{gdprStatus.description}</p>
              
              {consent && !consent.revoked && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {consent.data_processing_consent && (
                    <Badge variant="outline" className="text-xs bg-white">
                      <FileCheck className="w-3 h-3 mr-1" />
                      Traitement données
                    </Badge>
                  )}
                  {consent.data_sharing_consent && (
                    <Badge variant="outline" className="text-xs bg-white">
                      <FileCheck className="w-3 h-3 mr-1" />
                      Partage autorisé
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <Button 
              size="sm" 
              variant={gdprStatus.status === 'missing' ? 'default' : 'outline'}
              onClick={() => setShowConsentDialog(true)}
            >
              {gdprStatus.status === 'missing' ? 'Obtenir' : 'Mettre à jour'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      <GDPRConsentWorkflow
        patient={patient}
        isOpen={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onConsented={() => {
          setShowConsentDialog(false);
          onConsentUpdated?.();
        }}
      />
    </>
  );
}