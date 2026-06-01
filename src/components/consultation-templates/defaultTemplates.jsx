// Modèles de consultation par défaut par spécialité
export const DEFAULT_CONSULTATION_TEMPLATES = [
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
    id: 'default_iu',
    name: 'Infection urinaire',
    category: 'Infectiologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Dysurie / Pollakiurie',
      anamnese: 'Brûlures mictionnelles depuis [durée]. Pollakiurie: [oui/non]. Hématurie: [oui/non]. Fièvre: [oui/non]. Douleurs lombaires: [oui/non]. ATCD IU: [oui/non].',
      examen_clinique: 'T°: [temp]°C\nAbdomen souple, pas de défense\nFosse lombaire: [libre/sensible]\nBandelette urinaire: leucocytes [+/-], nitrites [+/-]',
      diagnostic: 'Cystite aiguë [simple/compliquée]',
      prescriptions: 'Cystite simple: Fosfomycine-trométamol 3g dose unique\nECBU si compliquée ou récidivante'
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
      anamnese: 'Patient suivi pour HTA. Traitement actuel: [traitement]. Observance: [bonne/moyenne/mauvaise]. Automesure: [valeurs].',
      examen_clinique: 'PA: [pa] mmHg (assis, repos 5min)\nFC: [fc]/min régulier\nAuscultation cardiaque: B1B2 réguliers, pas de souffle\nŒdèmes MI: [oui/non]',
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
      anamnese: 'Douleur thoracique depuis [durée]. Type: [constrictive/piquante/brûlure]. Irradiation: [non/bras/mâchoire]. Effort: [oui/non]. Dyspnée: [oui/non].',
      examen_clinique: 'PA: [pa] mmHg, FC: [fc]/min, SpO2: [spo2]%\nAuscultation cardiaque: [normale/anomalies]\nECG: [normal/anomalies]',
      diagnostic: '[À préciser après examens]',
      prescriptions: ''
    }
  },
  // Endocrinologie
  {
    id: 'default_diabetes',
    name: 'Suivi Diabète type 2',
    category: 'Endocrinologie',
    specialty: 'endocrinology',
    is_default: true,
    content: {
      motif: 'Suivi diabète type 2',
      anamnese: 'Diabète type 2 connu depuis [année]. Traitement: [traitement]. Dernière HbA1c: [valeur]%. Hypoglycémies: [oui/non]. Alimentation: [équilibrée/déséquilibrée]. Activité physique: [oui/non].',
      examen_clinique: 'Poids: [poids]kg, Taille: [taille]cm, IMC: [imc]\nExamen pieds: [normal/anomalies], monofilament: [normal/diminué]\nPouls pédieux: [perçus/diminués]\nPA: [pa] mmHg',
      diagnostic: 'Diabète type 2 [équilibré/déséquilibré]',
      prescriptions: 'Contrôle HbA1c dans 3 mois\nBilan lipidique + créatinine + microalbuminurie annuel\nFond d\'œil annuel'
    }
  },
  // Pneumologie
  {
    id: 'default_asthme',
    name: 'Suivi Asthme',
    category: 'Pneumologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Suivi asthme',
      anamnese: 'Asthme connu depuis [année]. Traitement de fond: [traitement]. Utilisation bronchodilatateur de secours: [fréquence/semaine]. Réveils nocturnes: [oui/non]. Limitation activités: [oui/non]. Score ACT: [score/25].',
      examen_clinique: 'FR: [fr]/min, SpO2: [spo2]%\nAuscultation pulmonaire: MV bilatéraux, [sibilants/pas de sibilant]\nDébit expiratoire de pointe: [dep] L/min ([%] de la théorique)',
      diagnostic: 'Asthme [contrôlé/partiellement contrôlé/non contrôlé]',
      prescriptions: ''
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
    id: 'default_pediatrie_visite',
    name: 'Visite de routine enfant',
    category: 'Pédiatrie',
    specialty: 'pediatrics',
    is_default: true,
    content: {
      motif: 'Visite de contrôle',
      anamnese: 'Enfant de [âge]. Développement psychomoteur: [normal/préoccupations]. Alimentation: [diversification/lait]. Sommeil: [bon/troubles]. Vaccinations: [à jour/retard].',
      examen_clinique: 'Poids: [poids]kg (P[percentile]), Taille: [taille]cm (P[percentile]), PC: [pc]cm\nExamen somatique: [normal/anomalies]\nDéveloppement: [conforme à l\'âge/retard]',
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
  // Rhumatologie
  {
    id: 'default_lombalgie',
    name: 'Lombalgie',
    category: 'Rhumatologie',
    specialty: 'rheumatology',
    is_default: true,
    content: {
      motif: 'Lombalgie',
      anamnese: 'Douleur lombaire depuis [durée]. Mécanique/inflammatoire. Irradiation: [non/membre inférieur]. Red flags: [recherchés et absents/présents].',
      examen_clinique: 'Rachis: [raideur/souple]. Lasègue: [négatif/positif à X°]. Force membres inférieurs: [conservée/déficit]. Réflexes: [présents/diminués]. Sensibilité: [normale/troubles].',
      diagnostic: 'Lombalgie [commune/spécifique]',
      prescriptions: 'Maintien activité physique\nAntalgiques palier [I/II]\nKinésithérapie si >4 semaines'
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
  // Gastro
  {
    id: 'default_gastro_rgo',
    name: 'Reflux gastro-œsophagien',
    category: 'Gastro-entérologie',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Pyrosis / RGO',
      anamnese: 'Pyrosis depuis [durée]. Régurgitations: [oui/non]. Dysphagie: [oui/non]. Facteurs aggravants: [repas copieux/décubitus/alcool]. Perte de poids: [oui/non]. ATCD FOGD: [oui/non].',
      examen_clinique: 'Abdomen: souple, dépressible, [sensible épigastre/non douloureux]\nPas de masse palpable\nPoids: [poids]kg',
      diagnostic: 'RGO [typique/atypique]',
      prescriptions: 'Règles hygiéno-diététiques\nIPP [molécule] [dose] pendant [durée]\nSi >50 ans ou alarme: FOGD'
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
      anamnese: '',
      examen_clinique: '',
      diagnostic: '',
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
      anamnese: 'Pathologie justifiant l\'arrêt: [diagnostic]. Durée estimée de l\'incapacité: [durée].',
      examen_clinique: '[Examen pertinent pour la pathologie]',
      diagnostic: '[Diagnostic]',
      prescriptions: ''
    }
  },
  // Visite à domicile
  {
    id: 'default_visite_domicile',
    name: 'Visite à domicile',
    category: 'Médecine générale',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Visite à domicile - [motif]',
      anamnese: 'Patient [autonome/grabataire/semi-autonome]. Motif de la visite: [motif]. Depuis: [durée]. Traitement en cours: [traitement]. Entourage: [seul/famille/aide-soignant].',
      examen_clinique: 'État général: [bon/altéré/fébrile]\nT°: [temp]°C, PA: [pa] mmHg, FC: [fc]/min, SpO2: [spo2]%\nExamen orienté: [findings]\nAutonomie: [conservée/limitée]',
      diagnostic: '[Diagnostic]',
      prescriptions: ''
    }
  },
  {
    id: 'default_check_up',
    name: 'Bilan de santé annuel',
    category: 'Médecine générale',
    specialty: 'general',
    is_default: true,
    content: {
      motif: 'Bilan de santé annuel',
      anamnese: 'Check-up annuel. ATCD: [antécédents]. Médicaments: [traitement en cours]. Vaccinations: [à jour/retard]. Tabac: [oui: PA/non]. Alcool: [consommation]. Activité physique: [fréquence].',
      examen_clinique: 'Poids: [poids]kg, Taille: [taille]cm, IMC: [imc]\nPA: [pa] mmHg, FC: [fc]/min\nAuscultation cardio-pulmonaire: [normale/anomalies]\nAbdomen: [souple/anomalies]\nExamen cutané: [normal/anomalies]\nGanglions: [non palpables/anomalies]',
      diagnostic: 'Bilan de santé [normal/anomalies à explorer]',
      prescriptions: 'Biologie: NFS, glycémie, bilan lipidique, créatinine, TSH\nDépistages: [selon âge et sexe]'
    }
  }
];