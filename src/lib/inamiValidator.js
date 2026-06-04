/**
 * Validation du numéro INAMI/NIHII belge (numéro de prestataire INAMI)
 *
 * Structure : 11 chiffres → format XX XXXXX XX X
 *   Positions 1-2  : code province (03 = médecin généraliste, 04 = spécialiste, etc.)
 *   Positions 3-7  : numéro séquentiel
 *   Positions 8-9  : clé de contrôle (97 - (N % 97))
 *   Position 10-11 : catégorie professionnelle
 *
 * Sources : INAMI / RIZIV — structure officielle du numéro d'identification
 *
 * Codes catégorie (premières 2 positions) :
 *   1x  = dentistes
 *   2x  = pharmaciens
 *   3x  = médecins généralistes
 *   4x  = médecins spécialistes
 *   5x  = infirmiers/kinés
 *   6x  = logopèdes/audio
 *   7x  = infirmiers
 *   8x  = autres prestataires
 */

export const inamiValidator = {
  normalize: (inami) => {
    if (!inami) return '';
    return inami.replace(/[\s\-.]/g, '');
  },

  validate: (inami) => {
    const n = inamiValidator.normalize(inami);

    if (!/^\d{11}$/.test(n)) {
      return { isValid: false, error: 'Le numéro INAMI doit contenir 11 chiffres.' };
    }

    const base = parseInt(n.substring(0, 6), 10);
    const checkDigits = parseInt(n.substring(6, 8), 10);
    const expected = 97 - (base % 97);

    if (expected !== checkDigits) {
      return { isValid: false, error: 'La clé de contrôle du numéro INAMI est invalide.' };
    }

    return { isValid: true, error: null };
  },

  format: (inami) => {
    const n = inamiValidator.normalize(inami);
    if (n.length !== 11) return inami;
    return `${n.substring(0, 2)}.${n.substring(2, 7)}.${n.substring(7, 9)}.${n.substring(9, 11)}`;
  },

  /**
   * Retourne la catégorie professionnelle à partir des 2 premiers chiffres.
   */
  getCategory: (inami) => {
    const n = inamiValidator.normalize(inami);
    if (n.length < 2) return null;
    const prefix = parseInt(n.substring(0, 2), 10);

    if (prefix >= 10 && prefix < 20) return 'Dentiste';
    if (prefix >= 20 && prefix < 30) return 'Pharmacien';
    if (prefix >= 30 && prefix < 40) return 'Médecin généraliste';
    if (prefix >= 40 && prefix < 50) return 'Médecin spécialiste';
    if (prefix >= 50 && prefix < 60) return 'Infirmier / Kinésithérapeute';
    if (prefix >= 60 && prefix < 70) return 'Logopède / Audiologiste';
    if (prefix >= 70 && prefix < 80) return 'Infirmier spécialisé';
    if (prefix >= 80 && prefix < 90) return 'Autre prestataire de soins';
    return 'Catégorie inconnue';
  },
};
