import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, TrendingDown, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function GenericAlternatives({ medication, onSelectAlternative }) {
  const { data: alternatives = [] } = useQuery({
    queryKey: ['generic-alternatives', medication.id],
    queryFn: async () => {
      const allDrugs = await base44.entities.Drug.list('-created_date', 1000);
      
      // Chercher les génériques avec la même substance active et dosage
      return allDrugs.filter(drug => 
        drug.id !== medication.id &&
        drug.substance_name === medication.substance_name &&
        drug.strength === medication.strength &&
        drug.unit === medication.unit &&
        drug.form === medication.form
      );
    },
    enabled: !!medication.substance_name
  });

  const isGeneric = medication.product_name?.toLowerCase().includes('mylan') ||
                   medication.product_name?.toLowerCase().includes('eg') ||
                   medication.product_name?.toLowerCase().includes('sandoz') ||
                   medication.product_name?.toLowerCase().includes('teva') ||
                   medication.product_name?.toLowerCase().includes('alter');

  if (alternatives.length === 0 && isGeneric) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-green-600" />
          {isGeneric ? (
            <span className="text-green-900">Médicament générique ✓</span>
          ) : (
            <span className="text-green-900">Alternatives génériques disponibles</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {!isGeneric && alternatives.length > 0 && (
          <>
            <p className="text-xs text-green-800 mb-3">
              Envisagez un générique pour réduire les coûts pour le patient et la mutuelle
            </p>
            {alternatives.slice(0, 3).map(alt => {
              const isGenericAlt = alt.product_name?.toLowerCase().includes('mylan') ||
                                  alt.product_name?.toLowerCase().includes('eg') ||
                                  alt.product_name?.toLowerCase().includes('sandoz') ||
                                  alt.product_name?.toLowerCase().includes('teva') ||
                                  alt.product_name?.toLowerCase().includes('alter');
              
              if (!isGenericAlt) return null;

              return (
                <div
                  key={alt.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-green-900">{alt.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                        Générique
                      </Badge>
                      {alt.cnk && (
                        <span className="text-xs text-slate-600">CNK: {alt.cnk}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelectAlternative(alt);
                      toast.success('Générique sélectionné');
                    }}
                    className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Remplacer
                  </Button>
                </div>
              );
            })}
          </>
        )}

        {isGeneric && (
          <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-800">
              Ce médicament est déjà un générique, offrant une alternative économique au patient.
            </p>
          </div>
        )}

        {!isGeneric && alternatives.length === 0 && (
          <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700">
              Aucune alternative générique trouvée dans la base de données pour ce médicament.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}