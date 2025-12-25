import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Hook pour vérification IdSupport (carte d'identité)
export const useIdSupport = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Vérifier la validité d'une carte via IdSupport
  const verifyCard = useCallback(async (cardData) => {
    setIsVerifying(true);
    setVerificationResult(null);

    console.log('[IdSupport] Vérification carte...', cardData);

    try {
      const currentUser = await base44.auth.me();

      // Appel au WebService IdSupport (via backend)
      // En production : appel réel au service IdSupport eHealth
      // En développement : simulation

      const response = await simulateIdSupportVerification(cardData);

      setVerificationResult(response);

      // Audit log
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'IDSUPPORT_VERIFICATION',
        target_entity: 'Patient',
        target_id: cardData.patientId,
        details: `IdSupport: ${response.status} - ${response.message}`,
        timestamp: new Date().toISOString()
      });

      return response;

    } catch (error) {
      console.error('[IdSupport] Erreur vérification:', error);
      
      const errorResult = {
        status: 'ERROR',
        message: error.message || 'Erreur lors de la vérification IdSupport',
        timestamp: new Date().toISOString()
      };

      setVerificationResult(errorResult);
      return errorResult;

    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    isVerifying,
    verificationResult,
    verifyCard
  };
};

// Simulation IdSupport (pour démo)
async function simulateIdSupportVerification(cardData) {
  console.log('[IdSupport] Simulation vérification...');

  return new Promise((resolve) => {
    setTimeout(() => {
      const random = Math.random();

      if (random > 0.8) {
        // 20% chance de carte expirée
        resolve({
          status: 'EXPIRED',
          message: 'Carte expirée',
          validFrom: '2015-01-15',
          validUntil: '2020-01-14',
          cardType: 'eID',
          timestamp: new Date().toISOString(),
          requestId: `IDSupport-${Date.now()}`
        });
      } else if (random > 0.7) {
        // 10% chance de révocation
        resolve({
          status: 'REVOKED',
          message: 'Carte révoquée',
          revocationDate: '2023-08-20',
          cardType: 'eID',
          timestamp: new Date().toISOString(),
          requestId: `IDSupport-${Date.now()}`
        });
      } else if (random > 0.6) {
        // 10% chance de données incohérentes
        resolve({
          status: 'INCONSISTENT',
          message: 'Données incohérentes avec les sources authentiques',
          issues: ['Nom de famille ne correspond pas', 'Date de naissance différente'],
          cardType: 'eID',
          timestamp: new Date().toISOString(),
          requestId: `IDSupport-${Date.now()}`
        });
      } else {
        // 60% chance de carte valide
        resolve({
          status: 'VALID',
          message: 'Carte valide',
          validFrom: '2020-01-15',
          validUntil: '2030-01-14',
          cardType: 'eID',
          timestamp: new Date().toISOString(),
          requestId: `IDSupport-${Date.now()}`
        });
      }
    }, 2000);
  });
}