import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Pill,
  X
} from 'lucide-react';

// Base de données simplifiée d'interactions médicamenteuses
const DRUG_INTERACTIONS = [
  // Anticoagulants
  { drug1: 'warfarine', drug2: 'aspirine', severity: 'high', description: 'Risque hémorragique majeur. Association déconseillée.', recommendation: 'Éviter l\'association ou surveillance étroite de l\'INR.' },
  { drug1: 'warfarine', drug2: 'ibuprofène', severity: 'high', description: 'Risque hémorragique accru par les AINS.', recommendation: 'Préférer le paracétamol si possible.' },
  { drug1: 'rivaroxaban', drug2: 'aspirine', severity: 'medium', description: 'Augmentation du risque de saignement.', recommendation: 'Évaluer le rapport bénéfice/risque.' },
  
  // Antidiabétiques
  { drug1: 'metformine', drug2: 'iode', severity: 'high', description: 'Risque d\'acidose lactique avec produits de contraste iodés.', recommendation: 'Arrêter metformine 48h avant et après injection de produit de contraste.' },
  { drug1: 'sulfamide', drug2: 'fluconazole', severity: 'medium', description: 'Risque d\'hypoglycémie par inhibition du métabolisme.', recommendation: 'Surveillance glycémique renforcée.' },
  
  // Cardiovasculaire
  { drug1: 'digoxine', drug2: 'amiodarone', severity: 'high', description: 'Augmentation des taux de digoxine. Risque de toxicité.', recommendation: 'Réduire la dose de digoxine de 50%.' },
  { drug1: 'iec', drug2: 'potassium', severity: 'medium', description: 'Risque d\'hyperkaliémie.', recommendation: 'Surveillance de la kaliémie.' },
  { drug1: 'iec', drug2: 'ains', severity: 'medium', description: 'Diminution de l\'effet antihypertenseur. Risque d\'insuffisance rénale.', recommendation: 'Surveillance de la fonction rénale et de la TA.' },
  { drug1: 'betabloquant', drug2: 'verapamil', severity: 'high', description: 'Risque de bradycardie sévère et de trouble de conduction.', recommendation: 'Association contre-indiquée.' },
  { drug1: 'statine', drug2: 'fibrate', severity: 'medium', description: 'Risque accru de rhabdomyolyse.', recommendation: 'Surveillance des CPK et signes musculaires.' },
  
  // Psychotropes
  { drug1: 'isrs', drug2: 'imao', severity: 'critical', description: 'Syndrome sérotoninergique potentiellement fatal.', recommendation: 'Association contre-indiquée. Respecter un délai de 14 jours.' },
  { drug1: 'isrs', drug2: 'tramadol', severity: 'medium', description: 'Risque de syndrome sérotoninergique.', recommendation: 'Surveillance clinique.' },
  { drug1: 'benzodiazepine', drug2: 'opioide', severity: 'high', description: 'Risque de dépression respiratoire.', recommendation: 'Éviter l\'association ou réduire les doses.' },
  
  // Antibiotiques
  { drug1: 'fluoroquinolone', drug2: 'corticoide', severity: 'medium', description: 'Risque accru de tendinopathie/rupture tendineuse.', recommendation: 'Surveillance et information du patient.' },
  { drug1: 'macrolide', drug2: 'statine', severity: 'medium', description: 'Risque de rhabdomyolyse par inhibition du CYP3A4.', recommendation: 'Préférer l\'azithromycine ou suspendre temporairement la statine.' },
  { drug1: 'metronidazole', drug2: 'alcool', severity: 'high', description: 'Effet antabuse: nausées, vomissements, flush.', recommendation: 'Éviter toute prise d\'alcool pendant le traitement.' },
  
  // Autres
  { drug1: 'lithium', drug2: 'ains', severity: 'high', description: 'Augmentation de la lithiémie. Risque de toxicité.', recommendation: 'Éviter les AINS ou surveillance étroite de la lithiémie.' },
  { drug1: 'lithium', drug2: 'diuretique', severity: 'high', description: 'Augmentation de la lithiémie par déshydratation.', recommendation: 'Surveillance de la lithiémie et hydratation.' },
  { drug1: 'allopurinol', drug2: 'azathioprine', severity: 'critical', description: 'Toxicité hématologique majeure.', recommendation: 'Réduire la dose d\'azathioprine de 75%.' },
];

