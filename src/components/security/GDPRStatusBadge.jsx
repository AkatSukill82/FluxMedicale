import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GDPRStatusBadge({ patient, onClick }) {
  const consent = patient?.gdpr_consent;
  
  if (!consent || !consent.has_consented) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClick}
              className="h-6 px-2 text-orange-600 hover:bg-orange-50"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span className="text-xs">RGPD</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Consentement RGPD non enregistré</p>
            <p className="text-xs text-slate-400">Cliquez pour enregistrer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (consent.revoked) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClick}
              className="h-6 px-2 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-3 h-3 mr-1" />
              <span className="text-xs">RGPD révoqué</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Consentement révoqué le {format(new Date(consent.revoked_date), 'dd/MM/yyyy', { locale: fr })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClick}
            className="h-6 px-2 text-green-600 hover:bg-green-50"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            <span className="text-xs">RGPD ✓</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Consentement actif (v{consent.consent_version})</p>
          <p className="text-xs text-slate-400">
            {format(new Date(consent.consent_date), 'dd/MM/yyyy', { locale: fr })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}