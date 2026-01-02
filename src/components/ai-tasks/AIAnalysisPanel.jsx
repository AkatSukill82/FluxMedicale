import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Sparkles,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths, differenceInYears } from 'date-fns';

export default function AIAnalysisPanel({ patients = [], consultations = [] }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  const runGlobalAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      // Préparer les données
      const recentConsults = consultations.filter(c => 
        new Date(c.date_consultation) >= subMonths(new Date(), 3)
      );

      // Statistiques de base
      const stats = {
        totalPatients: patients.length,
        activePatients: new Set(recentConsults.map(c => c.patient_id)).size,
        totalConsultations: recentConsults.length,
        avgAge: patients.length > 0 ? 
          Math.round(patients.reduce((sum, p) => {
            const age = p.birthDate ? differenceInYears(new Date(), new Date(p.birthDate)) : 0;
            return sum + age;
          }, 0) / patients.length) : 0
      };

      // Diagnostics fréquents
      const diagCounts = {};
      recentConsults.forEach(c => {
        if (c.diagnostic) {
          const diag = c.diagnostic.split(',')[0].trim().substring(0, 40);
          diagCounts[diag] = (diagCounts[diag] || 0) + 1;
        }
      });
      const topDiagnoses = Object.entries(diagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Analyse IA
      const prompt = `En tant qu'assistant médical IA, analyse ces données de cabinet médical et fournis des insights utiles:

STATISTIQUES (3 derniers mois):
- Patients actifs: ${stats.activePatients}/${stats.totalPatients}
- Consultations: ${stats.totalConsultations}
- Âge moyen patients: ${stats.avgAge} ans

DIAGNOSTICS FRÉQUENTS:
${topDiagnoses.map(([d, c]) => `- ${d}: ${c} cas`).join('\n')}

Fournis:
1. Une analyse des tendances
2. Des alertes ou points d'attention
3. Des recommandations pratiques pour optimiser le cabinet`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            trends: { type: 'array', items: { type: 'string' } },
            alerts: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' }
          }
        }
      });

      setAnalysis({
        stats,
        topDiagnoses,
        aiInsights: result
      });

    } catch (error) {
      toast.error('Erreur d\'analyse: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCustomAnalysis = async () => {
    if (!customQuery.trim()) return;
    setIsAnalyzing(true);

    try {
      const context = `Données disponibles: ${patients.length} patients, ${consultations.length} consultations.
Âge moyen: ${patients.length > 0 ? Math.round(patients.reduce((s, p) => s + (p.birthDate ? differenceInYears(new Date(), new Date(p.birthDate)) : 0), 0) / patients.length) : 0} ans.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nQuestion: ${customQuery}\n\nRéponds de manière concise et professionnelle.`
      });

      setAnalysis(prev => ({
        ...prev,
        customResponse: result
      }));
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lancer l'analyse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Analyse globale du cabinet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runGlobalAnalysis} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Lancer l'analyse IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {analysis && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{analysis.stats?.activePatients}</p>
                <p className="text-xs text-muted-foreground">Patients actifs (3 mois)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{analysis.stats?.totalConsultations}</p>
                <p className="text-xs text-muted-foreground">Consultations</p>
              </CardContent>
            </Card>
          </div>

          {/* Insights IA */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Tendances */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Tendances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {analysis.aiInsights?.trends?.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Alertes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Points d'attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {analysis.aiInsights?.alerts?.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-orange-600">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recommandations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {analysis.aiInsights?.recommendations?.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-600">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Top diagnostics */}
          {analysis.topDiagnoses?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Diagnostics les plus fréquents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.topDiagnoses.map(([diag, count], i) => (
                    <Badge key={i} variant="secondary">
                      {diag} <span className="ml-1 text-muted-foreground">({count})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Question personnalisée */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poser une question à l'IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Ex: Quels patients diabétiques n'ont pas eu de contrôle récent?"
            rows={2}
          />
          <Button onClick={runCustomAnalysis} disabled={isAnalyzing || !customQuery.trim()}>
            <Brain className="w-4 h-4 mr-2" />
            Analyser
          </Button>
          {analysis?.customResponse && (
            <div className="p-4 bg-purple-50 rounded-lg mt-3">
              <p className="text-sm">{analysis.customResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}