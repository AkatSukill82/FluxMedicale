import { PERMISSIONS } from '@/components/auth/RBACGuard';

/**
 * Permission requise pour accéder à chaque page.
 *
 * Jusqu'ici le routeur montait toutes les pages pour tout utilisateur
 * authentifié : une secrétaire pouvait ouvrir /Utilisateurs, /Securite ou
 * /ExportComptable en tapant l'URL. La matrice de RBACGuard existait mais
 * n'était appliquée que sur une seule page.
 *
 * `null` = accessible à tout utilisateur authentifié (profil personnel, aide,
 * tableau de bord, notifications). Toute page absente de cette table est
 * refusée par défaut : ajouter une page impose de décider qui y accède.
 */
export const ROUTE_PERMISSIONS = {
  // --- Ouvert à tout compte authentifié ---
  Dashboard: null,
  Documentation: null,
  ProfilMedecin: null,
  Securite: null,          // enrôlement MFA de son propre compte
  Stock: null,             // inventaire du cabinet, collaboratif

  // --- Administration ---
  Utilisateurs: PERMISSIONS.MANAGE_USERS,

  // --- Audit et conformité ---
  Audit: PERMISSIONS.VIEW_AUDIT,

  // --- Agenda ---
  Agenda: PERMISSIONS.VIEW_CALENDAR,
  Garde: PERMISSIONS.VIEW_CALENDAR,

  // --- Dossiers patients ---
  Patients: PERMISSIONS.VIEW_PATIENTS,
  Inbox: PERMISSIONS.VIEW_MEDICAL_DATA,
  Statistiques: PERMISSIONS.VIEW_MEDICAL_DATA,


  // --- Prescription ---
  Prescriptions: PERMISSIONS.VIEW_PRESCRIPTIONS,

  // --- Facturation ---
  Facturation: PERMISSIONS.VIEW_INVOICES,
};

/**
 * Renvoie la permission exigée pour une page.
 * `undefined` signifie « page inconnue » : le garde refuse alors l'accès.
 */
export function permissionForPage(pageName) {
  return ROUTE_PERMISSIONS[pageName];
}

export function isKnownPage(pageName) {
  return Object.prototype.hasOwnProperty.call(ROUTE_PERMISSIONS, pageName);
}
