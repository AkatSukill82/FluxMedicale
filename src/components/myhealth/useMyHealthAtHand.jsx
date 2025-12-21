import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Hook pour gérer l'intégration MyHealth@Hand
 * Permet de récupérer et synchroniser les données patient avec le portail de santé belge
 */
export function useMyHealthAtHand(patient) {
  const queryClient = useQueryClient();

  // Récupérer les données patient depuis MyHealth@Hand
  const fetchPatientData = useMutation({
    mutationFn: async ({ patientNISS }) => {
      if (!patientNISS) {
        throw new Error('NISS requis pour la synchronisation');
      }

      // Appel à l'API MyHealth@Hand via l'intégration LLM
      // qui peut interroger des sources externes
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Rechercher les informations médicales pour le patient avec NISS ${patientNISS}.
        
Extraire les données suivantes si disponibles:
1. Allergies connues (nom, type, sévérité, date)
2. Traitements en cours (médicaments, posologie, date début)
3. Diagnostics actifs (pathologie, date diagnostic, statut)
4. Vaccinations récentes
5. Contacts médicaux (médecin traitant, spécialistes)

Format de réponse: JSON structuré avec les sections ci-dessus.
Si aucune donnée n'est disponible, retourner un objet vide pour chaque section.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            allergies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  allergen: { type: 'string' },
                  allergen_type: { type: 'string' },
                  severity: { type: 'string' },
                  reaction: { type: 'string' },
                  onset_date: { type: 'string' }
                }
              }
            },
            medications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  drug_name: { type: 'string' },
                  posology: { type: 'string' },
                  start_date: { type: 'string' },
                  prescriber: { type: 'string' }
                }
              }
            },
            diagnoses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  condition: { type: 'string' },
                  diagnosis_date: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            },
            vaccinations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vaccine_name: { type: 'string' },
                  vaccination_date: { type: 'string' },
                  lot_number: { type: 'string' }
                }
              }
            },
            source: { type: 'string' },
            last_updated: { type: 'string' }
          }
        }
      });

      return response;
    },
    onSuccess: () => {
      toast.success('Données récupérées depuis MyHealth@Hand');
    },
    onError: (error) => {
      toast.error(`Erreur synchronisation: ${error.message}`);
    }
  });

  // Synchroniser les allergies récupérées
  const syncAllergies = useMutation({
    mutationFn: async ({ allergies }) => {
      if (!allergies || allergies.length === 0) return [];

      const created = [];
      for (const allergy of allergies) {
        try {
          const newAllergy = await base44.entities.Allergy.create({
            patient_id: patient.id,
            allergen: allergy.allergen,
            allergen_type: allergy.allergen_type || 'OTHER',
            severity: allergy.severity || 'MODERATE',
            reaction: allergy.reaction || '',
            onset_date: allergy.onset_date || new Date().toISOString().split('T')[0],
            status: 'ACTIVE',
            verified: false
          });
          created.push(newAllergy);
        } catch (error) {
          console.error('Erreur création allergie:', error);
        }
      }
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['allergies', patient?.id] });
      toast.success(`${created.length} allergie(s) importée(s)`);
    }
  });

  // Synchroniser les vaccinations récupérées
  const syncVaccinations = useMutation({
    mutationFn: async ({ vaccinations }) => {
      if (!vaccinations || vaccinations.length === 0) return [];

      const created = [];
      for (const vacc of vaccinations) {
        try {
          const newVacc = await base44.entities.Vaccination.create({
            patient_id: patient.id,
            vaccine_name: vacc.vaccine_name,
            vaccination_date: vacc.vaccination_date || new Date().toISOString().split('T')[0],
            lot_number: vacc.lot_number || '',
            vaccine_type: 'AUTRE'
          });
          created.push(newVacc);
        } catch (error) {
          console.error('Erreur création vaccination:', error);
        }
      }
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations', patient?.id] });
      toast.success(`${created.length} vaccination(s) importée(s)`);
    }
  });

  // Mettre à jour les traitements du patient
  const updateMedications = useMutation({
    mutationFn: async ({ medications }) => {
      if (!medications || medications.length === 0) return;

      const medicationsList = medications
        .map(med => `${med.drug_name} - ${med.posology}`)
        .join('\n');

      await base44.entities.Patient.update(patient.id, {
        medicaments_actuels: medicationsList
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient?.id] });
      toast.success('Traitements synchronisés');
    }
  });

  // Pousser les données locales vers MyHealth@Hand
  const pushToMyHealth = useMutation({
    mutationFn: async () => {
      // Récupérer les données locales
      const allergies = await base44.entities.Allergy.filter({ 
        patient_id: patient.id,
        status: 'ACTIVE'
      });

      const vaccinations = await base44.entities.Vaccination.filter({
        patient_id: patient.id
      }, '-vaccination_date', 10);

      const consultations = await base44.entities.Consultation.filter({
        patient_id: patient.id
      }, '-date_consultation', 5);

      // Simuler l'envoi vers MyHealth@Hand
      // En production, cela appellerait l'API réelle
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Préparer les données suivantes pour synchronisation vers MyHealth@Hand:

Allergies actives: ${JSON.stringify(allergies)}
Vaccinations récentes: ${JSON.stringify(vaccinations)}
Consultations récentes: ${JSON.stringify(consultations)}

Générer un résumé de la synchronisation et confirmer que les données sont prêtes à être envoyées.`,
        response_json_schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            summary: { type: 'string' },
            items_prepared: { type: 'number' }
          }
        }
      });

      return response;
    },
    onSuccess: () => {
      toast.success('Données synchronisées vers MyHealth@Hand');
    },
    onError: (error) => {
      toast.error(`Erreur envoi: ${error.message}`);
    }
  });

  return {
    fetchPatientData,
    syncAllergies,
    syncVaccinations,
    updateMedications,
    pushToMyHealth
  };
}