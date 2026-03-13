/**
 * Conditions de remboursement par paragraphe Chapitre IV (INAMI/RIZIV)
 * 
 * Chaque paragraphe définit:
 * - Le type d'autorisation (modèle b, c, d, e)
 * - Les conditions à cocher par le médecin
 * - Le type de médecin autorisé à faire la demande
 * - La durée de l'autorisation
 * - Les documents éventuels à joindre
 * - Les conditions de prolongation
 * 
 * Inspiré du système CIVARS / MyCareNet eChapter IV
 */

export const PARAGRAPH_CONDITIONS = {
  // === ANTI-DIABÉTIQUES ===
  '3200000': {
    title: 'Inhibiteurs SGLT2 (gliflozines)',
    category: 'Endocrinologie',
    authModel: 'b',
    prescriber: ['generaliste', 'specialiste_endocrino', 'specialiste_interne'],
    duration: { first: 12, renewal: 60 },
    renewalAutomatic: true,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'diag_dt2', text: 'Le bénéficiaire est atteint de diabète de type 2', required: true },
        { id: 'hba1c', text: 'HbA1c ≥ 7.0% malgré un traitement antidiabétique depuis au moins 3 mois', required: true, needsValue: true, valueLabel: 'Valeur HbA1c (%)', valueType: 'number' },
        { id: 'metformin_ci', text: 'Contre-indication ou intolérance documentée à la metformine', required: false, exclusive: 'metformin_combo' },
        { id: 'metformin_combo', text: 'En association avec la metformine (dose maximale tolérée)', required: false, exclusive: 'metformin_ci' },
        { id: 'cv_risk', text: 'Le patient présente un risque cardiovasculaire élevé ou une insuffisance cardiaque', required: false },
        { id: 'renal', text: 'Le patient présente une néphropathie diabétique (DFGe ≥ 20 ml/min)', required: false },
      ],
      documents: [
        { id: 'lab_hba1c', text: 'Résultat de laboratoire HbA1c récent (< 6 mois)', required: true },
      ]
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'ongoing_treatment', text: 'Le traitement est poursuivi et bien toléré', required: true },
        { id: 'compliance', text: 'Le bénéficiaire est compliant au traitement', required: true },
      ],
      documents: []
    }
  },

  '3210000': {
    title: 'Agonistes GLP-1 (sémaglutide, dulaglutide, liraglutide)',
    category: 'Endocrinologie',
    authModel: 'b',
    prescriber: ['generaliste', 'specialiste_endocrino', 'specialiste_interne'],
    duration: { first: 12, renewal: 60 },
    renewalAutomatic: true,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'diag_dt2', text: 'Le bénéficiaire est atteint de diabète de type 2', required: true },
        { id: 'hba1c', text: 'HbA1c ≥ 7.0% malgré un traitement antidiabétique depuis au moins 3 mois', required: true, needsValue: true, valueLabel: 'Valeur HbA1c (%)', valueType: 'number' },
        { id: 'bmi', text: 'IMC ≥ 30 kg/m²', required: true, needsValue: true, valueLabel: 'IMC (kg/m²)', valueType: 'number' },
        { id: 'metformin_combo', text: 'En association avec la metformine (dose maximale tolérée)', required: false },
        { id: 'insulin_combo', text: 'En association avec une insuline basale', required: false },
      ],
      documents: [
        { id: 'lab_hba1c', text: 'Résultat de laboratoire HbA1c récent (< 6 mois)', required: true },
      ]
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'ongoing_treatment', text: 'Le traitement est poursuivi et bien toléré', required: true },
        { id: 'hba1c_improved', text: 'L\'HbA1c a diminué d\'au moins 0.5% par rapport à la valeur initiale', required: true },
      ],
      documents: [
        { id: 'lab_hba1c_renewal', text: 'Résultat de laboratoire HbA1c récent (< 6 mois)', required: true },
      ]
    }
  },

  // === ANTICOAGULANTS ===
  '4220000': {
    title: 'Anticoagulants oraux directs (AOD) - Rivaroxaban, Apixaban, Edoxaban, Dabigatran',
    category: 'Cardiologie',
    authModel: 'd',
    prescriber: ['generaliste', 'specialiste_cardio', 'specialiste_interne', 'specialiste_neuro'],
    duration: { first: 12, renewal: 60 },
    renewalAutomatic: true,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'fa_non_valv', text: 'Fibrillation auriculaire non valvulaire avec score CHA₂DS₂-VASc ≥ 1 (homme) ou ≥ 2 (femme)', required: false, group: 'indication' },
        { id: 'tvp_ep', text: 'Traitement de la thrombose veineuse profonde (TVP) et/ou embolie pulmonaire (EP)', required: false, group: 'indication' },
        { id: 'prevention_tvp', text: 'Prévention des récidives de TVP/EP', required: false, group: 'indication' },
        { id: 'post_ortho', text: 'Prévention des événements thromboemboliques veineux après chirurgie orthopédique majeure', required: false, group: 'indication' },
        { id: 'avk_ci', text: 'Contre-indication ou intolérance aux AVK (antivitamines K)', required: false },
        { id: 'avk_instable', text: 'INR instable sous AVK malgré une bonne compliance', required: false },
        { id: 'renal_ok', text: 'Fonction rénale compatible (clairance créatinine ≥ 15 ml/min)', required: true },
      ],
      documents: [],
      groupRules: {
        'indication': { min: 1, message: 'Au moins une indication doit être cochée' }
      }
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'ongoing', text: 'L\'indication persiste et le traitement est bien toléré', required: true },
        { id: 'no_bleeding', text: 'Absence de complication hémorragique majeure', required: true },
        { id: 'renal_check', text: 'Fonction rénale vérifiée dans les 12 derniers mois', required: true },
      ],
      documents: []
    }
  },

  // === IMMUNOSUPPRESSEURS BIOLOGIQUES ===
  '5810000': {
    title: 'Agents biologiques anti-TNF et immunomodulateurs',
    category: 'Rhumatologie / Gastro-entérologie / Dermatologie',
    authModel: 'b',
    prescriber: ['specialiste_rhumato', 'specialiste_gastro', 'specialiste_dermato'],
    duration: { first: 6, renewal: 12 },
    renewalAutomatic: false,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'ra', text: 'Polyarthrite rhumatoïde active (DAS28 ≥ 3.2) réfractaire aux DMARDs conventionnels', required: false, group: 'indication' },
        { id: 'spa', text: 'Spondylarthrite ankylosante active (BASDAI ≥ 4) réfractaire aux AINS', required: false, group: 'indication' },
        { id: 'psa', text: 'Arthrite psoriasique active réfractaire aux DMARDs conventionnels', required: false, group: 'indication' },
        { id: 'crohn', text: 'Maladie de Crohn modérée à sévère (CDAI ≥ 220) réfractaire aux traitements conventionnels', required: false, group: 'indication' },
        { id: 'rch', text: 'Rectocolite hémorragique modérée à sévère réfractaire aux traitements conventionnels', required: false, group: 'indication' },
        { id: 'psoriasis', text: 'Psoriasis en plaques sévère (PASI ≥ 10 et DLQI ≥ 10) réfractaire aux traitements systémiques', required: false, group: 'indication' },
        { id: 'failed_conventional', text: 'Échec documenté d\'au moins 2 traitements conventionnels pendant ≥ 3 mois chacun', required: true },
        { id: 'tb_screening', text: 'Dépistage tuberculose effectué (IDR/Quantiferon + radiographie thorax)', required: true },
        { id: 'hepatitis_screening', text: 'Sérologies hépatites B et C effectuées', required: true },
      ],
      documents: [
        { id: 'specialist_report', text: 'Rapport du médecin spécialiste avec historique thérapeutique', required: true },
        { id: 'disease_score', text: 'Score d\'activité de la maladie (DAS28, BASDAI, CDAI, PASI selon l\'indication)', required: true },
        { id: 'tb_results', text: 'Résultats du dépistage tuberculose', required: true },
      ],
      groupRules: {
        'indication': { min: 1, message: 'Au moins une indication doit être sélectionnée' }
      }
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'response', text: 'Réponse clinique satisfaisante au traitement', required: true },
        { id: 'score_improved', text: 'Amélioration significative du score d\'activité de la maladie', required: true },
        { id: 'tolerance', text: 'Bonne tolérance au traitement (absence d\'effets indésirables graves)', required: true },
      ],
      documents: [
        { id: 'followup_report', text: 'Rapport de suivi du spécialiste avec scores d\'activité actuels', required: true },
      ]
    }
  },

  // === IPP (Inhibiteurs de la pompe à protons) ===
  '1610000': {
    title: 'Inhibiteurs de la pompe à protons (IPP) - traitement chronique',
    category: 'Gastro-entérologie',
    authModel: 'b',
    prescriber: ['generaliste', 'specialiste_gastro', 'specialiste_interne'],
    duration: { first: 12, renewal: 60 },
    renewalAutomatic: true,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'gerd', text: 'Reflux gastro-œsophagien documenté par endoscopie', required: false, group: 'indication' },
        { id: 'ulcer', text: 'Ulcère gastrique ou duodénal documenté', required: false, group: 'indication' },
        { id: 'zollinger', text: 'Syndrome de Zollinger-Ellison', required: false, group: 'indication' },
        { id: 'nsaid_prevention', text: 'Prévention des lésions gastro-duodénales dues aux AINS chez un patient à haut risque', required: false, group: 'indication' },
        { id: 'barrett', text: 'Œsophage de Barrett documenté par biopsie', required: false, group: 'indication' },
      ],
      documents: [
        { id: 'endoscopy', text: 'Rapport d\'endoscopie (si indication GERD, ulcère ou Barrett)', required: false },
      ],
      groupRules: {
        'indication': { min: 1, message: 'Au moins une indication doit être cochée' }
      }
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'ongoing_need', text: 'La nécessité du traitement au long cours persiste', required: true },
        { id: 'lowest_dose', text: 'La dose la plus faible efficace est utilisée', required: true },
      ],
      documents: []
    }
  },

  // === ANTINÉOPLASIQUES ===
  '8100000': {
    title: 'Antinéoplasiques et immunomodulateurs (oncologie)',
    category: 'Oncologie',
    authModel: 'b',
    prescriber: ['specialiste_onco', 'specialiste_hemato'],
    duration: { first: 6, renewal: 6 },
    renewalAutomatic: false,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'confirmed_diag', text: 'Diagnostic histologique/cytologique confirmé', required: true },
        { id: 'indication_amm', text: 'L\'indication correspond à une indication reconnue dans les conditions de remboursement', required: true },
        { id: 'ps_ok', text: 'Performance Status (ECOG) compatible avec le traitement (0, 1 ou 2)', required: true },
        { id: 'organ_function', text: 'Fonctions hépatique, rénale et hématologique compatibles avec le traitement', required: true },
        { id: 'prior_treatment', text: 'Les traitements antérieurs exigés par les conditions ont été administrés ou sont contre-indiqués', required: false },
      ],
      documents: [
        { id: 'histology', text: 'Rapport anatomopathologique', required: true },
        { id: 'staging', text: 'Bilan d\'extension (staging TNM)', required: true },
        { id: 'mdt', text: 'Décision de consultation multidisciplinaire oncologique (CMO)', required: true },
      ]
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'response_eval', text: 'Évaluation de la réponse tumorale effectuée (RECIST, etc.)', required: true },
        { id: 'no_progression', text: 'Absence de progression tumorale', required: true },
        { id: 'tolerance_ok', text: 'Toxicité acceptable permettant la poursuite du traitement', required: true },
        { id: 'ps_maintained', text: 'Performance Status maintenu (ECOG 0-2)', required: true },
      ],
      documents: [
        { id: 'imaging', text: 'Compte-rendu d\'imagerie d\'évaluation récent', required: true },
      ]
    }
  },

  // === STATINES à haute dose ===
  '2440000': {
    title: 'Statines à dose élevée (rosuvastatine, atorvastatine)',
    category: 'Cardiologie',
    authModel: 'd',
    prescriber: ['generaliste', 'specialiste_cardio', 'specialiste_interne'],
    duration: { first: 12, renewal: 60 },
    renewalAutomatic: true,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'hypercholest', text: 'Hypercholestérolémie primaire ou dyslipidémie mixte', required: false, group: 'indication' },
        { id: 'familial', text: 'Hypercholestérolémie familiale hétérozygote', required: false, group: 'indication' },
        { id: 'cv_prevention', text: 'Prévention cardiovasculaire secondaire (antécédent d\'événement CV)', required: false, group: 'indication' },
        { id: 'ldl_target', text: 'Objectif LDL-C non atteint avec une statine à dose standard', required: true, needsValue: true, valueLabel: 'LDL-C actuel (mg/dL)', valueType: 'number' },
      ],
      documents: [
        { id: 'lipid_panel', text: 'Bilan lipidique récent (< 6 mois)', required: true },
      ],
      groupRules: {
        'indication': { min: 1, message: 'Au moins une indication doit être cochée' }
      }
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'ongoing', text: 'Le traitement est poursuivi et bien toléré', required: true },
      ],
      documents: []
    }
  },

  // === KINÉSITHÉRAPIE (soins ambulatoires) ===
  'ambulatory_physio': {
    title: 'Kinésithérapie - Pathologies chroniques',
    category: 'Soins ambulatoires',
    authModel: 'b',
    prescriber: ['generaliste', 'specialiste'],
    duration: { first: 12, renewal: 12 },
    renewalAutomatic: false,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'chronic_condition', text: 'Le patient présente une pathologie chronique nécessitant une rééducation fonctionnelle', required: true },
        { id: 'functional_limitation', text: 'Limitation fonctionnelle objectivée', required: true },
        { id: 'rehab_plan', text: 'Un plan de rééducation a été établi', required: true },
      ],
      documents: [
        { id: 'prescription_kine', text: 'Prescription médicale de kinésithérapie', required: true },
      ]
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'progress', text: 'Progrès fonctionnels documentés', required: true },
        { id: 'ongoing_need', text: 'La nécessité de poursuivre le traitement est justifiée', required: true },
      ],
      documents: [
        { id: 'kine_report', text: 'Rapport du kinésithérapeute', required: true },
      ]
    }
  },

  // === LOGOPÉDIE ===
  'ambulatory_logo': {
    title: 'Logopédie - Troubles du langage',
    category: 'Soins ambulatoires',
    authModel: 'b',
    prescriber: ['generaliste', 'specialiste_orl', 'specialiste_neuro', 'specialiste_pediatre'],
    duration: { first: 24, renewal: 24 },
    renewalAutomatic: false,
    firstRequest: {
      label: 'Première demande',
      conditions: [
        { id: 'speech_disorder', text: 'Trouble du langage et/ou de la parole objectivé par un bilan logopédique', required: true },
        { id: 'impact', text: 'Le trouble a un impact significatif sur la communication et/ou les apprentissages', required: true },
        { id: 'qi_ok', text: 'Le QI total est ≥ 86 (ou performances non-verbales ≥ 86)', required: true },
      ],
      documents: [
        { id: 'logo_bilan', text: 'Bilan logopédique complet', required: true },
        { id: 'qi_test', text: 'Résultats du test de QI (si applicable)', required: false },
        { id: 'orl_report', text: 'Rapport ORL avec audiogramme', required: false },
      ]
    },
    renewal: {
      label: 'Demande de prolongation',
      conditions: [
        { id: 'progress', text: 'Progrès objectivés dans le bilan de suivi', required: true },
        { id: 'ongoing_need', text: 'La poursuite de la thérapie est justifiée', required: true },
      ],
      documents: [
        { id: 'logo_followup', text: 'Bilan logopédique de suivi', required: true },
      ]
    }
  }
};

