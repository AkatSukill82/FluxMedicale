import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Pill,
  Info
} from 'lucide-react';

// Base de données simplifiée d'interactions médicamenteuses
const INTERACTION_DATABASE = {
  // Anticoagulants
  'warfarine': {
    contraindicated: ['aspirine', 'ibuprofene', 'naproxene', 'diclofenac'],
    major: ['paracetamol', 'amiodarone', 'fluconazole', 'metronidazole'],
    moderate: ['omeprazole', 'pantoprazole', 'simvastatine'],
    alerts: {
      'aspirine': 'Risque hémorragique majeur - Association déconseillée',
      'ibuprofene': 'Risque hémorragique - AINS contre-indiqués',
      'amiodarone': 'Potentialisation effet anticoagulant - Surveillance INR',
    }
  },
  'rivaroxaban': {
    contraindicated: ['ketoconazole', 'itraconazole', 'ritonavir'],
    major: ['aspirine', 'clopidogrel', 'diltiazem', 'verapamil'],
    moderate: ['amiodarone', 'clarithromycine'],
    alerts: {
      'aspirine': 'Risque hémorragique augmenté',
      'ketoconazole': 'Contre-indication absolue - Augmentation majeure des concentrations',
    }
  },
  // Anti-inflammatoires
  'ibuprofene': {
    contraindicated: ['ketorolac'],
    major: ['aspirine', 'warfarine', 'lithium', 'methotrexate'],
    moderate: ['antihypertenseurs', 'diuretiques', 'corticoides'],
    alerts: {
      'aspirine': 'Association AINS déconseillée - Risque GI et rénal',
      'lithium': 'Augmentation lithémie - Surveillance requise',
    }
  },
  // Antibiotiques
  'ciprofloxacine': {
    contraindicated: ['tizanidine'],
    major: ['theophylline', 'warfarine', 'methotrexate'],
    moderate: ['antiacides', 'fer', 'calcium', 'duloxetine'],
    alerts: {
      'theophylline': 'Risque de toxicité théophylline - Réduire dose',
      'antiacides': 'Absorption réduite - Espacer prises de 2h',
    }
  },
  'metronidazole': {
    contraindicated: ['disulfirame'],
    major: ['alcool', 'warfarine', 'lithium'],
    moderate: ['phenytoine', 'carbamazepine'],
    alerts: {
      'alcool': 'Effet antabuse - Abstinence alcool pendant traitement',
      'warfarine': 'Potentialisation anticoagulant - Surveiller INR',
    }
  },
  // Cardiovasculaire
  'amiodarone': {
    contraindicated: ['sotalol', 'flecainide'],
    major: ['warfarine', 'digoxine', 'simvastatine', 'atorvastatine'],
    moderate: ['betabloquants', 'diltiazem', 'verapamil'],
    alerts: {
      'simvastatine': 'Risque rhabdomyolyse - Max 20mg simvastatine',
      'digoxine': 'Augmentation digoxinémie - Réduire dose 50%',
    }
  },
  'simvastatine': {
    contraindicated: ['gemfibrozil', 'itraconazole', 'ketoconazole'],
    major: ['amiodarone', 'diltiazem', 'verapamil', 'clarithromycine'],
    moderate: ['amlodipine', 'colchicine'],
    alerts: {
      'amiodarone': 'Max 20mg/j simvastatine - Risque myopathie',
      'clarithromycine': 'Suspendre statine pendant traitement ATB',
    }
  },
  // Antidépresseurs
  'sertraline': {
    contraindicated: ['imao', 'pimozide'],
    major: ['tramadol', 'triptans', 'lithium'],
    moderate: ['aspirine', 'ains', 'warfarine'],
    alerts: {
      'tramadol': 'Risque syndrome sérotoninergique',
      'triptans': 'Risque syndrome sérotoninergique - Surveillance',
    }
  },
  // Antidiabétiques
  'metformine': {
    contraindicated: [],
    major: ['produits de contraste iodés'],
    moderate: ['alcool', 'corticoides'],
    alerts: {
      'produits de contraste iodés': 'Arrêter 48h avant et après injection',
      'alcool': 'Risque acidose lactique augmenté',
    }
  }
};

// Allergies croisées
const CROSS_ALLERGIES = {
  'penicilline': ['amoxicilline', 'ampicilline', 'cephalosporines'],
  'aspirine': ['ains', 'ibuprofene', 'naproxene', 'diclofenac'],
  'sulfamides': ['sulfamethoxazole', 'sulfasalazine'],
};

