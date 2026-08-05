import { base44 } from '@/api/base44Client';

/**
 * Écriture d'une entrée de journal d'audit.
 *
 * Remplace les écritures directes sur l'entité AuditLog. Celle-ci n'est plus
 * accessible en écriture depuis le navigateur : c'est la fonction backend
 * `auditLog` qui écrit, avec l'identité issue de la session vérifiée,
 * l'horodatage de l'horloge serveur et l'adresse IP réelle.
 *
 * Les champs `user_email` et `timestamp` éventuellement passés ici sont donc
 * ignorés par le serveur. Ils restent tolérés dans la charge utile pour ne pas
 * casser les appels existants.
 *
 * La journalisation ne doit jamais interrompre l'action de l'utilisateur : les
 * échecs sont signalés en console et la promesse est toujours tenue.
 */
export async function recordAudit(entry) {
  try {
    await base44.functions.auditLog(entry);
    return true;
  } catch (err) {
    console.warn('Journalisation audit échouée:', err?.message || err);
    return false;
  }
}

/**
 * Journalise un accès à des données patient : alimente le journal d'audit et
 * le registre RGPD des accès en une seule écriture serveur.
 */
export function recordPatientAccess({
  patientId,
  action,
  resourceType,
  resourceId,
  justification = '',
  dataFieldsAccessed = [],
  details,
}) {
  return recordAudit({
    action: `${action}_${resourceType}`.toUpperCase(),
    target_entity: resourceType,
    target_id: resourceId || patientId,
    details: details ?? JSON.stringify({ justification, fields: dataFieldsAccessed }),
    patient_id: patientId,
    access_action: action,
    resource_type: resourceType,
    resource_id: resourceId || patientId,
    justification,
    data_fields_accessed: dataFieldsAccessed,
  });
}

/** Plusieurs entrées en un seul appel (max 50 côté serveur). */
export async function recordAuditBatch(entries) {
  if (!entries?.length) return true;
  try {
    await base44.functions.auditLog({ entries });
    return true;
  } catch (err) {
    console.warn('Journalisation audit (lot) échouée:', err?.message || err);
    return false;
  }
}
