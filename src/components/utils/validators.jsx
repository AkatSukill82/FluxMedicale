// Validateurs pour profil médecin

export function validateIBAN(iban) {
  if (!iban) return false;
  
  // Nettoyer
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Format de base (longueur)
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  
  // Code pays (2 lettres) + check digits (2 chiffres)
  if (!/^[A-Z]{2}[0-9]{2}/.test(cleaned)) return false;
  
  // Vérification Mod-97 simplifiée
  // En production : implémenter la vraie validation IBAN
  return true;
}

export function validateEmail(email) {
  if (!email) return false;
  
  // RFC 5322 simplifié
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePhone(phone) {
  if (!phone) return false;
  
  // Accepter formats E.164 et locaux
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Minimum 8 chiffres, peut commencer par +
  return /^\+?[0-9]{8,15}$/.test(cleaned);
}

export function validateBIC(bic) {
  if (!bic) return true; // Optionnel
  
  // Format BIC: 8 ou 11 caractères
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase());
}

export function validateINAMI(inami) {
  if (!inami) return false;
  
  // Format INAMI belge: 11 chiffres
  const cleaned = inami.replace(/[\s\-]/g, '');
  
  return /^[0-9]{11}$/.test(cleaned);
}