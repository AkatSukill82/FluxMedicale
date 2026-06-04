/**
 * Hook d'auto-ouverture patient à l'insertion d'une carte eID belge.
 *
 * Prérequis :
 *  1. Belgium eID Middleware installé : https://eid.belgium.be/fr/telechargements
 *  2. L'agent local eID Viewer doit tourner (port 27272)
 *  3. L'utilisateur doit activer l'option dans Paramètres > Sécurité (opt-in RGPD)
 *
 * Comportement à l'insertion de carte :
 *  - Patient trouvé (NISS) → ouverture directe de la fiche
 *  - Patient inconnu       → création automatique avec les données de la carte
 *  - Doublons              → ouverture du premier + avertissement
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Patient } from '@/entities/Patient';
import { AuditLog } from '@/entities/AuditLog';
import { eidAgentService } from './eidAgentService';
import { nissValidator } from './nissValidator';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const SSIN_SYSTEM = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';

export const useAutoOpenEID = () => {
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState(false);
  const [agentStatus, setAgentStatus] = useState({
    isConnected: false,
    isRunning: false,
    pcscAvailable: false,
    readerCount: 0,
    lastEvent: null,
  });

  useEffect(() => {
    const saved = localStorage.getItem('eid_auto_open_enabled');
    setIsEnabled(saved === 'true');
    checkAgentStatus();
  }, []);

  useEffect(() => {
    if (isEnabled) {
      eidAgentService.connect();
    }
    const unsubscribe = eidAgentService.addListener(handleCardEvent);
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  const checkAgentStatus = async () => {
    const status = await eidAgentService.checkStatus();
    setAgentStatus((prev) => ({
      ...prev,
      isRunning: status.isRunning,
      pcscAvailable: status.pcscAvailable,
      readerCount: status.readerCount,
    }));
  };

  const handleCardEvent = async (event) => {
    setAgentStatus((prev) => ({ ...prev, lastEvent: event }));

    if (event.type === 'AGENT_CONNECTED') {
      setAgentStatus((prev) => ({ ...prev, isConnected: true }));
      toast.success('Agent eID connecté');
      return;
    }
    if (event.type === 'AGENT_DISCONNECTED') {
      setAgentStatus((prev) => ({ ...prev, isConnected: false }));
      return;
    }
    if (event.type === 'AGENT_ERROR') {
      toast.error(event.message || 'Erreur agent eID');
      return;
    }

    if (!isEnabled) return;

    if (event.type === 'card_inserted') {
      // L'événement peut contenir les données directement OU juste la notif d'insertion.
      // Si les données manquent, on les récupère via l'API HTTP de l'agent (getLastCard).
      const rawData = event.data || event;
      const hasData = !!(rawData.nationalNumber || rawData.niss || rawData.national_number);
      const cardData = hasData ? rawData : await eidAgentService.getLastCard();

      if (!cardData) {
        toast.error('Carte détectée mais données non lisibles. Retirez et réinsérez la carte.');
        return;
      }

      await handleCardInserted(cardData);
    }
  };

  const handleCardInserted = async (cardData) => {
    try {
      const currentUser = await base44.auth.me();

      // Normaliser les noms de champs — chaque agent eID peut utiliser des conventions différentes
      const rawNiss =
        cardData.nationalNumber  ||
        cardData.national_number ||
        cardData.niss            ||
        cardData.NISS            ||
        null;

      const firstName = cardData.firstName || cardData.first_name || cardData.prenom || '';
      const lastName  = cardData.lastName  || cardData.last_name  || cardData.nom    || '';
      const birthDate = cardData.birthDate || cardData.birth_date || cardData.dateNaissance || null;
      const gender    = cardData.gender    || cardData.sexe       || 'unknown';
      const address   = cardData.address   || null;

      if (!rawNiss) {
        toast.error('Carte insérée mais NISS non disponible. Essayez la saisie manuelle.');
        return;
      }

      const normalizedNiss = nissValidator.normalize(rawNiss);
      const validation = nissValidator.validate(normalizedNiss);

      if (!validation.isValid) {
        toast.error(`NISS invalide : ${validation.error}`);
        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_OPEN_ERROR',
          target_entity: 'Patient',
          details: `NISS invalide auto-ouverture : ${validation.error}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'EID_AUTO_READ',
        target_entity: 'Patient',
        details: `Lecture automatique eID — NISS masqué : ${nissValidator.format(normalizedNiss, true)}`,
        timestamp: new Date().toISOString(),
      });

      // Rechercher le patient par NISS
      const allPatients = await Patient.list();
      const matches = allPatients.filter((p) =>
        p.identifier?.some(
          (id) =>
            id.system === SSIN_SYSTEM &&
            nissValidator.normalize(id.value) === normalizedNiss
        )
      );

      // Cas 1 : patient trouvé
      if (matches.length === 1) {
        const patient = matches[0];
        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_PATIENT_OPENED',
          target_entity: 'Patient',
          target_id: patient.id,
          details: `Auto-ouverture : ${firstName} ${lastName}`,
          timestamp: new Date().toISOString(),
        });
        toast.success(`Patient ouvert : ${firstName} ${lastName}`);
        navigate(createPageUrl('Patients') + `?patient=${patient.id}`);
        return;
      }

      // Cas 2 : patient inconnu → création automatique
      if (matches.length === 0) {
        const newPatient = await Patient.create({
          identifier: [{ system: SSIN_SYSTEM, value: normalizedNiss }],
          name: [{ use: 'official', family: lastName || 'Inconnu', given: [firstName || 'Inconnu'] }],
          gender,
          birthDate,
          address: address ? [address] : [],
          telecom: [],
          statut: 'Actif',
          // RGPD : consentement non encore recueilli — à compléter lors de la 1re consultation
          gdpr_consent: { has_consented: false, consent_pending: true },
        });

        await AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_AUTO_PATIENT_CREATED',
          target_entity: 'Patient',
          target_id: newPatient.id,
          details: `Patient créé via eID : ${firstName} ${lastName}`,
          timestamp: new Date().toISOString(),
        });

        toast.success(`Nouveau patient créé : ${firstName} ${lastName}`);
        navigate(createPageUrl('Patients') + `?patient=${newPatient.id}`);
        return;
      }

      // Cas 3 : doublons NISS
      toast.warning(`${matches.length} patients avec le même NISS — fusion requise.`, {
        duration: 8000,
      });
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'EID_AUTO_DUPLICATES',
        target_entity: 'Patient',
        details: `Doublons NISS détectés : ${matches.length} patients`,
        timestamp: new Date().toISOString(),
      });
      navigate(createPageUrl('Patients') + `?patient=${matches[0].id}`);
    } catch {
      toast.error("Erreur lors de l'ouverture automatique du patient.");
    }
  };

  const toggleAutoOpen = useCallback((enabled) => {
    setIsEnabled(enabled);
    localStorage.setItem('eid_auto_open_enabled', String(enabled));
    if (enabled) {
      eidAgentService.connect();
      eidAgentService.resetReconnectAttempts();
      toast.success('Auto-ouverture eID activée');
    } else {
      toast.info('Auto-ouverture eID désactivée');
    }
  }, []);

  return { isEnabled, agentStatus, toggleAutoOpen, checkAgentStatus };
};
