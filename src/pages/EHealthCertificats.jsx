import React from 'react';
import { Shield } from 'lucide-react';
import EHealthCertificateManager from '@/components/ehealth/EHealthCertificateManager';

export default function EHealthCertificats() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Certificats eHealth
        </h1>
        <p className="text-muted-foreground">
          Gérez vos certificats eHealth pour accéder aux services sécurisés belges
        </p>
      </div>
      
      <EHealthCertificateManager />
    </div>
  );
}