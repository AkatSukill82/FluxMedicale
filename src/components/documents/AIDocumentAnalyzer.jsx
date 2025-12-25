import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Brain,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * AI Document Analyzer
 * Analyzes uploaded medical documents (lab reports, specialist letters)
 * Extracts: diagnoses, medications, test results
 * Creates structured summaries & populates patient fields
 */
export default function AIDocumentAnalyzer({ document, patient, onAnalysisComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const analyzeDocument = async () => {
    setIsAnalyzing(true);
    try {
      // Step 1: Extract text from document
      let documentText = '';
      
      if (document.content_html) {
        // Remove HTML tags
        documentText = document.content_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (document.file_ref_pdf) {
        // For PDF, we'd need to extract text - for now use placeholder
        documentText = 'Contenu PDF à extraire';
        toast.info('Extraction PDF en cours...');
      }

      // Step 2: AI Analysis
      const analysisPrompt = `Analyse ce document médical et extrais toutes les informations structurées importantes:

DOCUMENT: ${document.title}
TYPE: ${document.type}

CONTENU:
${documentText}

CONTEXTE PATIENT:
- Nom: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}
- Âge: ${patient.birthDate ? Math.floor((new Date() - new Date(patient.birthDate)) / 31557600000) : 'N/A'} ans
- Antécédents: ${patient.antecedents_medicaux || 'Aucun'}
- Allergies: ${patient.allergies || 'Aucune'}

Extrais et structure:
1. DIAGNOSTICS (avec codes ICD-10 si possibles)
2. MÉDICAMENTS prescrits ou mentionnés (avec posologies)
3. RÉSULTATS D'EXAMENS (valeurs + unités + normes + interprétation)
4. RECOMMANDATIONS de suivi
5. INFORMATIONS IMPORTANTES à ajouter au dossier patient
6. RÉSUMÉ EXÉCUTIF (3-5 lignes)

Format JSON structuré:`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            diagnoses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  icd10_code: { type: "string" },
                  status: { type: "string", enum: ["CONFIRMED", "SUSPECTED", "RULED_OUT"] },
                  notes: { type: "string" }
                }
              }
            },
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  duration: { type: "string" },
                  indication: { type: "string" }
                }
              }
            },
            test_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  test_name: { type: "string" },
                  value: { type: "string" },
                  unit: { type: "string" },
                  reference_range: { type: "string" },
                  interpretation: { type: "string", enum: ["NORMAL", "ABNORMAL_HIGH", "ABNORMAL_LOW", "CRITICAL"] },
                  notes: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            key_findings: {
              type: "array",
              items: { type: "string" }
            },
            executive_summary: {
              type: "string"
            },
            suggested_patient_updates: {
              type: "object",
              properties: {
                add_to_medical_history: { type: "array", items: { type: "string" } },
                add_to_current_medications: { type: "array", items: { type: "string" } },
                update_allergies: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setAnalysisResult(analysis);

      // Step 3: Update document with AI summary
      await base44.entities.Document.update(document.id, {
        ai_analysis: {
          analyzed_at: new Date().toISOString(),
          summary: analysis.executive_summary,
          extracted_data: analysis
        }
      });

      toast.success('Analyse IA terminée', {
        description: `${analysis.diagnoses?.length || 0} diagnostic(s), ${analysis.test_results?.length || 0} résultat(s) extrait(s)`
      });

      if (onAnalysisComplete) onAnalysisComplete(analysis);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Erreur lors de l\'analyse IA du document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyToPatientRecord = async () => {
    try {
      const updates = {};

      // Add diagnoses to medical history
      if (analysisResult.suggested_patient_updates?.add_to_medical_history?.length > 0) {
        const newConditions = analysisResult.suggested_patient_updates.add_to_medical_history.join(', ');
        const existingHistory = patient.antecedents_medicaux || '';
        updates.antecedents_medicaux = existingHistory 
          ? `${existingHistory}, ${newConditions}` 
          : newConditions;
      }

      // Add medications
      if (analysisResult.suggested_patient_updates?.add_to_current_medications?.length > 0) {
        const newMeds = analysisResult.suggested_patient_updates.add_to_current_medications.join(', ');
        const existingMeds = patient.medicaments_actuels || '';
        updates.medicaments_actuels = existingMeds 
          ? `${existingMeds}, ${newMeds}` 
          : newMeds;
      }

      // Update allergies
      if (analysisResult.suggested_patient_updates?.update_allergies?.length > 0) {
        const newAllergies = analysisResult.suggested_patient_updates.update_allergies.join(', ');
        const existingAllergies = patient.allergies || '';
        updates.allergies = existingAllergies 
          ? `${existingAllergies}, ${newAllergies}` 
          : newAllergies;
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.Patient.update(patient.id, updates);
        toast.success('Dossier patient mis à jour automatiquement');
      } else {
        toast.info('Aucune mise à jour du dossier patient nécessaire');
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Erreur lors de la mise à jour du dossier');
    }
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-purple-600" />
          Analyse IA du Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisResult && (
          <Button 
            onClick={analyzeDocument} 
            disabled={isAnalyzing}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyser avec IA
              </>
            )}
          </Button>
        )}

        {analysisResult && (
          <div className="space-y-4">
            {/* Executive Summary */}
            <Alert className="bg-purple-50 border-purple-200">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <strong>Résumé:</strong> {analysisResult.executive_summary}
              </AlertDescription>
            </Alert>

            {/* Diagnoses */}
            {analysisResult.diagnoses?.length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2">Diagnostics extraits:</h5>
                <div className="space-y-2">
                  {analysisResult.diagnoses.map((diag, idx) => (
                    <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{diag.condition}</span>
                        {diag.icd10_code && <Badge variant="outline">{diag.icd10_code}</Badge>}
                        <Badge className={
                          diag.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                          diag.status === 'SUSPECTED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>{diag.status}</Badge>
                      </div>
                      {diag.notes && <p className="text-xs text-muted-foreground mt-1">{diag.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Results */}
            {analysisResult.test_results?.length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2">Résultats d'examens:</h5>
                <div className="space-y-1">
                  {analysisResult.test_results.map((result, idx) => (
                    <div key={idx} className="p-2 bg-green-50 rounded border border-green-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.test_name}</span>
                        <Badge className={
                          result.interpretation === 'NORMAL' ? 'bg-green-500 text-white' :
                          result.interpretation === 'CRITICAL' ? 'bg-red-500 text-white' :
                          'bg-orange-500 text-white'
                        }>{result.interpretation}</Badge>
                      </div>
                      <p className="mt-1">
                        {result.value} {result.unit} 
                        {result.reference_range && ` (Norme: ${result.reference_range})`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={applyToPatientRecord}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Intégrer au dossier patient
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}