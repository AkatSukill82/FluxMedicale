import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour accéder à SAM (Source Authentique des Médicaments - FAMHP) + CBIP
export const useSAM = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchSAM = useCallback(async (searchTerm) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SAM] Recherche:', searchTerm);

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'SEARCH_SAM',
        target_entity: 'Medication',
        details: `Recherche médicament: ${searchTerm}`,
        timestamp: new Date().toISOString()
      });

      // Simulation recherche SAM
      // En production: appel API FAMHP ou base SAM via endpoint sécurisé
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockResults = [
        {
          sam_id: 'SAM_001234',
          cnk: '0123456',
          name: 'AMOXICILLINE MYLAN 500 MG GELULES 24',
          dosage: '500 mg',
          active_substance: 'Amoxicilline',
          form: 'Gélule',
          laboratory: 'MYLAN',
          atc_class: 'J01CA04',
          remboursement: true,
          cbip_url: 'https://www.cbip.be/fr/chapters/12?frag=8133'
        },
        {
          sam_id: 'SAM_001235',
          cnk: '0234567',
          name: 'CLAMOXYL 500 MG GELULES 24',
          dosage: '500 mg',
          active_substance: 'Amoxicilline',
          form: 'Gélule',
          laboratory: 'GLAXOSMITHKLINE',
          atc_class: 'J01CA04',
          remboursement: true,
          cbip_url: 'https://www.cbip.be/fr/chapters/12?frag=8133'
        },
        {
          sam_id: 'SAM_001236',
          cnk: '0345678',
          name: 'AMOXICILLINE/CLAVULANATE SANDOZ 875/125 MG COMP 20',
          dosage: '875/125 mg',
          active_substance: 'Amoxicilline + Acide clavulanique',
          form: 'Comprimé pelliculé',
          laboratory: 'SANDOZ',
          atc_class: 'J01CR02',
          remboursement: true,
          cbip_url: 'https://www.cbip.be/fr/chapters/12?frag=8138'
        }
      ];

      setIsLoading(false);
      return mockResults.filter(med => 
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.active_substance.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (err) {
      setError('Erreur lors de la recherche SAM');
      setIsLoading(false);
      return [];
    }
  }, [currentUser]);

  const getMedicationDetails = useCallback(async (samId) => {
    console.log('[SAM] Détails pour:', samId);

    // En production: appel API SAM + scraping CBIP si autorisé
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockDetails = {
      posology: '1 gélule 3× par jour pendant 7-10 jours',
      contraindications: 'Allergie aux pénicillines, mononucléose infectieuse',
      precautions: 'Insuffisance rénale (ajuster posologie), allaitement (passage dans le lait)',
      adverse_effects: 'Diarrhée, nausées, éruptions cutanées (10% des cas)',
      interactions_url: 'https://www.cbip.be/fr/chapters/17?frag=8000',
      leaflet_url: `https://www.cbip.be/pdf/notice/${samId}.pdf`
    };

    return mockDetails;
  }, []);

  const checkInteractions = useCallback(async (patient, medication) => {
    console.log('[SAM] Vérification interactions pour:', medication.name);

    // Audit
    await AuditLog.create({
      user_email: currentUser.email,
      action: 'CHECK_MEDICATION_INTERACTIONS',
      target_entity: 'Patient',
      target_id: patient.id,
      details: `Vérification interactions: ${medication.name}`,
      timestamp: new Date().toISOString()
    });

    // En production: appel API interactions (CBIP, Vidal, etc.)
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockInteractions = {
      has_interactions: Math.random() > 0.7,
      interactions: Math.random() > 0.7 ? [
        {
          drug1: medication.name,
          drug2: 'METFORMINE',
          description: 'Risque accru d\'effets gastro-intestinaux',
          severity: 'MODERATE'
        }
      ] : []
    };

    return mockInteractions;
  }, [currentUser]);

  return {
    searchSAM,
    getMedicationDetails,
    checkInteractions,
    isLoading,
    error
  };
}