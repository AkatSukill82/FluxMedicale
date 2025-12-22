import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, XCircle, Stethoscope, Brain } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  CONTRAINDICATED: {
    icon: XCircle,
    color: 'bg-red-100 border-red-500 text-red-900',
    badgeColor: 'bg-red-500 text-white',
    label: 'CONTRE-INDIQUÉ'
  },
  MAJOR: {
    icon: AlertTriangle,
    color: 'bg-orange-100 border-orange-500 text-orange-900',
    badgeColor: 'bg-orange-500 text-white',
    label: 'MAJEURE'
  },
  MODERATE: {
    icon: AlertCircle,
    color: 'bg-yellow-100 border-yellow-500 text-yellow-900',
    badgeColor: 'bg-yellow-500 text-white',
    label: 'MODÉRÉE'
  },
  MINOR: {
    icon: Info,
    color: 'bg-blue-100 border-blue-500 text-blue-900',
    badgeColor: 'bg-blue-500 text-white',
    label: 'MINEURE'
  }
};

export default function InteractionChecker({ selectedMedications, patientId }) {
  const [interactions, setInteractions] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Charger les médicaments actuels du patient
  const { data: currentMedications = [] } = useQuery({
    queryKey: ['patient-medications', patientId],
    queryFn: async () => {
      const prescriptions = await base44.entities.Prescription.filter({ patient_id: patientId });
      // Récupérer les médicaments des prescriptions récentes (moins de 3 mois)
      const recentPrescriptions = prescriptions.filter(p => {
        const prescDate = new Date(p.date_prescription);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return prescDate > threeMonthsAgo;
      });
      return recentPrescriptions.flatMap(p => p.medicaments || []);
    },
    enabled: !!patientId
  });

  // Charger les allergies du patient
  const { data: allergies = [] } = useQuery({
    queryKey: ['patient-allergies', patientId],
    queryFn: () => base44.entities.Allergy.filter({ patient_id: patientId, status: 'ACTIVE' }),
    enabled: !!patientId
  });

  useEffect(() => {
    // Vérifier les interactions entre médicaments sélectionnés et médicaments actuels
    const checkInteractions = async () => {
      const allInteractions = [];
      
      // 1. Vérifier les allergies
      for (const med of selectedMedications) {
        for (const allergy of allergies) {
          if (allergy.allergen_type === 'MEDICATION') {
            // Vérifier si le médicament contient l'allergène
            const allergenLower = allergy.allergen.toLowerCase();
            if (med.product_name?.toLowerCase().includes(allergenLower) ||
                med.substance_name?.toLowerCase().includes(allergenLower)) {
              allInteractions.push({
                type: 'ALLERGY',
                drug1: med.product_name,
                drug2: `Allergie: ${allergy.allergen}`,
                severity: allergy.severity === 'LIFE_THREATENING' ? 'CONTRAINDICATED' : 
                         allergy.severity === 'SEVERE' ? 'MAJOR' : 'MODERATE',
                description: `Patient allergique à ${allergy.allergen}. Réaction: ${allergy.reaction}`,
                recommendation: 'NE PAS PRESCRIRE - Allergie connue du patient'
              });
            }
          }
        }
      }
      
      // 2. Interactions avec médicaments actuels
      for (const med of selectedMedications) {
        if (med.interactions && Array.isArray(med.interactions)) {
          for (const currentMed of currentMedications) {
            const interaction = med.interactions.find(int => 
              currentMed.nom_produit?.toLowerCase().includes(int.drug_name?.toLowerCase())
            );
            if (interaction) {
              allInteractions.push({
                type: 'DRUG_INTERACTION',
                drug1: med.product_name,
                drug2: currentMed.nom_produit,
                ...interaction
              });
            }
          }
          
          // 3. Interactions entre médicaments sélectionnés
          for (const otherMed of selectedMedications) {
            if (otherMed.id !== med.id) {
              const interaction = med.interactions.find(int => 
                otherMed.product_name?.toLowerCase().includes(int.drug_name?.toLowerCase()) ||
                otherMed.substance_name?.toLowerCase().includes(int.drug_name?.toLowerCase())
              );
              if (interaction) {
                allInteractions.push({
                  type: 'DRUG_INTERACTION',
                  drug1: med.product_name,
                  drug2: otherMed.product_name,
                  ...interaction
                });
              }
            }
          }
        }
      }
      
      setInteractions(allInteractions);
    };

    if (selectedMedications.length > 0) {
      checkInteractions();
    } else {
      setInteractions([]);
      setAiAnalysis(null);
    }
  }, [selectedMedications, currentMedications, allergies]);

  // Analyse IA avancée
  const analyzeWithAI = async () => {
    setLoadingAI(true);
    try {
      const medicationList = selectedMedications.map(m => 
        `${m.product_name} (${m.substance_name}) - ${m.dosage_prescribed || m.strength + m.unit}`
      ).join('\n');
      
      const currentMedsList = currentMedications.map(m => m.nom_produit).join(', ');
      
      const allergiesList = allergies.map(a => 
        `${a.allergen} (${a.severity}): ${a.reaction}`
      ).join('\n');

      const prompt = `En tant que pharmacologue clinique, analysez cette prescription:

NOUVEAUX MÉDICAMENTS:
${medicationList}

MÉDICAMENTS ACTUELS DU PATIENT:
${currentMedsList || 'Aucun'}

ALLERGIES CONNUES:
${allergiesList || 'Aucune'}

Fournissez une analyse complète incluant:
1. Interactions médicamenteuses potentielles (même non répertoriées dans la base)
2. Contre-indications pharmacologiques
3. Risques de cumul ou surdosage
4. Recommandations de surveillance clinique
5. Conseils d'optimisation thérapeutique

Soyez précis et basé sur les guidelines médicales belges.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string", enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"] },
            summary: { type: "string" },
            interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drugs: { type: "string" },
                  risk: { type: "string" },
                  explanation: { type: "string" }
                }
              }
            },
            monitoring_recommendations: {
              type: "array",
              items: { type: "string" }
            },
            optimization_suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAiAnalysis(response);
      toast.success('Analyse IA terminée');
    } catch (error) {
      toast.error('Erreur lors de l\'analyse IA');
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const hasAllergies = allergies.length > 0;
  const hasCriticalInteractions = interactions.some(i => 
    i.severity === 'CONTRAINDICATED' || i.type === 'ALLERGY'
  );

  if (interactions.length === 0 && !aiAnalysis && !hasAllergies) {
    return (
      <Card className="p-4 border-2 border-green-300 bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-green-600" />
            <p className="text-sm font-semibold text-green-900">
              Aucune interaction détectée dans la base de données
            </p>
          </div>
          {selectedMedications.length >= 2 && (
            <Button
              onClick={analyzeWithAI}
              disabled={loadingAI}
              size="sm"
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-100"
            >
              <Brain className="w-4 h-4 mr-2" />
              {loadingAI ? 'Analyse...' : 'Analyse IA avancée'}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Grouper par sévérité
  const groupedBySeverity = interactions.reduce((acc, interaction) => {
    const severity = interaction.severity || 'MINOR';
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(interaction);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card className={`p-4 border-2 ${hasCriticalInteractions ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-5 h-5" />
            {hasCriticalInteractions ? 'ALERTE CRITIQUE' : 'Interactions détectées'} ({interactions.length})
          </h3>
          {selectedMedications.length >= 2 && (
            <Button
              onClick={analyzeWithAI}
              disabled={loadingAI}
              size="sm"
              variant="outline"
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              <Brain className="w-4 h-4 mr-2" />
              {loadingAI ? 'Analyse...' : 'Analyse IA approfondie'}
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          {Object.entries(groupedBySeverity)
            .sort((a, b) => {
              const order = { CONTRAINDICATED: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
              return order[a[0]] - order[b[0]];
            })
            .map(([severity, inters]) => {
              const config = SEVERITY_CONFIG[severity];
              const Icon = config.icon;
              
              return (
                <div key={severity}>
                  {inters.map((interaction, idx) => (
                    <Alert key={idx} className={`${config.color} border-2 mb-2`}>
                      <Icon className="w-5 h-5" />
                      <AlertDescription>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-bold text-base mb-1">
                              {interaction.drug1} ↔ {interaction.drug2}
                            </div>
                            <div className="flex gap-2 mt-1">
                              <Badge className={config.badgeColor}>
                                {config.label}
                              </Badge>
                              {interaction.type === 'ALLERGY' && (
                                <Badge className="bg-red-600 text-white">
                                  ⚠️ ALLERGIE
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm mt-2">{interaction.description}</p>
                        {interaction.recommendation && (
                          <div className="mt-2 p-2 bg-white/50 rounded border">
                            <p className="text-sm font-semibold">Recommandation:</p>
                            <p className="text-sm">{interaction.recommendation}</p>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              );
            })}
        </div>
      </Card>

      {aiAnalysis && (
        <Card className="p-4 border-2 border-purple-300 bg-purple-50">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-purple-900">
            <Brain className="w-5 h-5" />
            Analyse pharmacologique IA
          </h3>
          
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${
              aiAnalysis.risk_level === 'CRITICAL' ? 'bg-red-100 border-2 border-red-300' :
              aiAnalysis.risk_level === 'HIGH' ? 'bg-orange-100 border-2 border-orange-300' :
              aiAnalysis.risk_level === 'MODERATE' ? 'bg-yellow-100 border-2 border-yellow-300' :
              'bg-green-100 border-2 border-green-300'
            }`}>
              <p className="font-semibold text-sm mb-1">Niveau de risque: {aiAnalysis.risk_level}</p>
              <p className="text-sm">{aiAnalysis.summary}</p>
            </div>

            {aiAnalysis.interactions?.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Interactions détectées par l'IA:</p>
                <div className="space-y-2">
                  {aiAnalysis.interactions.map((int, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border text-sm">
                      <p className="font-semibold">{int.drugs}</p>
                      <p className="text-xs text-slate-600 mt-1">Risque: {int.risk}</p>
                      <p className="text-xs mt-1">{int.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiAnalysis.monitoring_recommendations?.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Stethoscope className="w-4 h-4" />
                  Surveillance recommandée:
                </p>
                <ul className="space-y-1">
                  {aiAnalysis.monitoring_recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiAnalysis.optimization_suggestions?.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Suggestions d'optimisation:</p>
                <ul className="space-y-1">
                  {aiAnalysis.optimization_suggestions.map((sug, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-purple-600">💡</span>
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}