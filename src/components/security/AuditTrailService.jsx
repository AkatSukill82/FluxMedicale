import { base44 } from '@/api/base44Client';

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

// Logger un accès aux données
export async function logDataAccess({
  patientId,
  action,
  resourceType,
  resourceId,
  justification = '',
  dataFieldsAccessed = [],
  metadata = {}
}) {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.DataAccessLog.create({
      user_email: user.email,
      patient_id: patientId,
      action: action,
      resource_type: resourceType,
      resource_id: resourceId || patientId,
      timestamp: new Date().toISOString(),
      justification: justification,
      data_fields_accessed: dataFieldsAccessed,
      ip_address: 'client-side',
      user_agent: navigator.userAgent,
      session_id: sessionStorage.getItem('session_id') || generateSessionId()
    });

    // Également logger dans AuditLog pour la traçabilité générale
    await base44.entities.AuditLog.create({
      user_email: user.email,
      action: `${action}_${resourceType}`.toUpperCase(),
      target_entity: resourceType,
      target_id: resourceId || patientId,
      details: JSON.stringify({
        patient_id: patientId,
        justification,
        fields: dataFieldsAccessed,
        ...metadata
      }),
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Audit log error:', error);
    return false;
  }
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