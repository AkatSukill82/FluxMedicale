import React from 'react';
import { BarChart3 } from 'lucide-react';
import CabinetStats from '../components/dashboard/CabinetStats';

export default function Statistics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Statistiques Cabinet
        </h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre activité et indicateurs clés
        </p>
      </div>

      <CabinetStats />
    </div>
  );
}