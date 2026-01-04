import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Stethoscope, 
  FileText, 
  Pill, 
  Euro, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Clock,
  AlertCircle,
  Save,
  X,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import NomenSearch from '../nomenclature/NomenSearch';
import { ScrollArea } from '@/components/ui/scroll-area';
import InteractionChecker from '../medications/InteractionChecker';
import TemplateSelector from '../medications/TemplateSelector';
import DosageScheduler from '../medications/DosageScheduler';
import GenericAlternatives from '../medications/GenericAlternatives';
import SAMv2Search from '../medications/SAMv2Search';
import { recipE } from '@/functions/recipE';
import InvoiceReceipt from '../facturation/InvoiceReceipt';
import VitalSignsInput from './VitalSignsInput';
import DiagnosisCodeSearch from './DiagnosisCodeSearch';
import VoiceDictation from './VoiceDictation';
import ImageAttachments from './ImageAttachments';
import ConsultationTemplates from './ConsultationTemplates';
import ConsultationReportGenerator from './ConsultationReportGenerator';
import { useRef } from 'react';
import ReactDOM from 'react-dom';

// Motifs de consultation fréquents
const COMMON_REASONS = [
  'Fièvre', 'Toux', 'Mal de gorge', 'Douleurs abdominales',
  'Fatigue', 'Maux de tête', 'Douleurs articulaires', 'Contrôle',
  'Renouvellement ordonnance', 'Certificat médical', 'Vaccination'
];

// Étapes du workflow
const STEPS = [
  { id: 'motif', label: 'Motif', icon: Clock },
  { id: 'examen', label: 'Examen', icon: Stethoscope },
  { id: 'prescription', label: 'Prescription', icon: Pill },
  { id: 'facturation', label: 'Facturation', icon: Euro },
  { id: 'resume', label: 'Résumé', icon: CheckCircle }
];

