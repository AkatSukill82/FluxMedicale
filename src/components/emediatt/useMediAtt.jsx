import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Document } from '@/entities/Document';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour génération et envoi d'attestations eMediAtt
export const useMediAtt = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Générer l'attestation (KMEHR + PDF)
  const generateAttestation = useCallback(async (patientId, attestationData) => {
    setIsGenerating(true);

    console.log('[eMediAtt] Génération attestation...', attestationData);

    try {
      const currentUser = await base44.auth.me();

      // Génération KMEHR incapacity-notification 2.2
      const kmehrXml = generateKMEHRIncapacity(attestationData, currentUser);
      
      // Génération PDF
      const pdfBlob = await generateAttestationPDF(attestationData, currentUser);
      
      // Upload PDF
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfBlob });
      
      // Upload XML
      const xmlBlob = new Blob([kmehrXml], { type: 'application/xml' });
      const { file_url: xmlUrl } = await base44.integrations.Core.UploadFile({ file: xmlBlob });

      // Créer le document
      const document = await Document.create({
        patient_id: patientId,
        type: 'CERTIFICATE',
        subtype: 'eMediAtt',
        title: `Attestation d'incapacité - ${attestationData.dateDebut}`,
        status: 'DRAFT',
        file_ref_pdf: pdfUrl,
        file_ref_xml: xmlUrl,
        variables_snapshot: attestationData,
        created_by: currentUser.email
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'EMEDIATT_GENERATED',
        target_entity: 'Document',
        target_id: document.id,
        details: `Attestation eMediAtt générée : ${attestationData.dateDebut} à ${attestationData.dateFin}`,
        timestamp: new Date().toISOString()
      });

      return document;

    } catch (error) {
      console.error('[eMediAtt] Erreur génération:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Envoyer vers Medex via eHealthBox
  const sendToMedex = useCallback(async (documentId) => {
    setIsSending(true);

    console.log('[eMediAtt] Envoi vers Medex...', documentId);

    try {
      const currentUser = await base44.auth.me();
      const document = await Document.filter({ id: documentId });

      if (!document || document.length === 0) {
        throw new Error('Document non trouvé');
      }

      const doc = document[0];

      // Simulation envoi eHealthBox-Publication vers Medex
      const sendResult = await simulateMedexSend(doc);

      // Mettre à jour le document
      await Document.update(documentId, {
        status: 'SENT',
        sent_via: 'EHEALTHBOX',
        sent_at: new Date().toISOString(),
        recipient: {
          name: 'Medex',
          ehealthbox_id: 'medex@ehealthbox.be'
        }
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'EMEDIATT_SENT',
        target_entity: 'Document',
        target_id: documentId,
        details: `Attestation envoyée à Medex - ID: ${sendResult.messageId}`,
        timestamp: new Date().toISOString()
      });

      return sendResult;

    } catch (error) {
      console.error('[eMediAtt] Erreur envoi:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    isGenerating,
    isSending,
    generateAttestation,
    sendToMedex
  };
};

// Génération KMEHR incapacity-notification 2.2
function generateKMEHRIncapacity(data, user) {
  const now = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<kmehrmessage xmlns="http://www.ehealth.fgov.be/standards/kmehr/schema/v1">
  <header>
    <standard>
      <cd S="CD-STANDARD">20110701</cd>
    </standard>
    <id S="ID-KMEHR" SV="1.0">KMEHR-${Date.now()}</id>
    <date>${now}</date>
    <time>${now}</time>
    <sender>
      <hcparty>
        <id S="ID-HCPARTY" SV="1.0">${user.numero_inami || '00000000000'}</id>
        <cd S="CD-HCPARTY">persphysician</cd>
        <firstname>${user.full_name?.split(' ')[0] || ''}</firstname>
        <familyname>${user.full_name?.split(' ')[1] || ''}</familyname>
      </hcparty>
    </sender>
    <recipient>
      <hcparty>
        <cd S="CD-HCPARTY">orginsuranceadmin</cd>
        <name>Medex</name>
      </hcparty>
    </recipient>
  </header>
  <folder>
    <id S="ID-FOLDER" SV="1.0">1</id>
    <patient>
      <id S="INSS" SV="1.0">${data.patientNiss}</id>
      <firstname>${data.patientFirstName}</firstname>
      <familyname>${data.patientLastName}</familyname>
      <birthdate>
        <date>${data.patientBirthDate}</date>
      </birthdate>
    </patient>
    <transaction>
      <cd S="CD-TRANSACTION">incapacity</cd>
      <date>${data.dateDebut}</date>
      <time>${now}</time>
      <author>
        <hcparty>
          <id S="ID-HCPARTY" SV="1.0">${user.numero_inami || '00000000000'}</id>
          <cd S="CD-HCPARTY">persphysician</cd>
        </hcparty>
      </author>
      <iscomplete>true</iscomplete>
      <isvalidated>true</isvalidated>
      <heading>
        <cd S="CD-HEADING">incapacity</cd>
      </heading>
      <item>
        <cd S="CD-ITEM">incapacity</cd>
        <content>
          <incapacity>
            <cd S="CD-INCAPACITY">${data.type || 'sickness'}</cd>
            <incapacityreason>
              <cd S="CD-INCAPACITYREASON">${data.motif || 'disease'}</cd>
            </incapacityreason>
            <beginmoment>
              <date>${data.dateDebut}</date>
            </beginmoment>
            <endmoment>
              <date>${data.dateFin}</date>
            </endmoment>
            ${data.hospitalisation ? '<outofhomeallowed>false</outofhomeallowed>' : ''}
            ${data.dateReprise ? `<expectedendmoment><date>${data.dateReprise}</date></expectedendmoment>` : ''}
          </incapacity>
        </content>
      </item>
    </transaction>
  </folder>
</kmehrmessage>`;
}

// Génération PDF attestation
async function generateAttestationPDF(data, user) {
  console.log('[eMediAtt] Génération PDF...');
  
  // En production : utiliser une bibliothèque PDF (pdfmake, jsPDF, etc.)
  // Pour la démo : créer un blob texte
  const pdfContent = `
ATTESTATION D'INCAPACITÉ DE TRAVAIL

Patient: ${data.patientFirstName} ${data.patientLastName}
NISS: ${data.patientNiss}
Date de naissance: ${data.patientBirthDate}

Période d'incapacité:
Du ${data.dateDebut} au ${data.dateFin}

Motif: ${data.motif || 'Maladie'}
${data.hospitalisation ? 'Hospitalisation requise' : 'Traitement ambulatoire'}
${data.dateReprise ? `Date de reprise prévue: ${data.dateReprise}` : ''}

Médecin prescripteur:
${user.full_name}
INAMI: ${user.numero_inami}

Date: ${new Date().toLocaleDateString('fr-BE')}
`;

  return new Blob([pdfContent], { type: 'application/pdf' });
}

// Simulation envoi Medex
async function simulateMedexSend(document) {
  console.log('[eMediAtt] Simulation envoi Medex...');
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'SENT',
        messageId: `MEDEX-${Date.now()}`,
        timestamp: new Date().toISOString(),
        acknowledgment: 'Message reçu par Medex'
      });
    }, 2000);
  });
}