import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { eidDetectionService } from './eidDetectionService';
import { eidAgentService } from './eidAgentService';
import { webEidService } from './webEidService';
import { nissValidator } from './nissValidator';
import { useI18n } from '../i18n/i18nContext';
import { toast } from 'sonner';

export const useEIDReader = () => {
  const { t } = useI18n();
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState(null);
  const [eidStatus, setEidStatus] = useState({
    isDetected: false,
    hasMiddleware: false,
    hasWebEid: false,
    hasEContract: false,
    hasSmartCardService: false,
    platform: null,
    details: null,
    preferredMethod: null
  });

  const detectMiddleware = useCallback(async () => {
    const status = await eidDetectionService.detectEIDMiddleware();
    setEidStatus(status);
    return status;
  }, []);

  useEffect(() => {
    detectMiddleware();
  }, [detectMiddleware]);

  // Lire via Web-eID (authentification - retourne certificat avec données)
  const readViaWebEid = useCallback(async () => {
    try {
      // Utiliser la méthode readCardData du service Web-eID
      const cardData = await webEidService.readCardData({ lang: 'fr' });
      
      if (!cardData.success) {
        throw new Error('Échec de la lecture des données');
      }
      
      return {
        nationalNumber: cardData.nationalNumber,
        firstName: cardData.firstName,
        lastName: cardData.lastName,
        birthDate: cardData.birthDate,
        gender: cardData.gender,
        address: null // L'adresse n'est pas dans le certificat
      };
    } catch (error) {
      throw new Error(error.message || 'Erreur Web-eID');
    }
  }, []);

  // Lire via e-Contract.be (API locale legacy)
  const readViaEContract = useCallback(async () => {
    const response = await fetch('http://localhost:35963/v1/card-data', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`e-Contract réponse HTTP ${response.status}`);
    return await response.json();
  }, []);

  // Lire via l'agent local Belgium eID Viewer (port 27272)
  // Ne nécessite pas de PIN — lit les données publiques de la carte
  const readViaLocalAgent = useCallback(async () => {
    const agentStatus = await eidAgentService.checkStatus();
    if (!agentStatus.isRunning) throw new Error('Agent eID Viewer non détecté (port 27272)');

    const cardData = await eidAgentService.getLastCard();
    if (!cardData || !cardData.nationalNumber) {
      throw new Error('Aucune donnée de carte disponible. Retirez et réinsérez votre carte eID.');
    }
    return cardData;
  }, []);

  const readEID = useCallback(async () => {
    setIsReading(true);
    setError(null);
    toast.info(t('status.reading'));

    try {
      const currentUser = await base44.auth.me();

      // Détecter les middlewares disponibles
      let currentStatus;
      try {
        currentStatus = await eidDetectionService.detectEIDMiddleware();
        setEidStatus(currentStatus);
      } catch {
        currentStatus = { hasWebEid: false, hasEContract: false, hasMiddleware: false };
      }

      let eidData = null;
      const errors = [];

      // Méthode 1 : Web-eID (recommandé — avec PIN)
      if (currentStatus.hasWebEid) {
        try {
          toast.info('Authentification Web-eID — entrez votre PIN…');
          eidData = await readViaWebEid();
        } catch (err) {
          // Si l'utilisateur annule, on s'arrête immédiatement
          if (err.message?.includes('annulée') || err.message?.includes('cancelled')) {
            setIsReading(false);
            return { status: 'CANCELLED' };
          }
          errors.push(`Web-eID : ${err.message}`);
        }
      }

      // Méthode 2 : Agent local Belgium eID Viewer (sans PIN)
      if (!eidData) {
        try {
          toast.info('Lecture via eID Viewer local…');
          eidData = await readViaLocalAgent();
        } catch (err) {
          errors.push(`eID Viewer local : ${err.message}`);
        }
      }

      // Méthode 3 : e-Contract.be (fallback legacy)
      if (!eidData && currentStatus.hasEContract) {
        try {
          toast.info('Lecture via e-Contract…');
          eidData = await readViaEContract();
        } catch (err) {
          errors.push(`e-Contract : ${err.message}`);
        }
      }

      // Aucune méthode n'a fonctionné
      if (!eidData) {
        setIsReading(false);
        toast.dismiss();
        const detail = errors.length ? ` (${errors.join(' / ')})` : '';
        toast.info(`Lecteur eID non disponible${detail} — utilisez la saisie manuelle du NISS.`, {
          duration: 6000,
        });
        return { status: 'NO_MIDDLEWARE', errors };
      }

      const rawNiss = eidData.nationalNumber;
      if (!rawNiss) {
        const errorMsg = t('errors.eidRead') + `: ${t('errors.eidNoNiss')}`;
        setError(errorMsg);
        toast.error(errorMsg);
        return { status: 'ERROR', error: errorMsg };
      }
      
      const normalizedNiss = nissValidator.normalize(rawNiss);
      const validation = nissValidator.validate(normalizedNiss);

      if (!validation.isValid) {
        const errorMsg = t('errors.eidRead') + `: ${validation.error}`;
        setError(errorMsg);
        toast.error(errorMsg);
        await base44.entities.AuditLog.create({
            user_email: currentUser.email,
            action: 'EID_READ_ERROR',
            details: `Invalid NISS: ${validation.error}`,
            timestamp: new Date().toISOString()
        }).catch(console.error);
        return { status: 'ERROR', error: errorMsg };
      }

      await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_READ_SUCCESS',
          details: `eID read: NISS ${nissValidator.format(normalizedNiss, true)}`,
          timestamp: new Date().toISOString()
      }).catch(console.error);

      toast.info(t('status.opening'));
      
      const SSIN_SYSTEM = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';
      const allPatients = await base44.entities.Patient.list();
      const matchingPatients = allPatients.filter(p => 
        p.identifier?.some(id => 
          id.system === SSIN_SYSTEM && 
          nissValidator.normalize(id.value) === normalizedNiss
        )
      );

      if (matchingPatients.length === 1) {
        const patient = matchingPatients[0];
        await base44.entities.AuditLog.create({
            user_email: currentUser.email,
            action: 'EID_PATIENT_OPENED',
            target_entity: 'Patient',
            target_id: patient.id,
            details: `eID match → Patient: ${eidData.firstName} ${eidData.lastName}`,
            timestamp: new Date().toISOString()
        }).catch(console.error);
        toast.success(t('success.patientOpened'));
        return { status: 'MATCH', patient: patient };
      }

      if (matchingPatients.length === 0) {
        toast.info(t('status.creating'));
        const newPatient = await base44.entities.Patient.create({
          identifier: [{ system: SSIN_SYSTEM, value: normalizedNiss }],
          name: [{ use: 'official', family: eidData.lastName, given: [eidData.firstName] }],
          gender: eidData.gender,
          birthDate: eidData.birthDate,
          address: eidData.address ? [eidData.address] : [],
          statut: 'Actif'
        });

        await base44.entities.AuditLog.create({
            user_email: currentUser.email,
            action: 'EID_PATIENT_CREATED',
            target_entity: 'Patient',
            target_id: newPatient.id,
            details: `Patient auto-created via eID: ${eidData.firstName} ${eidData.lastName}`,
            timestamp: new Date().toISOString()
        }).catch(console.error);
        toast.success(t('success.patientCreated'));
        return { status: 'CREATED', patient: newPatient };
      }

      if (matchingPatients.length > 1) {
        await base44.entities.AuditLog.create({
            user_email: currentUser.email,
            action: 'EID_DUPLICATES_DETECTED',
            details: `Duplicates found: ${matchingPatients.length} patients with NISS ${nissValidator.format(normalizedNiss, true)}`,
            timestamp: new Date().toISOString()
        }).catch(console.error);
        return { 
          status: 'DUPLICATES', 
          patients: matchingPatients,
          eidData: eidData,
          niss: normalizedNiss
        };
      }

    } catch (err) {
      console.error('[eID Reader] Error:', err);
      const errorMsg = err.name === 'AbortError' ? t('toast.eidReadTimeout') : (t('errors.eidRead') + `: ${err.message}`);
      setError(errorMsg);
      toast.error(errorMsg);
      try {
        const currentUser = await base44.auth.me();
        await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: 'EID_READ_ERROR',
          details: `eID read error: ${err.message}`,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      } catch {}
      return { status: 'ERROR', error: errorMsg };
    } finally {
        setIsReading(false);
    }
  }, [t, detectMiddleware, readViaWebEid, readViaEContract]);

  return {
    isReading,
    error,
    eidStatus,
    readEID,
    detectMiddleware
  };
};