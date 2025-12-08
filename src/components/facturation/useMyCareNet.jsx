import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour simuler les interactions avec MyCareNet
export const useMyCareNet = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simule la vérification de l'assurabilité du patient
  const checkAssurability = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);
    console.log(`[MyCareNet SIM] Vérification assurabilité pour patient NISS: ${patient.identifier?.find(id => id.system === 'nn')?.value || 'N/A'}`);

    // Log d'audit pour la consultation
    await AuditLog.create({
        user_email: currentUser.email,
        action: 'MYCARENET_CHECK_ASSURABILITY',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Consultation de l'assurabilité pour ${patient.name[0].given[0]} ${patient.name[0].family}`,
        timestamp: new Date().toISOString()
    });

    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        // Scénario aléatoire pour la démo
        const isTiersPayant = Math.random() > 0.5;
        const result = {
          is_insured: true,
          mutuelle_code: isTiersPayant ? '134' : '306',
          patient_niss: patient.identifier?.find(id => id.system === 'nn')?.value,
          tiers_payant_allowed: isTiersPayant,
          tiers_payant_obligatoire: isTiersPayant && Math.random() > 0.8,
          conditions: isTiersPayant ? ['Ticket modérateur social'] : []
        };
        console.log('[MyCareNet SIM] Résultat assurabilité:', result);
        resolve(result);
      }, 1500);
    });
  }, [currentUser]);

  // Simule l'envoi d'une transaction (eAttest ou eFact)
  const sendTransaction = useCallback(async (transactionData) => {
    setIsLoading(true);
    setError(null);
    console.log(`[MyCareNet SIM] Envoi transaction ${transactionData.type}:`, transactionData);
    
    await AuditLog.create({
        user_email: currentUser.email,
        action: `MYCARENET_SEND_${transactionData.type}`,
        target_entity: 'MyCareNetTransaction',
        details: `Envoi ${transactionData.type} de ${transactionData.totalAmount}€ pour patient ID ${transactionData.patient_id}`,
        timestamp: new Date().toISOString()
    });

    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        // Scénario de succès ou d'échec aléatoire
        const isSuccess = Math.random() > 0.2;
        if (isSuccess) {
          const response = {
            status: 'ACCEPTED',
            transaction_id: `MyCareNet-Tx-${Date.now()}`,
            message: `${transactionData.type} acceptée par l'organisme assureur.`,
          };
          console.log('[MyCareNet SIM] Réponse succès:', response);
          resolve(response);
        } else {
          const errorResponse = {
            status: 'REJECTED',
            message: 'Erreur 4041: Données patient invalides ou inconnues.',
          };
          console.error('[MyCareNet SIM] Réponse erreur:', errorResponse);
          setError(errorResponse.message);
          resolve(errorResponse);
        }
      }, 2000);
    });
  }, [currentUser]);

  return { isLoading, error, checkAssurability, sendTransaction };
};