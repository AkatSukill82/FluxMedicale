import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function MultEMediAttService({ patient, onAttestationSent }) {
  const [isLoading, setIsLoading] = useState(false);

  const sendAttestation = async () => {
    setIsLoading(true);
    try {
      // Simulation d'envoi d'attestation via MediAtt
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Attestation envoyée via MultEMediAtt');
      onAttestationSent?.();
    } catch (error) {
      console.error('Erreur envoi MultEMediAtt:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-blue-600" />
          MultEMediAtt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Service d'envoi d'attestations médicales électroniques via la plateforme MultEMediAtt.
        </p>

        <Button onClick={sendAttestation} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer une attestation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}