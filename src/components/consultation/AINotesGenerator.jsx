import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw,
  Lightbulb,
  FileText,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AINotesGenerator({ 
  motif,
  symptoms,
  vitalSigns,
  patientInfo,
  onGenerated 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState({});

  const generateNotes = async (type = 'full') => {
    setIsGenerating(true);
    try {
      const patientContext = patientInfo ? `
Patient: ${patientInfo.age || 'âge inconnu'} ans, ${patientInfo.gender === 'male' ? 'Homme' : patientInfo.gender === 'female' ? 'Femme' : 'Genre non spécifié'}
${patientInfo.allergies ? `Allergies connues: ${patientInfo.allergies}` : ''}
${patientInfo.antecedents ? `Antécédents: ${patientInfo.antecedents}` : ''}
${patientInfo.medicaments ? `Traitements en cours: ${patientInfo.medicaments}` : ''}
` : '';

      const vitalsContext = vitalSigns && Object.keys(vitalSigns).length > 0 ? `
Constantes vitales:
${vitalSigns.systolic && vitalSigns.diastolic ? `- TA: ${vitalSigns.systolic}/${vitalSigns.diastolic} mmHg` : ''}
${vitalSigns.heart_rate ? `- FC: ${vitalSigns.heart_rate} bpm` : ''}
${vitalSigns.temperature ? `- Température: ${vitalSigns.temperature}°C` : ''}
${vitalSigns.spo2 ? `- SpO2: ${vitalSigns.spo2}%` : ''}
${vitalSigns.weight ? `- Poids: ${vitalSigns.weight} kg` : ''}
` : '';

      const prompt = `Tu es un assistant médical pour un médecin généraliste belge. 
Génère une note de consultation structurée et professionnelle basée sur les informations suivantes.

${patientContext}

Motif de consultation: ${motif || 'Non spécifié'}

Symptômes décrits: ${symptoms || customPrompt || 'Non spécifiés'}

${vitalsContext}

${type === 'full' ? `
Génère une note complète avec:
1. ANAMNÈSE: Résumé structuré de l'histoire de la maladie actuelle
2. EXAMEN CLINIQUE: Proposition d'examen clinique pertinent à réaliser (ce que le médecin devrait vérifier)
3. HYPOTHÈSES DIAGNOSTIQUES: 2-3 hypothèses diagnostiques différentielles
4. PLAN: Propositions de prise en charge (examens complémentaires, traitement symptomatique)
` : type === 'anamnese' ? `
Génère uniquement une ANAMNÈSE structurée et détaillée.
` : type === 'examen' ? `
Génère uniquement une proposition d'EXAMEN CLINIQUE pertinent.
` : `
Génère uniquement des HYPOTHÈSES DIAGNOSTIQUES avec diagnostic différentiel.
`}

Réponds en français médical professionnel. Sois concis mais complet.
IMPORTANT: Ce sont des suggestions pour aider le médecin, pas un diagnostic définitif.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            anamnese: { type: "string", description: "Anamnèse structurée" },
            examen_clinique: { type: "string", description: "Proposition d'examen clinique" },
            hypotheses: { 
              type: "array", 
              items: { type: "string" },
              description: "Hypothèses diagnostiques"
            },
            plan: { type: "string", description: "Plan de prise en charge proposé" },
            alertes: {
              type: "array",
              items: { type: "string" },
              description: "Signaux d'alerte à surveiller"
            }
          }
        }
      });

      setGeneratedNotes(response);
      toast.success('Notes générées avec succès');
    } catch (error) {
      console.error('Erreur génération IA:', error);
      toast.error('Erreur lors de la génération des notes');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [field]: true });
    setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
  };

  const applyNotes = (field, content) => {
    if (onGenerated) {
      onGenerated(field, content);
      toast.success(`${field === 'anamnese' ? 'Anamnèse' : field === 'examen_clinique' ? 'Examen clinique' : 'Diagnostic'} appliqué`);
    }
  };

  return (
    <Card className="p-4 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900">Assistant IA - Génération de notes</h3>
        <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-700 border-purple-300">
          Beta
        </Badge>
      </div>

      {!generatedNotes ? (
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-purple-800 mb-2 block">
              Décrivez les symptômes du patient pour générer automatiquement les notes
            </Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Patient se plaint de toux sèche depuis 3 jours, fièvre modérée, fatigue générale, pas de dyspnée..."
              className="h-24 bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => generateNotes('full')}
              disabled={isGenerating || (!motif && !customPrompt)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer note complète
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => generateNotes('anamnese')}
              disabled={isGenerating || (!motif && !customPrompt)}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <FileText className="w-4 h-4 mr-2" />
              Anamnèse seule
            </Button>
            <Button
              variant="outline"
              onClick={() => generateNotes('hypotheses')}
              disabled={isGenerating || (!motif && !customPrompt)}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Hypothèses diagnostiques
            </Button>
          </div>

          <p className="text-xs text-purple-600">
            💡 L'IA génère des suggestions basées sur les symptômes. Le médecin reste responsable du diagnostic final.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bouton régénérer */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGeneratedNotes(null)}
              className="text-purple-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Régénérer
            </Button>
          </div>

          {/* Alertes */}
          {generatedNotes.alertes && generatedNotes.alertes.length > 0 && (
            <Card className="p-3 bg-red-50 border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Signaux d'alerte</p>
                  <ul className="text-sm text-red-700 mt-1 space-y-1">
                    {generatedNotes.alertes.map((alerte, idx) => (
                      <li key={idx}>• {alerte}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Anamnèse */}
          {generatedNotes.anamnese && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-purple-800">Anamnèse suggérée</Label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedNotes.anamnese, 'anamnese')}
                  >
                    {copied.anamnese ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => applyNotes('anamnese', generatedNotes.anamnese)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
              <Card className="p-3 bg-white">
                <p className="text-sm whitespace-pre-wrap">{generatedNotes.anamnese}</p>
              </Card>
            </div>
          )}

          {/* Examen clinique */}
          {generatedNotes.examen_clinique && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-purple-800">Examen clinique proposé</Label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedNotes.examen_clinique, 'examen')}
                  >
                    {copied.examen ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => applyNotes('examen_clinique', generatedNotes.examen_clinique)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
              <Card className="p-3 bg-white">
                <p className="text-sm whitespace-pre-wrap">{generatedNotes.examen_clinique}</p>
              </Card>
            </div>
          )}

          {/* Hypothèses diagnostiques */}
          {generatedNotes.hypotheses && generatedNotes.hypotheses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-purple-800">Hypothèses diagnostiques</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedNotes.hypotheses.join('\n'), 'hypotheses')}
                >
                  {copied.hypotheses ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Card className="p-3 bg-white">
                <ul className="text-sm space-y-2">
                  {generatedNotes.hypotheses.map((hyp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                      <span>{hyp}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* Plan */}
          {generatedNotes.plan && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-purple-800">Plan de prise en charge suggéré</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedNotes.plan, 'plan')}
                >
                  {copied.plan ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Card className="p-3 bg-white">
                <p className="text-sm whitespace-pre-wrap">{generatedNotes.plan}</p>
              </Card>
            </div>
          )}

          <p className="text-xs text-purple-600 text-center">
            ⚠️ Ces suggestions sont générées par IA. Vérifiez et adaptez selon votre jugement clinique.
          </p>
        </div>
      )}
    </Card>
  );
}