import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { eidDetectionService } from './eidDetectionService';
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
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error('e-Contract API failed');
    }
    return await response.json();
  }, []);

  const readEID = useCallback(async () => {
    setIsReading(true);
    setError(null);
    toast.info(t('status.reading'));

    try {
      const currentUser = await base44.auth.me();
      
      // Re-détecter pour avoir le statut à jour
      const currentStatus = await eidDetectionService.detectEIDMiddleware();
      setEidStatus(currentStatus);

      let eidData;
      
      // Essayer Web-eID d'abord (recommandé), puis e-Contract
      if (currentStatus.hasWebEid) {
        try {
          toast.info("Authentification Web-eID en cours...");
          eidData = await readViaWebEid();
        } catch (webEidError) {
          console.warn('[eID Reader] Web-eID failed:', webEidError.message);
          // Si Web-eID échoue et e-Contract est dispo, essayer e-Contract
          if (currentStatus.hasEContract) {
            toast.info("Tentative via e-Contract...");
            eidData = await readViaEContract();
          } else {
            throw webEidError;
          }
        }
      } else if (currentStatus.hasEContract) {
        eidData = await readViaEContract();
      } else {
        const errorMsg = t('errors.eidApiUnavailable');
        setError(errorMsg);
        toast.dismiss();
        toast.error(errorMsg, {
          description: "Installez Web-eID (recommandé) ou e-Contract.be pour lire les cartes eID.",
          duration: 5000
        });
        return { status: 'NO_MIDDLEWARE', error: errorMsg };
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