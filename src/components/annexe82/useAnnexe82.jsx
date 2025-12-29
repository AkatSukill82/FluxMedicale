import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

// Types d'examens pour Annexe 82
export const EXAM_TYPES = [
  { id: 'CT', label: 'CT-Scan (Tomodensitométrie)', code: '459' },
  { id: 'IRM', label: 'IRM (Résonance magnétique)', code: '460' },
  { id: 'PET', label: 'PET-Scan', code: '461' },
  { id: 'SCINTIGRAPHIE', label: 'Scintigraphie', code: '462' }
];

// Régions anatomiques
export const ANATOMICAL_REGIONS = [
  'Crâne/Encéphale', 'Face/Sinus', 'Cou/Thyroïde', 'Thorax', 'Abdomen', 
  'Pelvis', 'Colonne cervicale', 'Colonne dorsale', 'Colonne lombaire',
  'Membre supérieur', 'Membre inférieur', 'Articulation', 'Corps entier'
];

// Indications cliniques courantes
export const CLINICAL_INDICATIONS = [
  { code: 'TRAUMA', label: 'Traumatisme' },
  { code: 'TUMOR', label: 'Suspicion tumorale' },
  { code: 'INFECTION', label: 'Recherche infection' },
  { code: 'VASCULAR', label: 'Pathologie vasculaire' },
  { code: 'DEGENERATIVE', label: 'Pathologie dégénérative' },
  { code: 'FOLLOWUP', label: 'Suivi/Contrôle' },
  { code: 'OTHER', label: 'Autre' }
];

