import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useHubAccess() {
  const [user, setUser] = useState(null);
  const [activeDelegation, setActiveDelegation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(false);

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

        // Prendre la première liaison active avec accès HUB
        const hubLiaison = liaisons.find(l => l.permissions?.includes('hub_access'));
        setActiveDelegation(hubLiaison || null);
      }
    } catch (error) {
      console.error('Error loading user/delegation:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccessHub = useCallback(() => {
    if (!user) return false;
    // Médecin peut toujours accéder
    if (user.role === 'admin') return true;
    // Secrétaire a besoin d'une délégation active
    return !!activeDelegation;
  }, [user, activeDelegation]);

  const getDelegatingDoctor = useCallback(() => {
    return activeDelegation ? {
      email: activeDelegation.medecin_email,
      nom: activeDelegation.medecin_nom,
      nihii: activeDelegation.medecin_nihii
    } : null;
  }, [activeDelegation]);

  const accessHubForPatient = useCallback(async (patient) => {
    if (!canAccessHub()) {
      toast.error("Vous n'avez pas les droits pour accéder au HUB");
      return null;
    }

    setHubLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const isSecretary = currentUser.role === 'user';
      
      // Récupérer le NISS du patient
      const niss = patient.identifier?.find(
        id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
      )?.value;

      if (!niss) {
        toast.error("NISS du patient non disponible");
        return null;
      }

      // Paramètres pour l'appel HUB
      const hubParams = {
        patient_niss: niss,
        requester_email: currentUser.email,
        requester_role: currentUser.role,
      };

      // Si secrétaire, ajouter les infos de délégation
      if (isSecretary && activeDelegation) {
        hubParams.delegation = {
          medecin_email: activeDelegation.medecin_email,
          medecin_nihii: activeDelegation.medecin_nihii,
          delegation_id: activeDelegation.id
        };
      }

      // Log de l'accès
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'HUB_ACCESS_REQUEST',
        target_entity: 'Patient',
        target_id: patient.id,
        details: JSON.stringify({
          patient_niss: niss.slice(0, 6) + '****',
          via_delegation: isSecretary,
          delegating_doctor: isSecretary ? activeDelegation?.medecin_email : null
        }),
        timestamp: new Date().toISOString()
      });

      // Simuler l'appel au HUB (à remplacer par l'appel réel)
      // En production, ceci appellerait une fonction backend qui utilise
      // le certificat eHealth du médecin délégant
      const hubData = await simulateHubAccess(hubParams);

      toast.success(isSecretary 
        ? `HUB consulté via délégation de Dr. ${activeDelegation.medecin_nom}`
        : "Données HUB récupérées"
      );

      return hubData;

    } catch (error) {
      console.error('Hub access error:', error);
      toast.error("Erreur lors de l'accès au HUB");
      
      // Log de l'erreur
      await base44.entities.AuditLog.create({
        user_email: user?.email || 'unknown',
        action: 'HUB_ACCESS_ERROR',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }).catch(console.error);

      return null;
    } finally {
      setHubLoading(false);
    }
  }, [user, activeDelegation, canAccessHub]);

  return {
    user,
    activeDelegation,
    loading,
    hubLoading,
    canAccessHub,
    getDelegatingDoctor,
    accessHubForPatient,
    refreshDelegation: loadUserAndDelegation
  };
}

// Simulation de l'accès HUB - À remplacer par l'appel réel
async function simulateHubAccess(params) {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    status: 'success',
    timestamp: new Date().toISOString(),
    patient_niss: params.patient_niss,
    sumehr: {
      lastUpdate: '2024-06-15',
      medications: [
        { name: 'Paracetamol 500mg', posology: '3x/jour si douleur' },
        { name: 'Omeprazole 20mg', posology: '1x/jour le matin' }
      ],
      allergies: ['Pénicilline'],
      vaccinations: [
        { name: 'COVID-19', date: '2023-10-15' },
        { name: 'Grippe', date: '2023-11-01' }
      ],
      activeProblems: ['Hypertension artérielle', 'Diabète type 2']
    },
    via_delegation: !!params.delegation
  };
}