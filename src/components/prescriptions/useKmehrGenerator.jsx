/**
 * Hook de génération KMEHR pour Recip-e (prescription électronique belge)
 *
 * Références :
 *  - eHealth platform : https://www.ehealth.fgov.be/standards/kmehr
 *  - Standard KMEHR v1 (schéma XSD officiel eHealth)
 *  - Recip-e webservice (Farmaflux)
 *  - AR 10/08/2005 sur la prescription électronique
 *
 * IMPORTANT : la génération et la signature du XML KMEHR ainsi que l'appel
 * au webservice Recip-e doivent impérativement être réalisés côté backend
 * (fonction sécurisée) car ils nécessitent :
 *   1. Le certificat eHealth du médecin (stocké côté serveur)
 *   2. La signature XML-DSIG / SAML
 *   3. La communication HTTPS avec le STS eHealth (Service Token Service)
 *
 * Cette implémentation produit un XML de démonstration valide en structure
 * et appelle une fonction backend simulée. À remplacer par l'appel réel en production.
 */
import { useState } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { format } from 'date-fns';

// Constantes Recip-e / eHealth
const KMEHR_NS = 'http://www.ehealth.fgov.be/standards/kmehr/schema/v1';
const KMEHR_CD_SOURCE = 'http://www.ehealth.fgov.be/standards/kmehr/cd/v1';
const FHIR_SSIN = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';

/**
 * Génère le XML KMEHR pour une prescription Recip-e.
 * Suit le schéma officiel eHealth KMEHR v1 (pharmaceutical-prescription).
 */
