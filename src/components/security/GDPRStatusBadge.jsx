import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function GDPRStatusBadge({ patient }) {
  const consent = patient?.gdpr_consent;
  
  if (!consent || !consent.has_consented) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="w-3 h-3" />
        RGPD non consenti
      </Badge>
    );
  }
  
  if (consent.revoked) {
    return (
      <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800">
        <Shield className="w-3 h-3" />
        Consentement révoqué
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
      <ShieldCheck className="w-3 h-3" />
      RGPD OK
    </Badge>
  );
}