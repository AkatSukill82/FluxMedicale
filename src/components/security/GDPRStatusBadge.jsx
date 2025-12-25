import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function GDPRStatusBadge({ patient }) {
  const hasConsent = patient?.gdpr_consent?.has_consented;
  const isRevoked = patient?.gdpr_consent?.revoked;

  if (isRevoked) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="w-3 h-3" />
        Consentement révoqué
      </Badge>
    );
  }

  if (hasConsent) {
    return (
      <Badge className="bg-green-100 text-green-800 gap-1">
        <ShieldCheck className="w-3 h-3" />
        RGPD OK
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Shield className="w-3 h-3" />
      Consentement requis
    </Badge>
  );
}