import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Settings,
  Eye,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Stethoscope,
  Activity,
  Pill,
  FileCode
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const REPORT_SECTIONS = [
  { id: 'motif', label: 'Motif de consultation', icon: FileText },
  { id: 'anamnese', label: 'Anamnèse', icon: User },
  { id: 'examen', label: 'Examen clinique', icon: Stethoscope },
  { id: 'vitals', label: 'Constantes vitales', icon: Activity },
  { id: 'diagnostic', label: 'Diagnostic', icon: FileText },
  { id: 'codes', label: 'Codes CISP-2 / ICD-10', icon: FileCode },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
];

export default function ConsultationReportGenerator({ 
  isOpen, 
  onClose, 
  consultation, 
  patient,
  vitalSigns,
  diagnosisCodes,
  prescriptions 
}) {
  const [selectedSections, setSelectedSections] = useState(
    REPORT_SECTIONS.map(s => s.id)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [headerConfig, setHeaderConfig] = useState({
    cabinetName: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    inami: ''
  });
  
  const [footerConfig, setFooterConfig] = useState({
    text: 'Document confidentiel - Usage médical uniquement',
    showDate: true,
    showPageNumbers: true
  });

  // Charger les paramètres du médecin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Charger le template de prescription existant pour récupérer les infos cabinet
  const { data: prescriptionTemplate } = useQuery({
    queryKey: ['prescriptionTemplate', currentUser?.email],
    queryFn: async () => {
      const templates = await base44.entities.PrescriptionTemplate.filter({ medecin_email: currentUser.email });
      return templates[0] || null;
    },
    enabled: !!currentUser?.email,
    onSuccess: (template) => {
      if (template) {
        setHeaderConfig({
          cabinetName: template.cabinet_name || '',
          logoUrl: template.logo_url || '',
          address: template.address || '',
          phone: template.phone || '',
          email: template.email || '',
          inami: template.inami_number || ''
        });
      }
    }
  });

  const toggleSection = (sectionId) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getPatientName = () => {
    if (!patient) return 'Patient inconnu';
    const officialName = patient.name?.find(n => n.use === 'official') || patient.name?.[0] || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  };

  const getPatientNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // === EN-TÊTE ===
      if (headerConfig.cabinetName) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(headerConfig.cabinetName, margin, yPos);
        yPos += 7;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (headerConfig.address) {
        doc.text(headerConfig.address, margin, yPos);
        yPos += 5;
      }
      
      const contactLine = [
        headerConfig.phone ? `Tél: ${headerConfig.phone}` : '',
        headerConfig.email ? `Email: ${headerConfig.email}` : ''
      ].filter(Boolean).join(' | ');
      
      if (contactLine) {
        doc.text(contactLine, margin, yPos);
        yPos += 5;
      }
      
      if (headerConfig.inami) {
        doc.text(`N° INAMI: ${headerConfig.inami}`, margin, yPos);
        yPos += 5;
      }

      // Ligne de séparation
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // === TITRE DU RAPPORT ===
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT DE CONSULTATION', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date de consultation
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const consultDate = consultation?.date_consultation 
        ? format(new Date(consultation.date_consultation), 'dd MMMM yyyy à HH:mm', { locale: fr })
        : format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });
      doc.text(`Date: ${consultDate}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // === INFORMATIONS PATIENT ===
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 25, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PATIENT', margin + 5, yPos + 3);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nom: ${getPatientName()}`, margin + 5, yPos + 10);
      
      const patientInfo = [];
      if (patient?.birthDate) {
        patientInfo.push(`Né(e) le: ${format(new Date(patient.birthDate), 'dd/MM/yyyy')}`);
      }
      if (getPatientNISS()) {
        patientInfo.push(`NISS: ${getPatientNISS()}`);
      }
      doc.text(patientInfo.join(' | '), margin + 5, yPos + 17);
      yPos += 30;

      // === SECTIONS SÉLECTIONNÉES ===
      const addSection = (title, content) => {
        if (!content) return;
        
        // Vérifier si on a besoin d'une nouvelle page
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175); // Bleu
        doc.text(title.toUpperCase(), margin, yPos);
        yPos += 7;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const lines = doc.splitTextToSize(content, pageWidth - 2 * margin);
        lines.forEach(line => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin, yPos);
          yPos += 5;
        });
        yPos += 8;
      };

      // Motif
      if (selectedSections.includes('motif') && consultation?.motif) {
        addSection('Motif de consultation', consultation.motif);
      }

      // Anamnèse
      if (selectedSections.includes('anamnese') && consultation?.anamnese) {
        addSection('Anamnèse', consultation.anamnese);
      }

      // Constantes vitales
      if (selectedSections.includes('vitals') && vitalSigns && Object.keys(vitalSigns).some(k => vitalSigns[k])) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('CONSTANTES VITALES', margin, yPos);
        yPos += 7;
        doc.setTextColor(0, 0, 0);

        const vitalsData = [];
        if (vitalSigns.systolic && vitalSigns.diastolic) {
          vitalsData.push(['Tension artérielle', `${vitalSigns.systolic}/${vitalSigns.diastolic} mmHg`]);
        }
        if (vitalSigns.heart_rate) vitalsData.push(['Fréquence cardiaque', `${vitalSigns.heart_rate} bpm`]);
        if (vitalSigns.temperature) vitalsData.push(['Température', `${vitalSigns.temperature} °C`]);
        if (vitalSigns.spo2) vitalsData.push(['SpO2', `${vitalSigns.spo2} %`]);
        if (vitalSigns.respiratory_rate) vitalsData.push(['Fréquence respiratoire', `${vitalSigns.respiratory_rate} /min`]);
        if (vitalSigns.weight) vitalsData.push(['Poids', `${vitalSigns.weight} kg`]);
        if (vitalSigns.height) vitalsData.push(['Taille', `${vitalSigns.height} cm`]);
        if (vitalSigns.weight && vitalSigns.height) {
          const bmi = (vitalSigns.weight / Math.pow(vitalSigns.height / 100, 2)).toFixed(1);
          vitalsData.push(['IMC', bmi]);
        }
        if (vitalSigns.pain_score !== undefined && vitalSigns.pain_score !== null) {
          vitalsData.push(['Score EVA', `${vitalSigns.pain_score}/10`]);
        }

        if (vitalsData.length > 0) {
          doc.autoTable({
            startY: yPos,
            head: [['Paramètre', 'Valeur']],
            body: vitalsData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [30, 64, 175] },
            theme: 'striped'
          });
          yPos = doc.lastAutoTable.finalY + 10;
        }
      }

      // Examen clinique
      if (selectedSections.includes('examen') && consultation?.examen_clinique) {
        addSection('Examen clinique', consultation.examen_clinique);
      }

      // Diagnostic
      if (selectedSections.includes('diagnostic') && consultation?.diagnostic) {
        addSection('Diagnostic', consultation.diagnostic);
      }

      // Codes CISP-2 / ICD-10
      if (selectedSections.includes('codes') && diagnosisCodes && diagnosisCodes.length > 0) {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('CODES DIAGNOSTIQUES', margin, yPos);
        yPos += 7;
        doc.setTextColor(0, 0, 0);

        const codesData = diagnosisCodes.map(code => [
          code.system || 'N/A',
          code.code,
          code.label || code.description || ''
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Système', 'Code', 'Description']],
          body: codesData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [30, 64, 175] },
          theme: 'striped'
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Prescriptions
      if (selectedSections.includes('prescriptions') && prescriptions && prescriptions.length > 0) {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('PRESCRIPTIONS', margin, yPos);
        yPos += 7;
        doc.setTextColor(0, 0, 0);

        const prescData = prescriptions.map(med => [
          med.nom_produit || med.name,
          med.posologie || med.dosage || '',
          med.duree_traitement || med.duration || ''
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Médicament', 'Posologie', 'Durée']],
          body: prescData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [30, 64, 175] },
          theme: 'striped'
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // === PIED DE PAGE ===
      const totalPages = doc.internal.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        if (footerConfig.text) {
          doc.text(footerConfig.text, margin, pageHeight - 12);
        }
        
        const rightText = [];
        if (footerConfig.showDate) {
          rightText.push(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`);
        }
        if (footerConfig.showPageNumbers) {
          rightText.push(`Page ${i}/${totalPages}`);
        }
        
        if (rightText.length > 0) {
          doc.text(rightText.join(' | '), pageWidth - margin, pageHeight - 12, { align: 'right' });
        }
      }

      // Télécharger le PDF
      const fileName = `consultation_${getPatientName().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);
      
      onClose();
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Générer un rapport de consultation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sections à inclure */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Sections à inclure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {REPORT_SECTIONS.map(section => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Label htmlFor={section.id} className="flex items-center gap-2 cursor-pointer">
                      <section.icon className="w-4 h-4 text-slate-500" />
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSections(REPORT_SECTIONS.map(s => s.id))}
                >
                  Tout sélectionner
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSections([])}
                >
                  Tout désélectionner
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Configuration en-tête */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                En-tête du document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cabinetName">Nom du cabinet</Label>
                  <Input
                    id="cabinetName"
                    value={headerConfig.cabinetName}
                    onChange={(e) => setHeaderConfig({...headerConfig, cabinetName: e.target.value})}
                    placeholder="Cabinet médical Dr..."
                  />
                </div>
                <div>
                  <Label htmlFor="inami">N° INAMI</Label>
                  <Input
                    id="inami"
                    value={headerConfig.inami}
                    onChange={(e) => setHeaderConfig({...headerConfig, inami: e.target.value})}
                    placeholder="1-XXXXX-XX-XXX"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={headerConfig.address}
                  onChange={(e) => setHeaderConfig({...headerConfig, address: e.target.value})}
                  placeholder="Rue, numéro, code postal, ville"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={headerConfig.phone}
                    onChange={(e) => setHeaderConfig({...headerConfig, phone: e.target.value})}
                    placeholder="+32 ..."
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={headerConfig.email}
                    onChange={(e) => setHeaderConfig({...headerConfig, email: e.target.value})}
                    placeholder="contact@cabinet.be"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration pied de page */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pied de page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="footerText">Texte du pied de page</Label>
                <Input
                  id="footerText"
                  value={footerConfig.text}
                  onChange={(e) => setFooterConfig({...footerConfig, text: e.target.value})}
                  placeholder="Document confidentiel..."
                />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDate"
                    checked={footerConfig.showDate}
                    onCheckedChange={(checked) => setFooterConfig({...footerConfig, showDate: checked})}
                  />
                  <Label htmlFor="showDate">Afficher la date de génération</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPageNumbers"
                    checked={footerConfig.showPageNumbers}
                    onCheckedChange={(checked) => setFooterConfig({...footerConfig, showPageNumbers: checked})}
                  />
                  <Label htmlFor="showPageNumbers">Afficher les numéros de page</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aperçu des données */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Aperçu des données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Patient:</strong> {getPatientName()}</p>
                <p><strong>Date:</strong> {consultation?.date_consultation 
                  ? format(new Date(consultation.date_consultation), 'dd/MM/yyyy HH:mm') 
                  : format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSections.map(sectionId => {
                    const section = REPORT_SECTIONS.find(s => s.id === sectionId);
                    return (
                      <Badge key={sectionId} variant="secondary">
                        {section?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={isGenerating || selectedSections.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Télécharger le PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}