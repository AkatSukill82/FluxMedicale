import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour simuler les interactions avec MyCareNet eDMG
export const useDMG = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simule la consultation du statut DMG
  const checkDMGStatus = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);
    
    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;
    
    // Validation NISS
    if (!patientNiss) {
      setIsLoading(false);
      setError('NISS du patient introuvable. Le DMG nécessite un numéro national.');
      return null;
    }
    
    console.log(`[MyCareNet eDMG SIM] Consultation DMG pour NISS: ${patientNiss}`);

    // Log d'audit
    await AuditLog.create({
      user_email: currentUser.email,
      action: 'DMG_CONSULTATION',
      target_entity: 'Patient',
      target_id: patient.id,
      details: `Consultation statut DMG pour ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family} (NISS: ${patientNiss})`,
      timestamp: new Date().toISOString()
    });

    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        
        // Scénarios simulés
        const scenarios = [
          // Patient avec DMG actif chez le médecin connecté
          {
            statut: 'ACTIF',
            medecin_dmg_nihii: currentUser.numero_inami || '12345678901',
            medecin_dmg_nom: currentUser.full_name || 'Dr. Example',
            date_ouverture: '2023-01-15',
            date_expiration: '2025-01-15',
            date_derniere_consultation: '2024-11-15',
            can_open_dmg: false,
            can_renew_dmg: true
          },
          // Patient avec DMG chez un autre médecin
          {
            statut: 'ACTIF',
            medecin_dmg_nihii: '98765432109',
            medecin_dmg_nom: 'Dr. Autre Médecin',
            date_ouverture: '2022-06-10',
            date_expiration: '2024-12-31',
            date_derniere_consultation: '2024-10-20',
            can_open_dmg: false,
            can_renew_dmg: false
          },
          // Patient sans DMG
          {
            statut: 'AUCUN',
            can_open_dmg: true,
            can_renew_dmg: false
          },
          // Patient avec DMG expiré
          {
            statut: 'EXPIRE',
            medecin_dmg_nihii: currentUser.numero_inami || '12345678901',
            medecin_dmg_nom: currentUser.full_name || 'Dr. Example',
            date_ouverture: '2021-01-15',
            date_expiration: '2023-01-15',
            can_open_dmg: true,
            can_renew_dmg: true
          }
        ];

        // Sélection aléatoire d'un scénario
        const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        
        const result = {
          patient_id: patient.id,
          patient_niss: patientNiss, // IMPORTANT: Toujours inclure le NISS
          mutuelle_code: '300', // Simulation
          transaction_id: `DMG-${Date.now()}`,
          derniere_verification: new Date().toISOString(),
          verified_by: currentUser.email,
          conditions_dmg: selectedScenario.statut === 'ACTIF' ? ['Consultation annuelle obligatoire'] : [],
          ...selectedScenario
        };
        
        console.log('[MyCareNet eDMG SIM] Résultat:', result);
        resolve(result);
      }, 1200);
    });
  }, [currentUser]);

  // Simule l'ouverture d'un DMG
  const openDMG = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);
    
    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;
    
    if (!patientNiss) {
      setIsLoading(false);
      setError('NISS du patient introuvable');
      return null;
    }
    
    console.log(`[MyCareNet eDMG SIM] Ouverture DMG pour NISS: ${patientNiss}`);

    await AuditLog.create({
      user_email: currentUser.email,
      action: 'DMG_OUVERTURE',
      target_entity: 'Patient',
      target_id: patient.id,
      details: `Ouverture DMG pour ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`,
      timestamp: new Date().toISOString()
    });

    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        
        // Simulation : 90% de succès
        const success = Math.random() > 0.1;
        
        if (success) {
          const result = {
            status: 'SUCCESS',
            message: 'DMG ouvert avec succès',
            transaction_id: `DMG-OPEN-${Date.now()}`,
            dmg_data: {
              patient_id: patient.id,
              patient_niss: patientNiss, // IMPORTANT: Toujours inclure le NISS
              medecin_dmg_nihii: currentUser.numero_inami || '12345678901',
              medecin_dmg_nom: currentUser.full_name || 'Dr. Example',
              statut: 'ACTIF',
              date_ouverture: new Date().toISOString().split('T')[0],
              date_expiration: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              can_open_dmg: false,
              can_renew_dmg: true
            }
          };
          resolve(result);
        } else {
          const errorResult = {
            status: 'ERROR',
            message: 'Refus OA: Patient déjà inscrit chez un autre médecin cette année',
            error_code: 'DMG_ALREADY_EXISTS'
          };
          setError(errorResult.message);
          resolve(errorResult);
        }
      }, 2000);
    });
  }, [currentUser]);

  // Simule le renouvellement d'un DMG
  const renewDMG = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);
    
    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;
    
    if (!patientNiss) {
      setIsLoading(false);
      setError('NISS du patient introuvable');
      return null;
    }
    
    console.log(`[MyCareNet eDMG SIM] Renouvellement DMG pour NISS: ${patientNiss}`);

    await AuditLog.create({
      user_email: currentUser.email,
      action: 'DMG_RENOUVELLEMENT',
      target_entity: 'Patient',
      target_id: patient.id,
      details: `Renouvellement DMG pour ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`,
      timestamp: new Date().toISOString()
    });

    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        
        const result = {
          status: 'SUCCESS',
          message: 'DMG renouvelé avec succès',
          transaction_id: `DMG-RENEW-${Date.now()}`,
          dmg_data: {
            date_expiration: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            statut: 'ACTIF'
          }
        };
        resolve(result);
      }, 1500);
    });
  }, [currentUser]);

  return { isLoading, error, checkDMGStatus, openDMG, renewDMG };
};