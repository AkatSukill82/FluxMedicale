import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';

// Hook pour génération et envoi d'attestations eMediAtt
export const useMediAtt = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Générer l'attestation (KMEHR + PDF)
  const generateAttestation = useCallback(async (patientId, attestationData) => {
    setIsGenerating(true);
    setLastError(null);

    console.log('[eMediAtt] Génération attestation...', attestationData);

    try {
      const currentUser = await base44.auth.me();

      // Génération KMEHR incapacity-notification 2.2
      const kmehrXml = generateKMEHRIncapacity(attestationData, currentUser);
      
      // Génération PDF avec jsPDF
      const pdfBlob = await generateAttestationPDF(attestationData, currentUser);
      
      // Upload PDF
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfBlob });
      
      // Upload XML
      const xmlBlob = new Blob([kmehrXml], { type: 'application/xml' });
      const { file_url: xmlUrl } = await base44.integrations.Core.UploadFile({ file: xmlBlob });

      // Créer le document
      const document = await base44.entities.Document.create({
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
      await base44.entities.AuditLog.create({
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
      setLastError(error.message);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Envoyer vers Medex via eHealthBox
  const sendToMedex = useCallback(async (documentId) => {
    setIsSending(true);
    setLastError(null);

    console.log('[eMediAtt] Envoi vers Medex...', documentId);

    try {
      const currentUser = await base44.auth.me();
      const documents = await base44.entities.Document.filter({ id: documentId });

      if (!documents || documents.length === 0) {
        throw new Error('Document non trouvé');
      }

      const doc = documents[0];

      // Simulation envoi eHealthBox-Publication vers Medex
      // En production: intégration réelle avec eHealthBox API
      const sendResult = await simulateMedexSend(doc);

      // Mettre à jour le document
      await base44.entities.Document.update(documentId, {
        status: 'SENT',
        sent_via: 'EHEALTHBOX',
        sent_at: new Date().toISOString(),
        recipient: {
          name: 'Medex',
          ehealthbox_id: 'medex@ehealthbox.be'
        }
      });

      // Audit
      await base44.entities.AuditLog.create({
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
      setLastError(error.message);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, []);

  // Vérifier le statut d'une attestation envoyée
  const checkStatus = useCallback(async (documentId) => {
    try {
      const documents = await base44.entities.Document.filter({ id: documentId });
      if (!documents || documents.length === 0) {
        return null;
      }
      
      // En production: appeler l'API Medex pour vérifier le statut
      return {
        status: documents[0].status,
        lastUpdate: documents[0].updated_date,
        medexStatus: 'RECEIVED' // Simulé
      };
    } catch (error) {
      console.error('[eMediAtt] Erreur vérification statut:', error);
      return null;
    }
  }, []);

  return {
    isGenerating,
    isSending,
    lastError,
    generateAttestation,
    sendToMedex,
    checkStatus
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

// Génération PDF attestation avec jsPDF
async function generateAttestationPDF(data, user) {
  console.log('[eMediAtt] Génération PDF avec jsPDF...');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Titre
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("ATTESTATION D'INCAPACITÉ DE TRAVAIL", pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Mult-eMediatt - Certificat Médical Électronique", pageWidth / 2, 33, { align: 'center' });
  
  // Ligne séparatrice
  doc.setLineWidth(0.5);
  doc.line(20, 40, pageWidth - 20, 40);
  
  let y = 55;
  
  // Section Patient
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("PATIENT", 20, y);
  y += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${data.patientLastName || ''}`, 20, y);
  y += 7;
  doc.text(`Prénom: ${data.patientFirstName || ''}`, 20, y);
  y += 7;
  doc.text(`NISS: ${data.patientNiss || 'Non renseigné'}`, 20, y);
  y += 7;
  doc.text(`Date de naissance: ${data.patientBirthDate || 'Non renseignée'}`, 20, y);
  y += 15;
  
  // Section Période
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("PÉRIODE D'INCAPACITÉ", 20, y);
  y += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Du: ${data.dateDebut || ''}`, 20, y);
  doc.text(`Au: ${data.dateFin || ''}`, 100, y);
  y += 7;
  
  const typeLabels = {
    sickness: 'Maladie',
    accident: 'Accident',
    pregnancy: 'Maternité',
    prophylaxis: 'Prophylaxie'
  };
  doc.text(`Type: ${typeLabels[data.type] || data.type || 'Maladie'}`, 20, y);
  y += 15;
  
  // Section Motif
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("MOTIF / DIAGNOSTIC", 20, y);
  y += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const motifLines = doc.splitTextToSize(data.motif || 'Non précisé', pageWidth - 40);
  doc.text(motifLines, 20, y);
  y += motifLines.length * 7 + 8;
  
  // Options
  doc.setFontSize(11);
  if (data.hospitalisation) {
    doc.text("☑ Hospitalisation requise", 20, y);
  } else {
    doc.text("☐ Hospitalisation requise", 20, y);
  }
  y += 7;
  
  if (data.sortieAutorisee && !data.hospitalisation) {
    doc.text("☑ Sorties autorisées", 20, y);
  } else {
    doc.text("☐ Sorties autorisées", 20, y);
  }
  y += 7;
  
  if (data.dateReprise) {
    doc.text(`Date de reprise prévue: ${data.dateReprise}`, 20, y);
    y += 10;
  }
  y += 8;
  
  // Observations
  if (data.observations) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("OBSERVATIONS", 20, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(data.observations, pageWidth - 40);
    doc.text(obsLines, 20, y);
    y += obsLines.length * 7 + 10;
  }
  
  // Ligne séparatrice
  doc.setLineWidth(0.3);
  doc.line(20, y, pageWidth - 20, y);
  y += 15;
  
  // Médecin prescripteur
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("MÉDECIN PRESCRIPTEUR", 20, y);
  y += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dr. ${user.full_name || ''}`, 20, y);
  y += 7;
  doc.text(`N° INAMI: ${user.numero_inami || 'Non renseigné'}`, 20, y);
  y += 7;
  doc.text(`Date: ${new Date().toLocaleDateString('fr-BE')}`, 20, y);
  y += 20;
  
  // Signature
  doc.text("Signature:", 20, y);
  doc.setLineWidth(0.3);
  doc.line(60, y, 120, y);
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text("Document généré électroniquement via Mult-eMediatt - FluxMed", pageWidth / 2, 285, { align: 'center' });
  
  // Retourner le blob PDF
  const pdfOutput = doc.output('blob');
  return pdfOutput;
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