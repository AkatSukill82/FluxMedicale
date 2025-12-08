export const nissValidator = {
  normalize: (niss) => {
    return niss.replace(/[.\- ]/g, '');
  },

  validate: (niss) => {
    const normalized = nissValidator.normalize(niss);

    if (!/^\d{11}$/.test(normalized)) {
      return { isValid: false, error: 'Le NISS doit contenir 11 chiffres.' };
    }

    const base = parseInt(normalized.substring(0, 9), 10);
    const checksum = parseInt(normalized.substring(9, 11), 10);
    
    if (97 - (base % 97) === checksum) {
      return { isValid: true, error: null };
    }

    const baseWith2000 = parseInt('2' + normalized.substring(0, 9), 10);
    if (97 - (baseWith2000 % 97) === checksum) {
      return { isValid: true, error: null };
    }

    return { isValid: false, error: 'La somme de contrôle du NISS est invalide.' };
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
  }
};