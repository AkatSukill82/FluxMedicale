import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Building,
  Calendar,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function InsuranceQuickCheck({ patient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const handleCheck = async () => {
    setIsChecking(true);
    setResult(null);

    try {
      // Simulation de vérification MyCareNet + MediPrima
      await new Promise(resolve => setTimeout(resolve, 1500));

      const niss = getNISS();
      const hasMutuelle = patient?.mutuelle && patient.mutuelle !== '';
      
      // Simulation des résultats
      if (hasMutuelle) {
        // Patient avec mutuelle
        setResult({
          type: 'MUTUELLE',
          status: 'ACTIVE',
          mutuelle: patient.mutuelle,
          numero_affiliation: patient.numero_mutuelle || 'Non renseigné',
          bim: Math.random() > 0.7, // Simulation BIM
          omnio: Math.random() > 0.8, // Simulation OMNIO
          validity_start: '2024-01-01',
          validity_end: '2025-12-31',
          message: 'Couverture mutuelle active'
        });
        toast.success('Mutuelle vérifiée avec succès');
      } else {
        // Vérifier MediPrima (CPAS)
        const hasCPAS = Math.random() > 0.5; // Simulation
        
        if (hasCPAS) {
          setResult({
            type: 'MEDIPRIMA',
            status: 'ACTIVE',
            cpas_name: 'CPAS de Bruxelles',
            cpas_code: '21004',
            oa_code: '000',
            oa_name: 'CAAMI',
            coverage_type: 'FULL',
            validity_start: '2024-06-01',
            validity_end: '2025-05-31',
            message: 'Couverture CPAS active via MediPrima'
          });
          toast.success('Droits CPAS vérifiés (MediPrima)');
        } else {
          setResult({
            type: 'NONE',
            status: 'NONE',
            message: 'Aucune couverture mutuelle ou CPAS trouvée pour ce patient'
          });
          toast.warning('Aucune couverture trouvée');
        }
      }
    } catch (error) {
      setResult({
        type: 'ERROR',
        status: 'ERROR',
        message: 'Erreur lors de la vérification. Veuillez réessayer.'
      });
      toast.error('Erreur de vérification');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    switch (result.status) {
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'NONE':
        return <XCircle className="w-5 h-5 text-orange-500" />;
      case 'ERROR':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          handleCheck();
        }}
        className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
      >
        <Shield className="w-4 h-4" />
        Vérifier mutuelle
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Vérification couverture sociale
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {isChecking && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
                <p className="text-sm text-slate-600">Vérification en cours...</p>
                <p className="text-xs text-slate-400 mt-1">MyCareNet & MediPrima</p>
              </div>
            )}

            {result && !isChecking && (
              <>
                {/* Résultat Mutuelle */}
                {result.type === 'MUTUELLE' && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon()}
                        <div>
                          <p className="font-semibold text-green-900">Mutuelle active</p>
                          <p className="text-sm text-green-700">{result.mutuelle}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">N° Affiliation</p>
                          <p className="font-medium">{result.numero_affiliation}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Validité</p>
                          <p className="font-medium">
                            {format(new Date(result.validity_start), 'dd/MM/yyyy')} - {format(new Date(result.validity_end), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>

                      {(result.bim || result.omnio) && (
                        <div className="flex gap-2">
                          {result.bim && (
                            <Badge className="bg-blue-600">BIM</Badge>
                          )}
                          {result.omnio && (
                            <Badge className="bg-purple-600">OMNIO</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Résultat MediPrima (CPAS) */}
                {result.type === 'MEDIPRIMA' && (
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon()}
                        <div>
                          <p className="font-semibold text-purple-900">Couverture CPAS (MediPrima)</p>
                          <p className="text-sm text-purple-700">{result.cpas_name}</p>
                        </div>
                        <Badge className="bg-purple-600 ml-auto">CPAS</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="text-xs text-slate-500">Code CPAS</p>
                            <p className="font-medium">{result.cpas_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="text-xs text-slate-500">Organisme assureur</p>
                            <p className="font-medium">{result.oa_name} ({result.oa_code})</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="text-xs text-slate-500">Période de couverture</p>
                          <p className="font-medium">
                            {format(new Date(result.validity_start), 'dd/MM/yyyy')} - {format(new Date(result.validity_end), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>

                      <Badge className={result.coverage_type === 'FULL' ? 'bg-green-600' : 'bg-orange-500'}>
                        {result.coverage_type === 'FULL' ? 'Prise en charge totale' : 'Prise en charge partielle'}
                      </Badge>

                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertDescription className="text-xs text-yellow-800">
                          <strong>Facturation:</strong> Les factures seront routées vers la CAAMI via MediPrima.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}

                {/* Aucune couverture */}
                {result.type === 'NONE' && (
                  <Alert className="bg-orange-50 border-orange-200">
                    <XCircle className="w-5 h-5 text-orange-500" />
                    <AlertDescription className="text-orange-800">
                      <strong>Aucune couverture trouvée</strong><br />
                      {result.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Erreur */}
                {result.type === 'ERROR' && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <AlertDescription className="text-red-800">
                      {result.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleCheck}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isChecking}
                >
                  <Shield className="w-4 h-4" />
                  Revérifier
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}