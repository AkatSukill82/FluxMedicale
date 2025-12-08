
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  TrendingUp,
  Activity,
  Loader2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Système d'Aide à la Décision Clinique (CDSS)
 * Fournit des recommandations basées sur l'IA pour diagnostics, investigations et traitements
 */
export default function ClinicalDecisionSupport({ 
  patient, 
  consultationData,
  vitalSigns,
  onRecommendationApplied 
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [physicianNotes, setPhysicianNotes] = useState('');
  const [modifiedText, setModifiedText] = useState('');

  useEffect(() => {
    if (consultationData?.motif && consultationData?.anamnese) {
      // Auto-trigger analysis when enough context is available
      analyzePatientContext();
    }
  }, [consultationData?.motif, consultationData?.anamnese, consultationData?.examen_clinique]);

  const analyzePatientContext = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      // Récupérer l'utilisateur actuel ET l'historique médical complet
      const currentUser = await base44.auth.me();
      
      const [consultations, prescriptions, previousVitals] = await Promise.all([
        base44.entities.Consultation.filter({ patient_id: patient.id }).catch(() => []),
        base44.entities.Prescription.filter({ patient_id: patient.id }).catch(() => []),
        base44.entities.VitalSigns.filter({ patient_id: patient.id }).catch(() => [])
      ]);

      // Construire le contexte clinique
      const clinicalContext = {
        current_symptoms: consultationData.motif || '',
        history: consultationData.anamnese || '',
        physical_exam: consultationData.examen_clinique || '',
        vital_signs: vitalSigns || {},
        allergies: patient.allergies || 'Aucune allergie connue',
        current_medications: patient.medicaments_actuels || 'Aucun médicament actuel',
        medical_history: patient.antecedents_medicaux || 'Aucun antécédent',
        age: calculateAge(patient.birthDate),
        gender: patient.gender,
        recent_consultations: consultations.slice(0, 3).map(c => ({
          date: c.date_consultation,
          motif: c.motif,
          diagnostic: c.diagnostic
        }))
      };

      // Appeler l'IA pour générer des recommandations
      const aiRecommendations = await generateClinicalRecommendations(clinicalContext);
      
      // Sauvegarder dans la base
      const savedRecommendations = await Promise.all(
        aiRecommendations.map(rec => 
          base44.entities.ClinicalRecommendation.create({
            patient_id: patient.id,
            consultation_id: consultationData.id,
            recommendation_type: rec.type,
            context: {
              symptoms: [consultationData.motif],
              vital_signs: vitalSigns || {},
              medical_history: [patient.antecedents_medicaux],
              current_medications: patient.medicaments_actuels ? [patient.medicaments_actuels] : []
            },
            recommendation: rec.recommendation,
            confidence_score: rec.confidence,
            sources: rec.sources || [],
            generated_by: currentUser.email,
            ai_model_version: 'gpt-4-medical-v1'
          })
        )
      );

      setRecommendations(savedRecommendations);
      toast.success('Analyse clinique terminée', {
        description: `${savedRecommendations.length} recommandation(s) générée(s)`
      });
    } catch (error) {
      console.error('Error analyzing clinical context:', error);
      toast.error('Échec de l\'analyse clinique', {
        description: 'Veuillez réessayer'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateClinicalRecommendations = async (context) => {
    const prompt = `En tant que système d'aide à la décision clinique, analyse le contexte suivant et fournis des recommandations cliniques structurées.

CONTEXTE PATIENT:
- Âge: ${context.age} ans
- Sexe: ${context.gender}
- Symptômes actuels: ${context.current_symptoms}
- Anamnèse: ${context.history}
- Examen physique: ${context.physical_exam}
- Signes vitaux: ${JSON.stringify(context.vital_signs)}
- Allergies: ${context.allergies}
- Médicaments actuels: ${context.current_medications}
- Antécédents: ${context.medical_history}

INSTRUCTIONS:
Génère 3-5 recommandations cliniques pertinentes, incluant:
1. Diagnostics différentiels (au moins 2-3 hypothèses)
2. Investigations recommandées (examens de laboratoire, imagerie)
3. Options thérapeutiques (si approprié)
4. Drapeaux rouges / alertes (si présents)

Pour chaque recommandation, fournis:
- Titre clair
- Description détaillée
- Justification médicale (rationale)
- Niveau de preuve (HIGH/MODERATE/LOW)
- Urgence (ROUTINE/SOON/URGENT/IMMEDIATE)
- Alternatives possibles

Format JSON attendu:
{
  "recommendations": [
    {
      "type": "DIFFERENTIAL_DIAGNOSIS" | "INVESTIGATION" | "TREATMENT" | "ALERT",
      "confidence": 0.0-1.0,
      "recommendation": {
        "title": "...",
        "description": "...",
        "rationale": "...",
        "evidence_level": "HIGH",
        "urgency": "ROUTINE",
        "alternatives": [{"option": "...", "pros": "...", "cons": "..."}]
      },
      "sources": [{"reference": "...", "url": "..."}]
    }
  ]
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                confidence: { type: "number" },
                recommendation: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    rationale: { type: "string" },
                    evidence_level: { type: "string" },
                    urgency: { type: "string" },
                    alternatives: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          option: { type: "string" },
                          pros: { type: "string" },
                          cons: { type: "string" }
                        }
                      }
                    }
                  }
                },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      reference: { type: "string" },
                      url: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return response.recommendations || [];
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleRecommendationDecision = async (recommendation, decision) => {
    setSelectedRecommendation(recommendation);
    setModifiedText(recommendation.recommendation.description);
    
    if (decision === 'REJECTED') {
      await updateRecommendationStatus(recommendation.id, 'REJECTED');
      toast.info('Recommandation rejetée');
    } else {
      setShowDecisionDialog(true);
    }
  };

  const saveDecision = async () => {
    try {
      await base44.entities.ClinicalRecommendation.update(selectedRecommendation.id, {
        physician_decision: physicianNotes ? 'ACCEPTED_MODIFIED' : 'ACCEPTED',
        physician_notes: physicianNotes,
        modified_recommendation: modifiedText !== selectedRecommendation.recommendation.description ? modifiedText : null,
        applied_at: new Date().toISOString()
      });

      // Appliquer la recommandation au formulaire de consultation
      if (onRecommendationApplied) {
        onRecommendationApplied({
          type: selectedRecommendation.recommendation_type,
          content: modifiedText,
          original: selectedRecommendation
        });
      }

      toast.success('Recommandation appliquée', {
        description: 'La recommandation a été ajoutée à la consultation'
      });

      setShowDecisionDialog(false);
      setPhysicianNotes('');
      
      // Refresh recommendations
      const updated = recommendations.map(r => 
        r.id === selectedRecommendation.id 
          ? { ...r, physician_decision: physicianNotes ? 'ACCEPTED_MODIFIED' : 'ACCEPTED' }
          : r
      );
      setRecommendations(updated);
    } catch (error) {
      console.error('Error saving decision:', error);
      toast.error('Échec de la sauvegarde');
    }
  };

  const updateRecommendationStatus = async (id, status) => {
    try {
      await base44.entities.ClinicalRecommendation.update(id, {
        physician_decision: status
      });
      
      const updated = recommendations.map(r => 
        r.id === id ? { ...r, physician_decision: status } : r
      );
      setRecommendations(updated);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DIFFERENTIAL_DIAGNOSIS': return Activity;
      case 'INVESTIGATION': return Eye;
      case 'TREATMENT': return TrendingUp;
      case 'ALERT': return AlertTriangle;
      case 'REFERRAL': return BookOpen;
      default: return Lightbulb;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'DIFFERENTIAL_DIAGNOSIS': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'INVESTIGATION': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'TREATMENT': return 'bg-green-100 text-green-800 border-green-300';
      case 'ALERT': return 'bg-red-100 text-red-800 border-red-300';
      case 'REFERRAL': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyBadge = (urgency) => {
    const colors = {
      IMMEDIATE: 'bg-red-500 text-white',
      URGENT: 'bg-orange-500 text-white',
      SOON: 'bg-yellow-500 text-black',
      ROUTINE: 'bg-green-500 text-white'
    };
    return colors[urgency] || colors.ROUTINE;
  };

  const getEvidenceBadge = (level) => {
    const colors = {
      HIGH: 'bg-green-100 text-green-800',
      MODERATE: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-orange-100 text-orange-800',
      EXPERT_OPINION: 'bg-blue-100 text-blue-800'
    };
    return colors[level] || colors.EXPERT_OPINION;
  };

  if (!patient || !consultationData) return null;

  const pendingRecommendations = recommendations.filter(r => r.physician_decision === 'PENDING');

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Aide à la Décision Clinique</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Recommandations générées par IA • Validation médicale requise
                </p>
              </div>
            </div>
            <Button
              onClick={analyzePatientContext}
              disabled={isAnalyzing || !consultationData.motif}
              variant="outline"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {recommendations.length > 0 ? 'Réanalyser' : 'Analyser le cas'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Recommendations List */}
      <AnimatePresence>
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {pendingRecommendations.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">
                    {pendingRecommendations.length} recommandation(s) en attente de validation
                  </p>
                </div>
              </div>
            )}

            {recommendations.map((rec) => {
              const TypeIcon = getTypeIcon(rec.recommendation_type);
              const isExpanded = expandedCards.has(rec.id);
              const isPending = rec.physician_decision === 'PENDING';

              return (
                <motion.div
                  key={rec.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "border-2 rounded-lg overflow-hidden transition-all",
                    isPending ? "border-primary/30 shadow-md" : "border-border"
                  )}
                >
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(rec.id)}>
                    <div className={cn("p-4", getTypeColor(rec.recommendation_type))}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <TypeIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h4 className="font-semibold text-sm">
                                {rec.recommendation.title}
                              </h4>
                              <Badge className={getUrgencyBadge(rec.recommendation.urgency)} variant="secondary">
                                {rec.recommendation.urgency}
                              </Badge>
                              <Badge className={getEvidenceBadge(rec.recommendation.evidence_level)} variant="outline">
                                {rec.recommendation.evidence_level}
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <Brain className="w-3 h-3" />
                                {Math.round(rec.confidence_score * 100)}%
                              </Badge>
                            </div>
                            <p className="text-sm opacity-90 line-clamp-2">
                              {rec.recommendation.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {rec.physician_decision === 'ACCEPTED' && (
                            <Badge className="bg-green-500 text-white gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Appliquée
                            </Badge>
                          )}
                          {rec.physician_decision === 'REJECTED' && (
                            <Badge className="bg-red-500 text-white gap-1">
                              <XCircle className="w-3 h-3" />
                              Rejetée
                            </Badge>
                          )}
                          
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="p-4 bg-card space-y-4">
                        {/* Rationale */}
                        <div>
                          <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Justification médicale
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {rec.recommendation.rationale}
                          </p>
                        </div>

                        {/* Alternatives */}
                        {rec.recommendation.alternatives && rec.recommendation.alternatives.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-sm mb-2">Options alternatives</h5>
                            <div className="space-y-2">
                              {rec.recommendation.alternatives.map((alt, idx) => (
                                <div key={idx} className="bg-muted p-3 rounded-lg text-sm">
                                  <p className="font-medium mb-1">{alt.option}</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-green-600 font-medium">Pour:</span> {alt.pros}
                                    </div>
                                    <div>
                                      <span className="text-red-600 font-medium">Contre:</span> {alt.cons}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sources */}
                        {rec.sources && rec.sources.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-sm mb-2">Sources médicales</h5>
                            <div className="space-y-1">
                              {rec.sources.map((source, idx) => (
                                <a
                                  key={idx}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline block"
                                >
                                  {source.reference}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && (
                          <div className="flex items-center gap-2 pt-3 border-t">
                            <Button
                              onClick={() => handleRecommendationDecision(rec, 'ACCEPTED')}
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              Appliquer
                            </Button>
                            <Button
                              onClick={() => handleRecommendationDecision(rec, 'ACCEPTED')}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              Modifier & Appliquer
                            </Button>
                            <Button
                              onClick={() => handleRecommendationDecision(rec, 'REJECTED')}
                              size="sm"
                              variant="destructive"
                              className="gap-2"
                            >
                              <ThumbsDown className="w-4 h-4" />
                              Rejeter
                            </Button>
                          </div>
                        )}

                        {/* AI Disclaimer */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-amber-800">
                            <strong>⚠️ Avertissement:</strong> Cette recommandation est générée par intelligence artificielle et doit être validée par un professionnel de santé. 
                            Elle ne remplace pas le jugement clinique du médecin.
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appliquer la recommandation</DialogTitle>
            <DialogDescription>
              Vous pouvez modifier le texte avant de l'appliquer à la consultation et ajouter des notes personnelles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Texte de la recommandation</label>
              <Textarea
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes du médecin (optionnel)</label>
              <Textarea
                value={physicianNotes}
                onChange={(e) => setPhysicianNotes(e.target.value)}
                placeholder="Ajoutez vos notes, ajustements ou raisons de modification..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              Annuler
            </Button>
            <Button onClick={saveDecision} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Confirmer & Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {recommendations.length === 0 && !isAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucune analyse disponible</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Remplissez les champs "Motif" et "Anamnèse" pour obtenir des recommandations cliniques assistées par IA.
            </p>
            <Button
              onClick={analyzePatientContext}
              disabled={!consultationData?.motif}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Lancer l'analyse
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
