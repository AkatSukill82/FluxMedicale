import { destroyOfflineDB } from '@/components/offline/OfflineService';

/**
 * Effacement des données locales à la déconnexion.
 *
 * L'application conserve côté poste : des brouillons de consultation en clair
 * (localStorage), des cohortes de patients, et une base IndexedDB complète
 * (patients, consultations, prescriptions, antécédents, NISS). Rien de tout
 * cela n'était effacé jusqu'ici — sur un poste partagé de cabinet, les données
 * du médecin précédent restaient accessibles après sa déconnexion.
 *
 * Principe : liste blanche. Tout est effacé sauf les préférences explicitement
 * listées ci-dessous. Une clé ajoutée plus tard est donc purgée par défaut,
 * plutôt que conservée par oubli.
 */

/** Préférences d'interface, sans donnée patient : conservées entre sessions. */
const PRESERVED_KEYS = new Set([
  'fluxmed_locale',
  'app-accessibility',
  'dashboard-widgets-config',
  'pwa_install_dismissed',
  'offline_auto_sync',
  'eid_auto_open_enabled',
  'drug_favorites',
  'medical_app_backup_config',
]);

/** Jetons du SDK Base44 : leur cycle de vie est géré par `base44.auth.logout()`. */
const SDK_PREFIX = 'base44_';

export function purgeLocalStorage() {
  let removed = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      if (PRESERVED_KEYS.has(key)) continue;
      if (key.startsWith(SDK_PREFIX)) continue;
      localStorage.removeItem(key);
      removed += 1;
    }
  } catch (e) {
    console.warn('Purge localStorage incomplète:', e);
  }
  return removed;
}

export function purgeSessionStorage() {
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('Purge sessionStorage incomplète:', e);
  }
}

/**
 * Efface toutes les données locales. Ne rejette jamais : une purge partielle
 * ne doit pas empêcher la déconnexion elle-même d'aboutir.
 */
export async function purgeLocalData() {
  purgeLocalStorage();
  purgeSessionStorage();
  try {
    await destroyOfflineDB();
  } catch (e) {
    console.warn('Suppression de la base hors-ligne impossible:', e);
  }
}
