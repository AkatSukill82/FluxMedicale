import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function GDPRRegistry() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Registre RGPD
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Module en cours de développement.
        </p>
      </CardContent>
    </Card>
  );
}