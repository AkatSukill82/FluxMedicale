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

// Parser le certificat Web-eID pour extraire les données du titulaire
// Le certificat X.509 contient le nom, prénom et numéro national dans le Subject
function parseWebEidCertificate(authResult) {
  try {
    // authResult contient unverifiedCertificate en base64
    const certBase64 = authResult.unverifiedCertificate;
    
    if (!certBase64) {
      throw new Error('Certificat non trouvé dans la réponse');
    }
    
    // Décoder le certificat (format DER en base64)
    const certBinary = atob(certBase64);
    
    // Extraire les données du Subject du certificat
    // Pour la carte eID belge, le CN contient: "Prénom Nom (Numéro National)"
    // Le serialNumber contient le numéro national
    
    // Rechercher le pattern du CN dans le certificat
    // C'est une simplification - en production on utiliserait une lib ASN.1
    const data = extractBelgianEidData(certBinary);
    
    return data;
  } catch (error) {
    console.error('[Web-eID Parser]', error);
    throw new Error('Impossible de parser le certificat eID');
  }
}

// Extraire les données spécifiques à la carte eID belge
function extractBelgianEidData(certBinary) {
  // Pattern pour trouver le serialNumber (numéro national belge)
  // Format: 11 chiffres (YYMMDDXXXCC)
  const nissPattern = /(\d{11})/g;
  const matches = certBinary.match(nissPattern);
  
  // Chercher un numéro national valide (commence par une date plausible)
  let nationalNumber = null;
  if (matches) {
    for (const match of matches) {
      // Vérifier si ça ressemble à un NISS belge
      const year = parseInt(match.substring(0, 2));
      const month = parseInt(match.substring(2, 4));
      const day = parseInt(match.substring(4, 6));
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        nationalNumber = match;
        break;
      }
    }
  }
  
  // Extraire le nom - chercher dans le CN
  // Pattern simplifié pour le CN de la carte belge
  let firstName = '';
  let lastName = '';
  
  // Chercher le pattern "GN=" (Given Name) et "SN=" (Surname) dans le certificat
  const gnMatch = certBinary.match(/GN=([^,\/\x00-\x1F]+)/);
  const snMatch = certBinary.match(/SN=([^,\/\x00-\x1F]+)/);
  
  if (gnMatch) firstName = gnMatch[1].trim();
  if (snMatch) lastName = snMatch[1].trim();
  
  // Alternative: chercher le CN qui contient "Prénom NOM"
  if (!firstName || !lastName) {
    const cnMatch = certBinary.match(/CN=([^,\/\x00-\x1F]+)/);
    if (cnMatch) {
      const parts = cnMatch[1].trim().split(' ');
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }
    }
  }
  
  // Calculer la date de naissance à partir du NISS
  let birthDate = null;
  if (nationalNumber) {
    const year = parseInt(nationalNumber.substring(0, 2));
    const month = parseInt(nationalNumber.substring(2, 4));
    const day = parseInt(nationalNumber.substring(4, 6));
    
    // Déterminer le siècle (19xx ou 20xx)
    const currentYear = new Date().getFullYear() % 100;
    const century = year > currentYear ? 1900 : 2000;
    
    birthDate = `${century + year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  // Déterminer le genre à partir du NISS (position 7-9: impair = homme, pair = femme)
  let gender = null;
  if (nationalNumber) {
    const seqNumber = parseInt(nationalNumber.substring(6, 9));
    gender = seqNumber % 2 === 1 ? 'male' : 'female';
  }
  
  return {
    nationalNumber,
    firstName,
    lastName,
    birthDate,
    gender,
    // Pas d'adresse disponible via le certificat (seulement sur la puce)
    address: null
  };
}