function buildKmehrXml(prescriptionData, patient, currentUser) {
  const now = new Date();
  const dateIso = format(now, "yyyy-MM-dd'T'HH:mm:ss");
  const dateOnly = format(now, 'yyyy-MM-dd');

  const patientFamily = patient.name?.[0]?.family || '';
  const patientGiven = (patient.name?.[0]?.given || []).join(' ');
  const patientNiss = prescriptionData.patient_niss || '';
  const patientBirthDate = patient.birthDate || '';
  const patientGender = patient.gender || 'unknown';

  const medecinInami = prescriptionData.medecin_inami || currentUser?.inami || '';
  const medecinFamily = currentUser?.last_name || currentUser?.full_name || '';

  const medicamentItems = (prescriptionData.medicaments || [])
    .map((med, i) => {
      const drugName = med.use_inn ? (med.inn_name || '') : (med.brand_name || '');
      const isInn = !!med.use_inn;
      const form = med.pharmaceutical_form || '';
      const strength = med.strength || '';
      const route = med.route || 'oral';
      const dose = med.dose_per_intake || '';
      const freq = med.frequency || '';
      const duration = med.duration_days ? `P${med.duration_days}D` : '';
      const units = med.units_count || '';
      const refills = med.refills || 0;
      const substitution = med.substitution_allowed !== false ? 'true' : 'false';
      const chapterIV = med.chapter_iv ? `<kmehr:text L="fr">${med.chapter_iv_indication || ''}</kmehr:text>` : '';
      const instructions = med.special_instructions
        ? `<kmehr:instructionforpatient L="fr">${med.special_instructions}</kmehr:instructionforpatient>`
        : '';

      return `
    <kmehr:item>
      <kmehr:id S="${KMEHR_CD_SOURCE}" SV="1.5">item_${i + 1}</kmehr:id>
      <kmehr:cd S="CD-ITEM" SV="1.5">medication</kmehr:cd>
      <kmehr:beginmoment><kmehr:date>${dateOnly}</kmehr:date></kmehr:beginmoment>
      <kmehr:medicinalproduct>
        <kmehr:intendedname>${drugName}</kmehr:intendedname>
        <kmehr:intendedcd S="${isInn ? 'INN' : 'BRAND'}" SV="1.0">${drugName}</kmehr:intendedcd>
        <kmehr:deliveryenvironment>ambulatory</kmehr:deliveryenvironment>
        <kmehr:substitutionallowed>${substitution}</kmehr:substitutionallowed>
        ${strength ? `<kmehr:strength>${strength}</kmehr:strength>` : ''}
        ${form ? `<kmehr:form><kmehr:cd S="CD-DRUGFORM" SV="1.0">${form}</kmehr:cd></kmehr:form>` : ''}
        ${route ? `<kmehr:route><kmehr:cd S="CD-DRUG-ROUTE" SV="1.0">${route}</kmehr:cd></kmehr:route>` : ''}
      </kmehr:medicinalproduct>
      <kmehr:posology>
        <kmehr:text L="fr">${dose} ${freq}</kmehr:text>
        ${dose ? `<kmehr:quantity><kmehr:decimal>${dose}</kmehr:decimal></kmehr:quantity>` : ''}
        ${freq ? `<kmehr:takes><kmehr:text L="fr">${freq}</kmehr:text></kmehr:takes>` : ''}
      </kmehr:posology>
      ${duration ? `<kmehr:duration><kmehr:periodicity><kmehr:cd S="CD-TIMEUNIT" SV="1.0">d</kmehr:cd></kmehr:periodicity><kmehr:decimal>${med.duration_days}</kmehr:decimal></kmehr:duration>` : ''}
      ${units ? `<kmehr:quantity><kmehr:decimal>${units}</kmehr:decimal><kmehr:unit><kmehr:cd S="CD-QUANTITYPREFIX" SV="1.0">package</kmehr:cd></kmehr:unit></kmehr:quantity>` : ''}
      ${refills > 0 ? `<kmehr:renewal><kmehr:decimal>${refills}</kmehr:decimal></kmehr:renewal>` : ''}
      ${chapterIV}
      ${instructions}
    </kmehr:item>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kmehr:kmehrmessage xmlns:kmehr="${KMEHR_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <kmehr:header>
    <kmehr:standard>
      <kmehr:cd S="CD-STANDARD" SV="1.5">20161201</kmehr:cd>
    </kmehr:standard>
    <kmehr:id S="${KMEHR_CD_SOURCE}" SV="1.5">${Date.now()}</kmehr:id>
    <kmehr:date>${dateOnly}</kmehr:date>
    <kmehr:time>${format(now, 'HH:mm:ss')}</kmehr:time>
    <kmehr:sender>
      <kmehr:hcparty>
        <kmehr:id S="ID-HCPARTY" SV="1.0">${medecinInami}</kmehr:id>
        <kmehr:cd S="CD-HCPARTY" SV="1.4">persphysician</kmehr:cd>
        <kmehr:name>${medecinFamily}</kmehr:name>
      </kmehr:hcparty>
    </kmehr:sender>
    <kmehr:recipient>
      <kmehr:hcparty>
        <kmehr:cd S="CD-HCPARTY" SV="1.4">application</kmehr:cd>
        <kmehr:name>Recip-e</kmehr:name>
      </kmehr:hcparty>
    </kmehr:recipient>
  </kmehr:header>
  <kmehr:folder>
    <kmehr:id S="${KMEHR_CD_SOURCE}" SV="1.5">folder_1</kmehr:id>
    <kmehr:patient>
      <kmehr:id S="ID-PATIENT" SV="1.0">${patientNiss}</kmehr:id>
      <kmehr:id S="INSS" SV="1.0">${patientNiss}</kmehr:id>
      <kmehr:firstname>${patientGiven}</kmehr:firstname>
      <kmehr:familyname>${patientFamily}</kmehr:familyname>
      <kmehr:birthdate><kmehr:date>${patientBirthDate}</kmehr:date></kmehr:birthdate>
      <kmehr:sex><kmehr:cd S="CD-SEX" SV="1.0">${patientGender}</kmehr:cd></kmehr:sex>
    </kmehr:patient>
    <kmehr:transaction>
      <kmehr:id S="${KMEHR_CD_SOURCE}" SV="1.5">transaction_1</kmehr:id>
      <kmehr:cd S="CD-TRANSACTION" SV="1.5">pharmaceutical-prescription</kmehr:cd>
      <kmehr:date>${dateOnly}</kmehr:date>
      <kmehr:time>${format(now, 'HH:mm:ss')}</kmehr:time>
      <kmehr:author>
        <kmehr:hcparty>
          <kmehr:id S="ID-HCPARTY" SV="1.0">${medecinInami}</kmehr:id>
          <kmehr:cd S="CD-HCPARTY" SV="1.4">persphysician</kmehr:cd>
          <kmehr:name>${medecinFamily}</kmehr:name>
        </kmehr:hcparty>
      </kmehr:author>
      <kmehr:isComplete>true</kmehr:isComplete>
      <kmehr:isValidated>true</kmehr:isValidated>
      ${medicamentItems}
    </kmehr:transaction>
  </kmehr:folder>
</kmehr:kmehrmessage>`;
}

export const useKmehrGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [generatedRid, setGeneratedRid] = useState(null);

  const generateAndSendKmehr = async (prescriptionData, patient, currentUser) => {
    setIsLoading(true);
    setError(null);
    setStatus('generating');

    try {
      // Étape 1 : génération XML KMEHR
      const kmehrXml = buildKmehrXml(prescriptionData, patient, currentUser);

      // Étape 2 : appel backend (à remplacer par l'intégration eHealth réelle)
      // En production, envoyer kmehrXml à une fonction backend sécurisée qui :
      //   a. Signe le XML avec le certificat eHealth du médecin (XMLDSig)
      //   b. Obtient un token SAML auprès du STS eHealth
      //   c. Appelle le webservice Recip-e (wsPrescription / wsPrescriberService)
      //   d. Retourne le RID de la prescription
      setStatus('sending');

      // --- SIMULATION (à remplacer par appel réel en production) ---
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const success = Math.random() > 0.05; // 95% succès
      if (!success) {
        throw new Error(
          'Erreur de communication avec le service Recip-e. Code RECIPE-503. Réessayez dans quelques instants.'
        );
      }

      // Format RID réel Recip-e : BEPxxx (14 caractères alphanumériques)
      const rid = `BEP${Date.now().toString(36).toUpperCase().padStart(11, '0')}`;
      setGeneratedRid(rid);
      setStatus('acknowledged');

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'CREATION_PRESCRIPTION_RECIPE',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Prescription Recip-e créée pour ${patient.name?.[0]?.family || ''}. RID: ${rid}. INAMI: ${prescriptionData.medecin_inami}`,
        timestamp: new Date().toISOString(),
      });

      setIsLoading(false);
      return { success: true, rid };
    } catch (err) {
      const msg = err.message || 'Erreur inconnue';
      setError(msg);
      setStatus('error');
      setIsLoading(false);

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'ERREUR_PRESCRIPTION_RECIPE',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Échec prescription Recip-e pour ${patient.name?.[0]?.family || ''} : ${msg}`,
        timestamp: new Date().toISOString(),
      });

      return { success: false, error: msg };
    }
  };

  return { isLoading, status, error, generatedRid, generateAndSendKmehr };
};
