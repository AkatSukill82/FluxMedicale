import React, { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Pill,
  ShieldCheck,
  ShieldAlert,
  HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Base d'interactions médicamenteuses ───
const DRUG_INTERACTIONS = [
  { drug1: 'warfarine', drug2: 'aspirine', severity: 'high', desc: 'Risque hémorragique majeur', action: 'Éviter ou surveillance INR étroite' },
  { drug1: 'warfarine', drug2: 'ains', severity: 'high', desc: 'Risque hémorragique par les AINS', action: 'Préférer paracétamol' },
  { drug1: 'warfarine', drug2: 'paracetamol', severity: 'low', desc: 'Légère augmentation INR si usage prolongé', action: 'Surveillance INR' },
  { drug1: 'rivaroxaban', drug2: 'aspirine', severity: 'medium', desc: 'Risque saignement augmenté', action: 'Évaluer bénéfice/risque' },
  { drug1: 'apixaban', drug2: 'aspirine', severity: 'medium', desc: 'Risque saignement augmenté', action: 'Évaluer bénéfice/risque' },
  { drug1: 'digoxine', drug2: 'amiodarone', severity: 'high', desc: 'Toxicité digoxine augmentée', action: 'Réduire dose digoxine 50%' },
  { drug1: 'betabloquant', drug2: 'verapamil', severity: 'critical', desc: 'Bradycardie sévère, BAV', action: 'Association contre-indiquée' },
  { drug1: 'iec', drug2: 'potassium', severity: 'medium', desc: 'Risque hyperkaliémie', action: 'Surveillance kaliémie' },
  { drug1: 'iec', drug2: 'ains', severity: 'medium', desc: 'Diminution effet antihypertenseur, risque IRA', action: 'Surveillance TA et fonction rénale' },
  { drug1: 'statine', drug2: 'fibrate', severity: 'medium', desc: 'Risque rhabdomyolyse', action: 'Surveillance CPK' },
  { drug1: 'simvastatine', drug2: 'amiodarone', severity: 'high', desc: 'Risque myopathie sévère', action: 'Max 20mg simvastatine/j' },
  { drug1: 'macrolide', drug2: 'statine', severity: 'medium', desc: 'Risque rhabdomyolyse par CYP3A4', action: 'Préférer azithromycine ou suspendre statine' },
  { drug1: 'clarithromycine', drug2: 'simvastatine', severity: 'high', desc: 'Myopathie sévère', action: 'Suspendre statine' },
  { drug1: 'isrs', drug2: 'imao', severity: 'critical', desc: 'Syndrome sérotoninergique fatal', action: 'CI absolue, délai 14 jours' },
  { drug1: 'isrs', drug2: 'tramadol', severity: 'medium', desc: 'Risque syndrome sérotoninergique', action: 'Surveillance clinique' },
  { drug1: 'benzodiazepine', drug2: 'opioide', severity: 'high', desc: 'Dépression respiratoire', action: 'Éviter ou réduire doses' },
  { drug1: 'lithium', drug2: 'ains', severity: 'high', desc: 'Toxicité lithium', action: 'Éviter AINS ou surveillance lithiémie' },
  { drug1: 'lithium', drug2: 'diuretique', severity: 'high', desc: 'Toxicité lithium par déshydratation', action: 'Surveillance lithiémie' },
  { drug1: 'fluoroquinolone', drug2: 'corticoide', severity: 'medium', desc: 'Risque tendinopathie/rupture', action: 'Information patient' },
  { drug1: 'metronidazole', drug2: 'alcool', severity: 'high', desc: 'Effet antabuse', action: 'Éviter alcool pendant traitement' },
  { drug1: 'metformine', drug2: 'iode', severity: 'high', desc: 'Acidose lactique', action: 'Arrêt 48h avant/après contraste iodé' },
  { drug1: 'sulfamide', drug2: 'fluconazole', severity: 'medium', desc: 'Hypoglycémie', action: 'Surveillance glycémie' },
  { drug1: 'allopurinol', drug2: 'azathioprine', severity: 'critical', desc: 'Toxicité hématologique majeure', action: 'Réduire azathioprine 75%' },
  { drug1: 'methotrexate', drug2: 'ains', severity: 'high', desc: 'Toxicité méthotrexate', action: 'Éviter AINS' },
  { drug1: 'isrs', drug2: 'ains', severity: 'medium', desc: 'Risque hémorragique GI augmenté', action: 'Associer IPP si nécessaire' },
];

// ─── Mapping substances → catégories ───
const CATEGORY_MAP = {
  'paracetamol': 'paracetamol', 'paracétamol': 'paracetamol', 'dafalgan': 'paracetamol', 'doliprane': 'paracetamol', 'efferalgan': 'paracetamol',
  'ibuprofene': 'ains', 'ibuprofène': 'ains', 'advil': 'ains', 'nurofen': 'ains', 'brufen': 'ains',
  'diclofenac': 'ains', 'diclofénac': 'ains', 'voltaren': 'ains',
  'naproxene': 'ains', 'naproxène': 'ains',
  'ketoprofene': 'ains', 'kétoprofène': 'ains', 'profenid': 'ains',
  'aspirine': 'aspirine', 'aspegic': 'aspirine', 'aspégic': 'aspirine', 'cardioaspirine': 'aspirine',
  'warfarine': 'warfarine', 'coumadine': 'warfarine', 'sintrom': 'warfarine', 'marevan': 'warfarine',
  'rivaroxaban': 'rivaroxaban', 'xarelto': 'rivaroxaban',
  'apixaban': 'apixaban', 'eliquis': 'apixaban',
  'lisinopril': 'iec', 'ramipril': 'iec', 'enalapril': 'iec', 'énalapril': 'iec', 'perindopril': 'iec', 'périndopril': 'iec', 'coversyl': 'iec', 'zestril': 'iec', 'triatec': 'iec',
  'losartan': 'iec', 'valsartan': 'iec', 'candesartan': 'iec', 'cozaar': 'iec', 'tareg': 'iec',
  'bisoprolol': 'betabloquant', 'metoprolol': 'betabloquant', 'métoprolol': 'betabloquant', 'atenolol': 'betabloquant', 'aténolol': 'betabloquant', 'propranolol': 'betabloquant',
  'verapamil': 'verapamil', 'vérapamil': 'verapamil', 'isoptine': 'verapamil',
  'diltiazem': 'diltiazem', 'tildiem': 'diltiazem',
  'digoxine': 'digoxine', 'lanoxin': 'digoxine',
  'amiodarone': 'amiodarone', 'cordarone': 'amiodarone',
  'atorvastatine': 'statine', 'simvastatine': 'statine', 'rosuvastatine': 'statine', 'pravastatine': 'statine', 'tahor': 'statine', 'lipitor': 'statine', 'zocor': 'statine', 'crestor': 'statine',
  'fenofibrate': 'fibrate', 'fénofibrate': 'fibrate', 'gemfibrozil': 'fibrate', 'lipanthyl': 'fibrate',
  'metformine': 'metformine', 'glucophage': 'metformine', 'stagid': 'metformine',
  'glibenclamide': 'sulfamide', 'gliclazide': 'sulfamide', 'diamicron': 'sulfamide',
  'fluoxetine': 'isrs', 'fluoxétine': 'isrs', 'prozac': 'isrs',
  'sertraline': 'isrs', 'zoloft': 'isrs',
  'paroxetine': 'isrs', 'paroxétine': 'isrs', 'deroxat': 'isrs',
  'escitalopram': 'isrs', 'seroplex': 'isrs',
  'citalopram': 'isrs', 'seropram': 'isrs',
  'venlafaxine': 'isrs', 'effexor': 'isrs', 'duloxetine': 'isrs', 'cymbalta': 'isrs',
  'diazepam': 'benzodiazepine', 'diazépam': 'benzodiazepine', 'valium': 'benzodiazepine',
  'alprazolam': 'benzodiazepine', 'xanax': 'benzodiazepine',
  'lorazepam': 'benzodiazepine', 'lorazépam': 'benzodiazepine', 'temesta': 'benzodiazepine',
  'bromazepam': 'benzodiazepine', 'bromazépam': 'benzodiazepine', 'lexomil': 'benzodiazepine',
  'tramadol': 'tramadol', 'contramal': 'tramadol', 'topalgic': 'tramadol',
  'morphine': 'opioide', 'codeine': 'opioide', 'codéine': 'opioide', 'oxycodone': 'opioide', 'fentanyl': 'opioide',
  'ciprofloxacine': 'fluoroquinolone', 'ciflox': 'fluoroquinolone', 'levofloxacine': 'fluoroquinolone', 'lévofloxacine': 'fluoroquinolone', 'ofloxacine': 'fluoroquinolone',
  'clarithromycine': 'macrolide', 'erythromycine': 'macrolide', 'érythromycine': 'macrolide', 'azithromycine': 'macrolide', 'zeclar': 'macrolide', 'zithromax': 'macrolide',
  'amoxicilline': 'penicilline', 'augmentin': 'penicilline',
  'metronidazole': 'metronidazole', 'métronidazole': 'metronidazole', 'flagyl': 'metronidazole',
  'prednisone': 'corticoide', 'prednisolone': 'corticoide', 'methylprednisolone': 'corticoide', 'méthylprednisolone': 'corticoide', 'medrol': 'corticoide', 'solupred': 'corticoide', 'cortancyl': 'corticoide', 'dexamethasone': 'corticoide',
  'lithium': 'lithium', 'teralithe': 'lithium', 'téralithe': 'lithium',
  'allopurinol': 'allopurinol', 'zyloric': 'allopurinol',
  'azathioprine': 'azathioprine', 'imurel': 'azathioprine',
  'methotrexate': 'methotrexate', 'méthotrexate': 'methotrexate', 'novatrex': 'methotrexate',
  'fluconazole': 'fluconazole', 'triflucan': 'fluconazole',
  'omeprazole': 'ipp', 'oméprazole': 'ipp', 'pantoprazole': 'ipp', 'esomeprazole': 'ipp', 'ésoméprazole': 'ipp', 'lansoprazole': 'ipp',
  'furosemide': 'diuretique', 'furosémide': 'diuretique', 'hydrochlorothiazide': 'diuretique', 'spironolactone': 'diuretique',
  'potassium': 'potassium', 'diffu-k': 'potassium', 'kaleorid': 'potassium',
  'levothyroxine': 'levothyroxine', 'lévothyroxine': 'levothyroxine', 'euthyrox': 'levothyroxine',
  'amlodipine': 'amlodipine',
};

// Allergies croisées
const CROSS_ALLERGIES = {
  penicilline: ['amoxicilline', 'ampicilline', 'augmentin'],
  aspirine: ['ibuprofene', 'ibuprofène', 'naproxene', 'naproxène', 'diclofenac', 'diclofénac', 'ketoprofene', 'kétoprofène'],
  sulfamides: ['sulfamethoxazole', 'sulfasalazine'],
};

const normalize = (name) => {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
};

const getCategory = (drugName) => {
  const n = normalize(drugName);
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (n.includes(normalize(key)) || normalize(key).includes(n)) return cat;
  }
  return n;
};

