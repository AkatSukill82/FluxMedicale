import React from 'react';
import { Network } from 'lucide-react';
import MyCareNetManager from '@/components/mycarenet/MyCareNetManager';

export default function MyCareNet() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6" />
          MyCareNet
        </h1>
        <p className="text-muted-foreground">
          Intégration avec les services de facturation et d'assurabilité belges
        </p>
      </div>
      
      <MyCareNetManager />
    </div>
  );
}