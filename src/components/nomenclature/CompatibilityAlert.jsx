import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CompatibilityAlert({ validation }) {
  if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Errors */}
      {validation.errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Incompatibilité détectée</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm">{error.message}</p>
            {error.conflictingCodes && error.conflictingCodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs font-medium">Codes en conflit:</span>
                {error.conflictingCodes.map(code => (
                  <Badge key={code} variant="destructive" className="font-mono text-xs">
                    {code}
                  </Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {/* Warnings */}
      {validation.warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="font-semibold text-orange-900">Attention</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm text-orange-800">{warning.message}</p>
            {warning.conflictingCodes && warning.conflictingCodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs font-medium text-orange-900">Codes concernés:</span>
                {warning.conflictingCodes.map(code => (
                  <Badge key={code} className="bg-orange-200 text-orange-900 font-mono text-xs">
                    {code}
                  </Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}