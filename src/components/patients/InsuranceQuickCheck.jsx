import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function InsuranceQuickCheck({ patient, assurabilite }) {
  const isInsured = assurabilite?.oa_code || patient?.mutuelle;
  
  return (
    <Card className={isInsured ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {isInsured ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {isInsured ? 'Patient assuré' : 'Statut assurance inconnu'}
            </p>
            {assurabilite?.oa_name && (
              <p className="text-sm text-muted-foreground">{assurabilite.oa_name}</p>
            )}
          </div>
          {assurabilite?.special_rights?.length > 0 && (
            <Badge className="bg-purple-100 text-purple-800">
              BIM/OMNIO
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}