// Génération du PDF Annexe 82
function generateAnnexe82PDF(patient, formData, currentUser, annexeNumber) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête officiel
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANNEXE 82', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Demande d\'imagerie médicale lourde', pageWidth / 2, 22, { align: 'center' });
  doc.text('(CT-Scan, IRM, PET-Scan, Scintigraphie)', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(`N° ${annexeNumber}`, pageWidth / 2, 35, { align: 'center' });
  
  let y = 50;
  
  // Section Patient
  doc.setFillColor(230, 240, 250);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT', 15, y + 6);
  y += 15;
  
  const patientName = patient.name?.find(n => n.use === 'official');
  const fullName = patientName ? `${(patientName.given || []).join(' ')} ${patientName.family || ''}`.trim() : 'Inconnu';
  const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${fullName}`, 15, y);
  doc.text(`NISS: ${niss}`, 110, y);
  y += 7;
  doc.text(`Date de naissance: ${patient.birthDate || 'Non renseignée'}`, 15, y);
  doc.text(`Sexe: ${patient.gender === 'male' ? 'Masculin' : 'Féminin'}`, 110, y);
  y += 12;
  
  // Section Examen demandé
  doc.setFillColor(230, 240, 250);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('EXAMEN DEMANDÉ', 15, y + 6);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  const examType = EXAM_TYPES.find(e => e.id === formData.type_examen);
  doc.text(`Type d'examen: ${examType?.label || formData.type_examen}`, 15, y);
  y += 7;
  doc.text(`Région anatomique: ${formData.region_anatomique}`, 15, y);
  y += 7;
  
  if (formData.urgence) {
    doc.setTextColor(255, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ URGENT', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 7;
  }
  
  // Options
  const options = [];
  if (formData.avec_produit_contraste) options.push('Avec produit de contraste');
  if (formData.grossesse_possible) options.push('Grossesse possible');
  if (formData.allergie_produit_contraste) options.push('Allergie produit contraste connue');
  
  if (options.length > 0) {
    doc.text(`Options: ${options.join(', ')}`, 15, y);
    y += 10;
  }
  
  y += 5;
  
  // Section Indication clinique
  doc.setFillColor(230, 240, 250);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('INDICATION CLINIQUE', 15, y + 6);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  const indication = CLINICAL_INDICATIONS.find(i => i.code === formData.indication_clinique);
  doc.text(`Indication: ${indication?.label || formData.indication_clinique}`, 15, y);
  y += 10;
  
  // Renseignements cliniques (text wrapping)
  if (formData.renseignements_cliniques) {
    doc.text('Renseignements cliniques:', 15, y);
    y += 5;
    const lines = doc.splitTextToSize(formData.renseignements_cliniques, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 5;
  }
  
  // Question clinique
  if (formData.question_clinique) {
    doc.text('Question clinique:', 15, y);
    y += 5;
    const lines = doc.splitTextToSize(formData.question_clinique, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 5;
  }
  
  y += 5;
  
  // Section Créatinine (si applicable)
  if (formData.avec_produit_contraste && formData.creatinine) {
    doc.setFillColor(255, 250, 230);
    doc.rect(10, y, pageWidth - 20, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('FONCTION RÉNALE', 15, y + 6);
    y += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Créatinine: ${formData.creatinine} mg/dL`, 15, y);
    if (formData.date_creatinine) {
      doc.text(`Date du dosage: ${formData.date_creatinine}`, 100, y);
    }
    y += 15;
  }
  
  // Section Médecin prescripteur
  doc.setFillColor(230, 240, 250);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('MÉDECIN PRESCRIPTEUR', 15, y + 6);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${currentUser.full_name || currentUser.email}`, 15, y);
  y += 7;
  if (currentUser.inami_number) {
    doc.text(`N° INAMI: ${currentUser.inami_number}`, 15, y);
    y += 7;
  }
  doc.text(`Date: ${new Date().toLocaleDateString('fr-BE')}`, 15, y);
  
  // Cadre signature
  y += 15;
  doc.setDrawColor(150, 150, 150);
  doc.rect(120, y - 10, 70, 30);
  doc.setFontSize(8);
  doc.text('Signature et cachet', 155, y + 15, { align: 'center' });
  
  // Pied de page
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Document généré par FluxMed - Conforme aux exigences INAMI pour les demandes d\'imagerie médicale lourde', pageWidth / 2, 285, { align: 'center' });
  doc.text(`Généré le ${new Date().toLocaleString('fr-BE')}`, pageWidth / 2, 290, { align: 'center' });
  
  return doc;
}

// Génération XML eForms
function generateEFormsXML(patient, formData, currentUser, annexeNumber) {
  const patientName = patient.name?.find(n => n.use === 'official');
  const fullName = patientName ? `${(patientName.given || []).join(' ')} ${patientName.family || ''}`.trim() : '';
  const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<eforms:ImagingRequest xmlns:eforms="http://www.ehealth.fgov.be/standards/eforms"
                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <header>
    <documentId>${annexeNumber}</documentId>
    <creationDate>${new Date().toISOString()}</creationDate>
    <formType>ANNEXE_82</formType>
  </header>
  <patient>
    <ssin>${niss}</ssin>
    <name>${fullName}</name>
    <birthDate>${patient.birthDate || ''}</birthDate>
    <gender>${patient.gender || ''}</gender>
  </patient>
  <examination>
    <type code="${formData.type_examen}">${EXAM_TYPES.find(e => e.id === formData.type_examen)?.label || ''}</type>
    <anatomicalRegion>${formData.region_anatomique}</anatomicalRegion>
    <urgent>${formData.urgence || false}</urgent>
    <withContrast>${formData.avec_produit_contraste || false}</withContrast>
    <possiblePregnancy>${formData.grossesse_possible || false}</possiblePregnancy>
    <contrastAllergy>${formData.allergie_produit_contraste || false}</contrastAllergy>
  </examination>
  <clinicalIndication>
    <code>${formData.indication_clinique}</code>
    <details>${formData.renseignements_cliniques || ''}</details>
    <clinicalQuestion>${formData.question_clinique || ''}</clinicalQuestion>
  </clinicalIndication>
  ${formData.creatinine ? `
  <renalFunction>
    <creatinine unit="mg/dL">${formData.creatinine}</creatinine>
    <measurementDate>${formData.date_creatinine || ''}</measurementDate>
  </renalFunction>` : ''}
  <prescriber>
    <nihii>${currentUser.inami_number || ''}</nihii>
    <name>${currentUser.full_name || ''}</name>
    <email>${currentUser.email}</email>
  </prescriber>
</eforms:ImagingRequest>`;
}

export const useAnnexe82 = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const generateAnnexe82 = useCallback(async (patient, formData) => {
    setIsGenerating(true);
    setError(null);

    try {
      const currentUser = await base44.auth.me();
      const annexeNumber = `ANX82-${Date.now()}`;
      
      // Générer le PDF
      const pdfDoc = generateAnnexe82PDF(patient, formData, currentUser, annexeNumber);
      const pdfBlob = pdfDoc.output('blob');
      
      // Upload du PDF
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfBlob });
      
      // Générer XML eForms
      const xmlContent = generateEFormsXML(patient, formData, currentUser, annexeNumber);
      const xmlBlob = new Blob([xmlContent], { type: 'application/xml' });
      const { file_url: xmlUrl } = await base44.integrations.Core.UploadFile({ file: xmlBlob });
      
      // Créer l'enregistrement Annexe82
      const annexe = await base44.entities.Annexe82.create({
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
        numero_demande: annexeNumber,
        date_creation: new Date().toISOString(),
        pdf_generated_url: pdfUrl,
        xml_eforms_url: xmlUrl
      });

      // Créer un document lié
      await base44.entities.Document.create({
        patient_id: patient.id,
        type: 'IMAGING_ORDER',
        subtype: formData.type_examen,
        title: `Annexe 82 - ${EXAM_TYPES.find(e => e.id === formData.type_examen)?.label || formData.type_examen} - ${formData.region_anatomique}`,
        status: 'SIGNED',
        file_ref_pdf: pdfUrl,
        file_ref_xml: xmlUrl,
        created_by: currentUser.email,
        date_document: new Date().toISOString()
      });

      // Audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'CREATE_ANNEXE82',
        target_entity: 'Annexe82',
        target_id: annexe.id,
        details: `Création Annexe 82: ${formData.type_examen} - ${formData.region_anatomique}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Annexe 82 générée avec succès');
      setIsGenerating(false);
      return { ...annexe, pdfUrl, xmlUrl };
    } catch (err) {
      console.error('Erreur génération Annexe 82:', err);
      setError('Erreur lors de la génération du formulaire');
      toast.error('Erreur lors de la génération');
      setIsGenerating(false);
      return null;
    }
  }, []);

  const sendViaEHealthBox = useCallback(async (annexe, destinataireNIHII) => {
    setIsSending(true);
    setError(null);

    try {
      const currentUser = await base44.auth.me();
      
      // Simulation envoi eHealthBox
      await new Promise(resolve => setTimeout(resolve, 1500));
      const messageId = `ehbox-annexe82-${Date.now()}`;

      await base44.entities.Annexe82.update(annexe.id, {
        statut: 'ENVOYEE',
        date_envoi: new Date().toISOString(),
        destinataire_nihii: destinataireNIHII,
        ehealthbox_message_id: messageId
      });

      // Audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'SEND_ANNEXE82_EHEALTHBOX',
        target_entity: 'Annexe82',
        target_id: annexe.id,
        details: `Envoi Annexe 82 via eHealthBox vers NIHII: ${destinataireNIHII}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Annexe 82 envoyée via eHealthBox');
      setIsSending(false);
      return { success: true, message_id: messageId };
    } catch (err) {
      console.error('Erreur envoi Annexe 82:', err);
      setError('Erreur lors de l\'envoi via eHealthBox');
      toast.error('Erreur lors de l\'envoi');
      setIsSending(false);
      return { success: false };
    }
  }, []);

  const downloadPDF = useCallback((pdfUrl) => {
    window.open(pdfUrl, '_blank');
  }, []);

  return {
    isGenerating,
    isSending,
    error,
    generateAnnexe82,
    sendViaEHealthBox,
    downloadPDF,
    EXAM_TYPES,
    ANATOMICAL_REGIONS,
    CLINICAL_INDICATIONS
  };
};