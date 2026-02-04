import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw,
  Stethoscope,
  FileText,
  Pill,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function AIConsultationAssistant({ 
  isOpen, 
  onClose, 
  patient,
  currentData,
  onApply 
}) {
  const [symptoms, setSymptoms] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(null);
  const [copied, setCopied] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');

  const patientAge = patient?.birthDate 
    ? Math.floor((new Date() - new Date(patient.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const patientGender = patient?.gender === 'male' ? 'homme' : patient?.gender === 'female' ? 'femme' : 'patient';

  const generateNote = async () => {
    if (!symptoms.trim()) {
      toast.error('Veuillez décrire les symptômes du patient');
      return;
    }

    setIsGenerating(true);
    setGeneratedNote(null);

    try {
      const prompt = `Tu es un assistant médical pour un médecin généraliste belge. 
Génère une note de consultation structurée basée sur les symptômes décrits.

PATIENT:
- Âge: ${patientAge ? `${patientAge} ans` : 'Non précisé'}
- Sexe: ${patientGender}
- Antécédents: ${patient?.antecedents_medicaux || 'Non précisés'}
- Allergies: ${patient?.allergies || 'Aucune connue'}
- Traitements actuels: ${patient?.medicaments_actuels || 'Aucun'}

SYMPTÔMES DÉCRITS PAR LE MÉDECIN:
${symptoms}

${additionalContext ? `CONTEXTE ADDITIONNEL:\n${additionalContext}` : ''}

Génère une note de consultation complète avec les sections suivantes:
1. ANAMNÈSE: Histoire détaillée de la maladie actuelle basée sur les symptômes
2. EXAMEN CLINIQUE: Éléments à examiner et observations attendues
3. DIAGNOSTIC: Diagnostic(s) différentiel(s) probable(s) avec codes ICD-10 si possible
4. PLAN THÉRAPEUTIQUE: Traitement suggéré et conseils
5. SUIVI: Recommandations de suivi

IMPORTANT: 
- Utilise un langage médical professionnel
- Sois précis et concis
- N'invente pas de données d'examen, suggère ce qu'il faut vérifier
- Propose des diagnostics différentiels plausibles`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            anamnese: { type: "string", description: "Anamnèse détaillée" },
            examen_clinique: { type: "string", description: "Éléments d'examen clinique" },
            diagnostic: { type: "string", description: "Diagnostic(s) différentiel(s)" },
            codes_icd10: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" }
                }
              },
              description: "Codes ICD-10 suggérés" 
            },
            plan_therapeutique: { type: "string", description: "Plan de traitement" },
            medicaments_suggeres: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  posologie: { type: "string" },
                  duree: { type: "string" }
                }
              }
            },
            suivi: { type: "string", description: "Recommandations de suivi" },
            drapeaux_rouges: {
              type: "array",
              items: { type: "string" },
              description: "Signes d'alerte à surveiller"
            }
          },
          required: ["anamnese", "examen_clinique", "diagnostic", "plan_therapeutique", "suivi"]
        }
      });

      setGeneratedNote(response);
      toast.success('Note générée avec succès');
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text, field) => {
    await navigator.clipboard.writeText(text);
    setCopied({ ...copied, [field]: true });
    setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    toast.success('Copié dans le presse-papiers');
  };

  const applySection = (field, value) => {
    if (onApply) {
      onApply(field, value);
      toast.success('Section appliquée');
    }
  };

  const applyAll = () => {
    if (onApply && generatedNote) {
      onApply('anamnese', generatedNote.anamnese);
      onApply('examen_clinique', generatedNote.examen_clinique);
      onApply('diagnostic', generatedNote.diagnostic);
      onApply('traitement', generatedNote.plan_therapeutique);
      toast.success('Toutes les sections ont été appliquées');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Assistant IA - Génération de Notes
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Décrivez les symptômes du patient et l'IA générera une note de consultation structurée
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Info patient */}
            {patient && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline" className="bg-white">
                    {patientGender}, {patientAge ? `${patientAge} ans` : 'âge inconnu'}
                  </Badge>
                  {patient.allergies && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      ⚠️ Allergies: {patient.allergies}
                    </Badge>
                  )}
                </div>
              </Card>
            )}

            {/* Saisie des symptômes */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">
                Décrivez les symptômes et plaintes du patient
              </Label>
              <Textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Ex: Patient se plaint de toux sèche depuis 3 jours, accompagnée de fièvre à 38.5°C, fatigue et légère dyspnée à l'effort. Pas de douleur thoracique. Contact récent avec personne grippée..."
                className="min-h-[120px] text-base"
              />
              <p className="text-xs text-slate-500">
                Plus les symptômes sont détaillés, meilleure sera la note générée
              </p>
            </div>

            {/* Options avancées */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-slate-600"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                Options avancées
              </Button>
              
              {showAdvanced && (
                <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-medium">Contexte additionnel (optionnel)</Label>
                  <Textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Ex: Le patient travaille dans un environnement poussiéreux, voyage récent, contexte familial particulier..."
                    className="mt-2 min-h-[80px]"
                  />
                </div>
              )}
            </div>

            {/* Bouton générer */}
            <div className="flex justify-center">
              <Button
                onClick={generateNote}
                disabled={isGenerating || !symptoms.trim()}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 gap-2 px-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Générer la note
                  </>
                )}
              </Button>
            </div>

            {/* Résultat généré */}
            {generatedNote && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Note générée
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateNote}
                      className="gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Régénérer
                    </Button>
                    <Button
                      size="sm"
                      onClick={applyAll}
                      className="bg-green-600 hover:bg-green-700 gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Tout appliquer
                    </Button>
                  </div>
                </div>

                {/* Drapeaux rouges */}
                {generatedNote.drapeaux_rouges?.length > 0 && (
                  <Card className="p-4 bg-red-50 border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-800">Signes d'alerte à surveiller</p>
                        <ul className="mt-2 space-y-1">
                          {generatedNote.drapeaux_rouges.map((flag, idx) => (
                            <li key={idx} className="text-sm text-red-700">• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Sections */}
                <div className="space-y-4">
                  {/* Anamnèse */}
                  <SectionCard
                    title="Anamnèse"
                    icon={<FileText className="w-4 h-4" />}
                    content={generatedNote.anamnese}
                    onCopy={() => copyToClipboard(generatedNote.anamnese, 'anamnese')}
                    onApply={() => applySection('anamnese', generatedNote.anamnese)}
                    copied={copied.anamnese}
                  />

                  {/* Examen clinique */}
                  <SectionCard
                    title="Examen clinique suggéré"
                    icon={<Stethoscope className="w-4 h-4" />}
                    content={generatedNote.examen_clinique}
                    onCopy={() => copyToClipboard(generatedNote.examen_clinique, 'examen')}
                    onApply={() => applySection('examen_clinique', generatedNote.examen_clinique)}
                    copied={copied.examen}
                  />

                  {/* Diagnostic */}
                  <SectionCard
                    title="Diagnostic différentiel"
                    icon={<FileText className="w-4 h-4" />}
                    content={generatedNote.diagnostic}
                    onCopy={() => copyToClipboard(generatedNote.diagnostic, 'diagnostic')}
                    onApply={() => applySection('diagnostic', generatedNote.diagnostic)}
                    copied={copied.diagnostic}
                    extra={
                      generatedNote.codes_icd10?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {generatedNote.codes_icd10.map((code, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50">
                              {code.code}: {code.description}
                            </Badge>
                          ))}
                        </div>
                      )
                    }
                  />

                  {/* Plan thérapeutique */}
                  <SectionCard
                    title="Plan thérapeutique"
                    icon={<Pill className="w-4 h-4" />}
                    content={generatedNote.plan_therapeutique}
                    onCopy={() => copyToClipboard(generatedNote.plan_therapeutique, 'traitement')}
                    onApply={() => applySection('traitement', generatedNote.plan_therapeutique)}
                    copied={copied.traitement}
                    extra={
                      generatedNote.medicaments_suggeres?.length > 0 && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="font-medium text-green-800 text-sm mb-2">Médicaments suggérés:</p>
                          <div className="space-y-1">
                            {generatedNote.medicaments_suggeres.map((med, idx) => (
                              <div key={idx} className="text-sm text-green-700">
                                • <strong>{med.nom}</strong> - {med.posologie} ({med.duree})
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                  />

                  {/* Suivi */}
                  <SectionCard
                    title="Recommandations de suivi"
                    icon={<FileText className="w-4 h-4" />}
                    content={generatedNote.suivi}
                    onCopy={() => copyToClipboard(generatedNote.suivi, 'suivi')}
                    copied={copied.suivi}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({ title, icon, content, onCopy, onApply, copied, extra }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold flex items-center gap-2 text-slate-800">
          {icon}
          {title}
        </h4>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-7 px-2"
          >
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          </Button>
          {onApply && (
            <Button
              variant="outline"
              size="sm"
              onClick={onApply}
              className="h-7 px-2 text-xs"
            >
              Appliquer
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{content}</p>
      {extra}
    </Card>
  );
}