// Liste des organismes assureurs belges
export const MUTUAL_ORGANIZATIONS = [
  { code: '100', name: 'Alliance Nationale des Mutualités Chrétiennes (MC)' },
  { code: '200', name: 'Union Nationale des Mutualités Neutres' },
  { code: '300', name: 'Union Nationale des Mutualités Socialistes (Solidaris)' },
  { code: '400', name: 'Union Nationale des Mutualités Libérales (Partenamut)' },
  { code: '500', name: 'Union Nationale des Mutualités Libres (Helan)' },
  { code: '600', name: 'CAAMI (Caisse Auxiliaire d\'Assurance Maladie-Invalidité)' },
  { code: '900', name: 'HR Rail (anciennement SNCB)' }
];

// Types de prescripteurs
export const PRESCRIBER_TYPES = {
  generaliste: 'Médecin généraliste',
  specialiste: 'Médecin spécialiste',
  specialiste_endocrino: 'Endocrinologue',
  specialiste_interne: 'Interniste',
  specialiste_cardio: 'Cardiologue',
  specialiste_neuro: 'Neurologue',
  specialiste_rhumato: 'Rhumatologue',
  specialiste_gastro: 'Gastro-entérologue',
  specialiste_dermato: 'Dermatologue',
  specialiste_onco: 'Oncologue',
  specialiste_hemato: 'Hématologue',
  specialiste_orl: 'ORL',
  specialiste_pediatre: 'Pédiatre'
};