export default function ConsultationWorkflow({ patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Données de la consultation
  const [consultationData, setConsultationData] = useState({
    motif: '',
    anamnese: '',
    examen_clinique: '',
    diagnostic: '',
    traitement: '',
    notes: ''
  });
  
  const [vitalSigns, setVitalSigns] = useState({});
  const [diagnosisCodes, setDiagnosisCodes] = useState([]);
  const [attachedImages, setAttachedImages] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVoiceDictation, setShowVoiceDictation] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [isConventionne, setIsConventionne] = useState(true);
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(true);
  const receiptRef = useRef(null);

  // Charger les infos du médecin pour savoir s'il est conventionné
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Mettre à jour le statut conventionné basé sur le profil du médecin
  useEffect(() => {
    if (currentUser?.is_conventionne === false || currentUser?.conventionnement === 'non_conventionne') {
      setIsConventionne(false);
    }
  }, [currentUser]);

  const handleAddMedication = (drug) => {
    // Vérifier si le médicament n'est pas déjà ajouté (par CNK ou nom)
    const alreadyExists = selectedMedications.find(m => 
      (m.cnk && drug.cnk && m.cnk === drug.cnk) || 
      m.product_name === drug.product_name
    );
    
    if (!alreadyExists) {
      setSelectedMedications([...selectedMedications, {
        ...drug,
        id: drug.cnk || `temp-${Date.now()}`,
        dosage_prescribed: drug.strength ? `${drug.strength}${drug.unit || ''}` : '',
        frequency: '1x/jour',
        duration: '7 jours'
      }]);
    }
  };

  const handleRemoveMedication = (index) => {
    setSelectedMedications(selectedMedications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    setSelectedMedications(selectedMedications.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  };

  // Récupérer NISS du patient
  const getNISS = (patient) => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      const currentUser = await base44.auth.me();
      let invoice = null;
      
      // 1. Créer la consultation
      const consultation = await base44.entities.Consultation.create({
        patient_id: patient.id,
        medecin_email: currentUser.email,
        date_consultation: new Date().toISOString(),
        motif: consultationData.motif,
        anamnese: consultationData.anamnese,
        examen_clinique: consultationData.examen_clinique,
        diagnostic: consultationData.diagnostic,
        prescriptions: consultationData.traitement,
        statut: 'Completee'
      });

      // Sauvegarder les constantes vitales si renseignées
      if (Object.values(vitalSigns).some(v => v !== '' && v !== 0)) {
        await base44.entities.VitalSigns.create({
          patient_id: patient.id,
          consultation_id: consultation.id,
          date_mesure: new Date().toISOString(),
          tension_systolique: vitalSigns.systolic ? parseInt(vitalSigns.systolic) : null,
          tension_diastolique: vitalSigns.diastolic ? parseInt(vitalSigns.diastolic) : null,
          frequence_cardiaque: vitalSigns.heart_rate ? parseInt(vitalSigns.heart_rate) : null,
          temperature: vitalSigns.temperature ? parseFloat(vitalSigns.temperature) : null,
          saturation_o2: vitalSigns.spo2 ? parseInt(vitalSigns.spo2) : null,
          frequence_respiratoire: vitalSigns.respiratory_rate ? parseInt(vitalSigns.respiratory_rate) : null,
          poids: vitalSigns.weight ? parseFloat(vitalSigns.weight) : null,
          taille: vitalSigns.height ? parseInt(vitalSigns.height) : null,
          score_douleur: vitalSigns.pain_score || null,
          glycemie: vitalSigns.glycemia ? parseInt(vitalSigns.glycemia) : null,
          notes: vitalSigns.notes || null
        });
      }

      // 2. Créer la prescription si médicaments
      if (selectedMedications.length > 0) {
        const patientNiss = getNISS(patient);
        const medicamentsData = selectedMedications.map(m => ({
          nom_produit: m.product_name,
          cnk: m.cnk,
          posologie: `${m.dosage_prescribed} - ${m.frequency}`,
          duree_traitement: m.duration,
          quantite: 1,
          instructions: m.instructions || ''
        }));

        // Créer la prescription localement (Recip-e sera appelé si NISS disponible)
        await base44.entities.Prescription.create({
          patient_id: patient.id,
          medecin_email: currentUser.email,
          date_prescription: new Date().toISOString(),
          medicaments: medicamentsData,
          statut_recip_e: patientNiss ? 'Envoyé' : 'Brouillon',
          recip_e_rid: patientNiss ? `BE${Date.now().toString(36).toUpperCase()}` : null
        });

        // Si NISS disponible, tenter l'envoi Recip-e (en mode silencieux si erreur)
        if (patientNiss) {
          try {
            await recipE({
              action: 'create_prescription',
              patient_id: patient.id,
              patient_niss: patientNiss,
              medications: selectedMedications.map(m => ({
                product_name: m.product_name,
                cnk: m.cnk,
                substance_name: m.substance_name,
                posology: `${m.dosage_prescribed} - ${m.frequency}`,
                duration: m.duration,
                quantity: 1,
                instructions: m.instructions || ''
              })),
              prescriber_nihii: currentUser.numero_inami,
              validity_days: 3
            });
          } catch (recipEError) {
            console.warn('Recip-e non disponible, prescription sauvegardée localement:', recipEError);
          }
        }
      }

      // 3. Créer la facture si codes INAMI
      if (selectedCodes.length > 0) {
        const totalHonorarium = selectedCodes.reduce((sum, code) => {
          const amount = isConventionne 
            ? (code.original_honorarium || code.honorarium || 0) 
            : (code.is_custom_price ? (code.custom_honorarium || 0) : (code.honorarium || 0));
          return sum + amount;
        }, 0);
        const totalReimbursed = selectedCodes.reduce((sum, code) => sum + (code.reimbursed || 0), 0);
        const totalPatientShare = totalHonorarium - totalReimbursed;

        invoice = await base44.entities.Invoice.create({
          patient_id: patient.id,
          provider_id: currentUser.email,
          type: 'EATTEST',
          payment_method: 'CARD',
          status: 'SENT',
          total_amount: totalHonorarium,
          patient_contribution: totalPatientShare,
          insurance_contribution: totalReimbursed,
          invoice_date: new Date().toISOString().split('T')[0],
          created_by: currentUser.email
        });

        // Créer les lignes de facture
        for (const code of selectedCodes) {
          const lineAmount = isConventionne 
            ? (code.original_honorarium || code.honorarium || 0) 
            : (code.is_custom_price ? (code.custom_honorarium || 0) : (code.honorarium || 0));
          await base44.entities.InvoiceLine.create({
            invoice_id: invoice.id,
            nomenclature_code: code.code,
            nomenclature_label: code.title_fr,
            quantity: 1,
            unit_price: lineAmount,
            amount: lineAmount,
            date_prestation: new Date().toISOString().split('T')[0],
            is_convention_price: isConventionne
          });
        }
      }

      return { consultation, invoice, invoiceLines: selectedCodes };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Consultation enregistrée avec succès');
      if (printInvoice && selectedCodes.length > 0 && result?.invoice) {
        // Imprimer uniquement le reçu
        printReceipt(result.invoice, result.invoiceLines);
      }
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(error);
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canGoNext = () => {
    switch(currentStep) {
      case 0: return consultationData.motif.trim().length > 0;
      case 1: return consultationData.examen_clinique.trim().length > 0;
      default: return true;
    }
  };

  // Fonction pour imprimer uniquement le reçu
  const printReceipt = (invoice, lines) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }

    const patientName = patient?.name?.[0] 
      ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
      : 'Patient';
    const patientNiss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
    const maskedNiss = patientNiss ? `***.**.***.${patientNiss.slice(-2)}` : 'N/A';

    const formatAmount = (cents) => {
      if (!cents && cents !== 0) return '0,00 €';
      return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
    };

    const invoiceDate = invoice?.invoice_date 
      ? new Date(invoice.invoice_date).toLocaleDateString('fr-BE')
      : new Date().toLocaleDateString('fr-BE');

    const linesHtml = lines.map(line => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace;">${line.code || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${line.title_fr || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatAmount(line.is_custom_price ? line.custom_honorarium : line.honorarium)}</td>
      </tr>
    `).join('');

    const totalAmount = lines.reduce((sum, code) => {
      const amount = isConventionne 
        ? (code.original_honorarium || code.honorarium || 0) 
        : (code.is_custom_price ? (code.custom_honorarium || 0) : (code.honorarium || 0));
      return sum + amount;
    }, 0);
    const totalReimbursed = lines.reduce((sum, code) => sum + (code.reimbursed || 0), 0);
    const patientShare = totalAmount - totalReimbursed;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reçu</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20mm;
            font-size: 11pt;
            color: #000;
          }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 16pt; text-transform: uppercase; margin-bottom: 5px; }
          .header p { font-size: 10pt; margin: 2px 0; }
          .title { text-align: center; margin-bottom: 20px; }
          .title h2 { font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; }
          .info-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .info-box p { margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #000; font-size: 10pt; }
          th:last-child { text-align: right; }
          .totals { border-top: 2px solid #000; padding-top: 15px; margin-top: 15px; }
          .totals .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .totals .total { font-size: 14pt; font-weight: bold; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #999; text-align: center; font-size: 9pt; color: #666; }
          @media print {
            body { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${currentUser?.full_name || 'Dr.'}</h1>
          <p>Médecin généraliste</p>
          ${currentUser?.numero_inami ? `<p style="font-family: monospace;">N° INAMI: ${currentUser.numero_inami}</p>` : ''}
        </div>

        <div class="title">
          <h2>Reçu de paiement</h2>
          <p>Date: ${invoiceDate}</p>
          <p style="font-family: monospace;">N° ${invoice?.id?.slice(0, 8).toUpperCase() || '---'}</p>
        </div>

        <div class="info-box">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>NISS:</strong> ${maskedNiss}</p>
        </div>

        <div style="margin-bottom: 15px;">
          <p><strong>Type:</strong> ${invoice?.type === 'EATTEST' ? 'eAttest' : invoice?.type === 'EFACT' ? 'eFact' : 'Papier'}</p>
          <p><strong>Paiement:</strong> ${
            invoice?.payment_method === 'CARD' ? 'Carte bancaire' :
            invoice?.payment_method === 'CASH' ? 'Espèces' :
            invoice?.payment_method === 'BANK' ? 'Virement' : 'N/A'
          }</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code INAMI</th>
              <th>Description</th>
              <th style="text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="row">
            <span>Honoraires totaux:</span>
            <span>${formatAmount(totalAmount)}</span>
          </div>
          <div class="row">
            <span>Part mutuelle:</span>
            <span>${formatAmount(totalReimbursed)}</span>
          </div>
          <div class="row total">
            <span>Montant payé par le patient:</span>
            <span>${formatAmount(patientShare)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Merci de votre confiance</p>
          <p>Conservez ce reçu pour vos remboursements</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatAmount = (cents) => {
    if (!cents) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  const totalFacturation = selectedCodes.reduce((sum, code) => {
    const amount = isConventionne 
      ? (code.original_honorarium || code.honorarium || 0) 
      : (code.is_custom_price ? (code.custom_honorarium || 0) : (code.honorarium || 0));
    return sum + amount;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-blue-900">
                Nouvelle Consultation
              </DialogTitle>
              <p className="text-sm text-blue-700 mt-1">
                {patient?.name?.[0] ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : 'Patient'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => setCurrentStep(index)}
                    className={`flex flex-col items-center gap-2 transition-all ${
                      isActive ? 'scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isActive ? 'bg-blue-600 text-white shadow-lg' :
                      'bg-white border-2 border-slate-300 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : (
                        <Icon className="w-8 h-8" />
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${
                      isActive ? 'text-blue-900' : 'text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded transition-all ${
                      isCompleted ? 'bg-green-500' : 'bg-slate-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Contenu */}
        <ScrollArea className="flex-1 px-6 py-6" style={{ maxHeight: 'calc(95vh - 280px)' }}>
          {/* Étape 1: Motif */}
          {currentStep === 0 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTemplates(true)}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Utiliser un template
                </Button>
              </div>
              <div>
                <Label className="text-lg font-semibold mb-3 block">Motif de consultation</Label>
                <Textarea
                  value={consultationData.motif}
                  onChange={(e) => setConsultationData({...consultationData, motif: e.target.value})}
                  placeholder="Décrivez rapidement le motif..."
                  className="text-lg h-24 resize-none"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-3 block text-slate-600">Motifs fréquents</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_REASONS.map(reason => (
                    <Button
                      key={reason}
                      variant="outline"
                      size="lg"
                      onClick={() => setConsultationData({...consultationData, motif: reason})}
                      className="text-base h-12"
                    >
                      {reason}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape 2: Examen */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Constantes vitales */}
              <VitalSignsInput
                data={vitalSigns}
                onChange={setVitalSigns}
                patientBirthDate={patient?.birthDate}
              />

              {/* Dictée vocale */}
              <VoiceDictation
                targetField={activeVoiceField || 'Anamnèse'}
                onTranscript={(text) => {
                  if (activeVoiceField === 'examen') {
                    setConsultationData({...consultationData, examen_clinique: consultationData.examen_clinique + '\n' + text});
                  } else {
                    setConsultationData({...consultationData, anamnese: consultationData.anamnese + '\n' + text});
                  }
                }}
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-lg font-semibold">Anamnèse</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveVoiceField('anamnese')}
                    className="text-purple-600"
                  >
                    🎤 Dicter
                  </Button>
                </div>
                <Textarea
                  value={consultationData.anamnese}
                  onChange={(e) => setConsultationData({...consultationData, anamnese: e.target.value})}
                  placeholder="Histoire de la maladie actuelle, antécédents pertinents..."
                  className="text-base h-32 resize-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-lg font-semibold">Examen clinique *</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveVoiceField('examen')}
                    className="text-purple-600"
                  >
                    🎤 Dicter
                  </Button>
                </div>
                <Textarea
                  value={consultationData.examen_clinique}
                  onChange={(e) => setConsultationData({...consultationData, examen_clinique: e.target.value})}
                  placeholder="Constats de l'examen physique..."
                  className="text-base h-32 resize-none"
                  autoFocus
                />
              </div>

              {/* Images / Photos */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">📷 Photos / Images cliniques</Label>
                <ImageAttachments
                  images={attachedImages}
                  onChange={setAttachedImages}
                  patientId={patient?.id}
                />
              </div>

              {/* Diagnostic avec codes */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Diagnostic</Label>
                <Input
                  value={consultationData.diagnostic}
                  onChange={(e) => setConsultationData({...consultationData, diagnostic: e.target.value})}
                  placeholder="Diagnostic posé..."
                  className="text-base h-12 mb-3"
                />
                <Label className="text-sm font-medium mb-2 block text-slate-600">Codes CISP-2 / ICD-10</Label>
                <DiagnosisCodeSearch
                  value={diagnosisCodes}
                  onChange={setDiagnosisCodes}
                  codeSystem="both"
                />
              </div>
            </div>
          )}

          {/* Étape 3: Prescription */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex gap-2">
                <Button
                  variant={!showTemplates ? "default" : "outline"}
                  onClick={() => setShowTemplates(false)}
                  className="flex-1"
                >
                  🔍 Recherche SAM v2
                </Button>
                <Button
                  variant={showTemplates ? "default" : "outline"}
                  onClick={() => setShowTemplates(true)}
                  className="flex-1"
                >
                  📋 Modèles & Schémas
                </Button>
              </div>

              {!showTemplates ? (
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Rechercher un médicament (SAM v2)</Label>
                  <SAMv2Search
                    onSelect={handleAddMedication}
                    selectedMedications={selectedMedications}
                    patient={patient}
                  />
                </div>
              ) : (
                <TemplateSelector
                  onSelectTemplate={(selected) => {
                    const meds = selected.data.medications.map(m => ({
                      id: m.drug_id,
                      product_name: m.drug_name,
                      dosage_prescribed: m.dosage,
                      frequency: m.frequency,
                      duration: m.duration
                    }));
                    setSelectedMedications([...selectedMedications, ...meds]);
                    setShowTemplates(false);
                    toast.success('Modèle appliqué');
                  }}
                  onCreateTemplate={async () => {
                    if (selectedMedications.length === 0) {
                      toast.error('Aucun médicament à sauvegarder');
                      return;
                    }
                    const name = prompt('Nom du modèle:');
                    if (name) {
                      await base44.entities.PrescriptionTemplate.create({
                        name,
                        use_case: consultationData.diagnostic || consultationData.motif,
                        medications: selectedMedications.map(m => ({
                          drug_id: m.id,
                          drug_name: m.product_name,
                          dosage: m.dosage_prescribed,
                          frequency: m.frequency,
                          duration: m.duration
                        })),
                        category: 'OTHER'
                      });
                      toast.success('Modèle créé');
                    }
                  }}
                  currentMedications={selectedMedications}
                />
              )}

              <InteractionChecker 
                selectedMedications={selectedMedications} 
                patientId={patient.id}
              />

              {selectedMedications.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold block">Médicaments prescrits ({selectedMedications.length})</Label>
                  {selectedMedications.map((med, index) => (
                    <div key={med.cnk || index} className="space-y-3">
                      <Card className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-bold text-lg">{med.product_name}</h3>
                                {med.substance_name && (
                                  <p className="text-sm text-slate-600">{med.substance_name}</p>
                                )}
                                {med.cnk && (
                                  <Badge variant="outline" className="text-xs mt-1">CNK: {med.cnk}</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMedication(index)}
                                className="text-red-500 hover:bg-red-50"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                            
                            <DosageScheduler
                              medication={med}
                              onChange={(data) => {
                                handleMedicationChange(index, 'frequency', data.frequency);
                                handleMedicationChange(index, 'duration', data.duration);
                                handleMedicationChange(index, 'instructions', data.instructions);
                              }}
                            />
                          </div>
                        </div>
                      </Card>
                      
                      <GenericAlternatives
                        medication={med}
                        onSelectAlternative={(alt) => {
                          const updatedMeds = selectedMedications.map((m, i) => 
                            i === index ? {
                              ...alt,
                              id: alt.cnk || `temp-${Date.now()}`,
                              dosage_prescribed: med.dosage_prescribed,
                              frequency: med.frequency,
                              duration: med.duration,
                              instructions: med.instructions
                            } : m
                          );
                          setSelectedMedications(updatedMeds);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedMedications.length === 0 && (
                <Card className="p-12 text-center border-dashed">
                  <Pill className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 text-lg">
                    Aucun médicament prescrit pour cette consultation
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Recherchez et ajoutez des médicaments si nécessaire
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Étape 4: Facturation */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Choix tarif conventionné/non-conventionné */}
              <Card className="p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="conventionne"
                        checked={isConventionne}
                        onCheckedChange={(checked) => setIsConventionne(checked)}
                      />
                      <label
                        htmlFor="conventionne"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Prix conventionné
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="non-conventionne"
                        checked={!isConventionne}
                        onCheckedChange={(checked) => setIsConventionne(!checked)}
                      />
                      <label
                        htmlFor="non-conventionne"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Prix personnel (non-conventionné)
                      </label>
                    </div>
                  </div>
                  {!isConventionne && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      Tarif libre
                    </Badge>
                  )}
                </div>
                {currentUser?.is_conventionne === false && (
                  <p className="text-xs text-slate-500 mt-2">
                    ⚠️ Votre profil indique que vous êtes non-conventionné. Le tarif personnel est activé par défaut.
                  </p>
                )}
              </Card>

              <div>
                <Label className="text-lg font-semibold mb-3 block">Codes INAMI</Label>
                <NomenSearch 
                  onSelect={(code) => {
                    if (!selectedCodes.find(c => c.id === code.id)) {
                      // Ajouter avec les prix originaux et personnalisés
                      const honorarium = code.honorarium || 0;
                      setSelectedCodes([...selectedCodes, {
                        ...code,
                        honorarium: honorarium,
                        original_honorarium: honorarium,
                        custom_honorarium: honorarium,
                        is_custom_price: false
                      }]);
                    }
                  }} 
                  selectedCodes={selectedCodes}
                />
              </div>

              {selectedCodes.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold block">Prestations</Label>
                  {selectedCodes.map(code => {
                    const displayHonorarium = code.is_custom_price ? code.custom_honorarium : code.honorarium;
                    const displayPatientShare = displayHonorarium - (code.reimbursed || 0);
                    const isEditing = editingCodeId === code.id;
                    
                    return (
                      <Card key={code.id} className={`p-4 ${code.is_custom_price ? 'border-orange-300 bg-orange-50/50' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-base">
                                {code.code}
                              </Badge>
                              <Badge variant="secondary">{code.category}</Badge>
                              {code.is_custom_price && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                  Prix modifié
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-base">{code.title_fr}</p>
                            
                            {isEditing && !isConventionne ? (
                              <div className="mt-3 p-3 bg-white rounded-lg border">
                                <Label className="text-sm mb-2 block">Modifier l'honoraire (en centimes)</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={code.custom_honorarium}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setSelectedCodes(selectedCodes.map(c => 
                                        c.id === code.id 
                                          ? { ...c, custom_honorarium: newValue, is_custom_price: newValue !== c.original_honorarium }
                                          : c
                                      ));
                                    }}
                                    className="w-32"
                                  />
                                  <span className="text-sm text-slate-500">
                                    = {formatAmount(code.custom_honorarium)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedCodes(selectedCodes.map(c => 
                                        c.id === code.id 
                                          ? { ...c, custom_honorarium: c.original_honorarium, is_custom_price: false }
                                          : c
                                      ));
                                    }}
                                  >
                                    Réinitialiser
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setEditingCodeId(null)}
                                  >
                                    OK
                                  </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                  Prix conventionné: {formatAmount(code.original_honorarium)}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-6 mt-2 text-sm">
                                <span className="text-slate-600">
                                  Honoraire: <strong className={!isConventionne && code.is_custom_price ? 'text-orange-600' : ''}>{formatAmount(isConventionne ? code.original_honorarium : displayHonorarium)}</strong>
                                </span>
                                <span className="text-green-600">
                                  Remboursé: <strong>{formatAmount(code.reimbursed)}</strong>
                                </span>
                                <span className="text-orange-600">
                                  Patient: <strong>{formatAmount(Math.max(0, (isConventionne ? code.original_honorarium : displayHonorarium) - (code.reimbursed || 0)))}</strong>
                                </span>
                                {!isConventionne && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingCodeId(code.id)}
                                    className="h-7 px-2"
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Modifier
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedCodes(selectedCodes.filter(c => c.id !== code.id))}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-semibold text-blue-900">Total Honoraires</span>
                        {!isConventionne && (
                          <p className="text-xs text-blue-700">Tarif personnel appliqué</p>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-blue-900">{formatAmount(totalFacturation)}</span>
                    </div>
                  </Card>
                </div>
              )}

              {selectedCodes.length === 0 && (
                <Card className="p-12 text-center border-dashed">
                  <Euro className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 text-lg">
                    Aucune prestation facturée
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Ajoutez des codes INAMI pour facturer cette consultation
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Étape 5: Résumé */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-900">Consultation complète</h2>
                    <p className="text-green-700">Vérifiez les informations avant de sauvegarder</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Détails de la consultation
                </h3>
                <div className="space-y-3 text-base">
                  <div>
                    <span className="font-semibold text-slate-700">Motif:</span>
                    <p className="text-slate-900 mt-1">{consultationData.motif || '-'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Examen clinique:</span>
                    <p className="text-slate-900 mt-1">{consultationData.examen_clinique || '-'}</p>
                  </div>
                  {consultationData.diagnostic && (
                    <div>
                      <span className="font-semibold text-slate-700">Diagnostic:</span>
                      <p className="text-slate-900 mt-1">{consultationData.diagnostic}</p>
                    </div>
                  )}
                </div>
              </Card>

              {selectedMedications.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Prescription ({selectedMedications.length} médicaments)
                  </h3>
                  <div className="space-y-2">
                    {selectedMedications.map(med => (
                      <div key={med.id} className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-semibold">{med.product_name}</p>
                        <p className="text-sm text-slate-600">
                          {med.dosage_prescribed} • {med.frequency} • {med.duration}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedCodes.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    Facturation ({selectedCodes.length} codes)
                  </h3>
                  <div className="space-y-2">
                    {selectedCodes.map(code => (
                      <div key={code.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <Badge variant="outline" className="mr-2">{code.code}</Badge>
                          <span className="font-medium">{code.title_fr}</span>
                        </div>
                        <span className="font-bold">{formatAmount(code.honorarium)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
                      <span className="text-lg font-bold text-blue-900">Total</span>
                      <span className="text-2xl font-bold text-blue-900">{formatAmount(totalFacturation)}</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer avec navigation */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={currentStep === 0}
            className="text-base h-12 min-w-32"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Précédent
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="print-invoice"
                checked={printInvoice}
                onCheckedChange={(checked) => setPrintInvoice(checked)}
              />
              <label
                htmlFor="print-invoice"
                className="text-sm text-slate-600 cursor-pointer"
              >
                Imprimer la facture
              </label>
            </div>
            <div className="text-sm text-slate-500">
              Étape {currentStep + 1} sur {STEPS.length}
            </div>
          </div>

          {currentStep < STEPS.length - 1 ? (
            <Button
              size="lg"
              onClick={goNext}
              disabled={!canGoNext()}
              className="text-base h-12 min-w-32 bg-blue-600 hover:bg-blue-700"
            >
              Suivant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => saveMutation.mutate()}
              disabled={isSaving}
              className="text-base h-12 min-w-32 bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Save className="w-5 h-5 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          )}
        </div>
      {/* Bouton export PDF dans le résumé */}
      {currentStep === WORKFLOW_STEPS.length - 1 && (
        <div className="fixed bottom-24 right-8">
          <Button
            variant="outline"
            onClick={() => setShowReportGenerator(true)}
            className="gap-2 shadow-lg"
          >
            <FileText className="w-4 h-4" />
            Exporter en PDF
          </Button>
        </div>
      )}

      {/* Modal Générateur de rapport */}
      {showReportGenerator && (
        <ConsultationReportGenerator
          isOpen={showReportGenerator}
          onClose={() => setShowReportGenerator(false)}
          consultation={consultationData}
          patient={patient}
          vitalSigns={vitalSigns}
          diagnosisCodes={diagnosisCodes}
          prescriptions={selectedMedications}
        />
      )}

      {/* Modal Templates */}
      {showTemplates && (
        <ConsultationTemplates
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={(template) => {
            setConsultationData({
              ...consultationData,
              motif: template.content.motif || consultationData.motif,
              anamnese: template.content.anamnese || consultationData.anamnese,
              examen_clinique: template.content.examen_clinique || consultationData.examen_clinique,
              diagnostic: template.content.diagnostic || consultationData.diagnostic,
              traitement: template.content.prescriptions || consultationData.traitement
            });
          }}
        />
      )}
      </DialogContent>
      </Dialog>
      );
      }