export default function DrugInteractionAlert({ 
  newDrug, 
  currentMedications = [], 
  patientAllergies = [],
  onDismiss 
}) {
  const [interactions, setInteractions] = useState([]);
  const [allergyAlerts, setAllergyAlerts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!newDrug) return;
    
    checkInteractions();
    checkAllergies();
  }, [newDrug, currentMedications, patientAllergies]);

  const checkInteractions = () => {
    const foundInteractions = [];
    const drugNameLower = newDrug.toLowerCase();

    // Vérifier si le nouveau médicament a des interactions connues
    const drugData = INTERACTION_DATABASE[drugNameLower];
    
    currentMedications.forEach(med => {
      const medNameLower = med.name?.toLowerCase() || med.toLowerCase();
      
      // Vérifier dans la base du nouveau médicament
      if (drugData) {
        if (drugData.contraindicated.some(d => medNameLower.includes(d))) {
          foundInteractions.push({
            severity: 'contraindicated',
            drug1: newDrug,
            drug2: med.name || med,
            message: drugData.alerts[medNameLower] || 'Contre-indication absolue',
          });
        } else if (drugData.major.some(d => medNameLower.includes(d))) {
          foundInteractions.push({
            severity: 'major',
            drug1: newDrug,
            drug2: med.name || med,
            message: drugData.alerts[medNameLower] || 'Interaction majeure - Surveillance requise',
          });
        } else if (drugData.moderate.some(d => medNameLower.includes(d))) {
          foundInteractions.push({
            severity: 'moderate',
            drug1: newDrug,
            drug2: med.name || med,
            message: drugData.alerts[medNameLower] || 'Interaction modérée - Prudence',
          });
        }
      }

      // Vérifier aussi dans l'autre sens
      const otherDrugData = INTERACTION_DATABASE[medNameLower];
      if (otherDrugData) {
        if (otherDrugData.contraindicated.some(d => drugNameLower.includes(d))) {
          const existing = foundInteractions.find(i => 
            i.drug1 === med.name && i.drug2 === newDrug
          );
          if (!existing) {
            foundInteractions.push({
              severity: 'contraindicated',
              drug1: med.name || med,
              drug2: newDrug,
              message: otherDrugData.alerts[drugNameLower] || 'Contre-indication absolue',
            });
          }
        }
      }
    });

    setInteractions(foundInteractions);
  };

  const checkAllergies = () => {
    const alerts = [];
    const drugNameLower = newDrug.toLowerCase();

    patientAllergies.forEach(allergy => {
      const allergyLower = allergy.toLowerCase();
      
      // Vérification directe
      if (drugNameLower.includes(allergyLower) || allergyLower.includes(drugNameLower)) {
        alerts.push({
          type: 'direct',
          allergen: allergy,
          message: `Allergie connue à ${allergy}`,
        });
      }

      // Vérification allergies croisées
      Object.entries(CROSS_ALLERGIES).forEach(([mainAllergen, crossReactive]) => {
        if (allergyLower.includes(mainAllergen)) {
          if (crossReactive.some(cr => drugNameLower.includes(cr))) {
            alerts.push({
              type: 'cross',
              allergen: allergy,
              message: `Allergie croisée possible (${allergy} → ${newDrug})`,
            });
          }
        }
      });
    });

    setAllergyAlerts(alerts);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'contraindicated':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'major':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'moderate':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'contraindicated':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'major':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'moderate':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  if (interactions.length === 0 && allergyAlerts.length === 0) {
    return null;
  }

  const hasContraindication = interactions.some(i => i.severity === 'contraindicated') || 
                              allergyAlerts.some(a => a.type === 'direct');

  return (
    <Card className={`border-2 ${hasContraindication ? 'border-red-500' : 'border-orange-400'}`}>
      <CardContent className="p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${hasContraindication ? 'text-red-600' : 'text-orange-600'}`} />
            <span className="font-semibold">
              {hasContraindication ? '⚠️ ALERTE CRITIQUE' : 'Alertes médicamenteuses'}
            </span>
            <Badge variant={hasContraindication ? 'destructive' : 'outline'}>
              {interactions.length + allergyAlerts.length} alerte(s)
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Alertes allergies */}
            {allergyAlerts.map((alert, idx) => (
              <Alert key={`allergy-${idx}`} className="bg-red-50 border-red-300">
                <XCircle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  <span className="font-bold">ALLERGIE: </span>
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}

            {/* Interactions */}
            {interactions.map((interaction, idx) => (
              <Alert key={`interaction-${idx}`} className={getSeverityStyle(interaction.severity)}>
                {getSeverityIcon(interaction.severity)}
                <AlertDescription>
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="w-4 h-4" />
                    <span className="font-semibold">{interaction.drug1}</span>
                    <span>↔</span>
                    <Pill className="w-4 h-4" />
                    <span className="font-semibold">{interaction.drug2}</span>
                  </div>
                  <p className="text-sm">{interaction.message}</p>
                </AlertDescription>
              </Alert>
            ))}

            {hasContraindication && (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={onDismiss}>
                  Ignorer (à mes risques)
                </Button>
                <Button variant="destructive" size="sm" onClick={() => window.history.back()}>
                  Annuler la prescription
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook pour vérifier les interactions en temps réel
export function useInteractionCheck(medications = [], allergies = []) {
  const [alerts, setAlerts] = useState([]);

  const checkDrug = (drugName) => {
    const interactions = [];
    const drugNameLower = drugName.toLowerCase();
    const drugData = INTERACTION_DATABASE[drugNameLower];

    if (drugData) {
      medications.forEach(med => {
        const medNameLower = (med.name || med).toLowerCase();
        
        if (drugData.contraindicated.some(d => medNameLower.includes(d))) {
          interactions.push({ severity: 'contraindicated', drug: med.name || med });
        } else if (drugData.major.some(d => medNameLower.includes(d))) {
          interactions.push({ severity: 'major', drug: med.name || med });
        }
      });
    }

    // Vérifier allergies
    allergies.forEach(allergy => {
      if (drugNameLower.includes(allergy.toLowerCase())) {
        interactions.push({ severity: 'allergy', allergen: allergy });
      }
    });

    return interactions;
  };

  return { checkDrug, alerts };
}