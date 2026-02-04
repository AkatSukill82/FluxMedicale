import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Download, 
  Printer, 
  Mail,
  Search,
  Star,
  Clock,
  CheckCircle,
  Edit,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

// Templates prédéfinis complets
const DOCUMENT_TEMPLATES = {
  certificates: [
    {
      id: 'cert_incapacite',
      name: 'Certificat d\'incapacité de travail',
      category: 'CERTIFICAT',
      fields: [
        { name: 'date_debut', label: 'Date de début', type: 'date', required: true },
        { name: 'date_fin', label: 'Date de fin', type: 'date', required: true },
        { name: 'sortie_autorisee', label: 'Sorties autorisées', type: 'select', options: ['Oui', 'Non'], required: true },
        { name: 'motif', label: 'Motif médical', type: 'select', options: ['Affection médicale', 'Accident', 'Intervention chirurgicale', 'Maladie'], required: true }
      ]
    },
    {
      id: 'cert_aptitude',
      name: 'Certificat d\'aptitude sportive',
      category: 'CERTIFICAT',
      fields: [
        { name: 'sport', label: 'Sport concerné', type: 'text', required: true },
        { name: 'niveau', label: 'Niveau de pratique', type: 'select', options: ['Loisir', 'Compétition', 'Haut niveau'], required: true },
        { name: 'validite', label: 'Durée de validité', type: 'select', options: ['1 an', '6 mois', '3 mois'], required: true },
        { name: 'restrictions', label: 'Restrictions éventuelles', type: 'textarea', required: false }
      ]
    },
    {
      id: 'cert_absence_scolaire',
      name: 'Certificat d\'absence scolaire',
      category: 'CERTIFICAT',
      fields: [
        { name: 'etablissement', label: 'Établissement scolaire', type: 'text', required: false },
        { name: 'date_debut', label: 'Date de début', type: 'date', required: true },
        { name: 'date_fin', label: 'Date de fin', type: 'date', required: true },
        { name: 'motif', label: 'Motif', type: 'select', options: ['Maladie', 'Consultation médicale', 'Hospitalisation'], required: true }
      ]
    },
    {
      id: 'cert_vaccination',
      name: 'Attestation de vaccination',
      category: 'CERTIFICAT',
      fields: [
        { name: 'vaccin', label: 'Vaccin administré', type: 'text', required: true },
        { name: 'lot', label: 'Numéro de lot', type: 'text', required: true },
        { name: 'date_vaccination', label: 'Date de vaccination', type: 'date', required: true },
        { name: 'rappel', label: 'Date du prochain rappel', type: 'date', required: false }
      ]
    }
  ],
  letters: [
    {
      id: 'lettre_specialiste',
      name: 'Lettre pour spécialiste',
      category: 'LETTRE',
      fields: [
        { name: 'specialiste', label: 'Spécialité', type: 'select', options: ['Cardiologue', 'Pneumologue', 'Gastro-entérologue', 'Neurologue', 'Dermatologue', 'ORL', 'Ophtalmologue', 'Rhumatologue', 'Endocrinologue', 'Urologue', 'Gynécologue', 'Orthopédiste', 'Psychiatre', 'Autre'], required: true },
        { name: 'nom_specialiste', label: 'Nom du spécialiste (optionnel)', type: 'text', required: false },
        { name: 'motif', label: 'Motif de la demande', type: 'textarea', required: true },
        { name: 'antecedents', label: 'Antécédents pertinents', type: 'textarea', required: true },
        { name: 'traitement', label: 'Traitement actuel', type: 'textarea', required: false },
        { name: 'examens', label: 'Examens déjà réalisés', type: 'textarea', required: false },
        { name: 'urgence', label: 'Degré d\'urgence', type: 'select', options: ['Non urgent', 'Semi-urgent (< 2 semaines)', 'Urgent (< 48h)'], required: true }
      ]
    },
    {
      id: 'lettre_hospitalisation',
      name: 'Lettre d\'hospitalisation',
      category: 'LETTRE',
      fields: [
        { name: 'hopital', label: 'Hôpital', type: 'text', required: true },
        { name: 'service', label: 'Service', type: 'text', required: true },
        { name: 'motif', label: 'Motif d\'hospitalisation', type: 'textarea', required: true },
        { name: 'histoire', label: 'Histoire de la maladie', type: 'textarea', required: true },
        { name: 'antecedents', label: 'Antécédents', type: 'textarea', required: true },
        { name: 'traitement', label: 'Traitement habituel', type: 'textarea', required: true },
        { name: 'allergies', label: 'Allergies connues', type: 'text', required: false }
      ]
    },
    {
      id: 'lettre_kine',
      name: 'Prescription kinésithérapie',
      category: 'LETTRE',
      fields: [
        { name: 'diagnostic', label: 'Diagnostic', type: 'text', required: true },
        { name: 'localisation', label: 'Localisation', type: 'text', required: true },
        { name: 'type_seances', label: 'Type de séances', type: 'select', options: ['Rééducation fonctionnelle', 'Drainage lymphatique', 'Kinésithérapie respiratoire', 'Rééducation neurologique', 'Rééducation orthopédique'], required: true },
        { name: 'nb_seances', label: 'Nombre de séances', type: 'select', options: ['9 séances', '18 séances', '60 séances'], required: true },
        { name: 'frequence', label: 'Fréquence', type: 'select', options: ['1x/semaine', '2x/semaine', '3x/semaine', '5x/semaine'], required: true },
        { name: 'remarques', label: 'Remarques', type: 'textarea', required: false }
      ]
    }
  ],
  requests: [
    {
      id: 'demande_biologie',
      name: 'Demande d\'analyses biologiques',
      category: 'DEMANDE',
      fields: [
        { name: 'analyses', label: 'Analyses demandées', type: 'textarea', required: true, placeholder: 'Ex: Hémogramme, CRP, VS, Ionogramme...' },
        { name: 'indication', label: 'Indication clinique', type: 'textarea', required: true },
        { name: 'jeun', label: 'À jeun requis', type: 'select', options: ['Oui', 'Non'], required: true },
        { name: 'urgence', label: 'Urgence', type: 'select', options: ['Non urgent', 'Sous 48h', 'Urgent'], required: true }
      ]
    },
    {
      id: 'demande_imagerie',
      name: 'Demande d\'imagerie',
      category: 'DEMANDE',
      fields: [
        { name: 'type_examen', label: 'Type d\'examen', type: 'select', options: ['Radiographie', 'Échographie', 'Scanner', 'IRM', 'Scintigraphie'], required: true },
        { name: 'zone', label: 'Zone à examiner', type: 'text', required: true },
        { name: 'indication', label: 'Indication clinique', type: 'textarea', required: true },
        { name: 'question', label: 'Question clinique', type: 'textarea', required: true },
        { name: 'urgence', label: 'Urgence', type: 'select', options: ['Non urgent', 'Semi-urgent', 'Urgent'], required: true },
        { name: 'contre_indications', label: 'Contre-indications connues', type: 'textarea', required: false }
      ]
    },
    {
      id: 'demande_ecg',
      name: 'Demande d\'ECG',
      category: 'DEMANDE',
      fields: [
        { name: 'indication', label: 'Indication', type: 'textarea', required: true },
        { name: 'symptomes', label: 'Symptômes', type: 'textarea', required: true },
        { name: 'antecedents_cardio', label: 'Antécédents cardiologiques', type: 'textarea', required: false },
        { name: 'traitement_cardio', label: 'Traitement cardiologique actuel', type: 'textarea', required: false }
      ]
    }
  ]
};