// Mapping des noms de médicaments vers catégories
const DRUG_CATEGORIES = {
  // AINS
  'ibuprofène': 'ains', 'ibuprofene': 'ains', 'advil': 'ains', 'nurofen': 'ains',
  'diclofénac': 'ains', 'diclofenac': 'ains', 'voltaren': 'ains',
  'naproxène': 'ains', 'naproxene': 'ains', 'aleve': 'ains',
  'kétoprofène': 'ains', 'ketoprofene': 'ains', 'profenid': 'ains',
  'aspirine': 'aspirine', 'aspégic': 'aspirine', 'aspegic': 'aspirine', 'cardioaspirine': 'aspirine',
  
  // Anticoagulants
  'warfarine': 'warfarine', 'coumadine': 'warfarine', 'sintrom': 'warfarine',
  'rivaroxaban': 'rivaroxaban', 'xarelto': 'rivaroxaban',
  'apixaban': 'apixaban', 'eliquis': 'apixaban',
  'dabigatran': 'dabigatran', 'pradaxa': 'dabigatran',
  
  // IEC/ARA2
  'lisinopril': 'iec', 'zestril': 'iec', 'ramipril': 'iec', 'triatec': 'iec',
  'énalapril': 'iec', 'enalapril': 'iec', 'renitec': 'iec',
  'périndopril': 'iec', 'perindopril': 'iec', 'coversyl': 'iec',
  'losartan': 'iec', 'cozaar': 'iec', 'valsartan': 'iec', 'tareg': 'iec',
  
  // Bêtabloquants
  'bisoprolol': 'betabloquant', 'cardensiel': 'betabloquant',
  'métoprolol': 'betabloquant', 'metoprolol': 'betabloquant', 'seloken': 'betabloquant',
  'aténolol': 'betabloquant', 'atenolol': 'betabloquant', 'tenormine': 'betabloquant',
  
  // Calcium bloquants
  'vérapamil': 'verapamil', 'verapamil': 'verapamil', 'isoptine': 'verapamil',
  'diltiazem': 'diltiazem', 'tildiem': 'diltiazem',
  
  // Statines
  'atorvastatine': 'statine', 'tahor': 'statine', 'lipitor': 'statine',
  'simvastatine': 'statine', 'zocor': 'statine',
  'rosuvastatine': 'statine', 'crestor': 'statine',
  'pravastatine': 'statine', 'elisor': 'statine',
  
  // Fibrates
  'fénofibrate': 'fibrate', 'fenofibrate': 'fibrate', 'lipanthyl': 'fibrate',
  'gemfibrozil': 'fibrate', 'lipur': 'fibrate',
  
  // Antidiabétiques
  'metformine': 'metformine', 'glucophage': 'metformine', 'stagid': 'metformine',
  'glibenclamide': 'sulfamide', 'daonil': 'sulfamide',
  'gliclazide': 'sulfamide', 'diamicron': 'sulfamide',
  
  // Psychotropes - ISRS
  'fluoxétine': 'isrs', 'fluoxetine': 'isrs', 'prozac': 'isrs',
  'sertraline': 'isrs', 'zoloft': 'isrs',
  'paroxétine': 'isrs', 'paroxetine': 'isrs', 'deroxat': 'isrs',
  'escitalopram': 'isrs', 'seroplex': 'isrs',
  'citalopram': 'isrs', 'seropram': 'isrs',
  
  // Benzodiazépines
  'diazépam': 'benzodiazepine', 'diazepam': 'benzodiazepine', 'valium': 'benzodiazepine',
  'alprazolam': 'benzodiazepine', 'xanax': 'benzodiazepine',
  'lorazépam': 'benzodiazepine', 'lorazepam': 'benzodiazepine', 'temesta': 'benzodiazepine',
  'bromazépam': 'benzodiazepine', 'bromazepam': 'benzodiazepine', 'lexomil': 'benzodiazepine',
  
  // Opioïdes
  'tramadol': 'tramadol', 'contramal': 'tramadol', 'topalgic': 'tramadol',
  'morphine': 'opioide', 'codéine': 'opioide', 'codeine': 'opioide',
  'oxycodone': 'opioide', 'oxycontin': 'opioide',
  
  // Antibiotiques
  'ciprofloxacine': 'fluoroquinolone', 'ciflox': 'fluoroquinolone',
  'lévofloxacine': 'fluoroquinolone', 'levofloxacine': 'fluoroquinolone', 'tavanic': 'fluoroquinolone',
  'ofloxacine': 'fluoroquinolone', 'oflocet': 'fluoroquinolone',
  'clarithromycine': 'macrolide', 'zeclar': 'macrolide',
  'érythromycine': 'macrolide', 'erythromycine': 'macrolide',
  'azithromycine': 'macrolide', 'zithromax': 'macrolide',
  'métronidazole': 'metronidazole', 'metronidazole': 'metronidazole', 'flagyl': 'metronidazole',
  
  // Corticoïdes
  'prednisone': 'corticoide', 'cortancyl': 'corticoide',
  'prednisolone': 'corticoide', 'solupred': 'corticoide',
  'méthylprednisolone': 'corticoide', 'methylprednisolone': 'corticoide', 'medrol': 'corticoide',
  
  // Autres
  'digoxine': 'digoxine', 'digoxin': 'digoxine',
  'amiodarone': 'amiodarone', 'cordarone': 'amiodarone',
  'lithium': 'lithium', 'téralithe': 'lithium', 'teralithe': 'lithium',
  'allopurinol': 'allopurinol', 'zyloric': 'allopurinol',
  'azathioprine': 'azathioprine', 'imurel': 'azathioprine',
  'fluconazole': 'fluconazole', 'triflucan': 'fluconazole',
  'potassium': 'potassium', 'diffu-k': 'potassium', 'kaleorid': 'potassium',
};

