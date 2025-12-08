
import React, { useState, useEffect, useCallback } from 'react';
import { ImportSession } from '@/entities/ImportSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText,
  Users,
  Pill,
  Calendar,
  Eye,
  Download
} from 'lucide-react';

export default function ValidationReport({ session, onValidationComplete }) {
  const [validationDetails, setValidationDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const runValidation = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulation de validation KMEHR
    setTimeout(async () => {
      const mockValidation = {
        is_valid: Math.random() > 0.4,
        schema_validation: {
          passed: Math.random() > 0.2,
          errors: Math.random() > 0.7 ? [] : [
            'Élément requis "patient/birthdate" manquant ligne 234',
            'Format date invalide "32/13/2023" ligne 145'
          ]
        },
        content_validation: {
          patients_valid: Math.floor(Math.random() * 5),
          patients_warnings: Math.floor(Math.random() * 8),
          medications_unmapped: Math.floor(Math.random() * 12),
          missing_codes: ['ABC123', 'DEF456']
        },
        errors: Math.random() > 0.6 ? [] : [
          'Patient sans identifiant NISS à la ligne 89',
          'Code médicament introuvable dans les référentiels: XYZ789'
        ],
        warnings: [
          'Date de naissance approximative détectée',
          'Codification non standard utilisée pour 3 prescriptions',
          'Adresse incomplète pour 2 patients'
        ],
        quality_score: Math.floor(Math.random() * 30) + 70
      };

      setValidationDetails(mockValidation);
      
      // Mise à jour de la session
      await ImportSession.update(session.id, {
        status: 'Validated',
        validation_report: mockValidation
      });

      setIsProcessing(false);
    }, 3000);
  }, [session]); // session is a dependency because session.id is used inside

  useEffect(() => {
    if (session?.validation_report) {
      setValidationDetails(session.validation_report);
    } else if (session?.id) { // Ensure session exists before running validation
      // Lancer la validation si pas encore faite
      runValidation();
    }
  }, [session, runValidation]); // runValidation is a dependency because it's called inside useEffect

  const handleProceedToMatching = () => {
    onValidationComplete(session.id);
  };

  const getValidationStatusIcon = () => {
    if (!validationDetails) return <FileText className="w-6 h-6 text-gray-400" />;
    
    if (validationDetails.is_valid) {
      return <CheckCircle2 className="w-6 h-6 text-green-600" />;
    } else if (validationDetails.errors?.length === 0) {
      return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    } else {
      return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getValidationStatusText = () => {
    if (isProcessing) return 'Validation en cours...';
    if (!validationDetails) return 'En attente de validation';
    
    if (validationDetails.is_valid) {
      return 'Validation réussie';
    } else if (validationDetails.errors?.length === 0) {
      return 'Validation avec avertissements';
    } else {
      return 'Validation échouée';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de validation */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getValidationStatusIcon()}
              <div>
                <CardTitle className="text-xl">Rapport de Validation</CardTitle>
                <p className="text-slate-600 mt-1">{session.file_name}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                className={
                  validationDetails?.is_valid ? 'bg-green-100 text-green-800' :
                  validationDetails?.errors?.length === 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }
              >
                {getValidationStatusText()}
              </Badge>
              {validationDetails?.quality_score && (
                <p className="text-sm text-slate-500 mt-1">
                  Score qualité: {validationDetails.quality_score}%
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Validation en cours</h3>
            <p className="text-slate-600 mb-4">
              Vérification du schéma KMEHR, validation du contenu et contrôles qualité...
            </p>
            <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </CardContent>
        </Card>
      )}

      {validationDetails && (
        <>
          {/* Résumé du contenu */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">
                  {session.content_summary?.patients_count || 0}
                </p>
                <p className="text-sm text-slate-600">Patients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">
                  {session.content_summary?.consultations_count || 0}
                </p>
                <p className="text-sm text-slate-600">Consultations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Pill className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">
                  {session.content_summary?.medications_count || 0}
                </p>
                <p className="text-sm text-slate-600">Médicaments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">
                  {session.content_summary?.documents_count || 0}
                </p>
                <p className="text-sm text-slate-600">Documents</p>
              </CardContent>
            </Card>
          </div>

          {/* Erreurs */}
          {validationDetails.errors && validationDetails.errors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Erreurs Bloquantes ({validationDetails.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationDetails.errors.map((error, index) => (
                    <Alert key={index} className="border-red-300 bg-red-100">
                      <AlertDescription className="text-red-800">
                        {error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Avertissements */}
          {validationDetails.warnings && validationDetails.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Avertissements ({validationDetails.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationDetails.warnings.map((warning, index) => (
                    <Alert key={index} className="border-yellow-300 bg-yellow-100">
                      <AlertDescription className="text-yellow-800">
                        {warning}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Télécharger Rapport
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Voir Détails XML
              </Button>
            </div>
            
            {(validationDetails.is_valid || validationDetails.errors?.length === 0) && (
              <Button 
                onClick={handleProceedToMatching}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continuer vers le Matching
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