export default function MedicalDocumentGenerator({ isOpen, onClose, patient }) {
  const [activeTab, setActiveTab] = useState('certificates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      // Pré-remplir avec les données du patient
      const initial = {};
      selectedTemplate.fields.forEach(field => {
        if (field.name === 'allergies' && patient?.allergies) {
          initial.allergies = patient.allergies;
        }
      });
      setFormData(initial);
    }
  }, [selectedTemplate, patient]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const getPatientName = () => {
    if (!patient?.name?.[0]) return 'Patient';
    const name = patient.name[0];
    return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim();
  };

  const getPatientNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const generatePDF = async () => {
    if (!selectedTemplate) return;

    // Valider les champs requis
    const missingFields = selectedTemplate.fields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast.error(`Champs requis manquants: ${missingFields.join(', ')}`);
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // En-tête médecin
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(currentUser?.full_name || 'Dr.', 20, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Médecin généraliste', 20, y);
      y += 5;
      if (currentUser?.numero_inami) {
        doc.text(`INAMI: ${currentUser.numero_inami}`, 20, y);
        y += 5;
      }
      if (currentUser?.adresse_cabinet) {
        doc.text(currentUser.adresse_cabinet, 20, y);
        y += 5;
      }
      if (currentUser?.telephone_cabinet) {
        doc.text(`Tél: ${currentUser.telephone_cabinet}`, 20, y);
        y += 5;
      }

      // Date
      doc.text(`Date: ${formatDate(new Date())}`, pageWidth - 60, 20);

      // Ligne de séparation
      y += 5;
      doc.setDrawColor(0);
      doc.line(20, y, pageWidth - 20, y);
      y += 15;

      // Titre du document
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedTemplate.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Informations patient
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Concernant:', 20, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text(getPatientName(), 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      if (patient?.birthDate) {
        doc.text(`Né(e) le: ${formatDate(patient.birthDate)}`, 20, y);
        y += 5;
      }
      const niss = getPatientNISS();
      if (niss) {
        doc.text(`NISS: ${niss.replace(/(\d{2})(\d{2})(\d{2})(\d{3})(\d{2})/, '$1.$2.$3-$4.$5')}`, 20, y);
        y += 5;
      }
      
      y += 10;

      // Contenu basé sur le template
      doc.setFontSize(11);
      
      selectedTemplate.fields.forEach(field => {
        if (formData[field.name]) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${field.label}:`, 20, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          
          const value = formData[field.name];
          if (field.type === 'date') {
            doc.text(formatDate(value), 25, y);
          } else if (field.type === 'textarea') {
            const lines = doc.splitTextToSize(value, pageWidth - 50);
            lines.forEach(line => {
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
              doc.text(line, 25, y);
              y += 5;
            });
          } else {
            doc.text(value, 25, y);
          }
          y += 8;
        }
      });

      // Signature
      y += 20;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.text('Fait pour servir et valoir ce que de droit.', 20, y);
      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.text(currentUser?.full_name || 'Dr.', pageWidth - 70, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Signature et cachet', pageWidth - 70, y);

      // Télécharger
      const fileName = `${selectedTemplate.id}_${getPatientName().replace(/\s/g, '_')}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast.success('Document généré avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const printDocument = () => {
    generatePDF();
    // Le PDF sera ouvert et l'utilisateur pourra imprimer
  };

  const allTemplates = [
    ...DOCUMENT_TEMPLATES.certificates,
    ...DOCUMENT_TEMPLATES.letters,
    ...DOCUMENT_TEMPLATES.requests
  ];

  const filteredTemplates = searchTerm
    ? allTemplates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  const getTemplatesByTab = () => {
    switch (activeTab) {
      case 'certificates': return DOCUMENT_TEMPLATES.certificates;
      case 'letters': return DOCUMENT_TEMPLATES.letters;
      case 'requests': return DOCUMENT_TEMPLATES.requests;
      default: return [];
    }
  };

  const displayTemplates = filteredTemplates || getTemplatesByTab();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6 text-blue-600" />
            Générateur de Documents Médicaux
          </DialogTitle>
          {patient && (
            <p className="text-sm text-slate-600">
              Patient: <strong>{getPatientName()}</strong>
            </p>
          )}
        </DialogHeader>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Liste des templates */}
          <div className="w-1/3 border-r">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {!searchTerm && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="px-2 pt-2">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="certificates" className="text-xs">Certificats</TabsTrigger>
                  <TabsTrigger value="letters" className="text-xs">Lettres</TabsTrigger>
                  <TabsTrigger value="requests" className="text-xs">Demandes</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <ScrollArea className="h-[calc(100%-120px)]">
              <div className="p-2 space-y-1">
                {displayTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-100 border-blue-300 border'
                        : 'hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <p className="font-medium text-sm">{template.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {template.fields.length} champs
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Formulaire */}
          <div className="flex-1 flex flex-col">
            {selectedTemplate ? (
              <>
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                      <Badge>{selectedTemplate.category}</Badge>
                    </div>

                    {selectedTemplate.fields.map(field => (
                      <div key={field.name} className="space-y-2">
                        <Label className={field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}>
                          {field.label}
                        </Label>
                        
                        {field.type === 'text' && (
                          <Input
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                            placeholder={field.placeholder}
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <Textarea
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                            placeholder={field.placeholder}
                            className="min-h-[100px]"
                          />
                        )}
                        
                        {field.type === 'date' && (
                          <Input
                            type="date"
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                          />
                        )}
                        
                        {field.type === 'select' && (
                          <Select
                            value={formData[field.name] || ''}
                            onValueChange={(value) => setFormData({...formData, [field.name]: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setFormData({})}>
                    Effacer
                  </Button>
                  <Button variant="outline" onClick={printDocument}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button 
                    onClick={generatePDF} 
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Génération...' : 'Télécharger PDF'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-6">
                <div>
                  <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">
                    Sélectionnez un modèle de document à gauche
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}