const SEVERITY_CONFIG = {
  critical: { label: 'Contre-indication', badgeClass: 'bg-red-600 text-white', alertClass: 'border-red-500 bg-red-50', textClass: 'text-red-800', Icon: AlertCircle },
  high:     { label: 'Majeure', badgeClass: 'bg-orange-600 text-white', alertClass: 'border-orange-400 bg-orange-50', textClass: 'text-orange-800', Icon: AlertTriangle },
  medium:   { label: 'Modérée', badgeClass: 'bg-yellow-500 text-white', alertClass: 'border-yellow-400 bg-yellow-50', textClass: 'text-yellow-800', Icon: Info },
  low:      { label: 'Mineure', badgeClass: 'bg-blue-500 text-white', alertClass: 'border-blue-300 bg-blue-50', textClass: 'text-blue-800', Icon: Info },
  allergy:  { label: 'Allergie', badgeClass: 'bg-red-700 text-white', alertClass: 'border-red-600 bg-red-100', textClass: 'text-red-900', Icon: ShieldAlert },
};

/**
 * Composant d'alerte d'interactions médicamenteuses en temps réel.
 * 
 * @param {Array} prescribedDrugs - Médicaments en cours de prescription [{nom_produit, name, substance_name}]
 * @param {Array} patientCurrentMeds - Traitement en cours du patient (texte libre ou tableau)
 * @param {Array} patientAllergies - Allergies connues du patient (texte ou tableau)
 */
