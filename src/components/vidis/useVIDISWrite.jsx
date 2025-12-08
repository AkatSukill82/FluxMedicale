import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour écriture VIDIS (Medication Scheme)
export const useVIDISWrite = () => {
  const [isWriting, setIsWriting] = useState(false);

  // Créer/mettre à jour un élément de médication
  const createMedicationElement = useCallback(async (patientNiss, medicationData) => {
    setIsWriting(true);

    console.log('[VIDIS Write] Création élément...', medicationData);

    try {
      const currentUser = await base44.auth.me();

      // Appel VIDIS pour créer/MAJ medicationschemeelement
      const result = await simulateVIDISWrite('CREATE', patientNiss, medicationData);

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'VIDIS_MEDICATION_CREATED',
        target_entity: 'VIDIS',
        details: `Médicament ajouté au SMP: ${medicationData.productName}`,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error('[VIDIS Write] Erreur création:', error);
      throw error;
    } finally {
      setIsWriting(false);
    }
  }, []);

  // Suspendre un traitement
  const suspendTreatment = useCallback(async (patientNiss, elementId, suspensionData) => {
    setIsWriting(true);

    console.log('[VIDIS Write] Suspension traitement...', elementId);

    try {
      const currentUser = await base44.auth.me();

      // Appel VIDIS treatmentsuspension
      const result = await simulateVIDISWrite('SUSPEND', patientNiss, { elementId, ...suspensionData });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'VIDIS_TREATMENT_SUSPENDED',
        target_entity: 'VIDIS',
        details: `Traitement suspendu: ${elementId}`,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error('[VIDIS Write] Erreur suspension:', error);
      throw error;
    } finally {
      setIsWriting(false);
    }
  }, []);

  // Reprendre un traitement
  const resumeTreatment = useCallback(async (patientNiss, elementId) => {
    setIsWriting(true);

    console.log('[VIDIS Write] Reprise traitement...', elementId);

    try {
      const currentUser = await base44.auth.me();

      // Appel VIDIS pour reprendre
      const result = await simulateVIDISWrite('RESUME', patientNiss, { elementId });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'VIDIS_TREATMENT_RESUMED',
        target_entity: 'VIDIS',
        details: `Traitement repris: ${elementId}`,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error('[VIDIS Write] Erreur reprise:', error);
      throw error;
    } finally {
      setIsWriting(false);
    }
  }, []);

  return {
    isWriting,
    createMedicationElement,
    suspendTreatment,
    resumeTreatment
  };
};

// Simulation VIDIS Write
async function simulateVIDISWrite(operation, patientNiss, data) {
  console.log(`[VIDIS Write] Simulation ${operation}...`);

  return new Promise((resolve) => {
    setTimeout(() => {
      const newVersion = Math.floor(Math.random() * 100) + 1;

      resolve({
        success: true,
        operation: operation,
        schemeVersion: newVersion,
        elementId: data.elementId || `ELEM-${Date.now()}`,
        timestamp: new Date().toISOString(),
        warnings: []
      });
    }, 1500);
  });
}