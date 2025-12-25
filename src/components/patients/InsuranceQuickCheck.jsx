import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export default function InsuranceQuickCheck({ patient }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="font-medium">Assurabilité</span>
          <Badge variant="outline">À vérifier</Badge>
        </div>
        {patient?.mutuelle && (
          <p className="text-sm text-slate-600 mt-2">Mutuelle: {patient.mutuelle}</p>
        )}
      </CardContent>
    </Card>
  );
}