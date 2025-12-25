import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Tag,
  Shield,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const SENSITIVE_CATEGORIES = {
  psychiatric: { label: 'Psychiatrie', color: 'bg-purple-100 text-purple-800' },
  hiv_std: { label: 'VIH/IST', color: 'bg-red-100 text-red-800' },
  genetics: { label: 'Génétique', color: 'bg-blue-100 text-blue-800' },
  reproductive: { label: 'Reproduction', color: 'bg-pink-100 text-pink-800' },
  addiction: { label: 'Addictions', color: 'bg-orange-100 text-orange-800' },
  violence: { label: 'Violence', color: 'bg-red-100 text-red-800' }
};

const ACCESS_LEVELS = {
  standard: { label: 'Standard', color: 'bg-green-100 text-green-800', icon: '✓' },
  restricted: { label: 'Restreint', color: 'bg-yellow-100 text-yellow-800', icon: '🔐' },
  confidential: { label: 'Confidentiel', color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
  sealed: { label: 'Scellé', color: 'bg-red-100 text-red-800', icon: '🔒' }
};

export default function AIDocumentAnalyzer({ fileUrl, fileName, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const analyzeDocument = async () => {
    setAnalyzing(true);
    setProgress(10);
    setError(null);

    try {
      // Step 1: Extract text from document
      setProgress(30);
      
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            raw_text: { type: "string", description: "Full extracted text from the document" },
            detected_language: { type: "string" }
          }
        }
      });

      setProgress(50);

      // Step 2: Analyze with LLM
      const analysisResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse ce document médical et extrais les informations clés.

Document: ${fileName}
Contenu extrait: ${extractionResult.output?.raw_text || 'Contenu non lisible'}

Analyse le document et fournis:
1. Le type de document (rapport médical, résultat de labo, ordonnance, imagerie, consentement, etc.)
2. La date du document si présente
3. Le nom du patient si mentionné
4. Le médecin/praticien si mentionné
5. Les diagnostics ou conditions médicales mentionnés
6. Les médicaments mentionnés
7. Des tags pertinents pour classifier ce document (max 5)
8. Les catégories sensibles parmi: psychiatric (psychiatrie/santé mentale), hiv_std (VIH/IST), genetics (génétique), reproductive (reproduction/fertilité), addiction (addictions), violence (violence/abus)
9. Le niveau de confidentialité recommandé: standard (informations générales), restricted (données personnelles), confidential (données sensibles), sealed (données très sensibles nécessitant protection maximale)
10. Un résumé court du document (2-3 phrases)

Sois précis et ne devine pas si l'information n'est pas clairement présente.`,
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { 
              type: "string", 
              enum: ["MEDICAL_REPORT", "LAB_RESULT", "IMAGING", "PRESCRIPTION", "CONSENT_FORM", "INSURANCE", "IDENTITY", "REFERRAL", "DISCHARGE_SUMMARY", "OTHER"]
            },
            document_date: { type: "string", description: "Date au format YYYY-MM-DD ou null" },
            patient_name: { type: "string" },
            practitioner_name: { type: "string" },
            diagnoses: { type: "array", items: { type: "string" } },
            medications: { type: "array", items: { type: "string" } },
            suggested_tags: { type: "array", items: { type: "string" } },
            sensitive_categories: { 
              type: "array", 
              items: { 
                type: "string",
                enum: ["psychiatric", "hiv_std", "genetics", "reproductive", "addiction", "violence"]
              }
            },
            recommended_access_level: {
              type: "string",
              enum: ["standard", "restricted", "confidential", "sealed"]
            },
            summary: { type: "string" },
            confidence_score: { type: "number", description: "Score de confiance de 0 à 100" }
          }
        }
      });

      setProgress(90);

      const finalAnalysis = {
        ...analysisResult,
        analyzed_at: new Date().toISOString(),
        file_name: fileName
      };

      setAnalysis(finalAnalysis);
      setProgress(100);
      
      toast.success('Analyse terminée');
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Erreur lors de l\'analyse du document');
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyAnalysis = () => {
    if (analysis && onAnalysisComplete) {
      onAnalysisComplete(analysis);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      MEDICAL_REPORT: 'Rapport médical',
      LAB_RESULT: 'Résultat de laboratoire',
      IMAGING: 'Imagerie',
      PRESCRIPTION: 'Ordonnance',
      CONSENT_FORM: 'Consentement',
      INSURANCE: 'Assurance',
      IDENTITY: 'Identité',
      REFERRAL: 'Lettre de référence',
      DISCHARGE_SUMMARY: 'Résumé de sortie',
      OTHER: 'Autre'
    };
    return labels[type] || type;
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          Analyse IA du document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && !analyzing && (
          <div className="text-center py-4">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-blue-400" />
            <p className="text-sm text-slate-600 mb-4">
              L'IA peut analyser ce document pour extraire automatiquement les informations clés et suggérer une classification.
            </p>
            <Button onClick={analyzeDocument} className="gap-2">
              <Brain className="w-4 h-4" />
              Analyser avec l'IA
            </Button>
          </div>
        )}

        {analyzing && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm text-slate-600">Analyse en cours...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-slate-500">
              {progress < 30 && 'Extraction du texte...'}
              {progress >= 30 && progress < 50 && 'Lecture du document...'}
              {progress >= 50 && progress < 90 && 'Analyse par l\'IA...'}
              {progress >= 90 && 'Finalisation...'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Confidence */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Confiance de l'analyse</span>
              <Badge variant="outline" className={analysis.confidence_score >= 70 ? 'text-green-600' : 'text-orange-600'}>
                {analysis.confidence_score || 75}%
              </Badge>
            </div>

            {/* Document Type */}
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Type de document</p>
                <p className="text-sm font-medium">{getDocumentTypeLabel(analysis.document_type)}</p>
              </div>
            </div>

            {/* Date */}
            {analysis.document_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Date du document</p>
                  <p className="text-sm font-medium">{analysis.document_date}</p>
                </div>
              </div>
            )}

            {/* Patient */}
            {analysis.patient_name && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Patient</p>
                  <p className="text-sm font-medium">{analysis.patient_name}</p>
                </div>
              </div>
            )}

            {/* Summary */}
            {analysis.summary && (
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Résumé</p>
                <p className="text-sm">{analysis.summary}</p>
              </div>
            )}

            {/* Tags */}
            {analysis.suggested_tags?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tags suggérés
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.suggested_tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sensitive Categories */}
            {analysis.sensitive_categories?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Catégories sensibles détectées
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.sensitive_categories.map((cat, idx) => (
                    <Badge key={idx} className={SENSITIVE_CATEGORIES[cat]?.color || 'bg-slate-100'}>
                      {SENSITIVE_CATEGORIES[cat]?.label || cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Access Level */}
            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Niveau de confidentialité recommandé
              </p>
              <Badge className={ACCESS_LEVELS[analysis.recommended_access_level]?.color}>
                {ACCESS_LEVELS[analysis.recommended_access_level]?.icon} {ACCESS_LEVELS[analysis.recommended_access_level]?.label}
              </Badge>
            </div>

            {/* Diagnoses */}
            {analysis.diagnoses?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Diagnostics mentionnés</p>
                <ul className="text-sm space-y-1">
                  {analysis.diagnoses.map((d, idx) => (
                    <li key={idx} className="text-slate-700">• {d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={applyAnalysis} className="flex-1 gap-2">
                <CheckCircle className="w-4 h-4" />
                Appliquer les suggestions
              </Button>
              <Button variant="outline" onClick={analyzeDocument}>
                Réanalyser
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}