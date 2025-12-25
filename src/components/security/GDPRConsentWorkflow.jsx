import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function GDPRConsentWorkflow({ patient, onConsentGiven }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Consentement RGPD
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">
          Workflow de consentement RGPD - En cours de développement.
        </p>
        <Button onClick={onConsentGiven}>Confirmer le consentement</Button>
      </CardContent>
    </Card>
  );
}