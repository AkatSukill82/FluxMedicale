import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FlaskConical, CheckCircle2 } from 'lucide-react';
import { getIntegration, STATUS } from '@/lib/integrationStatus';

/**
 * Signale l'état réel d'une intégration externe sur l'écran qui la déclenche.
 *
 * À placer sur toute surface qui annonce un échange avec un service externe
 * (« envoyé », « transmis », « vérifié »). Sans ce marquage, rien ne distingue
 * à l'écran une transmission réelle d'une simulation — et sur une ordonnance
 * ou un certificat, la confusion a des conséquences.
 *
 * L'état vient de src/lib/integrationStatus.js : c'est là qu'on le change,
 * une fois le connecteur réellement câblé.
 */
export default function IntegrationStatusBanner({ service, compact = false }) {
  const integration = getIntegration(service);

  // Intégration inconnue ou réelle : rien à signaler.
  if (!integration || integration.status === STATUS.LIVE) return null;

  const simulated = integration.status === STATUS.SIMULATED;

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={simulated
          ? 'border-orange-300 bg-orange-50 text-orange-800'
          : 'border-amber-300 bg-amber-50 text-amber-800'}
      >
        <FlaskConical className="w-3 h-3 mr-1" />
        {simulated ? 'Simulation' : 'Repli possible'}
      </Badge>
    );
  }

  return (
    <Alert
      className={simulated
        ? 'border-orange-300 bg-orange-50'
        : 'border-amber-300 bg-amber-50'}
    >
      {simulated
        ? <AlertTriangle className="w-4 h-4 text-orange-600" />
        : <CheckCircle2 className="w-4 h-4 text-amber-600" />}
      <AlertDescription className={simulated ? 'text-orange-900' : 'text-amber-900'}>
        <strong>
          {integration.label} — {simulated ? 'non connecté' : 'connecté avec repli'}
        </strong>
        <span className="block mt-1">{integration.impact}</span>
      </AlertDescription>
    </Alert>
  );
}
