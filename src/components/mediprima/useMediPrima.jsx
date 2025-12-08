import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour gérer MediPrima (CPAS)
export const useMediPrima = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkMediPrima = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);

    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;

    if (!patientNiss) {
      setIsLoading(false);
      setError('NISS patient requis pour vérifier MediPrima');
      return null;
    }

    console.log('[MediPrima] Vérification droits CPAS pour NISS:', patientNiss);

    try {
      // Audit log
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'CHECK_MEDIPRIMA',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Vérification droits CPAS (MediPrima-Consult) NISS: ${patientNiss}`,
        timestamp: new Date().toISOString()
      });

      // Simulation appel MediPrima-Consult (API eHealth)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 70% des patients n'ont PAS de droits CPAS
      const hasCPAS = Math.random() > 0.7;

      if (!hasCPAS) {
        console.log('[MediPrima] Pas de droits CPAS');
        setIsLoading(false);
        return {
          has_rights: false,
          message: 'Aucun droit CPAS actif pour ce patient'
        };
      }

      // Données simulées pour patient avec droits CPAS
      const mockMediPrimaData = {
        has_rights: true,
        patient_niss: patientNiss,
        cpas_code: '54021', // Code commune (ex: Charleroi)
        cpas_name: 'CPAS de Charleroi',
        oa_code: '350', // CAAMI (Caisse Auxiliaire d'Assurance Maladie-Invalidité)
        oa_name: 'CAAMI',
        coverage_start: '2024-01-01',
        coverage_end: '2025-12-31',
        coverage_type: 'FULL', // Prise en charge totale
        special_conditions: [
          'Tiers payant obligatoire',
          'Consultation gratuite',
          'Franchise supprimée'
        ],
        last_verified: new Date().toISOString()
      };

      console.log('[MediPrima] Droits CPAS actifs:', mockMediPrimaData);
      setIsLoading(false);
      return mockMediPrimaData;

    } catch (err) {
      console.error('[MediPrima] Erreur vérification:', err);
      setError('Erreur lors de la vérification MediPrima');
      setIsLoading(false);
      return null;
    }
  }, [currentUser]);

  return {
    isLoading,
    error,
    checkMediPrima
  };
};