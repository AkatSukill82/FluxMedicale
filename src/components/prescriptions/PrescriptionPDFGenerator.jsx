import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Loader2, 
  Mail, 
  Archive,
  CheckCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';

export default function PrescriptionPDFGenerator({ 
  prescription, 
  patient, 
  onGenerated,
  showActions = true 
}) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(prescription?.pdf_url);

  // Récupérer le template du médecin
  const { data: template } = useQuery({
    queryKey: ['prescriptionTemplate', prescription?.medecin_email],
    queryFn: async () => {
      const templates = await base44.entities.PrescriptionTemplate.filter({
        medecin_email: prescription.medecin_email
      });
      return templates[0] || null;
    },
    enabled: !!prescription?.medecin_email
  });

  // Récupérer les infos du médecin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const patientName = patient?.name?.[0] 
    ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
    : 'Patient';

  const patientNISS = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Couleur principale
      const primaryColor = template?.primary_color || '#1e40af';
      const rgbColor = hexToRgb(primaryColor);

      // ===== EN-TÊTE =====
      // Logo (si disponible)
      if (template?.logo_url) {
        try {
          // En production, charger l'image
          doc.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
          doc.rect(margin, yPos, 30, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text('LOGO', margin + 15, yPos + 9, { align: 'center' });
        } catch (e) {
          console.log('Logo non chargé');
        }
      }

      // Informations du médecin
      doc.setTextColor(rgbColor.r, rgbColor.g, rgbColor.b);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const cabinetName = template?.cabinet_name || `Dr. ${currentUser?.full_name || 'Médecin'}`;
      doc.text(cabinetName, template?.logo_url ? margin + 40 : margin, yPos + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      
      let headerY = yPos + 12;
      if (template?.address) {
        doc.text(template.address, template?.logo_url ? margin + 40 : margin, headerY);
        headerY += 5;
      }
      if (template?.phone) {
        doc.text(`Tél: ${template.phone}`, template?.logo_url ? margin + 40 : margin, headerY);
        headerY += 5;
      }
      if (template?.inami_number) {
        doc.text(`INAMI: ${template.inami_number}`, template?.logo_url ? margin + 40 : margin, headerY);
        headerY += 5;
      }

      // Date à droite
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const dateStr = format(new Date(prescription.date_prescription), 'dd MMMM yyyy', { locale: fr });
      doc.text(dateStr, pageWidth - margin, yPos + 5, { align: 'right' });

      // Ligne de séparation
      yPos = 50;
      doc.setDrawColor(rgbColor.r, rgbColor.g, rgbColor.b);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      // ===== TITRE PRESCRIPTION =====
      yPos += 15;
      doc.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
      doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PRESCRIPTION MÉDICALE', pageWidth / 2, yPos + 3, { align: 'center' });

      // ===== INFORMATIONS PATIENT =====
      yPos += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Patient:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(patientName, margin + 25, yPos);

      if (patientNISS) {
        yPos += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('NISS:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(patientNISS, margin + 25, yPos);
      }

      if (patient?.birthDate) {
        yPos += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Né(e) le:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(format(new Date(patient.birthDate), 'dd/MM/yyyy'), margin + 25, yPos);
      }

      // ===== MÉDICAMENTS =====
      yPos += 15;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(rgbColor.r, rgbColor.g, rgbColor.b);
      doc.text('Médicaments prescrits:', margin, yPos);
      yPos += 10;

      doc.setTextColor(0, 0, 0);
      prescription.medicaments?.forEach((med, index) => {
        // Numéro
        doc.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
        doc.circle(margin + 3, yPos - 1, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${index + 1}`, margin + 3, yPos, { align: 'center' });

        // Nom du médicament
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(med.nom_produit, margin + 12, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        // Posologie
        doc.text(`Posologie: ${med.posologie}`, margin + 12, yPos);
        yPos += 5;
        
        // Durée
        if (med.duree_traitement) {
          doc.text(`Durée: ${med.duree_traitement}`, margin + 12, yPos);
          yPos += 5;
        }
        
        // Instructions
        if (med.instructions) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Instructions: ${med.instructions}`, margin + 12, yPos);
          yPos += 5;
        }

        yPos += 8;
      });

      // ===== RID RECIP-E (si disponible) =====
      if (prescription.recip_e_rid) {
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 20, 2, 2, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Prescription électronique Recip-e', margin + 5, yPos);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`RID: ${prescription.recip_e_rid}`, margin + 5, yPos + 10);

        // QR Code placeholder (en production, générer un vrai QR)
        if (template?.show_qr_code !== false) {
          doc.setDrawColor(200, 200, 200);
          doc.rect(pageWidth - margin - 25, yPos - 5, 20, 20);
          doc.setFontSize(6);
          doc.text('QR', pageWidth - margin - 15, yPos + 7, { align: 'center' });
        }

        yPos += 20;
      }

      // ===== SIGNATURE =====
      yPos = Math.max(yPos + 20, 220);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Signature du médecin:', pageWidth - margin - 60, yPos);

      if (template?.signature_url) {
        // En production, charger l'image de signature
        doc.setDrawColor(200, 200, 200);
        doc.rect(pageWidth - margin - 60, yPos + 5, 50, 20);
      }

      // ===== PIED DE PAGE =====
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setDrawColor(rgbColor.r, rgbColor.g, rgbColor.b);
      doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      if (template?.footer_text) {
        doc.text(template.footer_text, pageWidth / 2, footerY - 3, { align: 'center' });
      }
      
      doc.text(
        `Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`,
        pageWidth / 2,
        footerY + 3,
        { align: 'center' }
      );

      // Générer le PDF
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `prescription_${prescription.id}.pdf`, { type: 'application/pdf' });

      // Uploader le fichier
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // Mettre à jour la prescription avec l'URL du PDF
      await base44.entities.Prescription.update(prescription.id, {
        pdf_url: file_url,
        pdf_generated_at: new Date().toISOString()
      });

      setPdfUrl(file_url);
      toast.success('PDF généré avec succès');
      onGenerated?.(file_url);

      return file_url;
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // Convertir hex en RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 30, g: 64, b: 175 };
  };

  // Archiver dans le dossier patient
  const archiveMutation = useMutation({
    mutationFn: async () => {
      // Créer un document dans le dossier patient
      await base44.entities.PatientDocument.create({
        patient_id: patient.id,
        file_url: pdfUrl,
        file_name: `Prescription_${format(new Date(prescription.date_prescription), 'yyyy-MM-dd')}.pdf`,
        file_type: 'application/pdf',
        document_type: 'ordonnance',
        title: `Prescription du ${format(new Date(prescription.date_prescription), 'dd/MM/yyyy')}`,
        description: `${prescription.medicaments?.length || 0} médicament(s) - RID: ${prescription.recip_e_rid || 'N/A'}`,
        document_date: prescription.date_prescription,
        medecin_email: prescription.medecin_email
      });

      // Marquer comme archivé
      await base44.entities.Prescription.update(prescription.id, {
        archived_in_patient_file: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patient?.id] });
      toast.success('Prescription archivée dans le dossier patient');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'archivage');
    }
  });

  // Envoyer par email
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const patientEmail = patient?.telecom?.find(t => t.system === 'email')?.value;
      
      if (!patientEmail) {
        throw new Error('Email du patient non disponible');
      }

      if (!pdfUrl) {
        throw new Error('PDF non généré');
      }

      // Envoyer l'email via l'intégration Core
      await base44.integrations.Core.SendEmail({
        to: patientEmail,
        subject: `Votre prescription médicale du ${format(new Date(prescription.date_prescription), 'dd/MM/yyyy')}`,
        body: `
          <h2>Votre prescription médicale</h2>
          <p>Bonjour ${patientName},</p>
          <p>Veuillez trouver ci-joint votre prescription médicale.</p>
          <p><strong>Médicaments prescrits:</strong></p>
          <ul>
            ${prescription.medicaments?.map(m => `<li>${m.nom_produit} - ${m.posologie}</li>`).join('')}
          </ul>
          ${prescription.recip_e_rid ? `<p><strong>Code Recip-e:</strong> ${prescription.recip_e_rid}</p>` : ''}
          <p>Cordialement,<br/>
          ${template?.cabinet_name || `Dr. ${currentUser?.full_name}`}</p>
          <hr/>
          <p><a href="${pdfUrl}">Télécharger la prescription (PDF)</a></p>
        `
      });

      // Mettre à jour la prescription
      await base44.entities.Prescription.update(prescription.id, {
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_recipient: patientEmail
      });
    },
    onSuccess: () => {
      toast.success('Prescription envoyée par email');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    }
  });

  if (!showActions) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Générer PDF */}
      <Button
        size="sm"
        variant="outline"
        onClick={generatePDF}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-1" />
        )}
        {pdfUrl ? 'Regénérer PDF' : 'Générer PDF'}
      </Button>

      {/* Télécharger */}
      {pdfUrl && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(pdfUrl, '_blank')}
        >
          <Download className="w-4 h-4 mr-1" />
          Télécharger
        </Button>
      )}

      {/* Archiver */}
      {pdfUrl && !prescription.archived_in_patient_file && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => archiveMutation.mutate()}
          disabled={archiveMutation.isPending}
        >
          {archiveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Archive className="w-4 h-4 mr-1" />
          )}
          Archiver
        </Button>
      )}

      {prescription.archived_in_patient_file && (
        <Button size="sm" variant="ghost" disabled className="text-green-600">
          <CheckCircle className="w-4 h-4 mr-1" />
          Archivé
        </Button>
      )}

      {/* Envoyer par email */}
      {pdfUrl && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => sendEmailMutation.mutate()}
          disabled={sendEmailMutation.isPending || prescription.email_sent}
        >
          {sendEmailMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Mail className="w-4 h-4 mr-1" />
          )}
          {prescription.email_sent ? 'Envoyé' : 'Envoyer par email'}
        </Button>
      )}
    </div>
  );
}