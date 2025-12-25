import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function GDPRRegistry() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Registre RGPD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Page du registre RGPD - En cours de développement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}