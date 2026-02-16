import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Plus,
  Search,
  Shield,
  Pill,
  Trash2,
  CheckCircle
} from 'lucide-react';

// Base d'interactions médicamenteuses étendue
const INTERACTIONS_DB = [
  // Anticoagulants
  { drugs: ['warfarine', 'aspirine'], severity: 'high', desc: 'Risque hémorragique majeur', action: 'Éviter ou surveillance INR étroite' },
  { drugs: ['warfarine', 'ibuprofène'], severity: 'high', desc: 'Risque hémorragique par les AINS', action: 'Préférer paracétamol' },
  { drugs: ['warfarine', 'paracétamol'], severity: 'low', desc: 'Légère augmentation INR possible', action: 'Surveillance si usage prolongé' },
  { drugs: ['rivaroxaban', 'aspirine'], severity: 'medium', desc: 'Augmentation risque saignement', action: 'Évaluer bénéfice/risque' },
  { drugs: ['apixaban', 'aspirine'], severity: 'medium', desc: 'Augmentation risque saignement', action: 'Évaluer bénéfice/risque' },
  
  // Cardiovasculaire
  { drugs: ['digoxine', 'amiodarone'], severity: 'high', desc: 'Toxicité digoxine augmentée', action: 'Réduire dose digoxine 50%' },
  { drugs: ['bêtabloquant', 'vérapamil'], severity: 'critical', desc: 'Bradycardie sévère, BAV', action: 'Association contre-indiquée' },
  { drugs: ['bisoprolol', 'vérapamil'], severity: 'critical', desc: 'Bradycardie sévère, BAV', action: 'Association contre-indiquée' },
  { drugs: ['iec', 'potassium'], severity: 'medium', desc: 'Risque hyperkaliémie', action: 'Surveillance kaliémie' },
  { drugs: ['lisinopril', 'potassium'], severity: 'medium', desc: 'Risque hyperkaliémie', action: 'Surveillance kaliémie' },
  { drugs: ['iec', 'ibuprofène'], severity: 'medium', desc: 'Diminution effet antihypertenseur, risque IRA', action: 'Surveillance TA et fonction rénale' },
  { drugs: ['statine', 'fibrate'], severity: 'medium', desc: 'Risque rhabdomyolyse', action: 'Surveillance CPK' },
  { drugs: ['simvastatine', 'amiodarone'], severity: 'high', desc: 'Risque myopathie', action: 'Limiter simva à 20mg/j' },
  
  // Psychotropes
  { drugs: ['isrs', 'imao'], severity: 'critical', desc: 'Syndrome sérotoninergique fatal', action: 'CI absolue, délai 14j' },
  { drugs: ['sertraline', 'imao'], severity: 'critical', desc: 'Syndrome sérotoninergique fatal', action: 'CI absolue, délai 14j' },
  { drugs: ['isrs', 'tramadol'], severity: 'medium', desc: 'Risque syndrome sérotoninergique', action: 'Surveillance clinique' },
  { drugs: ['sertraline', 'tramadol'], severity: 'medium', desc: 'Risque syndrome sérotoninergique', action: 'Surveillance clinique' },
  { drugs: ['benzodiazépine', 'opioïde'], severity: 'high', desc: 'Dépression respiratoire', action: 'Éviter ou réduire doses' },
  { drugs: ['alprazolam', 'tramadol'], severity: 'high', desc: 'Dépression respiratoire', action: 'Éviter ou réduire doses' },
  { drugs: ['lithium', 'ibuprofène'], severity: 'high', desc: 'Toxicité lithium', action: 'Éviter AINS' },
  { drugs: ['lithium', 'diurétique'], severity: 'high', desc: 'Toxicité lithium', action: 'Surveillance lithiémie' },
  
  // Antibiotiques
  { drugs: ['fluoroquinolone', 'corticoïde'], severity: 'medium', desc: 'Risque tendinopathie', action: 'Info patient' },
  { drugs: ['ciprofloxacine', 'prednisone'], severity: 'medium', desc: 'Risque tendinopathie', action: 'Info patient' },
  { drugs: ['macrolide', 'statine'], severity: 'medium', desc: 'Risque rhabdomyolyse', action: 'Préférer azithromycine' },
  { drugs: ['clarithromycine', 'simvastatine'], severity: 'high', desc: 'Risque myopathie sévère', action: 'Suspendre statine' },
  { drugs: ['métronidazole', 'alcool'], severity: 'high', desc: 'Effet antabuse', action: 'Éviter alcool' },
  
  // Antidiabétiques
  { drugs: ['metformine', 'iode'], severity: 'high', desc: 'Acidose lactique', action: 'Arrêt 48h avant/après contraste' },
  { drugs: ['sulfamide', 'fluconazole'], severity: 'medium', desc: 'Hypoglycémie', action: 'Surveillance glycémie' },
  
  // Autres
  { drugs: ['allopurinol', 'azathioprine'], severity: 'critical', desc: 'Toxicité hémato majeure', action: 'Réduire azathio 75%' },
  { drugs: ['méthotrexate', 'ibuprofène'], severity: 'high', desc: 'Toxicité MTX', action: 'Éviter AINS' },
];