// Modèles d'autorisation
export const AUTH_MODELS = {
  b: { name: 'Modèle B', description: 'Nombre illimité de conditionnements, pas de volet de renouvellement' },
  c: { name: 'Modèle C', description: 'Nombre limité de conditionnements, attestation par conditionnement' },
  d: { name: 'Modèle D', description: 'Nombre illimité de conditionnements avec volet de renouvellement, renouvellement automatique possible' },
  e: { name: 'Modèle E', description: 'Nombre déterminé de conditionnements sur une seule attestation' }
};

// Helper pour trouver le paragraphe correspondant à un médicament
export function findParagraphForMedication(medicationName) {
  const name = (medicationName || '').toLowerCase();
  
  // Mapping simplifié médicament → paragraphe
  const mappings = [
    { keywords: ['forxiga', 'jardiance', 'invokana', 'dapagliflozine', 'empagliflozine', 'canagliflozine', 'steglatro'], paragraph: '3200000' },
    { keywords: ['ozempic', 'trulicity', 'victoza', 'wegovy', 'mounjaro', 'semaglutide', 'dulaglutide', 'liraglutide', 'tirzepatide'], paragraph: '3210000' },
    { keywords: ['xarelto', 'eliquis', 'lixiana', 'pradaxa', 'rivaroxaban', 'apixaban', 'edoxaban', 'dabigatran'], paragraph: '4220000' },
    { keywords: ['humira', 'enbrel', 'remicade', 'simponi', 'cimzia', 'stelara', 'cosentyx', 'tremfya', 'skyrizi', 'adalimumab', 'etanercept', 'infliximab', 'golimumab', 'certolizumab', 'ustekinumab', 'secukinumab', 'guselkumab', 'risankizumab'], paragraph: '5810000' },
    { keywords: ['nexiam', 'pantomed', 'losec', 'pariet', 'esomeprazole', 'pantoprazole', 'omeprazole', 'rabeprazole', 'lansoprazole'], paragraph: '1610000' },
    { keywords: ['keytruda', 'opdivo', 'tecentriq', 'imfinzi', 'pembrolizumab', 'nivolumab', 'atezolizumab', 'durvalumab', 'ibrance', 'palbociclib', 'lynparza', 'olaparib'], paragraph: '8100000' },
    { keywords: ['crestor', 'lipitor', 'rosuvastatine', 'atorvastatine'], paragraph: '2440000' },
  ];

  for (const mapping of mappings) {
    if (mapping.keywords.some(kw => name.includes(kw))) {
      return mapping.paragraph;
    }
  }
  return null;
}