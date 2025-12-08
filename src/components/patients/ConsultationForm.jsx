
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSave } from '../AutoSave';
import SmartSuggestions from '../SmartSuggestions';
import ClinicalDecisionSupport from '../clinical/ClinicalDecisionSupport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ConsultationForm({ patientId, consultation, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    motif: '',
    anamnese: '',
    examen_clinique: '',
    diagnostic: '',
    traitement_prescrit: '',
    examens_demandes: '',
    notes_suivi: '',
    ...consultation
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [patient, setPatient] = useState(null);
  const [vitalSigns, setVitalSigns] = useState(null);

  // Charger les données du patient
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const [patientData, vitals] = await Promise.all([
          base44.entities.Patient.filter({ id: patientId }).then(res => res[0]),
          base44.entities.VitalSigns.filter({ patient_id: patientId }).then(res => res[0])
        ]);
        setPatient(patientData);
        setVitalSigns(vitals);
      } catch (error) {
        console.error('Error loading patient data:', error);
      }
    };

    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  // Auto-save brouillon toutes les 2 secondes
  useAutoSave(
    formData,
    async (data) => {
      const draftKey = `consultation_draft_${patientId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
      setLastSaved(new Date());
    },
    {
      enabled: true,
      delay: 2000,
      showToast: false
    }
  );

  // Charger brouillon si existant
  useEffect(() => {
    if (!consultation) {
      const draftKey = `consultation_draft_${patientId}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const { data, timestamp } = JSON.parse(draft);
          const draftDate = new Date(timestamp);
          const hoursSince = (new Date() - draftDate) / (1000 * 60 * 60);
          
          if (hoursSince < 24) {
            toast.info('Brouillon récupéré', {
              description: `Sauvegardé ${new Date(timestamp).toLocaleString()}`,
              action: {
                label: 'Supprimer',
                onClick: () => {
                  localStorage.removeItem(draftKey);
                  setFormData({
                    motif: '',
                    anamnese: '',
                    examen_clinique: '',
                    diagnostic: '',
                    traitement_prescrit: '',
                    examens_demandes: '',
                    notes_suivi: ''
                  });
                }
              }
            });
            setFormData(data);
            setLastSaved(draftDate);
          } else {
            localStorage.removeItem(draftKey);
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [patientId, consultation]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAISuggestion = async (field) => {
    setIsGenerating(true);
    try {
      const prompt = `En tant que médecin, génère une suggestion pour le champ "${field}" d'une consultation médicale.
Context: 
- Motif: ${formData.motif}
- Anamnèse: ${formData.anamnese}
${formData.examen_clinique ? `- Examen clinique: ${formData.examen_clinique}` : ''}

Fournis une suggestion concise, professionnelle et médicalement pertinente en français.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      handleChange(field, response);
      toast.success('Suggestion générée', {
        description: 'Vous pouvez modifier le texte généré'
      });
    } catch (error) {
      console.error('Error generating suggestion:', error);
      toast.error('Échec de la génération', {
        description: 'Veuillez réessayer'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecommendationApplied = (recommendation) => {
    // Appliquer la recommandation au bon champ selon le type
    switch (recommendation.type) {
      case 'DIFFERENTIAL_DIAGNOSIS':
        handleChange('diagnostic', 
          (formData.diagnostic ? formData.diagnostic + '\n\n' : '') + 
          '🤖 Diagnostic suggéré par IA:\n' + recommendation.content
        );
        break;
      case 'INVESTIGATION':
        handleChange('examens_demandes', 
          (formData.examens_demandes ? formData.examens_demandes + '\n\n' : '') + 
          '🤖 Examens suggérés par IA:\n' + recommendation.content
        );
        break;
      case 'TREATMENT':
        handleChange('traitement_prescrit', 
          (formData.traitement_prescrit ? formData.traitement_prescrit + '\n\n' : '') + 
          '🤖 Traitement suggéré par IA:\n' + recommendation.content
        );
        break;
      case 'ALERT':
        handleChange('notes_suivi', 
          (formData.notes_suivi ? formData.notes_suivi + '\n\n' : '') + 
          '⚠️ Alerte clinique:\n' + recommendation.content
        );
        break;
      default:
        handleChange('notes_suivi', 
          (formData.notes_suivi ? formData.notes_suivi + '\n\n' : '') + 
          '🤖 Note IA:\n' + recommendation.content
        );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    // Supprimer le brouillon après sauvegarde réussie
    localStorage.removeItem(`consultation_draft_${patientId}`);
  };

  const handleSuggestionClick = (suggestion) => {
    console.log('Suggestion clicked:', suggestion);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {consultation ? 'Modifier la consultation' : 'Nouvelle consultation'}
        </h2>
        {lastSaved && (
          <div className="text-xs text-muted-foreground">
            Brouillon sauvegardé à {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      <Tabs defaultValue="consultation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="consultation">Consultation</TabsTrigger>
          <TabsTrigger value="decision-support">Aide à la Décision</TabsTrigger>
        </TabsList>

        <TabsContent value="consultation" className="space-y-6 mt-6">
          <SmartSuggestions 
            patientId={patientId} 
            context="consultation"
            onSuggestionClick={handleSuggestionClick}
          />

          <Card>
            <CardHeader>
              <CardTitle>Motif de consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.motif}
                onChange={(e) => handleChange('motif', e.target.value)}
                placeholder="Décrivez le motif de la consultation..."
                rows={2}
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Anamnèse</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAISuggestion('anamnese')}
                  disabled={isGenerating || !formData.motif}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Suggérer avec IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.anamnese}
                onChange={(e) => handleChange('anamnese', e.target.value)}
                placeholder="Histoire de la maladie, symptômes..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Examen clinique</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAISuggestion('examen_clinique')}
                  disabled={isGenerating || !formData.motif}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Suggérer avec IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.examen_clinique}
                onChange={(e) => handleChange('examen_clinique', e.target.value)}
                placeholder="Résultats de l'examen physique..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Diagnostic</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAISuggestion('diagnostic')}
                  disabled={isGenerating || !formData.examen_clinique}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Suggérer avec IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.diagnostic}
                onChange={(e) => handleChange('diagnostic', e.target.value)}
                placeholder="Diagnostic posé..."
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traitement prescrit</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.traitement_prescrit}
                  onChange={(e) => handleChange('traitement_prescrit', e.target.value)}
                  placeholder="Médicaments, posologie..."
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Examens demandés</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.examens_demandes}
                  onChange={(e) => handleChange('examens_demandes', e.target.value)}
                  placeholder="Examens complémentaires..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notes de suivi</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes_suivi}
                onChange={(e) => handleChange('notes_suivi', e.target.value)}
                placeholder="Instructions pour le suivi..."
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision-support" className="mt-6">
          {patient && (
            <ClinicalDecisionSupport
              patient={patient}
              consultationData={formData}
              vitalSigns={vitalSigns}
              onRecommendationApplied={handleRecommendationApplied}
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          {consultation ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}
