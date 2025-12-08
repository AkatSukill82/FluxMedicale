import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Building
} from 'lucide-react';
import { useMediPrima } from './useMediPrima';
import { format } from 'date-fns';

export default function MediPrimaCheck({ patient, currentUser }) {
  const [mediPrimaData, setMediPrimaData] = useState(null);
  const { isLoading, error, checkMediPrima } = useMediPrima(currentUser);

  const handleCheck = async () => {
    const data = await checkMediPrima(patient);
    setMediPrimaData(data);
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-purple-900">MediPrima (CPAS)</CardTitle>
              <p className="text-sm text-purple-700 mt-1">
                Vérification droits CPAS et prise en charge
              </p>
            </div>
          </div>
          {mediPrimaData?.has_rights && (
            <Badge className="bg-purple-100 text-purple-800">
              CPAS Actif
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleCheck}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Vérifier droits CPAS (MediPrima-Consult)
            </>
          )}
        </Button>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {mediPrimaData && !mediPrimaData.has_rights && (
          <Alert className="bg-slate-50 border-slate-200">
            <XCircle className="w-4 h-4 text-slate-600" />
            <AlertDescription className="text-slate-700 text-sm">
              {mediPrimaData.message}
            </AlertDescription>
          </Alert>
        )}

        {mediPrimaData && mediPrimaData.has_rights && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Droits CPAS actifs</strong><br />
                Ce patient bénéficie d'une prise en charge CPAS
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">CPAS</p>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  <p className="text-slate-900">{mediPrimaData.cpas_name}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">Code: {mediPrimaData.cpas_code}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Organisme assureur</p>
                <p className="text-slate-900 font-medium">{mediPrimaData.oa_name}</p>
                <p className="text-xs text-slate-500 mt-1">Code OA: {mediPrimaData.oa_code}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Période de couverture</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div className="text-sm text-slate-900">
                    {format(new Date(mediPrimaData.coverage_start), 'dd/MM/yyyy')} - {format(new Date(mediPrimaData.coverage_end), 'dd/MM/yyyy')}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Type de prise en charge</p>
                <Badge className="bg-green-100 text-green-800">
                  {mediPrimaData.coverage_type === 'FULL' ? 'Prise en charge totale' : 'Partielle'}
                </Badge>
              </div>
            </div>

            {mediPrimaData.special_conditions && mediPrimaData.special_conditions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Conditions spéciales</p>
                <ul className="space-y-1">
                  {mediPrimaData.special_conditions.map((condition, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-900 text-sm">
                <strong>Facturation automatique</strong><br />
                Les factures seront automatiquement routées vers la CAAMI (code OA: {mediPrimaData.oa_code})
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="text-xs text-slate-500 text-center pt-4 border-t border-purple-200">
          Source: MediPrima-Consult (API eHealth ACPT/PROD)
        </div>
      </CardContent>
    </Card>
  );
}