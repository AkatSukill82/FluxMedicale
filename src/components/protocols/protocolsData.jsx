// Protocoles de soins guidés par pathologie pour la médecine générale belge

export const CARE_PROTOCOLS = [
  // ===== INFECTIOLOGIE =====
  {
    id: 'proto_grippe',
    name: 'Syndrome grippal / ILI',
    category: 'Infectiologie',
    icon: '🦠',
    severity: 'low',
    description: 'Prise en charge du syndrome grippal chez l\'adulte',
    steps: [
      {
        title: 'Anamnèse dirigée',
        type: 'checklist',
        items: [
          'Début brutal des symptômes',
          'Fièvre > 38°C',
          'Myalgies / arthralgies',
          'Céphalées',
          'Toux sèche',
          'Asthénie marquée',
          'Contact grippal dans l\'entourage',
          'Vaccination antigrippale cette saison'
        ]
      },
      {
        title: 'Red flags à exclure',
        type: 'alert',
        severity: 'high',
        items: [
          'Dyspnée ou SpO2 < 95%',
          'Confusion ou troubles de conscience',
          'Déshydratation sévère',
          'Douleur thoracique',
          'Patient immunodéprimé',
          'Grossesse',
          'Âge > 65 ans avec comorbidités'
        ],
        action: 'Si un red flag est présent → Envisager hospitalisation ou suivi rapproché'
      },
      {
        title: 'Examen clinique',
        type: 'exam',
        fields: ['temperature', 'fc', 'fr', 'spo2', 'pa'],
        checklist: [
          'Auscultation pulmonaire : MV bilatéraux, pas de foyer',
          'ORL : pharynx érythémateux, pas d\'exsudat',
          'Pas d\'ADP douloureuse cervicale',
          'Pas de raideur méningée'
        ]
      },
      {
        title: 'Prescription recommandée',
        type: 'prescription',
        medications: [
          { name: 'Paracétamol 1g', posology: '1 comprimé 3x/jour si fièvre ou douleur', duration: '5 jours', optional: false },
          { name: 'Sérum physiologique nasal', posology: 'Lavages nasaux 4-6x/jour', duration: '7 jours', optional: true }
        ],
        instructions: 'Repos, hydratation abondante. Pas d\'antibiotiques sauf surinfection bactérienne documentée.'
      },
      {
        title: 'Codes INAMI suggérés',
        type: 'billing',
        codes: ['101032'],
        notes: 'Consultation au cabinet'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Reconsulter si aggravation après 48h, persistance fièvre > 5j, dyspnée, douleur thoracique.',
        delay: '48-72h si pas d\'amélioration'
      }
    ],
    consultation_prefill: {
      motif: 'Syndrome grippal',
      diagnostic: 'Syndrome grippal (J11.1)'
    }
  },

  {
    id: 'proto_angine',
    name: 'Angine aiguë',
    category: 'Infectiologie',
    icon: '🤒',
    severity: 'low',
    description: 'Diagnostic et traitement de l\'angine avec score de McIsaac',
    steps: [
      {
        title: 'Score de McIsaac',
        type: 'score',
        scoreName: 'McIsaac',
        criteria: [
          { label: 'Fièvre > 38°C', points: 1 },
          { label: 'Absence de toux', points: 1 },
          { label: 'Adénopathies cervicales antérieures sensibles', points: 1 },
          { label: 'Atteinte amygdalienne (exsudat/gonflement)', points: 1 },
          { label: 'Âge 3-14 ans (+1) / 15-44 ans (0) / ≥45 ans (-1)', points: 0 }
        ],
        interpretation: [
          { range: [0, 1], text: 'Risque faible SGA (< 10%). Pas de TDR ni antibiotique.', color: 'green' },
          { range: [2, 3], text: 'Risque intermédiaire. TDR recommandé.', color: 'yellow' },
          { range: [4, 5], text: 'Risque élevé SGA (> 50%). TDR ou antibiothérapie directe.', color: 'red' }
        ]
      },
      {
        title: 'Red flags',
        type: 'alert',
        severity: 'high',
        items: [
          'Trismus (ouverture buccale limitée)',
          'Voix étouffée / hot potato voice',
          'Œdème unilatéral du voile',
          'Dysphagie sévère avec incapacité d\'avaler la salive',
          'Torticolis fébrile'
        ],
        action: 'Si présent → Suspicion de phlegmon péri-amygdalien → Urgences ORL'
      },
      {
        title: 'Prescription si TDR+',
        type: 'prescription',
        medications: [
          { name: 'Amoxicilline 1g', posology: '1g 2x/jour', duration: '6 jours', optional: false },
          { name: 'Paracétamol 1g', posology: '1g 3x/jour si douleur', duration: '5 jours', optional: true }
        ],
        instructions: 'Alternative si allergie pénicilline : Azithromycine 500mg J1 puis 250mg J2-J5.'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Amélioration attendue sous 48h. Reconsulter si persistance fièvre > 72h sous antibiotique.',
        delay: '72h si pas d\'amélioration'
      }
    ],
    consultation_prefill: {
      motif: 'Odynophagie / angine',
      diagnostic: 'Angine aiguë (J03)'
    }
  },

  {
    id: 'proto_cystite',
    name: 'Cystite simple (femme)',
    category: 'Infectiologie',
    icon: '💧',
    severity: 'low',
    description: 'Infection urinaire basse non compliquée chez la femme',
    steps: [
      {
        title: 'Critères de cystite simple',
        type: 'checklist',
        items: [
          'Femme non enceinte',
          'Brûlures mictionnelles',
          'Pollakiurie',
          'Urgenturie',
          'Pas de fièvre',
          'Pas de douleur lombaire',
          'Pas de cystites récidivantes (≥ 4/an)'
        ]
      },
      {
        title: 'Situations compliquantes',
        type: 'alert',
        severity: 'medium',
        items: [
          'Grossesse',
          'Anomalie urologique connue',
          'Immunodépression',
          'Insuffisance rénale sévère',
          'Homme (jamais "cystite simple")',
          'Fièvre > 38°C → pyélonéphrite ?'
        ],
        action: 'Si critère présent → Ce n\'est PAS une cystite simple. ECBU obligatoire.'
      },
      {
        title: 'Prescription 1ère intention',
        type: 'prescription',
        medications: [
          { name: 'Nitrofurantoïne 100mg', posology: '100mg 3x/jour', duration: '5 jours', optional: false }
        ],
        instructions: 'Alternative : Fosfomycine-trométamol 3g dose unique. BU si disponible (pas d\'ECBU nécessaire en 1ère intention cystite simple).'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Pas de contrôle nécessaire si amélioration. ECBU si échec à 72h ou récidive < 2 semaines.',
        delay: '72h si persistance'
      }
    ],
    consultation_prefill: {
      motif: 'Brûlures mictionnelles',
      diagnostic: 'Cystite aiguë simple (N30.0)'
    }
  },

  // ===== CARDIOLOGIE =====
  {
    id: 'proto_hta',
    name: 'Suivi HTA',
    category: 'Cardiologie',
    icon: '❤️',
    severity: 'medium',
    description: 'Protocole de suivi de l\'hypertension artérielle',
    steps: [
      {
        title: 'Bilan initial / annuel',
        type: 'checklist',
        items: [
          'Vérifier observance thérapeutique',
          'Rechercher effets indésirables du traitement',
          'Évaluer le mode de vie (sel, alcool, tabac, activité physique)',
          'Vérifier automesure / MAPA si disponible',
          'Rechercher atteinte des organes cibles'
        ]
      },
      {
        title: 'Objectifs tensionnels',
        type: 'alert',
        severity: 'info',
        items: [
          'Objectif général : < 140/90 mmHg au cabinet',
          'En automesure : < 135/85 mmHg',
          'Diabétique : < 130/80 mmHg',
          'Patient > 80 ans : < 150/90 mmHg (PAS)',
          'Insuffisant rénal + protéinurie : < 130/80 mmHg'
        ],
        action: 'Adapter le traitement si objectifs non atteints après 1 mois'
      },
      {
        title: 'Examen clinique',
        type: 'exam',
        fields: ['pa', 'fc', 'poids', 'imc'],
        checklist: [
          'PA aux 2 bras (si 1ère mesure)',
          'Auscultation cardiaque et carotidienne',
          'Recherche d\'œdèmes des MI',
          'Pouls pédieux',
          'Fond d\'œil (annuel ou si HTA sévère)'
        ]
      },
      {
        title: 'Bilan biologique à prescrire',
        type: 'laborders',
        tests: [
          'Créatinine + DFG',
          'Ionogramme (Na, K)',
          'Glycémie à jeun',
          'Bilan lipidique complet',
          'Microalbuminurie / protéinurie',
          'ECG'
        ],
        frequency: 'Annuel'
      },
      {
        title: 'Codes INAMI',
        type: 'billing',
        codes: ['101032'],
        notes: 'Consultation + ECG si réalisé : 475075'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Contrôle à 1 mois si changement de traitement. Sinon tous les 3-6 mois. Bilan annuel complet.',
        delay: '1 mois si modification, sinon 3-6 mois'
      }
    ],
    consultation_prefill: {
      motif: 'Suivi hypertension artérielle',
      diagnostic: 'Hypertension artérielle (I10)'
    }
  },

  // ===== ENDOCRINOLOGIE =====
  {
    id: 'proto_diabete2',
    name: 'Suivi Diabète type 2',
    category: 'Endocrinologie',
    icon: '🩸',
    severity: 'medium',
    description: 'Protocole de suivi trimestriel/annuel du diabète type 2',
    steps: [
      {
        title: 'Évaluation trimestrielle',
        type: 'checklist',
        items: [
          'Vérifier HbA1c (objectif individualisé, généralement < 7%)',
          'Évaluer observance thérapeutique',
          'Rechercher hypoglycémies',
          'Évaluer autosurveillance glycémique',
          'Vérifier la diététique et l\'activité physique',
          'Rechercher signes de complications'
        ]
      },
      {
        title: 'Objectifs HbA1c',
        type: 'alert',
        severity: 'info',
        items: [
          '< 7% : objectif standard',
          '< 6,5% : diabète récent, pas de complication, pas d\'hypoglycémie',
          '< 8% : comorbidités sévères, espérance de vie limitée, diabète ancien',
          '< 8,5% : personne très âgée ou fragile'
        ],
        action: 'Individualiser l\'objectif selon le profil du patient'
      },
      {
        title: 'Examen clinique',
        type: 'exam',
        fields: ['poids', 'imc', 'pa', 'fc'],
        checklist: [
          'Examen des pieds (monofilament, pouls)',
          'Inspection cutanée (sites d\'injection si insuline)',
          'Auscultation cardiaque',
          'Recherche d\'hypotension orthostatique',
          'IMC et tour de taille'
        ]
      },
      {
        title: 'Bilan biologique',
        type: 'laborders',
        tests: [
          'HbA1c (trimestriel)',
          'Créatinine + DFG (annuel)',
          'Microalbuminurie (annuel)',
          'Bilan lipidique (annuel)',
          'TSH (si metformine)',
          'Vitamine B12 (si metformine > 4 ans)'
        ],
        frequency: 'HbA1c trimestriel, reste annuel'
      },
      {
        title: 'Examens complémentaires annuels',
        type: 'checklist',
        items: [
          'Fond d\'œil (ophtalmologue)',
          'ECG',
          'Écho-doppler carotidien (si FDR)',
          'Podologue (si neuropathie/artériopathie)'
        ]
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Contrôle HbA1c tous les 3 mois. Bilan complet annuel. Adaptation du traitement si HbA1c hors cible pendant 2 contrôles consécutifs.',
        delay: '3 mois'
      }
    ],
    consultation_prefill: {
      motif: 'Suivi diabète type 2',
      diagnostic: 'Diabète de type 2 (E11)'
    }
  },

  // ===== PNEUMOLOGIE =====
  {
    id: 'proto_asthme',
    name: 'Suivi Asthme',
    category: 'Pneumologie',
    icon: '🫁',
    severity: 'medium',
    description: 'Évaluation du contrôle de l\'asthme et adaptation du traitement',
    steps: [
      {
        title: 'Score ACT (Asthma Control Test)',
        type: 'score',
        scoreName: 'ACT',
        criteria: [
          { label: 'Gêne dans les activités (1-5)', points: 0 },
          { label: 'Essoufflement (1-5)', points: 0 },
          { label: 'Réveils nocturnes (1-5)', points: 0 },
          { label: 'Utilisation du bronchodilatateur de secours (1-5)', points: 0 },
          { label: 'Auto-évaluation du contrôle (1-5)', points: 0 }
        ],
        interpretation: [
          { range: [5, 19], text: 'Asthme non contrôlé. Renforcer le traitement de fond.', color: 'red' },
          { range: [20, 24], text: 'Asthme partiellement contrôlé. À optimiser.', color: 'yellow' },
          { range: [25, 25], text: 'Asthme bien contrôlé. Maintenir le traitement.', color: 'green' }
        ]
      },
      {
        title: 'Vérifications',
        type: 'checklist',
        items: [
          'Technique d\'inhalation vérifiée',
          'Observance du traitement de fond',
          'Facteurs déclenchants identifiés',
          'Plan d\'action remis au patient',
          'Tabagisme actif (sevrage conseillé)',
          'Débit de pointe / spirométrie récente'
        ]
      },
      {
        title: 'Paliers de traitement',
        type: 'alert',
        severity: 'info',
        items: [
          'Palier 1 : SABA à la demande uniquement',
          'Palier 2 : CSI faible dose quotidien',
          'Palier 3 : CSI faible dose + LABA',
          'Palier 4 : CSI dose moyenne/forte + LABA',
          'Palier 5 : Avis pneumologue, biothérapie'
        ],
        action: 'Step-up si non contrôlé (ACT < 20). Step-down si contrôlé > 3 mois.'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Contrôle 1-3 mois après changement de palier. Si stable et bien contrôlé : tous les 6 mois. Spirométrie annuelle.',
        delay: '1-3 mois selon le contrôle'
      }
    ],
    consultation_prefill: {
      motif: 'Suivi asthme',
      diagnostic: 'Asthme (J45)'
    }
  },

  // ===== RHUMATOLOGIE =====
  {
    id: 'proto_lombalgie',
    name: 'Lombalgie aiguë commune',
    category: 'Rhumatologie',
    icon: '🦴',
    severity: 'low',
    description: 'Prise en charge de la lombalgie aiguë < 6 semaines',
    steps: [
      {
        title: 'Red flags à éliminer',
        type: 'alert',
        severity: 'high',
        items: [
          'Âge < 20 ou > 55 ans (1er épisode)',
          'Traumatisme récent significatif',
          'Douleur constante, progressive, non mécanique',
          'Douleur nocturne exclusive',
          'ATCD de cancer',
          'Corticothérapie prolongée',
          'Fièvre, perte de poids inexpliquée',
          'Syndrome de la queue de cheval (urgence!)',
          'Déficit neurologique progressif'
        ],
        action: 'Si red flag → Imagerie rapide (IRM) et/ou avis spécialisé urgent'
      },
      {
        title: 'Examen clinique',
        type: 'exam',
        fields: ['poids'],
        checklist: [
          'Inspection du rachis, attitude antalgique',
          'Palpation paravertébrale',
          'Schöber (mobilité lombaire)',
          'Lasègue bilatéral',
          'Testing moteur L4-S1',
          'Réflexes rotuliens et achilléens',
          'Sensibilité périnéale (si suspicion queue de cheval)'
        ]
      },
      {
        title: 'Prescription',
        type: 'prescription',
        medications: [
          { name: 'Paracétamol 1g', posology: '1g 3x/jour', duration: '7 jours', optional: false },
          { name: 'Ibuprofène 400mg', posology: '400mg 3x/jour au repas', duration: '5 jours', optional: true },
          { name: 'Myorelaxant (Thiocolchicoside)', posology: '4mg 2x/jour', duration: '5 jours', optional: true }
        ],
        instructions: 'PRIORITÉ : maintien de l\'activité physique. Pas de repos au lit strict. Rassurer le patient sur le pronostic favorable.'
      },
      {
        title: 'Kiné si > 4 semaines',
        type: 'followup',
        text: 'Si persistance > 4 semaines → Kinésithérapie active. Si > 6 semaines → Imagerie (radiographies standard). Si sciatique hyperalgique → IRM.',
        delay: '2-4 semaines si pas d\'amélioration'
      }
    ],
    consultation_prefill: {
      motif: 'Lombalgie aiguë',
      diagnostic: 'Lombalgie aiguë commune (M54.5)'
    }
  },

  // ===== DERMATOLOGIE =====
  {
    id: 'proto_eczema',
    name: 'Dermatite atopique',
    category: 'Dermatologie',
    icon: '🩹',
    severity: 'low',
    description: 'Prise en charge de la dermatite atopique / eczéma',
    steps: [
      {
        title: 'Évaluation de la sévérité',
        type: 'checklist',
        items: [
          'Étendue des lésions (% surface corporelle)',
          'Intensité du prurit (EVA 0-10)',
          'Impact sur le sommeil',
          'Impact sur la qualité de vie',
          'Surinfection (croûtes jaunâtres, suintement)',
          'ATCD atopie personnels/familiaux (asthme, rhinite)'
        ]
      },
      {
        title: 'Traitement par palier',
        type: 'alert',
        severity: 'info',
        items: [
          'Léger : émollient seul + dermocorticoïde classe faible si besoin',
          'Modéré : dermocorticoïde classe modérée 1x/j + émollient quotidien',
          'Sévère : dermocorticoïde fort + traitement d\'entretien 2x/sem',
          'Très sévère / résistant : avis dermatologue (tacrolimus, photothérapie, biothérapie)'
        ],
        action: 'Toujours associer un émollient quotidien en entretien'
      },
      {
        title: 'Prescription type',
        type: 'prescription',
        medications: [
          { name: 'Émollient (Cétaphil/Eucerin)', posology: 'Application 1-2x/jour sur tout le corps', duration: 'Continu', optional: false },
          { name: 'Dermocorticoïde classe II-III', posology: '1 application/jour sur les lésions uniquement', duration: '7-14 jours puis décroissance', optional: false },
          { name: 'Antihistaminique H1 (Cétirizine 10mg)', posology: '1 cp/jour si prurit invalidant', duration: '14 jours', optional: true }
        ],
        instructions: 'Règle de la phalangette pour le dosage. Entretien proactif : 2 applications/semaine sur les zones habituelles si récidives fréquentes.'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Contrôle à 2-4 semaines. Si pas d\'amélioration → réévaluer le diagnostic, vérifier l\'observance, envisager allergie de contact. Référer au dermatologue si résistant.',
        delay: '2-4 semaines'
      }
    ],
    consultation_prefill: {
      motif: 'Éruption cutanée / prurit',
      diagnostic: 'Dermatite atopique (L20)'
    }
  },

  // ===== PSYCHIATRIE =====
  {
    id: 'proto_depression',
    name: 'Épisode dépressif',
    category: 'Psychiatrie',
    icon: '🧠',
    severity: 'medium',
    description: 'Diagnostic et prise en charge initiale de l\'épisode dépressif',
    steps: [
      {
        title: 'Critères diagnostiques (PHQ-9)',
        type: 'score',
        scoreName: 'PHQ-9 simplifié',
        criteria: [
          { label: 'Peu d\'intérêt ou de plaisir (0-3)', points: 0 },
          { label: 'Humeur triste, déprimée (0-3)', points: 0 },
          { label: 'Troubles du sommeil (0-3)', points: 0 },
          { label: 'Fatigue, perte d\'énergie (0-3)', points: 0 },
          { label: 'Appétit modifié (0-3)', points: 0 },
          { label: 'Dévalorisation, culpabilité (0-3)', points: 0 },
          { label: 'Difficultés de concentration (0-3)', points: 0 },
          { label: 'Ralentissement ou agitation (0-3)', points: 0 },
          { label: 'Idées suicidaires (0-3)', points: 0 }
        ],
        interpretation: [
          { range: [0, 4], text: 'Pas de dépression significative', color: 'green' },
          { range: [5, 9], text: 'Dépression légère — psychothérapie, suivi', color: 'yellow' },
          { range: [10, 14], text: 'Dépression modérée — traitement à discuter', color: 'orange' },
          { range: [15, 27], text: 'Dépression sévère — traitement pharmacologique + psychothérapie', color: 'red' }
        ]
      },
      {
        title: 'Évaluation du risque suicidaire',
        type: 'alert',
        severity: 'critical',
        items: [
          'Idéations suicidaires actives',
          'Plan suicidaire élaboré',
          'Moyens disponibles',
          'ATCD de tentative de suicide',
          'Isolement social',
          'Consommation d\'alcool/drogues',
          'Événement de vie récent majeur'
        ],
        action: 'Si risque suicidaire imminent → Hospitalisation / Urgences psychiatriques. Numéro 0800 32 123 (Centre de Prévention du Suicide).'
      },
      {
        title: 'Prescription si dépression modérée à sévère',
        type: 'prescription',
        medications: [
          { name: 'Escitalopram (Sipralexa) 10mg', posology: '1 cp/jour le matin', duration: '6-12 mois minimum', optional: false },
          { name: 'Lormetazépam 1mg', posology: '1 cp au coucher si insomnie sévère', duration: '2 semaines max', optional: true }
        ],
        instructions: 'Délai d\'action ISRS : 2-4 semaines. Prévenir le patient. Ne pas arrêter brutalement. Psychothérapie en parallèle fortement recommandée.'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Contrôle rapproché : J7-J14 puis mensuel. Évaluer efficacité à 4-6 semaines. Durée minimale de traitement : 6 mois après rémission (12 mois si récidive).',
        delay: '1-2 semaines'
      }
    ],
    consultation_prefill: {
      motif: 'Humeur triste / état dépressif',
      diagnostic: 'Épisode dépressif (F32)'
    }
  },

  // ===== PÉDIATRIE =====
  {
    id: 'proto_gastro_enfant',
    name: 'Gastro-entérite (enfant)',
    category: 'Pédiatrie',
    icon: '👶',
    severity: 'medium',
    description: 'Prise en charge de la GEA chez le nourrisson et l\'enfant',
    steps: [
      {
        title: 'Évaluation de la déshydratation',
        type: 'score',
        scoreName: 'Score de déshydratation',
        criteria: [
          { label: 'Aspect général (0=normal, 1=agité, 2=léthargique)', points: 0 },
          { label: 'Yeux (0=normaux, 1=légèrement creux, 2=très creux)', points: 0 },
          { label: 'Muqueuses (0=humides, 1=collantes, 2=sèches)', points: 0 },
          { label: 'Larmes (0=présentes, 1=diminuées, 2=absentes)', points: 0 },
          { label: 'Pli cutané (0=normal, 1=ralenti, 2=persistant)', points: 0 }
        ],
        interpretation: [
          { range: [0, 2], text: 'Pas de déshydratation significative. Réhydratation orale.', color: 'green' },
          { range: [3, 5], text: 'Déshydratation légère à modérée (3-6%). SRO obligatoire.', color: 'yellow' },
          { range: [6, 10], text: 'Déshydratation sévère (> 6%). Hospitalisation pour IV.', color: 'red' }
        ]
      },
      {
        title: 'Red flags',
        type: 'alert',
        severity: 'high',
        items: [
          'Âge < 3 mois',
          'Perte de poids > 5%',
          'Refus total de boire',
          'Vomissements bilieux',
          'Sang dans les selles',
          'Fièvre élevée > 39°C avec altération de l\'état général',
          'Fontanelle déprimée'
        ],
        action: 'Si red flag → Hospitalisation pour réhydratation IV et surveillance'
      },
      {
        title: 'Prescription',
        type: 'prescription',
        medications: [
          { name: 'SRO (Oral Rehydration Solution)', posology: '50-100ml après chaque selle liquide', duration: 'Jusqu\'à résolution', optional: false },
          { name: 'Racécadotril (Tiorfan)', posology: '1,5mg/kg 3x/jour', duration: '5 jours', optional: true }
        ],
        instructions: 'Réalimentation précoce (4h après début SRO). Pas d\'arrêt du lait maternel. Pas de soda ni jus de fruits.'
      },
      {
        title: 'Suivi',
        type: 'followup',
        text: 'Peser l\'enfant à 24-48h. Reconsulter si pas d\'amélioration à 48h, aggravation, ou signes de déshydratation.',
        delay: '24-48h'
      }
    ],
    consultation_prefill: {
      motif: 'Diarrhées / vomissements (enfant)',
      diagnostic: 'Gastro-entérite aiguë (A09)'
    }
  }
];

export const PROTOCOL_CATEGORIES = [...new Set(CARE_PROTOCOLS.map(p => p.category))];