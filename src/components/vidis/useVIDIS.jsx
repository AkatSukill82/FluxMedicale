import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour simuler les interactions avec VIDIS (Shared Medication Scheme)
export const useVIDIS = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Vérifier si l'accès au VIDIS est autorisé (consentement + lien thérapeutique)
  const canAccessVIDIS = useCallback(async (patient) => {
    console.log('[VIDIS] Vérification accès pour patient:', patient.id);
    
    // Simulation : dans un vrai système, vérifier :
    // 1. Consentement patient pour partage données
    // 2. Lien thérapeutique actif
    // 3. Autorisation eHealth valide
    
    // Pour la démo, on suppose l'accès autorisé
    return true;
  }, []);

  // Lire le schéma de médication (KMEHR medicationscheme)
  const readMedicationScheme = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);
    
    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;
    
    if (!patientNiss) {
      setIsLoading(false);
      setError('NISS patient requis pour accéder au SMP');
      return null;
    }

    console.log('[VIDIS SMP] Lecture schéma de médication pour NISS:', patientNiss);

    // Audit log
    await AuditLog.create({
      user_email: currentUser.email,
      action: 'VIDIS_READ_SMP',
      target_entity: 'Patient',
      target_id: patient.id,
      details: `Consultation SMP VIDIS pour ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`,
      timestamp: new Date().toISOString()
    });

    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        
        // Simulation de données VIDIS réalistes
        const mockScheme = {
          patient_niss: patientNiss,
          scheme_id: `SMP-${Date.now()}`,
          last_updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Il y a 3 jours
          source: 'VIDIS - Recip-e / RSW',
          items: [
            {
              id: 'med-1',
              name: 'DAFALGAN 1000 MG COMP PELL 30',
              inn: 'Paracétamol',
              status: 'active',
              posology: '1 comprimé 3x par jour',
              start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              prescriber: 'Dr. Jean Dupont (INAMI: 12345678901)',
              reason: 'Douleurs chroniques',
              notes: 'À prendre au cours des repas'
            },
            {
              id: 'med-2',
              name: 'LISINOPRIL MYLAN 10 MG COMP 98',
              inn: 'Lisinopril',
              status: 'active',
              posology: '1 comprimé le matin',
              start_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
              prescriber: 'Dr. Marie Martin (INAMI: 98765432109)',
              reason: 'Hypertension artérielle',
              notes: 'Contrôle TA régulier'
            },
            {
              id: 'med-3',
              name: 'OMEPRAZOLE EG 20 MG CAPS 28',
              inn: 'Oméprazole',
              status: 'suspended',
              posology: '1 capsule le matin à jeun',
              start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              end_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              prescriber: currentUser.full_name || 'Dr. Example',
              reason: 'Reflux gastro-œsophagien',
              suspension_reason: 'Amélioration symptômes - réévaluation dans 3 mois',
              notes: 'Suspension temporaire - patient asymptomatique'
            }
          ]
        };

        console.log('[VIDIS SMP] Schéma récupéré:', mockScheme);
        resolve(mockScheme);
      }, 1500);
    });
  }, [currentUser]);

  return {
    isLoading,
    error,
    canAccessVIDIS,
    readMedicationScheme
  };
};