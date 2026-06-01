// Bibliothèque de modèles de consultation par défaut
export const DEFAULT_TEMPLATES = [
  // Infectiologie
  {
    id: 'default_grippe',
    name: 'Syndrome grippal',
    category: 'Infectiologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Syndrome grippal',
      anamnese: 'Fièvre depuis [durée], toux, céphalées, myalgies. Pas de signes de gravité.',
      examen_clinique: 'T°: [temp]°C, FC: [fc]/min, FR: [fr]/min\nORL: pharynx érythémateux\nPoumons: MV bilatéraux, pas de foyer',
      diagnostic: 'Syndrome grippal probable',
      prescriptions: 'Repos, hydratation\nParacétamol 1g x3/j si douleur ou fièvre'
    }
  },
  {
    id: 'default_angine',
    name: 'Angine',
    category: 'Infectiologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Odynophagie',
      anamnese: 'Douleur à la déglutition depuis [durée]. Fièvre: [oui/non]. Toux: [oui/non].',
      examen_clinique: 'T°: [temp]°C\nORL: amygdales [normales/érythémateuses/exsudat]. ADP cervicales: [oui/non].\nScore de McIsaac: [0-5]',
      diagnostic: 'Angine [virale probable/streptococcique possible]',
      prescriptions: 'Si TDR+: Amoxicilline 1g x2/j pendant 6 jours\nSinon: traitement symptomatique'
    }
  },
  {
    id: 'default_itu',
    name: 'Infection urinaire',
    category: 'Infectiologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Brûlures mictionnelles',
      anamnese: 'Dysurie, pollakiurie depuis [durée]. Douleur lombaire: [oui/non]. Fièvre: [oui/non]. Hématurie: [oui/non]. Grossesse: [oui/non]. ATCD ITU: [oui/non].',
      examen_clinique: 'T°: [temp]°C\nAbdomen: souple, pas de défense\nFosses lombaires: [libres/sensibles]\nBandelette urinaire: Leuco [+/-], Nitrites [+/-]',
      diagnostic: 'Infection urinaire [basse non compliquée / pyélonéphrite à exclure]',
      prescriptions: 'Fosfomycine 3g dose unique OU Nitrofurantoïne 100mg x3/j x5j\nECBU si doute ou récidive\nContrôle si pas d\'amélioration à 72h'
    }
  },
  {
    id: 'default_gastroenterite',
    name: 'Gastro-entérite aiguë',
    category: 'Infectiologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Diarrhées / Vomissements',
      anamnese: 'Diarrhées depuis [durée], [nb] selles/j. Vomissements: [oui/non]. Fièvre: [oui/non]. Sang: [oui/non]. Voyage récent: [oui/non]. Cas contact: [oui/non].',
      examen_clinique: 'T°: [temp]°C, PA: [pa] mmHg\nAbdomen: [souple/sensible], péristaltisme [actif/diminué]\nHydratation: [correcte/signes de déshydratation]\nPoids: [poids] kg',
      diagnostic: 'Gastro-entérite aiguë [virale probable / bactérienne possible]',
      prescriptions: 'Réhydratation orale (SRO si déshydratation)\nRégime adapté\nParacétamol si fièvre\nConsulter si: sang, fièvre >3j, déshydratation'
    }
  },
  // Cardiologie
  {
    id: 'default_hypertension',
    name: 'Suivi HTA',
    category: 'Cardiologie',
    specialty: 'cardiology',
    is_default: true,
    content: {
      motif: 'Suivi hypertension artérielle',
      anamnese: 'Patient suivi pour HTA. Traitement actuel: [traitement]. Observance: [bonne/moyenne/mauvaise]. Céphalées: [oui/non]. Vertige: [oui/non].',
      examen_clinique: 'PA: [pa] mmHg (assis, repos 5min)\nFC: [fc]/min régulier\nAuscultation cardiaque: B1B2 réguliers, pas de souffle\nOMI: [absents/présents]',
      diagnostic: 'HTA [équilibrée/non équilibrée]',
      prescriptions: ''
    }
  },
  {
    id: 'default_douleur_thoracique',
    name: 'Douleur thoracique',
    category: 'Cardiologie',
    specialty: 'cardiology',
    is_default: true,
    content: {
      motif: 'Douleur thoracique',
      anamnese: 'Douleur thoracique depuis [durée]. Type: [constrictive/piquante/brûlure]. Irradiation: [non/bras/mâchoire]. Effort: [oui/non]. Dyspnée: [oui/non]. ATCD coronariens: [oui/non].',
      examen_clinique: 'PA: [pa] mmHg, FC: [fc]/min, SpO2: [spo2]%\nAuscultation cardiaque: [normale/anomalies]\nAuscultation pulmonaire: [MV bilatéraux/crépitants]\nECG: [normal/anomalies]',
      diagnostic: '[À préciser après examens]',
      prescriptions: ''
    }
  },
  // Endocrinologie
  {
    id: 'default_diabetes',
    name: 'Suivi Diabète',
    category: 'Endocrinologie',
    specialty: 'endocrinology',
    is_default: true,
    content: {
      motif: 'Suivi diabète type 2',
      anamnese: 'Diabète type 2 connu depuis [année]. Traitement: [traitement]. Dernière HbA1c: [valeur]%. Hypoglycémies: [oui/non]. Observance: [bonne/moyenne].',
      examen_clinique: 'Poids: [poids]kg, Taille: [taille]cm, IMC: [imc]\nPA: [pa] mmHg\nExamen pieds: [normal/anomalies], monofilament: [normal/diminué]\nPouls pédieux: [perçus/diminués]\nFond d\'oeil: [date dernière vérification]',
      diagnostic: 'Diabète type 2 [équilibré/déséquilibré]',
      prescriptions: 'Contrôle HbA1c dans 3 mois\nBilan lipidique + rénal annuel\nFond d\'oeil si >1 an'
    }
  },
  {
    id: 'default_thyroide',
    name: 'Suivi Thyroïde',
    category: 'Endocrinologie',
    specialty: 'endocrinology',
    is_default: true,
    content: {
      motif: 'Suivi thyroïdien',
      anamnese: 'Hypothyroïdie/Hyperthyroïdie connue depuis [année]. Traitement: [Lévothyroxine dose / Antithyroïdien]. Fatigue: [oui/non]. Palpitations: [oui/non]. Transit: [normal/perturbé]. Poids: [stable/variation].',
      examen_clinique: 'Poids: [poids]kg, FC: [fc]/min\nThyroïde: [non palpable/augmentée volume/nodule]\nTremblements: [absents/présents]\nExophtalmie: [non/oui]',
      diagnostic: '[Hypo/Hyper]thyroïdie [équilibrée/à adapter]',
      prescriptions: 'TSH contrôle dans [6-8 semaines / 3 mois]\n[Adaptation traitement si nécessaire]'
    }
  },
  // Pédiatrie
  {
    id: 'default_pediatrie_otite',
    name: 'Otite moyenne aiguë (enfant)',
    category: 'Pédiatrie',
    specialty: 'pediatrics',
    is_default: true,
    content: {
      motif: 'Otalgie / Otite',
      anamnese: 'Enfant de [âge]. Otalgie depuis [durée]. Fièvre: [oui/non]. Rhinorrhée: [oui/non]. Otites récidivantes: [oui/non].',
      examen_clinique: 'T°: [temp]°C, Poids: [poids]kg\nOtoscopie: tympan [normal/congestif/bombé/perforé]\nGorge: [normale/érythémateuse]',
      diagnostic: 'Otite moyenne aiguë [unilatérale/bilatérale]',
      prescriptions: 'Si >6 mois sans signes de gravité: surveillance 48-72h\nSi indiqué: Amoxicilline [dose]/kg/j en 2 prises x8j'
    }
  },
  {
    id: 'default_pediatrie_bronchiolite',
    name: 'Bronchiolite',
    category: 'Pédiatrie',
    specialty: 'pediatrics',
    is_default: true,
    content: {
      motif: 'Toux / Gêne respiratoire',
      anamnese: 'Nourrisson de [âge]. Rhinite depuis [durée], puis toux et gêne respiratoire. Alimentation: [conservée/difficile]. Fièvre: [oui/non].',
      examen_clinique: 'T°: [temp]°C, FR: [fr]/min, SpO2: [spo2]%\nTirage: [absent/intercostal/sous-costal]\nAuscultation: sibilants, crépitants\nAlimentation: [>50%/>2/3/normale]',
      diagnostic: 'Bronchiolite [légère/modérée/sévère]',
      prescriptions: 'DRP au sérum physiologique\nFractionnement des repas\nSurveillance signes de gravité'
    }
  },
  {
    id: 'default_pediatrie_visite',
    name: 'Visite de routine enfant',
    category: 'Pédiatrie',
    specialty: 'pediatrics',
    is_default: true,
    content: {
      motif: 'Visite de contrôle',
      anamnese: "Enfant de [âge]. Développement psychomoteur: [normal/préoccupations]. Alimentation: [diversification/lait]. Sommeil: [bon/troubles]. Vaccinations: [à jour/retard].",
      examen_clinique: "Poids: [poids]kg (P[percentile]), Taille: [taille]cm (P[percentile]), PC: [pc]cm\nExamen somatique: [normal/anomalies]\nDéveloppement: [conforme à l'âge/retard]",
      diagnostic: 'Examen de routine [âge] - [normal/anomalies]',
      prescriptions: ''
    }
  },
  // Dermatologie
  {
    id: 'default_dermato_eczema',
    name: 'Eczéma / Dermatite',
    category: 'Dermatologie',
    specialty: 'dermatology',
    is_default: true,
    content: {
      motif: 'Éruption cutanée / Prurit',
      anamnese: 'Lésions cutanées depuis [durée]. Prurit: [oui/non]. Localisation: [zones]. ATCD atopie: [oui/non]. Facteur déclenchant: [identifié/non].',
      examen_clinique: 'Lésions: [érythème/vésicules/squames/lichénification]\nLocalisation: [zones]\nÉtendue: [localisé/généralisé]\nSurinfection: [oui/non]',
      diagnostic: 'Dermatite [atopique/contact/autre]',
      prescriptions: 'Dermocorticoïde classe [I-IV] 1x/j zones atteintes\nÉmollient quotidien\nÉviction allergène si identifié'
    }
  },
  // Psychiatrie
  {
    id: 'default_psy_anxiete',
    name: 'Trouble anxieux',
    category: 'Psychiatrie',
    specialty: 'psychiatry',
    is_default: true,
    content: {
      motif: 'Anxiété / Nervosité',
      anamnese: 'Symptômes anxieux depuis [durée]. Facteur déclenchant: [oui/non]. Attaques de panique: [oui/non]. Retentissement: [professionnel/social/familial]. Idées suicidaires: [non/explorées].',
      examen_clinique: 'État général: [correct/altéré]\nHumeur: [euthymique/anxieuse/dépressive]\nSommeil: [conservé/perturbé]\nAppétit: [conservé/diminué]',
      diagnostic: 'Trouble anxieux [généralisé/trouble panique/mixte anxio-dépressif]',
      prescriptions: 'Psychothérapie recommandée\nSi indiqué: [ISRS/benzodiazépine courte durée]'
    }
  },
  {
    id: 'default_psy_depression',
    name: 'Épisode dépressif',
    category: 'Psychiatrie',
    specialty: 'psychiatry',
    is_default: true,
    content: {
      motif: 'Humeur dépressive / Tristesse',
      anamnese: 'Tristesse, perte d\'intérêt depuis [durée]. Sommeil: [insomnie/hypersomnie]. Appétit: [diminué/augmenté]. Concentration: [altérée/normale]. Culpabilité: [oui/non]. Idées suicidaires: [non/passives/actives - plan: oui/non]. ATCD psychiatriques: [oui/non].',
      examen_clinique: 'Présentation: [soignée/négligée]\nContact: [bon/pauvre/hostile]\nHumeur: [triste/irritable/indifférente]\nRalentissement psychomoteur: [oui/non]\nPHQ-9: [score]/27',
      diagnostic: 'Épisode dépressif [léger/modéré/sévère]',
      prescriptions: 'Psychothérapie (TCC recommandée)\nSi modéré-sévère: [ISRS] dose de départ\nReevaluation à 2-4 semaines'
    }
  },
  // Rhumatologie
  {
    id: 'default_lombalgie',
    name: 'Lombalgie',
    category: 'Rhumatologie',
    specialty: 'rheumatology',
    is_default: true,
    content: {
      motif: 'Lombalgie',
      anamnese: 'Douleur lombaire depuis [durée]. Mécanique/inflammatoire. Irradiation: [non/membre inférieur]. Red flags: [recherchés et absents/présents]. Déficit moteur: [non/oui].',
      examen_clinique: 'Rachis: [raideur/souple]. Lasègue: [négatif/positif à X°]. Force membres inférieurs: [conservée/déficit L4/L5/S1]. Réflexes: [présents/diminués]. Sensibilité: [normale/troubles]. Marche sur pointes/talons: [possible/impossible].',
      diagnostic: 'Lombalgie [commune/spécifique]',
      prescriptions: 'Maintien activité physique\nAntalgiques palier [I/II]\nKinésithérapie si >4 semaines'
    }
  },
  // Administratif
  {
    id: 'default_certificat',
    name: 'Certificat médical',
    category: 'Administratif',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Demande de certificat médical',
      anamnese: 'Type de certificat: [aptitude sportive/scolaire/travail/autre]. Motif: [motif].',
      examen_clinique: 'Examen clinique complet sans anomalie notable.\nPA: [pa] mmHg, FC: [fc]/min\nAuscultation cardio-pulmonaire: normale',
      diagnostic: 'Apte / Inapte [préciser]',
      prescriptions: ''
    }
  },
  {
    id: 'default_arret_travail',
    name: 'Arrêt de travail',
    category: 'Administratif',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Arrêt de travail',
      anamnese: "Pathologie justifiant l'arrêt: [diagnostic]. Durée estimée de l'incapacité: [durée]. Prolongation: [oui/non].",
      examen_clinique: '[Examen pertinent pour la pathologie]',
      diagnostic: '[Diagnostic]',
      prescriptions: ''
    }
  }
];