// Mapping substances
const SUBSTANCE_MAP = {
  'paracétamol': ['paracetamol', 'dafalgan', 'doliprane', 'efferalgan'],
  'ibuprofène': ['ibuprofen', 'advil', 'nurofen', 'brufen'],
  'aspirine': ['aspégic', 'aspirin', 'cardioaspirine'],
  'warfarine': ['coumadine', 'marevan'],
  'rivaroxaban': ['xarelto'],
  'apixaban': ['eliquis'],
  'digoxine': ['lanoxin'],
  'amiodarone': ['cordarone'],
  'bêtabloquant': ['bisoprolol', 'métoprolol', 'aténolol', 'propranolol'],
  'bisoprolol': ['concor', 'emcor'],
  'vérapamil': ['isoptine', 'verapamil'],
  'iec': ['lisinopril', 'ramipril', 'énalapril', 'périndopril', 'captopril'],
  'lisinopril': ['zestril', 'lisinopril'],
  'statine': ['simvastatine', 'atorvastatine', 'rosuvastatine', 'pravastatine'],
  'simvastatine': ['zocor'],
  'fibrate': ['fénofibrate', 'gemfibrozil'],
  'isrs': ['sertraline', 'fluoxétine', 'paroxétine', 'escitalopram', 'citalopram'],
  'sertraline': ['zoloft'],
  'benzodiazépine': ['alprazolam', 'diazépam', 'lorazépam', 'bromazépam'],
  'alprazolam': ['xanax'],
  'opioïde': ['morphine', 'oxycodone', 'fentanyl', 'codéine'],
  'tramadol': ['contramal', 'topalgic'],
  'lithium': ['téralithe'],
  'diurétique': ['furosémide', 'hydrochlorothiazide', 'spironolactone'],
  'fluoroquinolone': ['ciprofloxacine', 'lévofloxacine', 'ofloxacine'],
  'ciprofloxacine': ['ciflox'],
  'macrolide': ['clarithromycine', 'érythromycine', 'azithromycine'],
  'clarithromycine': ['zeclar'],
  'corticoïde': ['prednisone', 'prednisolone', 'méthylprednisolone', 'dexaméthasone'],
  'prednisone': ['cortancyl'],
  'metformine': ['glucophage', 'stagid'],
  'sulfamide': ['glibenclamide', 'gliclazide', 'glimépiride'],
  'fluconazole': ['triflucan'],
  'allopurinol': ['zyloric'],
  'azathioprine': ['imurel'],
  'méthotrexate': ['novatrex', 'metoject'],
  'métronidazole': ['flagyl'],
  'potassium': ['diffu-k', 'kaleorid'],
};

const normalizeSubstance = (name) => {
  const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [key, aliases] of Object.entries(SUBSTANCE_MAP)) {
    if (key.toLowerCase() === lower || aliases.some(a => lower.includes(a.toLowerCase()))) {
      return key;
    }
  }
  return lower;
};

const findInteractions = (drugs) => {
  const normalized = drugs.map(d => ({
    original: d,
    normalized: normalizeSubstance(d.substance || d.product_name)
  }));

  const found = [];
  
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const drug1 = normalized[i].normalized;
      const drug2 = normalized[j].normalized;
      
      for (const interaction of INTERACTIONS_DB) {
        const [d1, d2] = interaction.drugs;
        if ((drug1.includes(d1) || d1.includes(drug1) || drug1 === d1) &&
            (drug2.includes(d2) || d2.includes(drug2) || drug2 === d2) ||
            (drug1.includes(d2) || d2.includes(drug1) || drug1 === d2) &&
            (drug2.includes(d1) || d1.includes(drug2) || drug2 === d1)) {
          found.push({
            ...interaction,
            drug1Name: normalized[i].original.product_name || normalized[i].original,
            drug2Name: normalized[j].original.product_name || normalized[j].original
          });
        }
      }
    }
  }
  
  return found;
};

