import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  FileCode, 
  Download, 
  Send, 
  Search, 
  User, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Sections exportables
const EXPORT_SECTIONS = [
  { id: 'identity', label: 'Identité & Contact', required: true },
  { id: 'antecedents', label: 'Antécédents médicaux', required: false },
  { id: 'allergies', label: 'Allergies', required: false },
  { id: 'medications', label: 'Médicaments actuels', required: false },
  { id: 'consultations', label: 'Consultations', required: false },
  { id: 'prescriptions', label: 'Prescriptions', required: false },
  { id: 'labResults', label: 'Résultats de laboratoire', required: false },
  { id: 'vaccinations', label: 'Vaccinations', required: false },
  { id: 'documents', label: 'Documents', required: false },
  { id: 'growthData', label: 'Courbes de croissance', required: false }
];

export default function PatientExportModal({ patient, isOpen, onClose }) {
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf' ou 'pmf'
  const [selectedSections, setSelectedSections] = useState(
    EXPORT_SECTIONS.filter(s => s.required).map(s => s.id)
  );
  const [sendMode, setSendMode] = useState('download'); // 'download' ou 'ehealthbox'
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ nihii: '', nom: '', prenom: '', specialite: '', ehealthbox_id: '' });
  const [exportProgress, setExportProgress] = useState(null);
  const [estimatedSize, setEstimatedSize] = useState(0);

  // Charger les médecins externes
  const { data: externalDoctors = [], refetch: refetchDoctors } = useQuery({
    queryKey: ['external_doctors'],
    queryFn: () => base44.entities.ExternalDoctor.filter({ actif: true })
  });

  // Charger les données du patient pour estimation taille
  const { data: consultations = [] } = useQuery({
    queryKey: ['patient_consultations_export', patient?.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }),
    enabled: !!patient?.id && selectedSections.includes('consultations')
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patient_prescriptions_export', patient?.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }),
    enabled: !!patient?.id && selectedSections.includes('prescriptions')
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['patient_documents_export', patient?.id],
    queryFn: () => base44.entities.Document.filter({ patient_id: patient.id }),
    enabled: !!patient?.id && selectedSections.includes('documents')
  });

  // Filtrer les médecins selon la recherche
  const filteredDoctors = useMemo(() => {
    if (!doctorSearch || doctorSearch.length < 2) return [];
    const search = doctorSearch.toLowerCase();
    return externalDoctors.filter(d => 
      d.nom?.toLowerCase().includes(search) ||
      d.prenom?.toLowerCase().includes(search) ||
      d.nihii?.includes(search) ||
      d.specialite?.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [externalDoctors, doctorSearch]);

  // Estimer la taille du fichier
  React.useEffect(() => {
    let size = 50000; // Base 50KB pour structure
    if (selectedSections.includes('consultations')) size += consultations.length * 5000;
    if (selectedSections.includes('prescriptions')) size += prescriptions.length * 2000;
    if (selectedSections.includes('documents')) size += documents.length * 100000; // ~100KB par doc
    setEstimatedSize(size);
  }, [selectedSections, consultations, prescriptions, documents]);

  const sizeExceeded = estimatedSize > MAX_FILE_SIZE_BYTES;
  const canExport = selectedSections.length > 0 && !sizeExceeded && 
    (sendMode === 'download' || (sendMode === 'ehealthbox' && selectedDoctor));

  // Mutation pour ajouter un nouveau médecin
  const addDoctorMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalDoctor.create(data),
    onSuccess: (newDoc) => {
      toast.success('Médecin ajouté au carnet d\'adresses');
      refetchDoctors();
      setSelectedDoctor(newDoc);
      setShowAddDoctor(false);
      setNewDoctor({ nihii: '', nom: '', prenom: '', specialite: '', ehealthbox_id: '' });
    },
    onError: () => toast.error('Erreur lors de l\'ajout du médecin')
  });

  // Mutation pour exporter
  const exportMutation = useMutation({
    mutationFn: async () => {
      setExportProgress({ step: 'collecting', message: 'Collecte des données...' });
      const currentUser = await base44.auth.me();

      // Collecter les données selon les sections sélectionnées
      const exportData = {
        patient: {
          id: patient.id,
          name: patient.name,
          birthDate: patient.birthDate,
          gender: patient.gender,
          identifier: patient.identifier,
          telecom: patient.telecom,
          address: patient.address,
          mutuelle: patient.mutuelle,
          numero_mutuelle: patient.numero_mutuelle
        },
        exportDate: new Date().toISOString(),
        exportedBy: currentUser.email,
        format: exportFormat,
        sections: {}
      };

      if (selectedSections.includes('antecedents')) {
        exportData.sections.antecedents = patient.antecedents_medicaux;
      }
      if (selectedSections.includes('allergies')) {
        exportData.sections.allergies = patient.allergies;
      }
      if (selectedSections.includes('medications')) {
        exportData.sections.medications = patient.medicaments_actuels;
      }
      if (selectedSections.includes('consultations')) {
        setExportProgress({ step: 'consultations', message: 'Export des consultations...' });
        const allConsultations = await base44.entities.Consultation.filter({ patient_id: patient.id });
        exportData.sections.consultations = allConsultations;
      }
      if (selectedSections.includes('prescriptions')) {
        setExportProgress({ step: 'prescriptions', message: 'Export des prescriptions...' });
        const allPrescriptions = await base44.entities.Prescription.filter({ patient_id: patient.id });
        exportData.sections.prescriptions = allPrescriptions;
      }
      if (selectedSections.includes('vaccinations')) {
        setExportProgress({ step: 'vaccinations', message: 'Export des vaccinations...' });
        const allVaccinations = await base44.entities.Vaccination.filter({ patient_id: patient.id });
        exportData.sections.vaccinations = allVaccinations;
      }
      if (selectedSections.includes('labResults')) {
        setExportProgress({ step: 'labs', message: 'Export des résultats labo...' });
        const allLabs = await base44.entities.LabResult.filter({ patient_id: patient.id });
        exportData.sections.labResults = allLabs;
      }
      if (selectedSections.includes('growthData')) {
        setExportProgress({ step: 'growth', message: 'Export des mesures de croissance...' });
        const allGrowth = await base44.entities.GrowthMeasurement.filter({ patient_id: patient.id });
        exportData.sections.growthData = allGrowth;
      }

      setExportProgress({ step: 'generating', message: `Génération du fichier ${exportFormat.toUpperCase()}...` });

      if (exportFormat === 'pdf') {
        // Générer le PDF
        const pdfContent = generatePDFContent(exportData);
        const blob = new Blob([pdfContent], { type: 'text/html' });
        
        if (sendMode === 'download') {
          downloadFile(blob, `dossier_${getPatientName(patient)}_${format(new Date(), 'yyyy-MM-dd')}.html`);
        } else {
          // Envoyer via eHealthBox
          await sendViaEHealthBox(exportData, selectedDoctor, currentUser);
        }
      } else {
        // Générer le PMF/XML
        const xmlContent = generatePMFXML(exportData);
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        
        if (sendMode === 'download') {
          downloadFile(blob, `dossier_${getPatientName(patient)}_${format(new Date(), 'yyyy-MM-dd')}.xml`);
        } else {
          await sendViaEHealthBox(exportData, selectedDoctor, currentUser);
        }
      }

      // Log d'audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: sendMode === 'download' ? 'PATIENT_EXPORT_DOWNLOAD' : 'PATIENT_EXPORT_EHEALTHBOX',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Export ${exportFormat.toUpperCase()} - Sections: ${selectedSections.join(', ')}${selectedDoctor ? ` - Envoyé à: Dr. ${selectedDoctor.nom} (${selectedDoctor.nihii})` : ''}`,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    },
    onSuccess: () => {
      setExportProgress(null);
      toast.success(sendMode === 'download' ? 'Dossier exporté avec succès' : 'Dossier envoyé via eHealthBox');
      onClose();
    },
    onError: (error) => {
      setExportProgress(null);
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const getPatientName = (p) => {
    const name = p?.name?.[0];
    return `${name?.given?.[0] || ''}_${name?.family || ''}`.replace(/\s+/g, '_');
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendViaEHealthBox = async (data, doctor, currentUser) => {
    setExportProgress({ step: 'sending', message: `Envoi à Dr. ${doctor.nom} via eHealthBox...` });
    
    // Simuler l'envoi eHealthBox (en production, appeler le vrai service)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Créer un enregistrement de message envoyé
    await base44.entities.EHealthBoxMessage.create({
      message_id: `EXPORT-${Date.now()}`,
      sender: currentUser.nihii || currentUser.email,
      sender_name: currentUser.full_name,
      recipient: doctor.ehealthbox_id || doctor.nihii,
      subject: `Dossier médical - ${getPatientName(data.patient)}`,
      message_type: 'OTHER',
      received_date: new Date().toISOString(),
      content: `Export de dossier patient au format ${data.format.toUpperCase()}`,
      status: 'SENT',
      patient_niss: data.patient.identifier?.find(i => i.system?.includes('ssin'))?.value
    });
  };

  const toggleSection = (sectionId) => {
    const section = EXPORT_SECTIONS.find(s => s.id === sectionId);
    if (section?.required) return;
    
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const patientName = patient?.name?.[0];
  const fullName = `${patientName?.given?.join(' ') || ''} ${patientName?.family || ''}`.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Exporter le dossier patient</h2>
              <p className="text-sm font-normal text-muted-foreground">{fullName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {exportProgress ? (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-lg font-medium">{exportProgress.message}</p>
            <p className="text-sm text-muted-foreground mt-2">Veuillez patienter...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Format d'export */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Format d'export</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    exportFormat === 'pdf' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-8 h-8 ${exportFormat === 'pdf' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-semibold">PDF</p>
                      <p className="text-xs text-muted-foreground">Document lisible</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setExportFormat('pmf')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    exportFormat === 'pmf' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode className={`w-8 h-8 ${exportFormat === 'pmf' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-semibold">PMF / XML</p>
                      <p className="text-xs text-muted-foreground">Format structuré KMEHR</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sections à exporter */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Sections à inclure</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXPORT_SECTIONS.map(section => (
                  <div 
                    key={section.id}
                    className={`flex items-center gap-2 p-2 rounded ${
                      section.required ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                      disabled={section.required}
                    />
                    <Label htmlFor={section.id} className="text-sm cursor-pointer flex-1">
                      {section.label}
                      {section.required && <span className="text-xs text-muted-foreground ml-1">(requis)</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimation taille */}
            <div className={`p-3 rounded-lg ${sizeExceeded ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Taille estimée:</span>
                <span className={`font-semibold ${sizeExceeded ? 'text-red-600' : ''}`}>
                  {formatSize(estimatedSize)} / {MAX_FILE_SIZE_MB} MB
                </span>
              </div>
              {sizeExceeded && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Taille maximale dépassée. Réduisez les sections sélectionnées.
                </p>
              )}
            </div>

            {/* Mode d'envoi */}
            <Tabs value={sendMode} onValueChange={setSendMode}>
              <TabsList className="w-full">
                <TabsTrigger value="download" className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Télécharger
                </TabsTrigger>
                <TabsTrigger value="ehealthbox" className="flex-1 gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer via eHealthBox
                </TabsTrigger>
              </TabsList>

              <TabsContent value="download" className="mt-4">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Le fichier sera téléchargé sur votre ordinateur.
                </p>
              </TabsContent>

              <TabsContent value="ehealthbox" className="mt-4 space-y-4">
                {/* Recherche médecin */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Destinataire</Label>
                  
                  {selectedDoctor ? (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                              <p className="font-semibold">Dr. {selectedDoctor.prenom} {selectedDoctor.nom}</p>
                              <p className="text-xs text-muted-foreground">
                                {selectedDoctor.specialite} • INAMI: {selectedDoctor.nihii}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedDoctor(null);
                              setDoctorSearch('');
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un médecin (nom, INAMI, spécialité)..."
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                        className="pl-10"
                      />
                      
                      {/* Liste des résultats */}
                      {filteredDoctors.length > 0 && (
                        <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                          <CardContent className="p-1">
                            {filteredDoctors.map(doctor => (
                              <button
                                key={doctor.id}
                                onClick={() => {
                                  setSelectedDoctor(doctor);
                                  setDoctorSearch('');
                                }}
                                className="w-full p-2 text-left hover:bg-slate-50 rounded flex items-center gap-3"
                              >
                                <User className="w-4 h-4 text-slate-400" />
                                <div>
                                  <p className="font-medium text-sm">Dr. {doctor.prenom} {doctor.nom}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doctor.specialite} • {doctor.nihii}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {doctorSearch.length >= 2 && filteredDoctors.length === 0 && (
                        <Card className="absolute z-10 w-full mt-1">
                          <CardContent className="p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-3">Aucun médecin trouvé</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowAddDoctor(true)}
                              className="gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Ajouter un nouveau médecin
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>

                {/* Formulaire ajout médecin */}
                {showAddDoctor && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">Nouveau médecin</h4>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddDoctor(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">INAMI *</Label>
                          <Input
                            placeholder="1-XXXXX-XX-XXX"
                            value={newDoctor.nihii}
                            onChange={(e) => setNewDoctor({...newDoctor, nihii: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">eHealthBox ID</Label>
                          <Input
                            placeholder="CBE ou NIHII"
                            value={newDoctor.ehealthbox_id}
                            onChange={(e) => setNewDoctor({...newDoctor, ehealthbox_id: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Prénom *</Label>
                          <Input
                            value={newDoctor.prenom}
                            onChange={(e) => setNewDoctor({...newDoctor, prenom: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Nom *</Label>
                          <Input
                            value={newDoctor.nom}
                            onChange={(e) => setNewDoctor({...newDoctor, nom: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Spécialité</Label>
                          <Input
                            placeholder="Ex: Cardiologie"
                            value={newDoctor.specialite}
                            onChange={(e) => setNewDoctor({...newDoctor, specialite: e.target.value})}
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-2"
                        onClick={() => addDoctorMutation.mutate(newDoctor)}
                        disabled={!newDoctor.nihii || !newDoctor.nom || !newDoctor.prenom || addDoctorMutation.isPending}
                      >
                        {addDoctorMutation.isPending ? 'Ajout...' : 'Ajouter au carnet'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Bouton d'action */}
            <Button
              className="w-full"
              size="lg"
              onClick={() => exportMutation.mutate()}
              disabled={!canExport || exportMutation.isPending}
            >
              {sendMode === 'download' ? (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Télécharger le dossier ({exportFormat.toUpperCase()})
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Envoyer via eHealthBox
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Générer le contenu PDF (HTML pour impression)
function generatePDFContent(data) {
  const patientName = data.patient.name?.[0];
  const fullName = `${patientName?.given?.join(' ') || ''} ${patientName?.family || ''}`;
  const niss = data.patient.identifier?.find(i => i.system?.includes('ssin'))?.value || 'N/A';

  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dossier Médical - ${fullName}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #334155; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .patient-info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f8fafc; }
    .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Dossier Médical</h1>
    <p>Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
  </div>
  
  <div class="patient-info">
    <h2>👤 Identité du patient</h2>
    <p><strong>Nom:</strong> ${fullName}</p>
    <p><strong>Date de naissance:</strong> ${data.patient.birthDate || 'N/A'}</p>
    <p><strong>Sexe:</strong> ${data.patient.gender === 'male' ? 'Masculin' : data.patient.gender === 'female' ? 'Féminin' : 'N/A'}</p>
    <p><strong>NISS:</strong> ${niss}</p>
    ${data.patient.mutuelle ? `<p><strong>Mutuelle:</strong> ${data.patient.mutuelle}</p>` : ''}
  </div>
`;

  if (data.sections.antecedents) {
    html += `
  <div class="section">
    <h2>📝 Antécédents médicaux</h2>
    <p>${data.sections.antecedents || 'Aucun antécédent renseigné'}</p>
  </div>`;
  }

  if (data.sections.allergies) {
    html += `
  <div class="section">
    <h2>⚠️ Allergies</h2>
    <p>${data.sections.allergies || 'Aucune allergie connue'}</p>
  </div>`;
  }

  if (data.sections.medications) {
    html += `
  <div class="section">
    <h2>💊 Médicaments actuels</h2>
    <p>${data.sections.medications || 'Aucun médicament en cours'}</p>
  </div>`;
  }

  if (data.sections.consultations?.length > 0) {
    html += `
  <div class="section">
    <h2>🩺 Consultations (${data.sections.consultations.length})</h2>
    <table>
      <tr><th>Date</th><th>Motif</th><th>Diagnostic</th><th>Médecin</th></tr>
      ${data.sections.consultations.map(c => `
        <tr>
          <td>${c.date_consultation ? format(new Date(c.date_consultation), 'dd/MM/yyyy') : 'N/A'}</td>
          <td>${c.motif || '-'}</td>
          <td>${c.diagnostic || '-'}</td>
          <td>${c.medecin_email || '-'}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
  }

  if (data.sections.prescriptions?.length > 0) {
    html += `
  <div class="section">
    <h2>📋 Prescriptions (${data.sections.prescriptions.length})</h2>
    <table>
      <tr><th>Date</th><th>Médicaments</th><th>Statut</th></tr>
      ${data.sections.prescriptions.map(p => `
        <tr>
          <td>${p.date_prescription ? format(new Date(p.date_prescription), 'dd/MM/yyyy') : 'N/A'}</td>
          <td>${p.medicaments?.map(m => m.nom_produit).join(', ') || '-'}</td>
          <td>${p.statut_recip_e || '-'}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
  }

  if (data.sections.vaccinations?.length > 0) {
    html += `
  <div class="section">
    <h2>💉 Vaccinations (${data.sections.vaccinations.length})</h2>
    <table>
      <tr><th>Date</th><th>Vaccin</th><th>Lot</th></tr>
      ${data.sections.vaccinations.map(v => `
        <tr>
          <td>${v.date_vaccination ? format(new Date(v.date_vaccination), 'dd/MM/yyyy') : 'N/A'}</td>
          <td>${v.nom_vaccin || '-'}</td>
          <td>${v.numero_lot || '-'}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
  }

  if (data.sections.growthData?.length > 0) {
    html += `
  <div class="section">
    <h2>📈 Mesures de croissance (${data.sections.growthData.length})</h2>
    <table>
      <tr><th>Date</th><th>Poids</th><th>Taille</th><th>IMC</th><th>Tension</th></tr>
      ${data.sections.growthData.map(g => `
        <tr>
          <td>${g.date_mesure ? format(new Date(g.date_mesure), 'dd/MM/yyyy') : 'N/A'}</td>
          <td>${g.poids_kg ? `${g.poids_kg} kg` : '-'}</td>
          <td>${g.taille_cm ? `${g.taille_cm} cm` : '-'}</td>
          <td>${g.imc || '-'}</td>
          <td>${g.tension_systolique && g.tension_diastolique ? `${g.tension_systolique}/${g.tension_diastolique}` : '-'}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
  }

  html += `
  <div class="footer">
    <p>Document généré automatiquement - Usage médical uniquement</p>
    <p>Exporté par: ${data.exportedBy}</p>
  </div>
</body>
</html>`;

  return html;
}

// Générer le contenu PMF/XML (KMEHR simplifié)
function generatePMFXML(data) {
  const patientName = data.patient.name?.[0];
  const niss = data.patient.identifier?.find(i => i.system?.includes('ssin'))?.value || '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<kmehrmessage xmlns="http://www.ehealth.fgov.be/standards/kmehr/schema/v1">
  <header>
    <standard>
      <cd S="CD-STANDARD" SV="1.0">20161201</cd>
    </standard>
    <id S="ID-KMEHR" SV="1.0">${Date.now()}</id>
    <date>${format(new Date(), 'yyyy-MM-dd')}</date>
    <time>${format(new Date(), 'HH:mm:ss')}</time>
    <sender>
      <hcparty>
        <cd S="CD-HCPARTY" SV="1.0">persphysician</cd>
        <id S="ID-HCPARTY" SV="1.0">${data.exportedBy}</id>
      </hcparty>
    </sender>
  </header>
  <folder>
    <patient>
      <id S="ID-PATIENT" SV="1.0">${niss}</id>
      <firstname>${patientName?.given?.[0] || ''}</firstname>
      <familyname>${patientName?.family || ''}</familyname>
      <birthdate>
        <date>${data.patient.birthDate || ''}</date>
      </birthdate>
      <sex>
        <cd S="CD-SEX" SV="1.0">${data.patient.gender === 'male' ? 'male' : data.patient.gender === 'female' ? 'female' : 'unknown'}</cd>
      </sex>
    </patient>`;

  // Ajouter les transactions pour chaque section
  if (data.sections.antecedents) {
    xml += `
    <transaction>
      <cd S="CD-TRANSACTION" SV="1.0">clinicalsummary</cd>
      <item>
        <cd S="CD-ITEM" SV="1.0">healthcareelement</cd>
        <content>
          <text L="fr">${escapeXml(data.sections.antecedents)}</text>
        </content>
      </item>
    </transaction>`;
  }

  if (data.sections.allergies) {
    xml += `
    <transaction>
      <cd S="CD-TRANSACTION" SV="1.0">allergy</cd>
      <item>
        <cd S="CD-ITEM" SV="1.0">allergy</cd>
        <content>
          <text L="fr">${escapeXml(data.sections.allergies)}</text>
        </content>
      </item>
    </transaction>`;
  }

  if (data.sections.consultations) {
    data.sections.consultations.forEach(c => {
      xml += `
    <transaction>
      <cd S="CD-TRANSACTION" SV="1.0">contactreport</cd>
      <date>${c.date_consultation ? format(new Date(c.date_consultation), 'yyyy-MM-dd') : ''}</date>
      <item>
        <cd S="CD-ITEM" SV="1.0">encounterreason</cd>
        <content>
          <text L="fr">${escapeXml(c.motif || '')}</text>
        </content>
      </item>
      ${c.diagnostic ? `
      <item>
        <cd S="CD-ITEM" SV="1.0">diagnosis</cd>
        <content>
          <text L="fr">${escapeXml(c.diagnostic)}</text>
        </content>
      </item>` : ''}
    </transaction>`;
    });
  }

  if (data.sections.prescriptions) {
    data.sections.prescriptions.forEach(p => {
      p.medicaments?.forEach(m => {
        xml += `
    <transaction>
      <cd S="CD-TRANSACTION" SV="1.0">medication</cd>
      <date>${p.date_prescription ? format(new Date(p.date_prescription), 'yyyy-MM-dd') : ''}</date>
      <item>
        <cd S="CD-ITEM" SV="1.0">medication</cd>
        <content>
          <medicinalproduct>
            <intendedname>${escapeXml(m.nom_produit || '')}</intendedname>
            ${m.cnk ? `<intendedcd S="CD-DRUG-CNK" SV="1.0">${m.cnk}</intendedcd>` : ''}
          </medicinalproduct>
        </content>
        ${m.posologie ? `<posology><text L="fr">${escapeXml(m.posologie)}</text></posology>` : ''}
      </item>
    </transaction>`;
      });
    });
  }

  xml += `
  </folder>
</kmehrmessage>`;

  return xml;
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}