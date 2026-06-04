import { useState, useCallback } from 'react';
import { Document } from '@/entities/Document';
import { TimelineEvent } from '@/entities/TimelineEvent';
import { AuditLog } from '@/entities/AuditLog';

export const useDocumentService = (currentUser, patient) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Remplir les variables du template avec les données patient/médecin
  const fillVariables = useCallback((template, customFields = {}) => {
    const officialName = patient.name?.find(n => n.use === 'official') || { family: '', given: [] };
    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value || 'N/A';
    
    const variables = {
      // Médecin
      medecin_nom: currentUser.full_name || '',
      medecin_prenom: currentUser.full_name?.split(' ')[0] || '',
      medecin_inami: currentUser.numero_inami || '',
      medecin_tel: currentUser.telephone_cabinet || '',
      // Cabinet
      cabinet_adresse: currentUser.adresse_cabinet || '',
      cabinet_ville: currentUser.adresse_cabinet?.split(',').pop()?.trim() || '',
      // Patient
      patient_nom: officialName.family || '',
      patient_prenom: (officialName.given || []).join(' '),
      patient_niss: patientNiss,
      patient_ddn: patient.birthDate || '',
      patient_atcd: patient.antecedents_medicaux || 'Néant',
      patient_allergies: patient.allergies || 'Aucune allergie connue',
      patient_medication: patient.medicaments_actuels || 'Aucune médication régulière',
      // Document
      date_emission: new Date().toLocaleDateString('fr-BE'),
      ...customFields
    };

    let content = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value || '');
    });

    return { content, variables };
  }, [patient, currentUser]);

  // Créer un document
  const createDocument = useCallback(async (documentData) => {
    setIsLoading(true);
    setError(null);

    try {
      const doc = await Document.create({
        ...documentData,
        patient_id: patient.id,
        created_by: currentUser.email,
        status: 'DRAFT'
      });

      // Timeline event
      await TimelineEvent.create({
        patient_id: patient.id,
        event_type: 'DOCUMENT',
        event_date: new Date().toISOString(),
        title: `Document créé: ${documentData.title}`,
        description: `Type: ${documentData.type}`,
        source: 'MediBridge',
        source_id: doc.id,
        provider: currentUser.full_name,
        created_by: currentUser.email
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'CREATE_DOCUMENT',
        target_entity: 'Document',
        target_id: doc.id,
        details: `Création document: ${documentData.title} pour patient ${patient.name?.[0]?.family}`,
        timestamp: new Date().toISOString()
      });

      return doc;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [patient, currentUser]);

  // Signature électronique (simulation itsme)
  const signDocument = useCallback(async (documentId, method = 'ITSME') => {
    setIsLoading(true);
    setError(null);

    console.log(`[itsme Sign SIM] Signature du document ${documentId} via ${method}`);

    try {
      // Simuler le processus de signature
      await new Promise(resolve => setTimeout(resolve, 2000));

      const signature = {
        signed: true,
        method,
        timestamp: new Date().toISOString(),
        certificate_thumbprint: `SHA256:${Math.random().toString(36).substring(7)}`,
        qes_compliant: true
      };

      await Document.update(documentId, {
        status: 'SIGNED',
        signature
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'SIGN_DOCUMENT',
        target_entity: 'Document',
        target_id: documentId,
        details: `Signature électronique via ${method} - QES conforme eIDAS`,
        timestamp: new Date().toISOString()
      });

      return signature;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Envoi via eHealthBox (simulation)
  const sendViaEHealthBox = useCallback(async (documentId, recipient) => {
    setIsLoading(true);
    setError(null);


    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const success = Math.random() > 0.2;

      if (!success) {
        throw new Error('Erreur eHealthBox: Destinataire introuvable');
      }

      await Document.update(documentId, {
        status: 'SENT',
        recipient,
        sent_via: 'EHEALTHBOX',
        sent_at: new Date().toISOString()
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'SEND_EHEALTHBOX',
        target_entity: 'Document',
        target_id: documentId,
        details: `Document envoyé via eHealthBox à ${recipient.name} (NIHII: ${recipient.nihii || 'N/A'})`,
        timestamp: new Date().toISOString()
      });

      return { success: true, messageId: `EHB-${Date.now()}` };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Envoi via Mult-eMediatt (attestations incapacité)
  const sendViaMulteMediatt = useCallback(async (documentId, patientNiss) => {
    setIsLoading(true);
    setError(null);


    try {
      await new Promise(resolve => setTimeout(resolve, 1800));

      await Document.update(documentId, {
        status: 'SENT',
        sent_via: 'MULTEMEDIATT',
        sent_at: new Date().toISOString()
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'SEND_MULTEMEDIATT',
        target_entity: 'Document',
        target_id: documentId,
        details: `Attestation envoyée à la mutualité via Mult-eMediatt (NISS: ${patientNiss})`,
        timestamp: new Date().toISOString()
      });

      return { success: true, transactionId: `MM-${Date.now()}` };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Générer PDF (simulation)
  const generatePDF = useCallback(async (documentId, htmlContent) => {
    console.log(`[PDF Generator] Génération PDF pour document ${documentId}`);
    
    // Simuler la génération PDF
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pdfUrl = `https://example.com/documents/${documentId}.pdf`;
    
    await Document.update(documentId, {
      file_ref_pdf: pdfUrl
    });

    return pdfUrl;
  }, []);

  return {
    isLoading,
    error,
    fillVariables,
    createDocument,
    signDocument,
    sendViaEHealthBox,
    sendViaMulteMediatt,
    generatePDF
  };
};