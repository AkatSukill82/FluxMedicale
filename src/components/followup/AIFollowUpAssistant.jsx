import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Loader2,
  RefreshCw,
  Lightbulb,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, subDays } from 'date-fns';

export default function AIFollowUpAssistant({ plan, progressEntries = [], onSuggestObjective }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyse complète par IA
  const runAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      // Préparer les données pour l'analyse
      const progressData = progressEntries.map(e => ({
        date: e.date,
        type: e.type,
        value: e.numeric_value,
        unit: e.unit,
        mood: e.mood,
        adherence: e.adherence_score
      }));

      const objectivesData = plan.objectives?.map(o => ({
        title: o.title,
        current: o.current_value,
        target: o.target_value,
        unit: o.unit,
        status: o.status,
        progress: o.progress_percent
      })) || [];

      const stepsData = plan.steps?.map(s => ({
        title: s.title,
        status: s.status,
        type: s.type
      })) || [];

      // Calculs locaux
      const recentEntries = progressEntries.filter(e => 
        new Date(e.date) >= subDays(new Date(), 30)
      );
      const avgAdherence = recentEntries.length > 0
        ? Math.round(recentEntries.reduce((s, e) => s + (e.adherence_score || 0), 0) / recentEntries.length)
        : null;
      
      const moodTrend = calculateMoodTrend(recentEntries);
      const completedSteps = plan.steps?.filter(s => s.status === 'termine').length || 0;
      const totalSteps = plan.steps?.length || 0;

      // Appel IA
      const prompt = `Tu es un assistant médical spécialisé dans le suivi des traitements. Analyse ces données de suivi patient et fournis des insights cliniques.

PLAN DE TRAITEMENT: ${plan.title}
Condition: ${plan.condition || 'Non spécifiée'}
Durée: ${differenceInDays(new Date(), new Date(plan.start_date))} jours
Progression globale: ${plan.overall_progress || 0}%

OBJECTIFS:
${objectivesData.map(o => `- ${o.title}: ${o.current || '?'} → ${o.target} ${o.unit} (${o.status})`).join('\n')}

ÉTAPES (${completedSteps}/${totalSteps} terminées):
${stepsData.map(s => `- ${s.title}: ${s.status}`).join('\n')}

DONNÉES RÉCENTES (30 jours):
- Mesures enregistrées: ${recentEntries.length}
- Adhérence moyenne: ${avgAdherence !== null ? avgAdherence + '%' : 'Non mesurée'}
- Tendance humeur: ${moodTrend}

HISTORIQUE MESURES:
${progressData.slice(0, 10).map(p => `${p.date}: ${p.type} = ${p.value} ${p.unit || ''}`).join('\n')}

Fournis une analyse JSON avec:
1. prediction: objet avec predicted_outcome (success/partial/at_risk), confidence (0-100), reasoning
2. adherence_risk: objet avec risk_level (low/medium/high), factors (array de facteurs de risque), recommendations (array)
3. progress_summary: résumé de progression en 2-3 phrases pour le médecin
4. suggested_objectives: array de 2-3 nouveaux objectifs personnalisés avec title, target_value, unit, rationale
5. alerts: array d'alertes importantes à signaler au médecin`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            prediction: {
              type: 'object',
              properties: {
                predicted_outcome: { type: 'string' },
                confidence: { type: 'number' },
                reasoning: { type: 'string' }
              }
            },
            adherence_risk: {
              type: 'object',
              properties: {
                risk_level: { type: 'string' },
                factors: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } }
              }
            },
            progress_summary: { type: 'string' },
            suggested_objectives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  target_value: { type: 'string' },
                  unit: { type: 'string' },
                  rationale: { type: 'string' }
                }
              }
            },
            alerts: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      setAnalysis({
        ...result,
        localStats: {
          avgAdherence,
          moodTrend,
          completedSteps,
          totalSteps,
          daysSinceStart: differenceInDays(new Date(), new Date(plan.start_date)),
          recentEntriesCount: recentEntries.length
        }
      });

      toast.success('Analyse IA terminée');
    } catch (error) {
      toast.error('Erreur d\'analyse: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculer tendance humeur
  const calculateMoodTrend = (entries) => {
    const moodValues = { excellent: 5, bien: 4, moyen: 3, difficile: 2, tres_difficile: 1 };
    const moodsWithValue = entries.filter(e => e.mood).map(e => moodValues[e.mood] || 3);
    if (moodsWithValue.length < 2) return 'Insuffisant';
    
    const firstHalf = moodsWithValue.slice(0, Math.floor(moodsWithValue.length / 2));
    const secondHalf = moodsWithValue.slice(Math.floor(moodsWithValue.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (avgSecond > avgFirst + 0.5) return 'En amélioration';
    if (avgSecond < avgFirst - 0.5) return 'En déclin';
    return 'Stable';
  };

  const getPredictionColor = (outcome) => {
    switch (outcome) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'at_risk': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + bouton analyse */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Assistant IA - Suivi intelligent</h3>
                <p className="text-sm text-muted-foreground">Analyse prédictive et recommandations</p>
              </div>
            </div>
            <Button onClick={runAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {analysis ? 'Actualiser' : 'Analyser'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* Alertes */}
          {analysis.alerts?.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                <ul className="list-disc ml-4 text-sm">
                  {analysis.alerts.map((alert, i) => (
                    <li key={i}>{alert}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Prédiction */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Prédiction de résultat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`p-3 rounded-lg border ${getPredictionColor(analysis.prediction?.predicted_outcome)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">
                      {analysis.prediction?.predicted_outcome === 'success' && '✓ Succès probable'}
                      {analysis.prediction?.predicted_outcome === 'partial' && '◐ Résultat partiel'}
                      {analysis.prediction?.predicted_outcome === 'at_risk' && '⚠ À risque'}
                    </span>
                    <Badge variant="outline">
                      Confiance: {analysis.prediction?.confidence}%
                    </Badge>
                  </div>
                  <p className="text-sm">{analysis.prediction?.reasoning}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  Basé sur {analysis.localStats?.recentEntriesCount} mesures récentes
                </div>
              </CardContent>
            </Card>

            {/* Risque de non-adhérence */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Risque de non-adhérence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${getRiskColor(analysis.adherence_risk?.risk_level)}`}>
                    {analysis.adherence_risk?.risk_level === 'low' && 'Faible'}
                    {analysis.adherence_risk?.risk_level === 'medium' && 'Modéré'}
                    {analysis.adherence_risk?.risk_level === 'high' && 'Élevé'}
                  </div>
                  {analysis.localStats?.avgAdherence !== null && (
                    <Badge variant="secondary">
                      Adhérence: {analysis.localStats.avgAdherence}%
                    </Badge>
                  )}
                </div>

                {analysis.adherence_risk?.factors?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Facteurs de risque:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {analysis.adherence_risk.factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-orange-500">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Résumé de progression */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Résumé de progression (pour le médecin)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                {analysis.progress_summary}
              </p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>📅 {analysis.localStats?.daysSinceStart} jours de traitement</span>
                <span>✓ {analysis.localStats?.completedSteps}/{analysis.localStats?.totalSteps} étapes</span>
                <span>😊 Humeur: {analysis.localStats?.moodTrend}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recommandations */}
          {analysis.adherence_risk?.recommendations?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  Recommandations pour améliorer l'adhérence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.adherence_risk.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Objectifs suggérés */}
          {analysis.suggested_objectives?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  Objectifs personnalisés suggérés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.suggested_objectives.map((obj, i) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-1">
                      <p className="font-medium">{obj.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Cible: <strong>{obj.target_value} {obj.unit}</strong>
                      </p>
                      <p className="text-xs text-purple-700 mt-1">{obj.rationale}</p>
                    </div>
                    {onSuggestObjective && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onSuggestObjective(obj)}
                        className="ml-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!analysis && !isAnalyzing && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Cliquez sur "Analyser" pour obtenir des insights IA</p>
          <p className="text-sm">Prédictions, risques et recommandations personnalisées</p>
        </div>
      )}
    </div>
  );
}