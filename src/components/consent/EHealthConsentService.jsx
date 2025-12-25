import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EHealthConsentService({ patient, onConsentUpdated }) {
  const [isLoading, setIsLoading] = useState(false);
  const [consentStatus, setConsentStatus] = useState(null);

  const checkConsent = async () => {
    setIsLoading(true);
    try {
      // Simulation de vérification du consentement eHealth
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConsentStatus({
        hasConsent: true,
        lastChecked: new Date().toISOString()
      });
      toast.success('Statut du consentement vérifié');
    } catch (error) {
      console.error('Erreur vérification consentement:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-blue-600" />
          Consentement eHealth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vérifiez le consentement du patient pour l'accès aux données via la plateforme eHealth.
        </p>

        {consentStatus && (
          <div className="flex items-center gap-2">
            {consentStatus.hasConsent ? (
              <Badge className="bg-green-100 text-green-800 gap-1">
                <CheckCircle className="w-3 h-3" />
                Consentement actif
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" />
                Pas de consentement
              </Badge>
            )}
          </div>
        )}

        <Button onClick={checkConsent} disabled={isLoading} variant="outline">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Vérification...
            </>
          ) : (
            'Vérifier le consentement'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}