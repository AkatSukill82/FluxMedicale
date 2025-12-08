import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain,
  AlertTriangle,
  Activity,
  HelpCircle,
  Loader2,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * AI-Powered Patient Triage for Telemedicine
 * Analyzes patient symptoms during scheduling/pre-consultation
 * Categorizes urgency, flags red flags, suggests questions
 */
export default function AIPatientTriage({ patient, onTriageComplete }) {
  const [inputs, setInputs] = useState({
    chief_complaint: '',
    symptoms: '',
    duration: '',
    severity: 'MODERATE',
    additional_context: ''
  });

  const [isTriaging, setIsTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const performTriage = async () => {
    if (!inputs.chief_complaint || !inputs.symptoms) {
      toast.error('Veuillez remplir le motif et les symptômes');
      return;
    }

    setIsTriaging(true);
    const startTime = Date.now();

    try {
      const symptomsList = inputs.symptoms.split(',').map(s => s.trim()).filter(Boolean);

      const triagePrompt = `En tant que système de triage médical IA, analyse cette demande de téléconsultation:

PATIENT:
- Nom: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}
- Âge: ${patient.birthDate ? Math.floor((new Date() - new Date(patient.birthDate)) / 31557600000) : 'N/A'} ans
- Sexe: ${patient.gender || 'N/A'}
- Antécédents: ${patient.antecedents_medicaux || 'Aucun'}
- Médicaments actuels: ${patient.medicaments_actuels || 'Aucun'}
- Allergies: ${patient.allergies || 'Aucune'}

MOTIF: ${inputs.chief_complaint}

SYMPTÔMES: ${symptomsList.join(', ')}

DURÉE: ${inputs.duration}

SÉVÉRITÉ AUTO-ÉVALUÉE: ${inputs.severity}

CONTEXTE ADDITIONNEL: ${inputs.additional_context || 'Aucun'}

Effectue un triage complet et fournis:
1. Niveau d'urgence (NON_URGENT/SEMI_URGENT/URGENT/EMERGENCY)
2. Score d'urgence 0-100
3. Drapeaux rouges détectés (si présents)
4. Diagnostics différentiels préliminaires
5. Questions pertinentes à poser durant la consultation
6. Examens recommandés
7. Instructions de préparation patient

Format JSON:`;

      const triage = await base44.integrations.Core.InvokeLLM({
        prompt: triagePrompt,
        response_json_schema: {
          type: "object",
          properties: {
            urgency_level: {
              type: "string",
              enum: ["NON_URGENT", "SEMI_URGENT", "URGENT", "EMERGENCY"]
            },
            urgency_score: {
              type: "number",
              minimum: 0,
              maximum: 100
            },
            red_flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  flag: { type: "string" },
                  severity: { type: "string", enum: ["WARNING", "CRITICAL"] },
                  recommendation: { type: "string" }
                }
              }
            },
            differential_diagnoses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  probability: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            suggested_questions: {
              type: "array",
              items: { type: "string" }
            },
            recommended_tests: {
              type: "array",
              items: { type: "string" }
            },
            patient_preparation: {
              type: "string"
            }
          }
        }
      });

      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      // Save triage assessment
      const assessment = await base44.entities.TriageAssessment.create({
        patient_id: patient.id,
        patient_inputs: {
          chief_complaint: inputs.chief_complaint,
          symptoms: symptomsList,
          duration: inputs.duration,
          severity: inputs.severity,
          additional_context: inputs.additional_context
        },
        ai_triage: triage,
        assessed_at: new Date().toISOString(),
        assessment_duration_seconds: durationSeconds
      });

      setTriageResult({ ...triage, assessment_id: assessment.id });

      toast.success('Triage IA terminé', {
        description: `Urgence: ${triage.urgency_level} (${triage.urgency_score}/100)`
      });

      if (onTriageComplete) onTriageComplete(assessment);
    } catch (error) {
      console.error('Triage error:', error);
      toast.error('Erreur lors du triage IA');
    } finally {
      setIsTriaging(false);
    }
  };

  const getUrgencyBadge = (level) => {
    const config = {
      NON_URGENT: { color: 'bg-green-100 text-green-800', icon: Clock },
      SEMI_URGENT: { color: 'bg-yellow-100 text-yellow-800', icon: Activity },
      URGENT: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      EMERGENCY: { color: 'bg-red-100 text-red-800', icon: Zap }
    };
    
    const { color, icon: Icon } = config[level] || config.NON_URGENT;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {level}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Triage Pré-Consultation (IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Motif de consultation *</Label>
            <Textarea
              value={inputs.chief_complaint}
              onChange={(e) => setInputs({ ...inputs, chief_complaint: e.target.value })}
              placeholder="Ex: Douleur thoracique, Fièvre persistante..."
              rows={2}
            />
          </div>

          <div>
            <Label>Symptômes (séparés par virgule) *</Label>
            <Textarea
              value={inputs.symptoms}
              onChange={(e) => setInputs({ ...inputs, symptoms: e.target.value })}
              placeholder="Ex: Toux, Fièvre, Fatigue, Maux de tête..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Durée</Label>
              <Select value={inputs.duration} onValueChange={(v) => setInputs({ ...inputs, duration: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Depuis combien de temps?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MOINS_24H">Moins de 24h</SelectItem>
                  <SelectItem value="1_3_JOURS">1-3 jours</SelectItem>
                  <SelectItem value="3_7_JOURS">3-7 jours</SelectItem>
                  <SelectItem value="1_2_SEMAINES">1-2 semaines</SelectItem>
                  <SelectItem value="PLUS_2_SEMAINES">Plus de 2 semaines</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sévérité auto-évaluée</Label>
              <Select value={inputs.severity} onValueChange={(v) => setInputs({ ...inputs, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Légère</SelectItem>
                  <SelectItem value="MODERATE">Modérée</SelectItem>
                  <SelectItem value="SEVERE">Sévère</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Contexte additionnel</Label>
            <Textarea
              value={inputs.additional_context}
              onChange={(e) => setInputs({ ...inputs, additional_context: e.target.value })}
              placeholder="Autres informations pertinentes..."
              rows={2}
            />
          </div>

          <Button 
            onClick={performTriage}
            disabled={isTriaging}
            className="w-full"
          >
            {isTriaging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Triage en cours...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Effectuer le triage IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Triage Results */}
      {triageResult && (
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Résultat du Triage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Urgency Level */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-semibold">Niveau d'urgence:</span>
              <div className="flex items-center gap-3">
                {getUrgencyBadge(triageResult.urgency_level)}
                <Badge variant="outline">Score: {triageResult.urgency_score}/100</Badge>
              </div>
            </div>

            {/* Red Flags */}
            {triageResult.red_flags?.length > 0 && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>⚠️ Drapeaux rouges détectés ({triageResult.red_flags.length}):</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    {triageResult.red_flags.map((flag, idx) => (
                      <li key={idx}>
                        <strong>{flag.flag}</strong>
                        {flag.severity === 'CRITICAL' && <Badge className="ml-2 bg-red-600 text-white">CRITIQUE</Badge>}
                        <br />
                        <span className="text-xs">{flag.recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Differential Diagnoses */}
            {triageResult.differential_diagnoses?.length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Hypothèses diagnostiques:
                </h5>
                <div className="space-y-2">
                  {triageResult.differential_diagnoses.map((diag, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{diag.condition}</span>
                        <Badge variant="outline">{diag.probability}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{diag.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {triageResult.suggested_questions?.length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Questions à poser durant la consultation:
                </h5>
                <ul className="space-y-1 text-sm">
                  {triageResult.suggested_questions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Tests */}
            {triageResult.recommended_tests?.length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2">Examens à envisager:</h5>
                <div className="flex flex-wrap gap-2">
                  {triageResult.recommended_tests.map((test, idx) => (
                    <Badge key={idx} variant="outline">{test}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Preparation */}
            {triageResult.patient_preparation && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>Instructions patient:</strong> {triageResult.patient_preparation}
                </AlertDescription>
              </Alert>
            )}

            {/* Disclaimer */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-xs text-amber-800">
                <strong>⚠️ Note:</strong> Ce triage IA est préliminaire. L'évaluation clinique complète du médecin reste essentielle.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}