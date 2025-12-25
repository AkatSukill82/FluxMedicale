import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

export default function GDPRStatusBadge({ patient, onClick }) {
  const consent = patient?.gdpr_consent;
  
  if (!consent || !consent.has_consented) {
    return (
      <Badge 
        variant="outline" 
        className="border-yellow-500 text-yellow-700 cursor-pointer hover:bg-yellow-50"
        onClick={onClick}
      >
        <ShieldAlert className="w-3 h-3 mr-1" />
        Consentement requis
      </Badge>
    );
  }

  if (consent.revoked) {
    return (
      <Badge 
        variant="outline" 
        className="border-red-500 text-red-700"
        onClick={onClick}
      >
        <ShieldX className="w-3 h-3 mr-1" />
        Consentement révoqué
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className="border-green-500 text-green-700 cursor-pointer hover:bg-green-50"
      onClick={onClick}
    >
      <ShieldCheck className="w-3 h-3 mr-1" />
      RGPD OK
    </Badge>
  );
}