const getDrugCategory = (drugName) => {
  const normalized = drugName.toLowerCase().trim();
  return DRUG_CATEGORIES[normalized] || normalized;
};

const findInteractions = (medications) => {
  const interactions = [];
  const categories = medications.map(m => ({
    original: m,
    category: getDrugCategory(m)
  }));

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const cat1 = categories[i].category;
      const cat2 = categories[j].category;

      for (const interaction of DRUG_INTERACTIONS) {
        if ((interaction.drug1 === cat1 && interaction.drug2 === cat2) ||
            (interaction.drug1 === cat2 && interaction.drug2 === cat1)) {
          interactions.push({
            ...interaction,
            drug1Name: categories[i].original,
            drug2Name: categories[j].original
          });
        }
      }
    }
  }

  return interactions;
};

const SEVERITY_CONFIG = {
  critical: { 
    label: 'Contre-indication', 
    color: 'bg-red-600 text-white', 
    borderColor: 'border-red-600',
    bgColor: 'bg-red-50',
    icon: AlertCircle 
  },
  high: { 
    label: 'Majeure', 
    color: 'bg-orange-600 text-white', 
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-50',
    icon: AlertTriangle 
  },
  medium: { 
    label: 'Modérée', 
    color: 'bg-yellow-500 text-white', 
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50',
    icon: Info 
  },
  low: { 
    label: 'Mineure', 
    color: 'bg-blue-500 text-white', 
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
    icon: Info 
  }
};

export function useInteractionChecker(medications = []) {
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    if (medications.length > 1) {
      const found = findInteractions(medications);
      setInteractions(found);
    } else {
      setInteractions([]);
    }
  }, [medications]);

  const hasInteractions = interactions.length > 0;
  const hasCritical = interactions.some(i => i.severity === 'critical');
  const hasHigh = interactions.some(i => i.severity === 'high');

  return { interactions, hasInteractions, hasCritical, hasHigh };
}

