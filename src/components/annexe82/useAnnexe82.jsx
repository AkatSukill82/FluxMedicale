import { useState, useCallback } from 'react';
import { Annexe82 } from '@/entities/Annexe82';
import { Document } from '@/entities/Document';
import { AuditLog } from '@/entities/AuditLog';

export const useAnnexe82 = (currentUser) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const generateAnnexe82 = useCallback(async (patient, formData) => {
    setIsGenerating(true);
    setError(null);

    try {
      const annexe = await Annexe82.create({
        patient_id: patient.id,
        medecin_prescripteur: currentUser.email,
        type_examen: formData.type_examen,
        region_anatomique: formData.region_anatomique,
        indication_clinique: formData.indication_clinique,
        renseignements_cliniques: formData.renseignements_cliniques,
        question_clinique: formData.question_clinique,
        urgence: formData.urgence || false,
        avec_produit_contraste: formData.avec_produit_contraste || false,
        grossesse_possible: formData.grossesse_possible || false,
        allergie_produit_contraste: formData.allergie_produit_contraste || false,
        creatinine: formData.creatinine,
        date_creatinine: formData.date_creatinine,
        examens_anterieurs: formData.examens_anterieurs,
        traitement_en_cours: formData.traitement_en_cours,
        radiologue_prefere: formData.radiologue_prefere,
        statut: 'COMPLETE',
        numero_demande: `ANX82-${Date.now()}`,
        date_creation: new Date().toISOString()
      });

      const pdfUrl = `https://storage.example.com/annexe82/${annexe.id}.pdf`;
      const xmlUrl = `https://storage.example.com/annexe82/${annexe.id}.xml`;

      await Annexe82.update(annexe.id, {
        pdf_generated_url: pdfUrl,
        xml_eforms_url: xmlUrl
      });

      await Document.create({
        patient_id: patient.id,
        type: 'IMAGING_ORDER',
        subtype: formData.type_examen,
        title: `Demande ${formData.type_examen} - ${formData.region_anatomique}`,
        status: 'SIGNED',
        file_ref_pdf: pdfUrl,
        file_ref_xml: xmlUrl,
        created_by: currentUser.email
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'CREATE_ANNEXE82',
        target_entity: 'Annexe82',
        target_id: annexe.id,
        details: `Création Annexe 82: ${formData.type_examen}`,
        timestamp: new Date().toISOString()
      });

      setIsGenerating(false);
      return annexe;
    } catch (err) {
      setError('Erreur lors de la génération du formulaire');
      setIsGenerating(false);
      return null;
    }
  }, [currentUser]);

  const sendViaEHealthBox = useCallback(async (annexe, destinataireNIHII) => {
    setIsSending(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const messageId = `ehbox-msg-${Date.now()}`;

      await Annexe82.update(annexe.id, {
        statut: 'ENVOYEE',
        date_envoi: new Date().toISOString(),
        destinataire_nihii: destinataireNIHII
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'SEND_ANNEXE82_EHEALTHBOX',
        target_entity: 'Annexe82',
        target_id: annexe.id,
        details: `Envoi via eHealthBox vers NIHII: ${destinataireNIHII}`,
        timestamp: new Date().toISOString()
      });

      setIsSending(false);
      return { success: true, message_id: messageId };
    } catch (err) {
      setError('Erreur lors de l\'envoi via eHealthBox');
      setIsSending(false);
      return { success: false };
    }
  }, [currentUser]);

  return {
    isGenerating,
    isSending,
    error,
    generateAnnexe82,
    sendViaEHealthBox
  };
};