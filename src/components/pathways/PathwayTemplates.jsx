// Predefined care pathway templates for Belgian general practice
export const PATHWAY_TEMPLATES = [
  {
    name: 'Suivi Diabète Type 2',
    description: 'Parcours complet de suivi du diabète type 2 selon les recommandations belges (SSMG/Domus Medica)',
    trigger_condition: 'diagnosis',
    trigger_value: 'diabète type 2',
    category: 'chronic',
    target_population: 'Patients diagnostiqués diabète type 2',
    is_template: true,
    steps: [
      { id: 'diab-1', title: 'HbA1c de contrôle', type: 'lab_order', description: 'Dosage HbA1c trimestriel', delay_days: 0, recurring: true, recurring_interval_days: 90, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'diab-2', title: 'Consultation suivi', type: 'consultation', description: 'Consultation de suivi diabète (poids, TA, pieds)', delay_days: 7, recurring: true, recurring_interval_days: 90, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'diab-3', title: 'Fond d\'œil annuel', type: 'referral', description: 'Référer à l\'ophtalmologue pour fond d\'œil', delay_days: 30, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'specialiste' },
      { id: 'diab-4', title: 'Bilan rénal annuel', type: 'lab_order', description: 'Créatinine, eGFR, microalbuminurie', delay_days: 30, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'diab-5', title: 'Bilan lipidique annuel', type: 'lab_order', description: 'Cholestérol total, HDL, LDL, triglycérides', delay_days: 30, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'diab-6', title: 'Podologue', type: 'referral', description: 'Examen podologique annuel', delay_days: 60, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'specialiste' },
      { id: 'diab-7', title: 'Vaccination grippe', type: 'vaccination', description: 'Vaccination grippe annuelle recommandée', delay_days: 270, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'diab-8', title: 'Éducation thérapeutique', type: 'education', description: 'Session éducation : auto-surveillance, alimentation, activité physique', delay_days: 14, recurring: true, recurring_interval_days: 180, auto_create_reminder: true, responsible: 'medecin' },
    ]
  },
  {
    name: 'Suivi HTA',
    description: 'Parcours hypertension artérielle — contrôle tensionnel et prévention cardiovasculaire',
    trigger_condition: 'diagnosis',
    trigger_value: 'hypertension',
    category: 'chronic',
    target_population: 'Patients hypertendus',
    is_template: true,
    steps: [
      { id: 'hta-1', title: 'Contrôle tensionnel', type: 'consultation', description: 'Mesure TA, évaluation traitement', delay_days: 0, recurring: true, recurring_interval_days: 90, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'hta-2', title: 'Bilan sanguin', type: 'lab_order', description: 'Ionogramme, créatinine, glycémie, lipides', delay_days: 14, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'hta-3', title: 'ECG', type: 'lab_order', description: 'ECG de repos annuel', delay_days: 30, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'hta-4', title: 'Évaluation rénale', type: 'lab_order', description: 'eGFR et microalbuminurie', delay_days: 30, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'hta-5', title: 'MAPA si nécessaire', type: 'referral', description: 'Holter tensionnel si doute HTA blouse blanche', delay_days: 60, recurring: false, auto_create_reminder: true, responsible: 'specialiste' },
    ]
  },
  {
    name: 'Dépistage Cancer Colorectal',
    description: 'Parcours de dépistage du cancer colorectal (50-74 ans)',
    trigger_condition: 'age_group',
    trigger_value: '50-74',
    category: 'prevention',
    target_population: 'Patients de 50 à 74 ans',
    is_template: true,
    steps: [
      { id: 'ccr-1', title: 'Test iFOBT', type: 'lab_order', description: 'Recherche sang occulte dans les selles', delay_days: 0, recurring: true, recurring_interval_days: 730, auto_create_reminder: true, responsible: 'patient' },
      { id: 'ccr-2', title: 'Résultat et conseil', type: 'consultation', description: 'Discussion résultat, orientation coloscopie si positif', delay_days: 21, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'ccr-3', title: 'Rappel prochain dépistage', type: 'reminder', description: 'Rappel pour le prochain test dans 2 ans', delay_days: 700, recurring: true, recurring_interval_days: 730, auto_create_reminder: true, responsible: 'secretaire' },
    ]
  },
  {
    name: 'Suivi Grossesse',
    description: 'Parcours de suivi de grossesse — consultations et examens recommandés',
    trigger_condition: 'diagnosis',
    trigger_value: 'grossesse',
    category: 'maternal',
    target_population: 'Patientes enceintes',
    is_template: true,
    steps: [
      { id: 'gro-1', title: 'Première consultation prénatale', type: 'consultation', description: 'Anamnèse, examen, prescription bilan initial', delay_days: 0, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'gro-2', title: 'Bilan sanguin T1', type: 'lab_order', description: 'Groupe Rh, NFS, sérologies, glycémie', delay_days: 7, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'gro-3', title: 'Échographie T1 (12 SA)', type: 'referral', description: 'Échographie de datation et dépistage trisomie', delay_days: 14, recurring: false, auto_create_reminder: true, responsible: 'specialiste' },
      { id: 'gro-4', title: 'Consultation mensuelle', type: 'consultation', description: 'Suivi mensuel (TA, poids, hauteur utérine)', delay_days: 30, recurring: true, recurring_interval_days: 30, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'gro-5', title: 'Échographie T2 (22 SA)', type: 'referral', description: 'Échographie morphologique', delay_days: 90, recurring: false, auto_create_reminder: true, responsible: 'specialiste' },
      { id: 'gro-6', title: 'HGPO (24-28 SA)', type: 'lab_order', description: 'Test de tolérance glucose — dépistage diabète gestationnel', delay_days: 120, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'gro-7', title: 'Échographie T3 (32 SA)', type: 'referral', description: 'Échographie de croissance', delay_days: 180, recurring: false, auto_create_reminder: true, responsible: 'specialiste' },
      { id: 'gro-8', title: 'Prélèvement GBS (36 SA)', type: 'lab_order', description: 'Dépistage streptocoque B', delay_days: 210, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
    ]
  },
  {
    name: 'Suivi Insuffisance Rénale Chronique',
    description: 'Parcours IRC stade 3+ — surveillance rénale et cardiovasculaire',
    trigger_condition: 'lab_result',
    trigger_value: 'eGFR < 60',
    category: 'chronic',
    target_population: 'Patients avec eGFR < 60 ml/min',
    is_template: true,
    steps: [
      { id: 'irc-1', title: 'Bilan rénal complet', type: 'lab_order', description: 'Créatinine, eGFR, microalbuminurie, ionogramme', delay_days: 0, recurring: true, recurring_interval_days: 90, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'irc-2', title: 'Consultation néphrologique', type: 'referral', description: 'Avis néphrologue si eGFR < 30 ou déclin rapide', delay_days: 30, recurring: true, recurring_interval_days: 365, auto_create_reminder: true, responsible: 'specialiste' },
      { id: 'irc-3', title: 'Contrôle tensionnel strict', type: 'consultation', description: 'Objectif TA < 130/80 mmHg', delay_days: 7, recurring: true, recurring_interval_days: 90, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'irc-4', title: 'Bilan phosphocalcique', type: 'lab_order', description: 'Calcium, phosphore, PTH, vitamine D', delay_days: 30, recurring: true, recurring_interval_days: 180, auto_create_reminder: true, responsible: 'medecin' },
    ]
  },
  {
    name: 'Vaccination Nourrisson (0-15 mois)',
    description: 'Calendrier vaccinal belge du nourrisson selon le CSS',
    trigger_condition: 'age_group',
    trigger_value: '0-1',
    category: 'pediatric',
    target_population: 'Nourrissons 0-15 mois',
    is_template: true,
    steps: [
      { id: 'vac-1', title: 'Hexa + PCV13 + Rotavirus (dose 1)', type: 'vaccination', description: '8 semaines — DTPa-IPV-Hib-HepB + Prevenar + RotaTeq', delay_days: 56, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'vac-2', title: 'Hexa + PCV13 + Rotavirus (dose 2)', type: 'vaccination', description: '12 semaines', delay_days: 84, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'vac-3', title: 'Hexa + Rotavirus (dose 3)', type: 'vaccination', description: '16 semaines', delay_days: 112, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'vac-4', title: 'PCV13 (rappel) + MenB', type: 'vaccination', description: '12 mois', delay_days: 365, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
      { id: 'vac-5', title: 'RRO + Hexa (rappel)', type: 'vaccination', description: '15 mois', delay_days: 456, recurring: false, auto_create_reminder: true, responsible: 'medecin' },
    ]
  },
];

export const STEP_TYPE_CONFIG = {
  lab_order: { label: 'Analyse labo', color: 'bg-purple-100 text-purple-800', icon: 'TestTube' },
  consultation: { label: 'Consultation', color: 'bg-blue-100 text-blue-800', icon: 'Stethoscope' },
  vaccination: { label: 'Vaccination', color: 'bg-green-100 text-green-800', icon: 'Syringe' },
  referral: { label: 'Orientation', color: 'bg-orange-100 text-orange-800', icon: 'Send' },
  reminder: { label: 'Rappel', color: 'bg-yellow-100 text-yellow-800', icon: 'Bell' },
  document: { label: 'Document', color: 'bg-slate-100 text-slate-800', icon: 'FileText' },
  education: { label: 'Éducation', color: 'bg-teal-100 text-teal-800', icon: 'BookOpen' },
};

export const CATEGORY_LABELS = {
  chronic: 'Maladies chroniques',
  prevention: 'Prévention',
  post_op: 'Post-opératoire',
  pediatric: 'Pédiatrie',
  geriatric: 'Gériatrie',
  maternal: 'Maternité',
  mental_health: 'Santé mentale',
  custom: 'Personnalisé',
};