export default function DrugInteractionChecker({ medications = [], patientMedications = [], showInline = false }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Combiner médicaments actuels du patient avec nouvelles prescriptions
  const allMedications = [...new Set([...patientMedications, ...medications])];
  const { interactions, hasInteractions, hasCritical, hasHigh } = useInteractionChecker(allMedications);

  if (!hasInteractions) {
    return showInline ? (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Shield className="w-4 h-4" />
        Aucune interaction détectée
      </div>
    ) : null;
  }

  const criticalCount = interactions.filter(i => i.severity === 'critical').length;
  const highCount = interactions.filter(i => i.severity === 'high').length;
  const otherCount = interactions.length - criticalCount - highCount;

  if (showInline) {
    return (
      <div className="space-y-2">
        <Alert className={`${hasCritical ? 'border-red-600 bg-red-50' : hasHigh ? 'border-orange-500 bg-orange-50' : 'border-yellow-500 bg-yellow-50'}`}>
          <AlertTriangle className={`w-4 h-4 ${hasCritical ? 'text-red-600' : hasHigh ? 'text-orange-600' : 'text-yellow-600'}`} />
          <AlertTitle className={hasCritical ? 'text-red-800' : hasHigh ? 'text-orange-800' : 'text-yellow-800'}>
            {interactions.length} interaction{interactions.length > 1 ? 's' : ''} détectée{interactions.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {criticalCount > 0 && <Badge className="bg-red-600">{criticalCount} contre-indication{criticalCount > 1 ? 's' : ''}</Badge>}
              {highCount > 0 && <Badge className="bg-orange-600">{highCount} majeure{highCount > 1 ? 's' : ''}</Badge>}
              {otherCount > 0 && <Badge className="bg-yellow-500">{otherCount} modérée{otherCount > 1 ? 's' : ''}</Badge>}
            </div>
            <Button 
              variant="link" 
              className="p-0 h-auto mt-2 text-sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {showDetails ? 'Masquer' : 'Voir les détails'}
            </Button>
          </AlertDescription>
        </Alert>

        {showDetails && (
          <div className="space-y-2 pl-4 border-l-2 border-slate-200">
            {interactions.map((interaction, idx) => {
              const config = SEVERITY_CONFIG[interaction.severity];
              const Icon = config.icon;
              return (
                <div key={idx} className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 ${hasCritical ? 'text-red-600' : 'text-orange-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {interaction.drug1Name} + {interaction.drug2Name}
                        </span>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-700">{interaction.description}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Recommandation:</strong> {interaction.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Version badge compacte
  return (
    <>
      <Button 
        variant="ghost" 
        size="sm"
        className={`gap-2 ${hasCritical ? 'text-red-600 hover:bg-red-100' : hasHigh ? 'text-orange-600 hover:bg-orange-100' : 'text-yellow-600 hover:bg-yellow-100'}`}
        onClick={() => setShowModal(true)}
      >
        <AlertTriangle className="w-4 h-4" />
        {interactions.length} interaction{interactions.length > 1 ? 's' : ''}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={hasCritical ? 'text-red-600' : 'text-orange-600'} />
              Interactions médicamenteuses détectées
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {interactions.map((interaction, idx) => {
              const config = SEVERITY_CONFIG[interaction.severity];
              const Icon = config.icon;
              return (
                <div key={idx} className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="gap-1">
                          <Pill className="w-3 h-3" />
                          {interaction.drug1Name}
                        </Badge>
                        <span className="text-slate-400">+</span>
                        <Badge variant="outline" className="gap-1">
                          <Pill className="w-3 h-3" />
                          {interaction.drug2Name}
                        </Badge>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-800 mb-2">{interaction.description}</p>
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-sm">
                          <strong>💡 Recommandation:</strong> {interaction.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}