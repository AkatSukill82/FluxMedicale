import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, XCircle, Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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
  const [alternativeSuggestions, setAlternativeSuggestions] = useState([]);

  // Charger tous les médicaments pour suggérer des alternatives
  const { data: allDrugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 1000)
  });

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

  useEffect(() => {
    // Vérifier les interactions entre médicaments sélectionnés et médicaments actuels
    const checkInteractions = async () => {
      const allInteractions = [];
      const suggestions = [];
      
      for (const med of selectedMedications) {
        if (med.interactions && Array.isArray(med.interactions)) {
          // Vérifier contre les médicaments actuels
          for (const currentMed of currentMedications) {
            const interaction = med.interactions.find(int => 
              currentMed.nom_produit?.toLowerCase().includes(int.drug_name?.toLowerCase())
            );
            if (interaction) {
              const interactionData = {
                drug1: med.product_name,
                drug1_id: med.id,
                drug2: currentMed.nom_produit,
                ...interaction
              };
              allInteractions.push(interactionData);

              // Chercher des alternatives si interaction majeure ou contre-indiquée
              if (interaction.severity === 'MAJOR' || interaction.severity === 'CONTRAINDICATED') {
                const alternatives = allDrugs.filter(alt => 
                  alt.substance_name !== med.substance_name &&
                  alt.form === med.form &&
                  !alt.interactions?.some(int => 
                    currentMed.nom_produit?.toLowerCase().includes(int.drug_name?.toLowerCase())
                  )
                ).slice(0, 2);

                if (alternatives.length > 0) {
                  suggestions.push({
                    problematicDrug: med.product_name,
                    problematicDrugId: med.id,
                    alternatives: alternatives
                  });
                }
              }
            }
          }
          
          // Vérifier contre les autres médicaments sélectionnés
          for (const otherMed of selectedMedications) {
            if (otherMed.id !== med.id) {
              const interaction = med.interactions.find(int => 
                otherMed.product_name?.toLowerCase().includes(int.drug_name?.toLowerCase()) ||
                otherMed.substance_name?.toLowerCase().includes(int.drug_name?.toLowerCase())
              );
              if (interaction) {
                allInteractions.push({
                  drug1: med.product_name,
                  drug1_id: med.id,
                  drug2: otherMed.product_name,
                  ...interaction
                });
              }
            }
          }
        }
      }
      
      setInteractions(allInteractions);
      setAlternativeSuggestions(suggestions);
    };

    if (selectedMedications.length > 0) {
      checkInteractions();
    } else {
      setInteractions([]);
      setAlternativeSuggestions([]);
    }
  }, [selectedMedications, currentMedications, allDrugs]);

  if (interactions.length === 0) {
    return null;
  }

  // Grouper par sévérité
  const groupedBySeverity = interactions.reduce((acc, interaction) => {
    const severity = interaction.severity || 'MINOR';
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(interaction);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <Card className="p-4 border-2 border-amber-300 bg-amber-50">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-amber-900">
          <AlertTriangle className="w-5 h-5" />
          Interactions médicamenteuses détectées ({interactions.length})
        </h3>
        
        <div className="space-y-3">
          {Object.entries(groupedBySeverity).map(([severity, inters]) => {
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
                          <Badge className={config.badgeColor}>
                            {config.label}
                          </Badge>
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

      {alternativeSuggestions.length > 0 && (
        <Card className="p-4 border-2 border-blue-300 bg-blue-50">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-blue-900">
            <Lightbulb className="w-5 h-5" />
            Suggestions d'alternatives
          </h3>
          <div className="space-y-3">
            {alternativeSuggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Alternatives pour {suggestion.problematicDrug}:
                </p>
                <div className="space-y-2">
                  {suggestion.alternatives.map(alt => (
                    <div key={alt.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{alt.product_name}</p>
                        <p className="text-xs text-slate-600">
                          {alt.substance_name} • {alt.strength}{alt.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}