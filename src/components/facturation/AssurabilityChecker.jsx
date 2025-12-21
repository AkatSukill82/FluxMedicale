import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AssurabilityChecker({ 
  patient, 
  selectedCodes, 
  customPrices,
  onPriceCorrection 
}) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);

    try {
      // Simuler une vérification (en production, appeler MyCareNet)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mutuelle = patient?.mutuelle || 'Non renseignée';
      const isConventioned = mutuelle !== 'Non conventionné';
      
      const errors = [];
      const corrections = [];
      let totalCorrection = 0;

      selectedCodes.forEach(code => {
        const customPrice = customPrices[code.id];
        const expectedHonorarium = code.honorarium;
        const expectedReimbursed = isConventioned ? code.reimbursed : Math.floor(code.reimbursed * 0.75);
        const expectedPatientShare = expectedHonorarium - expectedReimbursed;

        // Vérifier si le prix personnalisé diffère
        if (customPrice && customPrice.honorarium !== expectedHonorarium) {
          errors.push({
            code: code.code,
            title: code.title_fr,
            error: `Prix incorrect: ${(customPrice.honorarium / 100).toFixed(2)}€ au lieu de ${(expectedHonorarium / 100).toFixed(2)}€`,
            currentPrice: customPrice.honorarium,
            expectedPrice: expectedHonorarium,
            currentReimbursed: customPrice.reimbursed || 0,
            expectedReimbursed: expectedReimbursed,
            currentPatientShare: customPrice.patient_share || 0,
            expectedPatientShare: expectedPatientShare
          });

          corrections.push({
            codeId: code.id,
            honorarium: expectedHonorarium,
            reimbursed: expectedReimbursed,
            patient_share: expectedPatientShare
          });

          totalCorrection += Math.abs(customPrice.honorarium - expectedHonorarium);
        }
      });

      if (errors.length > 0) {
        setResult({
          success: false,
          mutuelle,
          isConventioned,
          errors,
          corrections,
          totalCorrection
        });
        toast.warning(`${errors.length} erreur(s) de prix détectée(s)`);
      } else {
        setResult({
          success: true,
          mutuelle,
          isConventioned,
          message: 'Tous les prix sont conformes aux tarifs INAMI'
        });
        toast.success('Vérification réussie - Prix conformes');
      }
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  const handleApplyCorrections = () => {
    if (result?.corrections) {
      result.corrections.forEach(correction => {
        onPriceCorrection(correction.codeId, {
          honorarium: correction.honorarium,
          reimbursed: correction.reimbursed,
          patient_share: correction.patient_share
        });
      });
      toast.success('Prix corrigés automatiquement');
      setResult({ ...result, corrections: [] });
    }
  };

  const formatAmount = (cents) => {
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleCheck}
        disabled={checking || selectedCodes.length === 0}
        variant="outline"
        className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        {checking ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Vérification en cours...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Check d'assurabilité
          </>
        )}
      </Button>

      {result && (
        <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">
                    {result.success ? 'Vérification réussie' : 'Erreurs détectées'}
                  </h4>
                  <Badge variant={result.isConventioned ? 'default' : 'secondary'} className="text-xs">
                    {result.isConventioned ? 'Conventionné' : 'Non conventionné'}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-1">
                  Mutuelle: <strong>{result.mutuelle}</strong>
                </p>

                {result.success ? (
                  <AlertDescription className="text-xs text-green-700">
                    {result.message}
                  </AlertDescription>
                ) : (
                  <div className="space-y-3 mt-3">
                    {result.errors.map((error, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge variant="outline" className="font-mono text-xs mb-1">
                              {error.code}
                            </Badge>
                            <p className="text-xs font-medium text-slate-900">{error.title}</p>
                          </div>
                        </div>
                        
                        <p className="text-xs text-orange-700 font-medium mb-2">
                          ⚠️ {error.error}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-red-50 rounded p-2">
                            <p className="text-red-600 font-semibold mb-1">Prix actuel</p>
                            <p>Honoraire: {formatAmount(error.currentPrice)}</p>
                            <p>Remb. OA: {formatAmount(error.currentReimbursed)}</p>
                            <p>Ticket mod.: {formatAmount(error.currentPatientShare)}</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-green-600 font-semibold mb-1">Prix correct</p>
                            <p>Honoraire: {formatAmount(error.expectedPrice)}</p>
                            <p>Remb. OA: {formatAmount(error.expectedReimbursed)}</p>
                            <p>Ticket mod.: {formatAmount(error.expectedPatientShare)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {result.corrections.length > 0 && (
                      <Button
                        onClick={handleApplyCorrections}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="sm"
                      >
                        Corriger automatiquement tous les prix
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}