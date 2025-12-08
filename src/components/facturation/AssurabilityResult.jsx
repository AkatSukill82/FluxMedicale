import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, ShieldOff, ArrowRight } from 'lucide-react';

export default function AssurabilityResult({ result, isLoading, onContinue }) {
  if (isLoading) {
    return (
      <div className="text-center p-8">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600">Vérification de l'assurabilité auprès de MyCareNet...</p>
      </div>
    );
  }

  if (!result) {
    return <div className="text-center text-red-600 p-8">Erreur lors de la vérification.</div>;
  }

  const billingType = result.tiers_payant_allowed ? 'EFACT (Tiers Payant)' : 'EATTEST (Paiement Comptant)';
  const badgeColor = result.tiers_payant_allowed ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

  return (
    <div className="text-center max-w-lg mx-auto">
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            {result.is_insured ? (
              <ShieldCheck className="w-16 h-16 text-green-600" />
            ) : (
              <ShieldOff className="w-16 h-16 text-red-600" />
            )}
            <h3 className="text-xl font-semibold">
              {result.is_insured ? "Patient Assuré" : "Patient Non Assuré"}
            </h3>
            {result.is_insured && (
              <>
                <p>Code mutuelle: <span className="font-mono">{result.mutuelle_code}</span></p>
                <p>Le flux de facturation sera automatiquement routé vers :</p>
                <Badge className={`text-lg px-4 py-2 ${badgeColor}`}>
                  {billingType}
                </Badge>
                {result.tiers_payant_obligatoire && <p className="text-sm text-orange-600 font-medium">Tiers payant obligatoire pour ce patient.</p>}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <Button onClick={onContinue} disabled={!result.is_insured} className="mt-6">
        Continuer vers la saisie des prestations
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}