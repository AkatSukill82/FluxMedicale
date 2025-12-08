import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour lecture vaccinations (Vaccinnet+ / e-vax)
export const useVaccinations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [vaccinations, setVaccinations] = useState([]);

  // Charger les vaccinations d'un patient
  const loadVaccinations = useCallback(async (patientNiss) => {
    setIsLoading(true);

    console.log('[Vaccinations] Chargement...', patientNiss);

    try {
      const currentUser = await base44.auth.me();

      // Appel vers Vaccinnet+ (VL) et e-vax (FWB)
      const vaccins = await simulateVaccinationsLoad(patientNiss);

      setVaccinations(vaccins);

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'VACCINATIONS_CONSULTED',
        target_entity: 'Vaccinations',
        details: `Consultation vaccinations: ${vaccins.length} vaccins trouvés`,
        timestamp: new Date().toISOString()
      });

      return vaccins;

    } catch (error) {
      console.error('[Vaccinations] Erreur chargement:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    vaccinations,
    loadVaccinations
  };
};

// Simulation chargement vaccinations
async function simulateVaccinationsLoad(patientNiss) {
  console.log('[Vaccinations] Simulation chargement...');

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'VACC-1',
          vaccin: 'COVID-19 (Pfizer-BioNTech)',
          date: '2021-03-15',
          lot: 'FJ3590',
          statut: 'Administré',
          source: 'Vaccinnet+ (VL)',
          administeredBy: 'Dr. Janssens',
          location: 'Centre de vaccination Bruxelles'
        },
        {
          id: 'VACC-2',
          vaccin: 'COVID-19 (Pfizer-BioNTech)',
          date: '2021-06-10',
          lot: 'FK9788',
          statut: 'Administré',
          source: 'Vaccinnet+ (VL)',
          administeredBy: 'Dr. Janssens',
          location: 'Centre de vaccination Bruxelles'
        },
        {
          id: 'VACC-3',
          vaccin: 'Grippe saisonnière',
          date: '2023-10-15',
          lot: 'GS2023-456',
          statut: 'Administré',
          source: 'e-vax (FWB)',
          administeredBy: 'Pharmacie Centrale',
          location: 'Liège'
        },
        {
          id: 'VACC-4',
          vaccin: 'Tétanos-Diphtérie',
          date: '2020-08-20',
          lot: 'TD-789012',
          statut: 'Administré',
          source: 'Vaccinnet+ (VL)',
          administeredBy: 'Dr. Lambert',
          location: 'Cabinet médical Anvers'
        }
      ]);
    }, 1500);
  });
}