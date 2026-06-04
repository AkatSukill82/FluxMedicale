/**
 * Codes ICPC-2 (International Classification of Primary Care, 2nd edition)
 * Classification utilisée en médecine générale belge (recommandée par le SSMG/WVVH)
 * Source : WONCA International Classification Committee
 *
 * Liste des codes les plus fréquents en consultation de médecine générale belge.
 * Pour la liste complète : https://www.wcc.wonca.org/icpc-2/
 */

export const ICPC2_CHAPTERS = {
  A: 'Généralités et non spécifié',
  B: 'Sang, organes hématopoïétiques et lymphatiques',
  D: 'Appareil digestif',
  F: 'Œil',
  H: 'Oreille',
  K: 'Appareil cardiovasculaire',
  L: 'Appareil locomoteur',
  N: 'Système nerveux',
  P: 'Problèmes psychologiques',
  R: 'Appareil respiratoire',
  S: 'Peau',
  T: 'Endocrinologie, métabolisme et nutrition',
  U: 'Appareil urinaire',
  W: 'Grossesse, accouchement et planification familiale',
  X: 'Appareil génital féminin',
  Y: 'Appareil génital masculin',
  Z: 'Problèmes sociaux',
};

// Codes les plus fréquents en médecine générale belge
export const ICPC2_FREQUENT = [
  // Généralités
  { code: 'A04', label: 'Faiblesse/lassitude générale', chapter: 'A' },
  { code: 'A09', label: 'Sueurs/transpiration, symptôme', chapter: 'A' },
  { code: 'A29', label: 'Symptôme général SAI', chapter: 'A' },
  { code: 'A97', label: 'Bilan / check-up', chapter: 'A' },
  { code: 'A78', label: 'Maladie infectieuse SAI', chapter: 'A' },
  { code: 'A03', label: 'Fièvre', chapter: 'A' },

  // Respiratoire
  { code: 'R05', label: 'Toux', chapter: 'R' },
  { code: 'R07', label: 'Éternuement / congestion nasale', chapter: 'R' },
  { code: 'R09', label: 'Autres symptômes respiratoires', chapter: 'R' },
  { code: 'R74', label: 'IVAS / rhume', chapter: 'R' },
  { code: 'R75', label: 'Sinusite aiguë/chronique', chapter: 'R' },
  { code: 'R78', label: 'Bronchite aiguë', chapter: 'R' },
  { code: 'R80', label: 'Grippe', chapter: 'R' },
  { code: 'R83', label: 'Pneumonie', chapter: 'R' },
  { code: 'R96', label: 'Asthme', chapter: 'R' },

  // Appareil digestif
  { code: 'D01', label: 'Douleur abdominale/crampes générales', chapter: 'D' },
  { code: 'D10', label: 'Nausées', chapter: 'D' },
  { code: 'D11', label: 'Vomissements', chapter: 'D' },
  { code: 'D73', label: 'Gastro-entérite présumée infectieuse', chapter: 'D' },
  { code: 'D84', label: 'Œsophagite / RGO', chapter: 'D' },
  { code: 'D85', label: 'Ulcère duodénal', chapter: 'D' },
  { code: 'D87', label: 'Constipation', chapter: 'D' },
  { code: 'D93', label: "Syndrome de l'intestin irritable", chapter: 'D' },

  // Cardiovasculaire
  { code: 'K01', label: 'Douleur cardiaque', chapter: 'K' },
  { code: 'K74', label: 'Angine de poitrine / coronaropathie', chapter: 'K' },
  { code: 'K75', label: 'Infarctus aigu du myocarde', chapter: 'K' },
  { code: 'K76', label: 'Insuffisance cardiaque', chapter: 'K' },
  { code: 'K80', label: 'Arythmie cardiaque', chapter: 'K' },
  { code: 'K86', label: 'Hypertension artérielle non compliquée', chapter: 'K' },
  { code: 'K87', label: 'Hypertension artérielle compliquée', chapter: 'K' },

  // Système locomoteur
  { code: 'L01', label: 'Douleur cervicale', chapter: 'L' },
  { code: 'L02', label: 'Dorsalgie', chapter: 'L' },
  { code: 'L03', label: 'Lombalgie', chapter: 'L' },
  { code: 'L04', label: "Douleur thoracique d'origine musculosquelettique", chapter: 'L' },
  { code: 'L08', label: 'Douleur articulaire SAI', chapter: 'L' },
  { code: 'L89', label: 'Arthrose', chapter: 'L' },
  { code: 'L92', label: 'Épaule gelée', chapter: 'L' },

  // Psychologique
  { code: 'P01', label: 'Anxiété/nervosité/tension', chapter: 'P' },
  { code: 'P02', label: 'Réaction aiguë au stress', chapter: 'P' },
  { code: 'P03', label: 'Sentiment dépressif', chapter: 'P' },
  { code: 'P76', label: 'Dépression', chapter: 'P' },
  { code: 'P74', label: 'Trouble anxieux / anxiété généralisée', chapter: 'P' },
  { code: 'P06', label: 'Troubles du sommeil', chapter: 'P' },

  // Endocrinologie / Métabolisme
  { code: 'T89', label: 'Diabète insulino-dépendant', chapter: 'T' },
  { code: 'T90', label: 'Diabète non insulino-dépendant', chapter: 'T' },
  { code: 'T82', label: 'Obésité', chapter: 'T' },
  { code: 'T93', label: 'Dyslipidémie', chapter: 'T' },

  // Peau
  { code: 'S10', label: 'Bouton / papule / pustule', chapter: 'S' },
  { code: 'S74', label: 'Dermatophytose / mycose cutanée', chapter: 'S' },
  { code: 'S86', label: 'Dermatite de contact / allergique', chapter: 'S' },
  { code: 'S88', label: 'Psoriasis', chapter: 'S' },
  { code: 'S76', label: 'Herpès simplex', chapter: 'S' },

  // Urinaire
  { code: 'U71', label: 'Cystite / infection urinaire basse', chapter: 'U' },
  { code: 'U72', label: 'Pyélonéphrite', chapter: 'U' },

  // Administratif
  { code: 'A97', label: 'Consultation de contrôle / suivi', chapter: 'A' },
  { code: 'A98', label: 'Renouvellement ordonnance', chapter: 'A' },
  { code: 'A13', label: 'Certificat médical demandé', chapter: 'A' },
];

/**
 * Recherche dans les codes ICPC-2 par texte ou code.
 */
export function searchICPC2(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return ICPC2_FREQUENT.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      (ICPC2_CHAPTERS[item.chapter] || '').toLowerCase().includes(q)
  ).slice(0, 15);
}
