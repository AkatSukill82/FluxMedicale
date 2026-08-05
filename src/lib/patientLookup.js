import { base44 } from '@/api/base44Client';

/**
 * Recherche d'un patient par NISS.
 *
 * Passe par la fonction backend `patientLookup` : le filtrage se fait côté
 * serveur, sur l'intégralité de la patientèle. La variante précédente
 * (`Patient.list()` puis filtre en mémoire) ne voyait que la première page de
 * résultats et créait donc des doublons dès que le cabinet dépassait quelques
 * centaines de patients.
 */

export class PatientLookupError extends Error {}

/**
 * @returns {Promise<{matches: Array, truncated: boolean}>}
 *   `truncated` à true signifie que le balayage n'a PAS été exhaustif :
 *   l'absence de résultat ne permet alors pas de conclure que le patient
 *   n'existe pas, et donc pas d'en créer un nouveau.
 * @throws {PatientLookupError} si la recherche n'a pas pu aboutir.
 */
export async function findPatientsByNiss(niss) {
  let response;
  try {
    response = await base44.functions.patientLookup({ action: 'by_niss', niss });
  } catch (err) {
    throw new PatientLookupError(
      err?.response?.data?.error || 'Recherche patient indisponible',
    );
  }

  const data = response?.data ?? response;
  if (!data || data.error) {
    throw new PatientLookupError(data?.error || 'Recherche patient indisponible');
  }

  return {
    matches: data.matches || [],
    truncated: data.truncated === true,
  };
}
