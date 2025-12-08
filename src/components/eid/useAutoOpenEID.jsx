import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Patient } from '@/entities/Patient';
import { AuditLog } from '@/entities/AuditLog';
import { eidAgentService } from './eidAgentService';
import { nissValidator } from './nissValidator';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

// Hook pour auto-ouverture patient à l'insertion eID
export const useAutoOpenEID = () => {
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState(false);
  const [agentStatus, setAgentStatus] = useState({
    isConnected: false,
    isRunning: false,
    pcscAvailable: false,
    readerCount: 0,
    lastEvent: null
  });

  useEffect(() => {
    // Charger préférence locale (opt-in RGPD)
    const saved = localStorage.getItem('eid_auto_open_enabled');
    setIsEnabled(saved === 'true');

    // Vérifier statut agent
    checkAgentStatus();
  }, []);

  useEffect(() => {
    // Si activé, démarrer connexion WebSocket
    if (isEnabled) {
      eidAgentService.connect();
    }

    // Listener événements carte
    const unsubscribe = eidAgentService.addListener(handleCardEvent);

    return () => {
      unsubscribe();
    };
  }, [isEnabled]);

  const checkAgentStatus = async () => {
    const status = await eidAgentService.checkStatus();
    setAgentStatus(prev => ({
      ...prev,
      isRunning: status.isRunning,
      pcscAvailable: status.pcscAvailable,
      readerCount: status.readerCount
    }));
  };

  const handleCardEvent = async (event) => {
    console.log('[Auto-Open eID] 📨 Événement:', event);

    setAgentStatus(prev => ({
      ...prev,
      lastEvent: event
    }));

    // Gérer les différents types d'événements
    if (event.type === 'AGENT_CONNECTED') {
      setAgentStatus(prev => ({
        ...prev,
        isConnected: true
      }));
      toast.success('Agent eID connecté');
      return;
    }

    if (event.type === 'AGENT_DISCONNECTED') {
      setAgentStatus(prev => ({
        ...prev,
        isConnected: false
      }));
      toast.warning('Agent eID déconnecté');
      return;
    }

    if (event.type === 'AGENT_ERROR') {
      toast.error(event.message || 'Erreur agent eID');
      return;
    }

    // Si pas activé, ignorer les insertions de carte
    if (!isEnabled) {
      console.log('[Auto-Open eID] ⏭️  Désactivé, ignorer insertion');
      return;
    }

    // Si carte insérée
    if (event.type === 'card_inserted') {
      await handleCardInserted(event);
    }
  };

  const handleCardInserted = async (cardData) => {
    try {
      const currentUser = await base44.auth.me();
      
      const rawNiss = cardData.niss;
      console.log('[Auto-Open eID] NISS lu:', rawNiss);

      // Normaliser et valider
      const normalizedNiss = nissValidator.normalize(rawNiss);
      const validation = nissValidator.validate(normalizedNiss);

      if (!validation.isValid) {
        toast.error(`NISS invalide: ${validation.error}`);
        
        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_OPEN_ERROR',
          target_entity: 'Patient',
          details: `NISS invalide lors auto-ouverture: ${validation.error}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('[Auto-Open eID] NISS validé:', normalizedNiss);

      // Audit lecture
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'EID_AUTO_READ',
        target_entity: 'Patient',
        details: `Lecture automatique eID - NISS: ${nissValidator.format(normalizedNiss, true)}`,
        timestamp: new Date().toISOString()
      });

      // Rechercher patient par FHIR SSIN
      const SSIN_SYSTEM = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';
      
      const allPatients = await Patient.list();
      const matchingPatients = allPatients.filter(p => 
        p.identifier?.some(id => 
          id.system === SSIN_SYSTEM && 
          nissValidator.normalize(id.value) === normalizedNiss
        )
      );

      console.log('[Auto-Open eID] Patients trouvés:', matchingPatients.length);

      // Cas 1: Match unique
      if (matchingPatients.length === 1) {
        const patient = matchingPatients[0];
        
        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_PATIENT_OPENED',
          target_entity: 'Patient',
          target_id: patient.id,
          details: `Auto-ouverture patient: ${cardData.firstName || ''} ${cardData.lastName || ''}`,
          timestamp: new Date().toISOString()
        });

        toast.success(`Patient ouvert: ${cardData.firstName || ''} ${cardData.lastName || ''}`);
        navigate(createPageUrl("Patients") + `?patient=${patient.id}`);
        return;
      }

      // Cas 2: Aucun match - créer patient minimal
      if (matchingPatients.length === 0) {
        const newPatient = await Patient.create({
          identifier: [
            {
              system: SSIN_SYSTEM,
              value: normalizedNiss
            }
          ],
          name: [
            {
              use: 'official',
              family: cardData.lastName || 'Inconnu',
              given: [cardData.firstName || 'Inconnu']
            }
          ],
          gender: cardData.gender || 'unknown',
          birthDate: cardData.birthDate || null,
          address: cardData.address ? [cardData.address] : [],
          telecom: [],
          statut: 'Actif',
          gdpr_consent: {
            has_consented: false,
            consent_date: null
          }
        });

        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_PATIENT_CREATED',
          target_entity: 'Patient',
          target_id: newPatient.id,
          details: `Patient créé automatiquement via eID: ${cardData.firstName || ''} ${cardData.lastName || ''} (NISS: ${nissValidator.format(normalizedNiss, true)})`,
          timestamp: new Date().toISOString()
        });

        toast.success(`Nouveau patient créé: ${cardData.firstName || ''} ${cardData.lastName || ''}`);
        navigate(createPageUrl("Patients") + `?patient=${newPatient.id}`);
        return;
      }

      // Cas 3: Doublons
      if (matchingPatients.length > 1) {
        toast.warning(`${matchingPatients.length} patients avec le même NISS détectés - fusion requise`);
        
        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_DUPLICATES',
          target_entity: 'Patient',
          details: `Doublons NISS détectés lors auto-ouverture: ${matchingPatients.length} patients`,
          timestamp: new Date().toISOString()
        });

        // Ouvrir le premier patient avec une alerte
        navigate(createPageUrl("Patients") + `?patient=${matchingPatients[0].id}`);
      }

    } catch (error) {
      console.error('[Auto-Open eID] ❌ Erreur:', error);
      toast.error('Erreur lors de l\'auto-ouverture du patient');
    }
  };

  const toggleAutoOpen = useCallback((enabled) => {
    setIsEnabled(enabled);
    localStorage.setItem('eid_auto_open_enabled', enabled.toString());

    if (enabled) {
      eidAgentService.connect();
      eidAgentService.resetReconnectAttempts();
      toast.success('Auto-ouverture eID activée');
    } else {
      toast.info('Auto-ouverture eID désactivée');
    }
  }, []);

  return {
    isEnabled,
    agentStatus,
    toggleAutoOpen,
    checkAgentStatus
  };
};