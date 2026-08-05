import { recordAudit } from '@/lib/auditLog';

// Service centralisé pour l'audit trail RGPD
export const AuditActions = {
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  EXPORT: 'EXPORT',
  PRINT: 'PRINT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CONSENT_GIVEN: 'CONSENT_GIVEN',
  CONSENT_REVOKED: 'CONSENT_REVOKED',
  DATA_BREACH: 'DATA_BREACH'
};

export const ResourceTypes = {
  PATIENT: 'Patient',
  CONSULTATION: 'Consultation',
  PRESCRIPTION: 'Prescription',
  LAB_RESULT: 'LabResult',
  DOCUMENT: 'Document',
  INVOICE: 'Invoice',
  VACCINATION: 'Vaccination'
};

/**
 * Journalise un accès aux données patient.
 *
 * Une seule écriture serveur alimente désormais le journal d'audit et le
 * registre RGPD des accès. L'identité, l'horodatage et l'adresse IP sont
 * établis par le backend : le client ne peut plus les fournir, et l'ancien
 * `ip_address: 'client-side'` disparaît au profit de l'IP réelle.
 */
export async function logDataAccess({
  patientId,
  action,
  resourceType,
  resourceId,
  justification = '',
  dataFieldsAccessed = [],
  metadata = {}
}) {
  return recordAudit({
    action: `${action}_${resourceType}`.toUpperCase(),
    target_entity: resourceType,
    target_id: resourceId || patientId,
    details: JSON.stringify({
      patient_id: patientId,
      justification,
      fields: dataFieldsAccessed,
      ...metadata
    }),
    // Déclenche l'écriture dans DataAccessLog côté serveur.
    patient_id: patientId,
    access_action: action,
    resource_type: resourceType,
    resource_id: resourceId || patientId,
    justification,
    data_fields_accessed: dataFieldsAccessed,
    session_id: sessionStorage.getItem('session_id') || generateSessionId()
  });
}

// Générer un ID de session unique
function generateSessionId() {
  const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('session_id', id);
  return id;
}

// Logger l'ouverture d'un dossier patient
export async function logPatientAccess(patientId, reason = '') {
  return logDataAccess({
    patientId,
    action: AuditActions.VIEW,
    resourceType: ResourceTypes.PATIENT,
    resourceId: patientId,
    justification: reason
  });
}

// Logger l'export de données
export async function logDataExport(patientId, exportType, dataTypes = []) {
  return logDataAccess({
    patientId,
    action: AuditActions.EXPORT,
    resourceType: 'Export',
    resourceId: `export_${Date.now()}`,
    justification: `Export ${exportType}`,
    dataFieldsAccessed: dataTypes,
    metadata: { exportType }
  });
}

// Logger l'impression
export async function logPrint(patientId, documentType, documentId) {
  return logDataAccess({
    patientId,
    action: AuditActions.PRINT,
    resourceType: documentType,
    resourceId: documentId,
    justification: `Impression document ${documentType}`
  });
}

// Vérifier si le patient a donné son consentement RGPD
export function checkGDPRConsent(patient) {
  if (!patient?.gdpr_consent) {
    return { valid: false, reason: 'NO_CONSENT' };
  }
  
  if (patient.gdpr_consent.revoked) {
    return { valid: false, reason: 'CONSENT_REVOKED' };
  }
  
  if (!patient.gdpr_consent.has_consented) {
    return { valid: false, reason: 'CONSENT_NOT_GIVEN' };
  }
  
  if (!patient.gdpr_consent.data_processing_consent) {
    return { valid: false, reason: 'DATA_PROCESSING_NOT_ALLOWED' };
  }
  
  return { valid: true, consent: patient.gdpr_consent };
}

// Hook pour utiliser l'audit dans les composants
export function useAuditLog() {
  return {
    logAccess: logDataAccess,
    logPatientAccess,
    logDataExport,
    logPrint,
    checkConsent: checkGDPRConsent,
    AuditActions,
    ResourceTypes
  };
}