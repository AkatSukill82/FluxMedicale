
import React, { useState, useEffect, useCallback } from 'react';
import { ImportSession } from '@/entities/ImportSession';
import { Patient } from '@/entities/Patient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Eye,
  AlertTriangle,
  CheckCircle2,
  Merge
} from 'lucide-react';

import PatientMergeDialog from './PatientMergeDialog';

export default function PatientMatching({ session, onMatchingComplete }) {
  const [existingPatients, setExistingPatients] = useState([]);
  const [matchingResults, setMatchingResults] = useState([]);
  const [selectedMerge, setSelectedMerge] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadExistingPatients = useCallback(async () => {
    try {
      const patients = await Patient.list();
      setExistingPatients(patients);
    } catch (error) {
      console.error('Erreur chargement patients:', error);
    }
  }, []); // No dependencies, as it doesn't rely on props or state from the component's scope

  const runPatientMatching = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulation du matching automatique
    setTimeout(async () => {
      const mockPatients = Array.from({ length: session.content_summary?.patients_count || 5 }, (_, i) => ({
        external_patient_id: `EXT_${i + 1}`,
        niss: Math.random() > 0.3 ? `${Math.floor(Math.random() * 100000000000)}` : null,
        firstName: ['Jean', 'Marie', 'Pierre', 'Sophie', 'Paul'][Math.floor(Math.random() * 5)],
        lastName: ['Dupont', 'Martin', 'Durand', 'Petit', 'Robert'][Math.floor(Math.random() * 5)],
        birthDate: `1970-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        gender: Math.random() > 0.5 ? 'male' : 'female'
      }));

      const matchingResults = mockPatients.map(importedPatient => {
        // Simulation de différents types de matching
        const matchType = Math.random();
        
        if (importedPatient.niss && matchType > 0.7) {
          // Match NISS exact
          const matchedPatient = existingPatients[Math.floor(Math.random() * Math.min(3, existingPatients.length))];
          return {
            ...importedPatient,
            match_type: 'NISS',
            confidence: 0.95,
            matched_patient_id: matchedPatient?.id,
            requires_review: false
          };
        } else if (matchType > 0.4) {
          // Match nom + DOB + sexe
          const matchedPatient = existingPatients[Math.floor(Math.random() * Math.min(3, existingPatients.length))];
          return {
            ...importedPatient,
            match_type: 'NameDobGender',
            confidence: Math.random() * 0.4 + 0.6,
            matched_patient_id: matchedPatient?.id,
            requires_review: true
          };
        } else {
          // Aucun match
          return {
            ...importedPatient,
            match_type: 'NoMatch',
            confidence: 0,
            matched_patient_id: null,
            requires_review: false
          };
        }
      });

      setMatchingResults(matchingResults);

      // Mise à jour de la session
      await ImportSession.update(session.id, {
        status: 'Matching',
        matching_results: matchingResults
      });

      setIsProcessing(false);
    }, 2000);
  }, [session, existingPatients]); // Dependencies: session (for id and content_summary) and existingPatients (for matching logic)

  useEffect(() => {
    loadExistingPatients();
    if (session.matching_results) {
      setMatchingResults(session.matching_results);
    } else {
      runPatientMatching();
    }
  }, [session, loadExistingPatients, runPatientMatching]); // Dependencies: session, and the useCallback versions of loadExistingPatients and runPatientMatching

  const getMatchBadge = (result) => {
    switch (result.match_type) {
      case 'NISS':
        return <Badge className="bg-green-100 text-green-800">Match NISS</Badge>;
      case 'NameDobGender':
        return <Badge className="bg-yellow-100 text-yellow-800">Match partiel</Badge>;
      case 'Manual':
        return <Badge className="bg-blue-100 text-blue-800">Match manuel</Badge>;
      case 'NoMatch':
      default:
        return <Badge className="bg-gray-100 text-gray-800">Aucun match</Badge>;
    }
  };

  const getMatchIcon = (result) => {
    if (result.confidence > 0.8) return <UserCheck className="w-5 h-5 text-green-600" />;
    if (result.confidence > 0.5) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <UserX className="w-5 h-5 text-gray-600" />;
  };

  const handleViewMerge = (result) => {
    const existingPatient = existingPatients.find(p => p.id === result.matched_patient_id);
    setSelectedMerge({
      importedPatient: result,
      existingPatient: existingPatient
    });
  };

  const handleProceedToImport = async () => {
    // Simulation de l'import final
    const stats = {
      imported_patients: matchingResults.filter(r => r.match_type !== 'Manual' || r.approved).length,
      imported_consultations: Math.floor(Math.random() * 50) + 20,
      imported_prescriptions: Math.floor(Math.random() * 30) + 10,
      skipped_duplicates: matchingResults.filter(r => r.match_type === 'NISS').length,
      errors: Math.floor(Math.random() * 3)
    };

    await ImportSession.update(session.id, {
      status: 'Completed',
      import_statistics: stats
    });

    onMatchingComplete(session.id);
  };

  const reviewCount = matchingResults.filter(r => r.requires_review).length;
  const matchCount = matchingResults.filter(r => r.match_type !== 'NoMatch').length;

  return (
    <div className="space-y-6">
      {/* Statistiques de matching */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{matchingResults.length}</p>
            <p className="text-sm text-slate-600">Patients importés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{matchCount}</p>
            <p className="text-sm text-slate-600">Matches trouvés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{reviewCount}</p>
            <p className="text-sm text-slate-600">Révision requise</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserX className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              {matchingResults.length - matchCount}
            </p>
            <p className="text-sm text-slate-600">Nouveaux patients</p>
          </CardContent>
        </Card>
      </div>

      {isProcessing ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Matching automatique en cours</h3>
            <p className="text-slate-600">
              Recherche par NISS, puis par nom/date/sexe...
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Résultats de matching */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Merge className="w-5 h-5 text-blue-600" />
                Résultats du Matching
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matchingResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getMatchIcon(result)}
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {result.firstName} {result.lastName}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {result.niss ? `NISS: ${result.niss}` : 'Pas de NISS'} • 
                          Né(e) le {result.birthDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getMatchBadge(result)}
                      {result.confidence > 0 && (
                        <span className="text-sm text-slate-600">
                          {Math.round(result.confidence * 100)}%
                        </span>
                      )}
                      {result.matched_patient_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMerge(result)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Réviser
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Alert className="max-w-md">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {reviewCount > 0 
                  ? `${reviewCount} patient(s) nécessitent une révision manuelle`
                  : 'Tous les patients ont été traités automatiquement'
                }
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleProceedToImport}
              className="bg-green-600 hover:bg-green-700"
              disabled={reviewCount > 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Procéder à l'Import
            </Button>
          </div>
        </>
      )}

      {/* Dialog de fusion */}
      {selectedMerge && (
        <PatientMergeDialog
          importedPatient={selectedMerge.importedPatient}
          existingPatient={selectedMerge.existingPatient}
          onClose={() => setSelectedMerge(null)}
          onMergeComplete={() => {
            setSelectedMerge(null);
            // Refresh matching results
          }}
        />
      )}
    </div>
  );
}