const SEVERITY_CONFIG = {
  critical: { label: 'Contre-indication', color: 'bg-red-600', icon: AlertCircle, bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  high: { label: 'Majeure', color: 'bg-orange-600', icon: AlertTriangle, bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
  medium: { label: 'Modérée', color: 'bg-yellow-500', icon: Info, bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
  low: { label: 'Mineure', color: 'bg-blue-500', icon: Info, bgColor: 'bg-blue-50', borderColor: 'border-blue-400' },
};

export default function DrugInteractionPanel({ drugs, onRemoveDrug, onClear, onAddDrug }) {
  const [searchQuery, setSearchQuery] = useState('');

  const interactions = useMemo(() => findInteractions(drugs), [drugs]);
  
  const hasCritical = interactions.some(i => i.severity === 'critical');
  const hasHigh = interactions.some(i => i.severity === 'high');

  const quickAddDrugs = [
    { product_name: 'Paracétamol', substance: 'Paracétamol', cnk: 'quick1' },
    { product_name: 'Ibuprofène', substance: 'Ibuprofène', cnk: 'quick2' },
    { product_name: 'Aspirine', substance: 'Aspirine', cnk: 'quick3' },
    { product_name: 'Warfarine', substance: 'Warfarine', cnk: 'quick4' },
    { product_name: 'Metformine', substance: 'Metformine', cnk: 'quick5' },
  ];

  return (
    <div className="space-y-4">
      {/* Médicaments sélectionnés */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5" />
              Médicaments à vérifier ({drugs.length})
            </CardTitle>
            {drugs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <Trash2 className="w-4 h-4 mr-1" />
                Tout effacer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {drugs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {drugs.map((drug, idx) => (
                <Badge
                  key={drug.cnk || idx}
                  variant="secondary"
                  className="px-3 py-2 text-sm"
                >
                  {drug.product_name}
                  <button
                    className="ml-2 hover:text-red-600"
                    onClick={() => onRemoveDrug(drug)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <p className="mb-4">Ajoutez des médicaments pour vérifier les interactions</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickAddDrugs.map((drug) => (
                  <Button
                    key={drug.cnk}
                    variant="outline"
                    size="sm"
                    onClick={() => onAddDrug(drug)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {drug.product_name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résultat des interactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${hasCritical ? 'text-red-600' : hasHigh ? 'text-orange-600' : 'text-slate-400'}`} />
            Résultat de l'analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drugs.length < 2 ? (
            <div className="text-center py-8 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Ajoutez au moins 2 médicaments pour analyser les interactions</p>
            </div>
          ) : interactions.length === 0 ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <AlertTitle className="text-green-800">Aucune interaction détectée</AlertTitle>
              <AlertDescription className="text-green-700">
                Les {drugs.length} médicaments analysés ne présentent pas d'interaction connue.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <Alert className={hasCritical ? 'border-red-500 bg-red-50' : hasHigh ? 'border-orange-500 bg-orange-50' : 'border-yellow-500 bg-yellow-50'}>
                <AlertTriangle className={`w-5 h-5 ${hasCritical ? 'text-red-600' : hasHigh ? 'text-orange-600' : 'text-yellow-600'}`} />
                <AlertTitle className={hasCritical ? 'text-red-800' : hasHigh ? 'text-orange-800' : 'text-yellow-800'}>
                  {interactions.length} interaction{interactions.length > 1 ? 's' : ''} détectée{interactions.length > 1 ? 's' : ''}
                </AlertTitle>
              </Alert>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {interactions.sort((a, b) => {
                    const order = { critical: 0, high: 1, medium: 2, low: 3 };
                    return order[a.severity] - order[b.severity];
                  }).map((interaction, idx) => {
                    const config = SEVERITY_CONFIG[interaction.severity];
                    const Icon = config.icon;
                    return (
                      <div key={idx} className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{interaction.drug1Name}</Badge>
                              <span className="text-slate-400">+</span>
                              <Badge variant="outline">{interaction.drug2Name}</Badge>
                              <Badge className={config.color}>{config.label}</Badge>
                            </div>
                            <p className="text-sm font-medium">{interaction.desc}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              <strong>Conduite à tenir:</strong> {interaction.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}