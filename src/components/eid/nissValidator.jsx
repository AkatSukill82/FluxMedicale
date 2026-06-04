/**
 * Validateur NISS/SSIN belge
 * Références : SPF Sécurité Sociale, eHealth platform
 * Structure : AA MM JJ SSS CC
 *   AA MM JJ  = date de naissance (YY.MM.DD)
 *   SSS       = numéro de séquence (pair = femme, impair = homme)
 *   CC        = clé de contrôle (97 - (base % 97))
 *   Pour nés après 31/12/1999 : clé = 97 - ((2 || base) % 97)
 */
export const nissValidator = {
  normalize: (niss) => {
    if (!niss) return '';
    return niss.replace(/[.\-\s]/g, '');
  },

  validate: (niss) => {
    const normalized = nissValidator.normalize(niss);

    if (!/^\d{11}$/.test(normalized)) {
      return { isValid: false, error: 'Le NISS doit contenir exactement 11 chiffres.' };
    }

    const checksum = parseInt(normalized.substring(9, 11), 10);

    // Nés avant 01/01/2000
    const base19 = parseInt(normalized.substring(0, 9), 10);
    if (97 - (base19 % 97) === checksum) {
      return { isValid: true, error: null };
    }

    // Nés à partir du 01/01/2000 (préfixe 2)
    const base20 = parseInt('2' + normalized.substring(0, 9), 10);
    if (97 - (base20 % 97) === checksum) {
      return { isValid: true, error: null };
    }

    return { isValid: false, error: 'La clé de contrôle du NISS est invalide.' };
  },

  /**
   * Extrait la date de naissance depuis le NISS.
   * Retourne un objet Date ou null si indéterminable.
   */
  extractBirthDate: (niss) => {
    const normalized = nissValidator.normalize(niss);
    if (normalized.length !== 11) return null;

    const yy = parseInt(normalized.substring(0, 2), 10);
    const mm = parseInt(normalized.substring(2, 4), 10);
    const dd = parseInt(normalized.substring(4, 6), 10);

    if (mm === 0 || mm > 12) return null;
    if (dd === 0 || dd > 31) return null;

    // Déterminer le siècle
    const checksum = parseInt(normalized.substring(9, 11), 10);
    const base20 = parseInt('2' + normalized.substring(0, 9), 10);
    const born2000 = 97 - (base20 % 97) === checksum;

    const fullYear = born2000 ? 2000 + yy : 1900 + yy;

    const date = new Date(fullYear, mm - 1, dd);
    if (isNaN(date.getTime())) return null;
    return date;
  },

  /**
   * Extrait le sexe biologique depuis le NISS.
   * SSS pair = femme, SSS impair = homme.
   * Retourne 'male', 'female' ou 'unknown' si SSS = 000.
   */
  extractGender: (niss) => {
    const normalized = nissValidator.normalize(niss);
    if (normalized.length !== 11) return 'unknown';

    const seq = parseInt(normalized.substring(6, 9), 10);
    if (seq === 0) return 'unknown';
    return seq % 2 === 0 ? 'female' : 'male';
  },

  /**
   * Vérifie la cohérence du NISS avec les données patient connues.
   * Retourne un tableau d'avertissements (vide = cohérent).
   */
  checkConsistency: (niss, { birthDate, gender } = {}) => {
    const warnings = [];
    const validation = nissValidator.validate(niss);
    if (!validation.isValid) return [validation.error];

    if (birthDate) {
      const nissDate = nissValidator.extractBirthDate(niss);
      if (nissDate) {
        const ref = new Date(birthDate);
        if (
          nissDate.getFullYear() !== ref.getFullYear() ||
          nissDate.getMonth() !== ref.getMonth() ||
          nissDate.getDate() !== ref.getDate()
        ) {
          const fmt = (d) => d.toLocaleDateString('fr-BE');
          warnings.push(
            `La date de naissance dans le NISS (${fmt(nissDate)}) ne correspond pas à la date du dossier (${fmt(ref)}).`
          );
        }
      }
    }

    if (gender && gender !== 'unknown' && gender !== 'other') {
      const nissGender = nissValidator.extractGender(niss);
      if (nissGender !== 'unknown' && nissGender !== gender) {
        warnings.push(
          `Le sexe encodé dans le NISS (${nissGender === 'male' ? 'homme' : 'femme'}) ne correspond pas au dossier.`
        );
      }
    }

    return warnings;
  },

  format: (niss, mask = false) => {
    if (!niss) return '';
    const normalized = nissValidator.normalize(niss);
    if (normalized.length !== 11) return niss;

    const year = normalized.substring(0, 2);
    const month = normalized.substring(2, 4);
    const day = normalized.substring(4, 6);
    const counter = normalized.substring(6, 9);
    const checksum = normalized.substring(9, 11);

    if (mask) {
      return `${year}.${month}.${day}-***.**`;
    }

    return `${year}.${month}.${day}-${counter}.${checksum}`;
  },
};