export default function RealTimeInteractionAlert({ prescribedDrugs = [], patientCurrentMeds = [], patientAllergies = [] }) {
  const [expanded, setExpanded] = useState(true);

  // Normaliser les noms des médicaments prescrits
  const drugNames = useMemo(() => {
    return prescribedDrugs.map(d => {
      const name = d.nom_produit || d.name || d.product_name || d;
      return typeof name === 'string' ? name : '';
    }).filter(Boolean);
  }, [prescribedDrugs]);

  // Normaliser le traitement en cours du patient
  const currentMedNames = useMemo(() => {
    if (typeof patientCurrentMeds === 'string') {
      return patientCurrentMeds.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(patientCurrentMeds)) {
      return patientCurrentMeds.map(m => {
        if (typeof m === 'string') return m;
        return m.nom_produit || m.name || m.product_name || '';
      }).filter(Boolean);
    }
    return [];
  }, [patientCurrentMeds]);

  // Normaliser les allergies
  const allergies = useMemo(() => {
    if (typeof patientAllergies === 'string') {
      return patientAllergies.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    }
    return Array.isArray(patientAllergies) ? patientAllergies.filter(Boolean) : [];
  }, [patientAllergies]);

  // Tous les médicaments combinés pour la détection croisée
  const allDrugs = useMemo(() => [...drugNames, ...currentMedNames], [drugNames, currentMedNames]);

  // Détecter les interactions
  const interactions = useMemo(() => {
    const found = [];
    if (allDrugs.length < 2) return found;

    const cats = allDrugs.map(name => ({ name, cat: getCategory(name) }));

    for (let i = 0; i < cats.length; i++) {
      for (let j = i + 1; j < cats.length; j++) {
        const c1 = cats[i].cat;
        const c2 = cats[j].cat;
        for (const inter of DRUG_INTERACTIONS) {
          if ((c1 === inter.drug1 && c2 === inter.drug2) || (c1 === inter.drug2 && c2 === inter.drug1)) {
            // Marquer si c'est une interaction entre prescription et traitement en cours
            const isNewVsCurrent = (i < drugNames.length && j >= drugNames.length) || (j < drugNames.length && i >= drugNames.length);
            found.push({
              ...inter,
              drug1Name: cats[i].name,
              drug2Name: cats[j].name,
              isNewVsCurrent
            });
          }
        }
      }
    }

    // Dédupliquer
    const unique = [];
    for (const f of found) {
      const key = [f.drug1Name, f.drug2Name].sort().join('|');
      if (!unique.find(u => [u.drug1Name, u.drug2Name].sort().join('|') === key)) {
        unique.push(f);
      }
    }

    return unique.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
  }, [allDrugs, drugNames.length]);

  // Détecter les alertes d'allergie
  const allergyAlerts = useMemo(() => {
    const alerts = [];
    for (const drug of drugNames) {
      const dn = normalize(drug);
      for (const allergy of allergies) {
        const an = normalize(allergy);
        // Direct match
        if (dn.includes(an) || an.includes(dn)) {
          alerts.push({ drug, allergy, type: 'direct', message: `Allergie connue à ${allergy}` });
          continue;
        }
        // Cross-allergy
        for (const [main, crossList] of Object.entries(CROSS_ALLERGIES)) {
          if (an.includes(normalize(main))) {
            if (crossList.some(cr => dn.includes(normalize(cr)))) {
              alerts.push({ drug, allergy, type: 'cross', message: `Allergie croisée possible : ${allergy} → ${drug}` });
            }
          }
        }
      }
    }
    return alerts;
  }, [drugNames, allergies]);

  const totalAlerts = interactions.length + allergyAlerts.length;

  if (drugNames.length === 0) return null;

  const hasCritical = interactions.some(i => i.severity === 'critical') || allergyAlerts.length > 0;
  const hasHigh = interactions.some(i => i.severity === 'high');

  // Pas d'alerte → badge vert
  if (totalAlerts === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
        <ShieldCheck className="w-4 h-4" />
        <span>Aucune interaction détectée{currentMedNames.length > 0 ? ` (incl. ${currentMedNames.length} traitement${currentMedNames.length > 1 ? 's' : ''} en cours)` : ''}</span>
      </div>
    );
  }

  const mainColor = hasCritical ? 'red' : hasHigh ? 'orange' : 'yellow';
  const borderClass = hasCritical ? 'border-red-500' : hasHigh ? 'border-orange-400' : 'border-yellow-400';
  const bgClass = hasCritical ? 'bg-red-50' : hasHigh ? 'bg-orange-50' : 'bg-yellow-50';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border-2 ${borderClass} ${bgClass} overflow-hidden`}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HeartPulse className={`w-5 h-5 ${hasCritical ? 'text-red-600 animate-pulse' : hasHigh ? 'text-orange-600' : 'text-yellow-600'}`} />
            <span className={`font-semibold text-sm ${hasCritical ? 'text-red-800' : hasHigh ? 'text-orange-800' : 'text-yellow-800'}`}>
              {hasCritical ? '⚠️ ALERTE CRITIQUE' : 'Alertes interactions'}
            </span>
            <div className="flex gap-1">
              {allergyAlerts.length > 0 && <Badge className="bg-red-700 text-white text-xs">{allergyAlerts.length} allergie{allergyAlerts.length > 1 ? 's' : ''}</Badge>}
              {interactions.filter(i => i.severity === 'critical').length > 0 && <Badge className="bg-red-600 text-white text-xs">{interactions.filter(i => i.severity === 'critical').length} CI</Badge>}
              {interactions.filter(i => i.severity === 'high').length > 0 && <Badge className="bg-orange-600 text-white text-xs">{interactions.filter(i => i.severity === 'high').length} majeure{interactions.filter(i => i.severity === 'high').length > 1 ? 's' : ''}</Badge>}
              {interactions.filter(i => i.severity === 'medium' || i.severity === 'low').length > 0 && <Badge className="bg-yellow-500 text-white text-xs">{interactions.filter(i => i.severity === 'medium' || i.severity === 'low').length} modérée{interactions.filter(i => i.severity === 'medium' || i.severity === 'low').length > 1 ? 's' : ''}</Badge>}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Details */}
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="px-3 pb-3 space-y-2"
          >
            {/* Allergies */}
            {allergyAlerts.map((a, idx) => (
              <div key={`a-${idx}`} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-100 border border-red-400">
                <ShieldAlert className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-red-900">ALLERGIE : </span>
                  <span className="text-sm text-red-800">{a.message}</span>
                </div>
              </div>
            ))}

            {/* Interactions */}
            {interactions.map((inter, idx) => {
              const cfg = SEVERITY_CONFIG[inter.severity];
              const Icon = cfg.Icon;
              return (
                <div key={`i-${idx}`} className={`p-2.5 rounded-lg border ${cfg.alertClass}`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.textClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Pill className="w-3 h-3" />
                          {inter.drug1Name}
                        </Badge>
                        <span className="text-slate-400 text-xs">+</span>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Pill className="w-3 h-3" />
                          {inter.drug2Name}
                        </Badge>
                        <Badge className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
                        {inter.isNewVsCurrent && (
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                            vs traitement en cours
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs ${cfg.textClass}`}>{inter.desc}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        <strong>→</strong> {inter.action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}