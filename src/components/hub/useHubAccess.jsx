import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Configuration des Hubs régionaux belges
const REGIONAL_HUBS = {
  RSW: { name: 'Réseau Santé Wallon', region: 'Wallonie', url: 'https://www.reseausantewallon.be' },
  VITALINK: { name: 'Vitalink', region: 'Flandre', url: 'https://www.vitalink.be' },
  COZO: { name: 'CoZo/Abrumet', region: 'Bruxelles', url: 'https://www.abrumet.be' }
};

export function useHubAccess() {
  const [user, setUser] = useState(null);
  const [activeDelegation, setActiveDelegation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(false);
  const [connectedHubs, setConnectedHubs] = useState([]);

  useEffect(() => {
    loadUserAndDelegation();
  }, []);

  const loadUserAndDelegation = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Si c'est une secrétaire (role = user), chercher une délégation active
      if (userData.role === 'user') {
        const liaisons = await base44.entities.MedecinSecretaireLiaison.filter({
          secretaire_email: userData.email,
          statut: 'active',
          ehealth_delegation_active: true
        });

        const hubLiaison = liaisons.find(l => l.permissions?.includes('hub_access'));
        setActiveDelegation(hubLiaison || null);
      }
      
      // Simuler les hubs connectés
      setConnectedHubs(['RSW', 'VITALINK', 'COZO']);
    } catch (error) {
      console.error('Error loading user/delegation:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccessHub = useCallback(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return !!activeDelegation;
  }, [user, activeDelegation]);

  const getDelegatingDoctor = useCallback(() => {
    return activeDelegation ? {
      email: activeDelegation.medecin_email,
      nom: activeDelegation.medecin_nom,
      nihii: activeDelegation.medecin_nihii
    } : null;
  }, [activeDelegation]);

  // Vérifier le lien thérapeutique
  const checkTherapeuticLink = useCallback(async (patientNiss) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulation - en production: appel eHealth Therapeutic Links
    return {
      hasLink: true,
      linkType: 'DMG',
      since: '2023-06-15',
      doctor: user?.full_name || 'Dr. Inconnu'
    };
  }, [user]);

  // Consulter le SumEHR
  const getSumEHR = useCallback(async (patientNiss, hub = 'RSW') => {
    if (!canAccessHub()) {
      throw new Error("Accès HUB non autorisé");
    }

    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      hub,
      lastUpdate: '2024-11-20T14:30:00Z',
      version: '1.2',
      author: {
        name: 'Dr. Martin Dupont',
        nihii: '11234567890'
      },
      content: {
        activeProblems: [
          { code: 'I10', description: 'Hypertension artérielle essentielle', since: '2020-03-15' },
          { code: 'E11', description: 'Diabète de type 2', since: '2019-08-22' }
        ],
        inactiveProblem: [
          { code: 'J06', description: 'Infection aiguë des voies respiratoires', resolved: '2024-01-10' }
        ],
        allergies: [
          { substance: 'Pénicilline', type: 'Médicament', severity: 'Sévère', reaction: 'Anaphylaxie' },
          { substance: 'Arachides', type: 'Alimentaire', severity: 'Modérée', reaction: 'Urticaire' }
        ],
        medications: [
          { name: 'Metformine 850mg', posology: '2x/jour', since: '2019-09-01' },
          { name: 'Lisinopril 10mg', posology: '1x/jour matin', since: '2020-04-01' },
          { name: 'Atorvastatine 20mg', posology: '1x/jour soir', since: '2021-01-15' }
        ],
        vaccinations: [
          { name: 'COVID-19 (Pfizer)', date: '2024-10-15', lot: 'FP1234' },
          { name: 'Grippe saisonnière', date: '2024-10-20', lot: 'GR5678' },
          { name: 'Pneumocoque', date: '2023-05-10', lot: 'PN9012' }
        ],
        socialHistory: {
          smoking: 'Ex-fumeur (arrêt 2018)',
          alcohol: 'Occasionnel',
          occupation: 'Retraité'
        }
      }
    };
  }, [canAccessHub]);

  // Consulter le schéma de médication
  const getMedicationScheme = useCallback(async (patientNiss, hub = 'VITALINK') => {
    if (!canAccessHub()) {
      throw new Error("Accès HUB non autorisé");
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      hub,
      lastUpdate: '2024-12-15T09:00:00Z',
      medications: [
        {
          name: 'Metformine Sandoz 850mg',
          cnk: '2837465',
          posology: { morning: 1, noon: 0, evening: 1, night: 0 },
          route: 'Oral',
          startDate: '2019-09-01',
          prescriber: 'Dr. Martin Dupont',
          status: 'Active'
        },
        {
          name: 'Lisinopril EG 10mg',
          cnk: '3847562',
          posology: { morning: 1, noon: 0, evening: 0, night: 0 },
          route: 'Oral',
          startDate: '2020-04-01',
          prescriber: 'Dr. Martin Dupont',
          status: 'Active'
        },
        {
          name: 'Atorvastatine Mylan 20mg',
          cnk: '4857263',
          posology: { morning: 0, noon: 0, evening: 1, night: 0 },
          route: 'Oral',
          startDate: '2021-01-15',
          prescriber: 'Dr. Sophie Lambert',
          status: 'Active'
        }
      ]
    };
  }, [canAccessHub]);

  // Consulter les données de vaccination (Vaccinnet+)
  const getVaccinationData = useCallback(async (patientNiss) => {
    if (!canAccessHub()) {
      throw new Error("Accès HUB non autorisé");
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      source: 'Vaccinnet+',
      lastSync: new Date().toISOString(),
      vaccinations: [
        { name: 'COVID-19 (Comirnaty)', date: '2024-10-15', dose: 'Rappel', administrator: 'Centre vaccination Bruxelles', lot: 'FP1234' },
        { name: 'Grippe saisonnière 2024-2025', date: '2024-10-20', dose: 'Annuel', administrator: 'Dr. Martin Dupont', lot: 'GR5678' },
        { name: 'Pneumocoque (Prevenar 13)', date: '2023-05-10', dose: '1/1', administrator: 'Dr. Martin Dupont', lot: 'PN9012' },
        { name: 'Tétanos-Diphtérie-Coqueluche', date: '2022-06-15', dose: 'Rappel', administrator: 'Dr. Martin Dupont', lot: 'TD3456' }
      ]
    };
  }, [canAccessHub]);

  const accessHubForPatient = useCallback(async (patient, options = {}) => {
    if (!canAccessHub()) {
      toast.error("Vous n'avez pas les droits pour accéder au HUB");
      return null;
    }

    setHubLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const isSecretary = currentUser.role === 'user';
      
      const niss = patient.identifier?.find(
        id => id.system?.includes('ssin')
      )?.value;

      if (!niss) {
        toast.error("NISS du patient non disponible");
        return null;
      }

      // Vérifier le lien thérapeutique d'abord
      const therapeuticLink = await checkTherapeuticLink(niss);
      
      if (!therapeuticLink.hasLink) {
        toast.warning("Aucun lien thérapeutique actif avec ce patient");
      }

      // Récupérer les données selon les options
      const hubData = {
        therapeuticLink,
        timestamp: new Date().toISOString(),
        patient_niss: niss,
        via_delegation: isSecretary
      };

      if (options.includeSumEHR !== false) {
        hubData.sumehr = await getSumEHR(niss, options.hub);
      }
      
      if (options.includeMedication !== false) {
        hubData.medicationScheme = await getMedicationScheme(niss, options.hub);
      }
      
      if (options.includeVaccinations) {
        hubData.vaccinations = await getVaccinationData(niss);
      }

      // Audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'HUB_ACCESS_REQUEST',
        target_entity: 'Patient',
        target_id: patient.id,
        details: JSON.stringify({
          patient_niss: niss.slice(0, 6) + '****',
          hubs_accessed: options.hub || 'ALL',
          via_delegation: isSecretary,
          delegating_doctor: isSecretary ? activeDelegation?.medecin_email : null,
          data_types: Object.keys(hubData).filter(k => !['therapeuticLink', 'timestamp', 'patient_niss', 'via_delegation'].includes(k))
        }),
        timestamp: new Date().toISOString()
      });

      toast.success(isSecretary 
        ? `HUB consulté via délégation de Dr. ${activeDelegation.medecin_nom}`
        : "Données HUB récupérées"
      );

      return hubData;

    } catch (error) {
      console.error('Hub access error:', error);
      toast.error("Erreur lors de l'accès au HUB");
      return null;
    } finally {
      setHubLoading(false);
    }
  }, [user, activeDelegation, canAccessHub, checkTherapeuticLink, getSumEHR, getMedicationScheme, getVaccinationData]);

  return {
    user,
    activeDelegation,
    loading,
    hubLoading,
    connectedHubs,
    regionalHubs: REGIONAL_HUBS,
    canAccessHub,
    getDelegatingDoctor,
    checkTherapeuticLink,
    getSumEHR,
    getMedicationScheme,
    getVaccinationData,
    accessHubForPatient,
    refreshDelegation: loadUserAndDelegation
  };
}