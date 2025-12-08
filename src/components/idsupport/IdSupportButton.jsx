import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Clock
} from 'lucide-react';
import { useIdSupport } from './useIdSupport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function IdSupportButton({ patient }) {
  const { isVerifying, verificationResult, verifyCard } = useIdSupport();
  const [showResult, setShowResult] = useState(false);

  const handleVerify = async () => {
    setShowResult(false);
    
    const niss = patient.identifier?.find(
      id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
    )?.value;

    if (!niss) {
      setShowResult(true);
      return;
    }

    await verifyCard({
      patientId: patient.id,
      niss: niss,
      name: patient.name?.[0],
      birthDate: patient.birthDate
    });

    setShowResult(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'VALID':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'EXPIRED':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'REVOKED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'INCONSISTENT':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <XCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VALID':
        return 'bg-green-50 border-green-200';
      case 'EXPIRED':
        return 'bg-orange-50 border-orange-200';
      case 'REVOKED':
        return 'bg-red-50 border-red-200';
      case 'INCONSISTENT':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleVerify}
        disabled={isVerifying}
        variant="outline"
        className="flex items-center gap-2"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Vérification en cours...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Vérifier la carte (IdSupport)
          </>
        )}
      </Button>

      {showResult && verificationResult && (
        <Card className={`${getStatusColor(verificationResult.status)} border`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getStatusIcon(verificationResult.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-slate-900">
                    {verificationResult.message}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {verificationResult.cardType}
                  </Badge>
                </div>

                {verificationResult.status === 'VALID' && (
                  <div className="text-sm text-slate-600">
                    Valide du {format(new Date(verificationResult.validFrom), 'dd/MM/yyyy')} au{' '}
                    {format(new Date(verificationResult.validUntil), 'dd/MM/yyyy')}
                  </div>
                )}

                {verificationResult.status === 'EXPIRED' && (
                  <div className="text-sm text-orange-900">
                    Carte expirée le {format(new Date(verificationResult.validUntil), 'dd/MM/yyyy')}
                  </div>
                )}

                {verificationResult.status === 'REVOKED' && (
                  <div className="text-sm text-red-900">
                    Carte révoquée le {format(new Date(verificationResult.revocationDate), 'dd/MM/yyyy')}
                  </div>
                )}

                {verificationResult.status === 'INCONSISTENT' && (
                  <div className="text-sm text-yellow-900">
                    <div className="font-medium mb-1">Problèmes détectés:</div>
                    <ul className="list-disc list-inside">
                      {verificationResult.issues?.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-slate-500 mt-2">
                  ID requête: {verificationResult.requestId}
                  <br />
                  {format(new Date(verificationResult.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {verificationResult && (verificationResult.status === 'EXPIRED' || verificationResult.status === 'REVOKED') && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Attention:</strong> L'auto-création de patient par lecture eID est bloquée pour ce document.
            Veuillez utiliser un document d'identité valide.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}