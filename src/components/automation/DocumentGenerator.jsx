import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Loader2, 
  Check,
  Stethoscope,
  Calendar,
  Briefcase,
  Heart,
  Baby
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  {
    id: 'certificat_medical',
    name: 'Certificat médical',
    icon: Stethoscope,
    description: 'Certificat médical standard',
    fields: ['motif', 'duree']
  },
  {
    id: 'certificat_aptitude',
    name: "Certificat d'aptitude",
    icon: Check,
    description: 'Aptitude sportive ou professionnelle',
    fields: ['type_aptitude', 'activite']
  },
  {
    id: 'arret_travail',
    name: 'Arrêt de travail',
    icon: Briefcase,
    description: 'Certificat d\'incapacité de travail',
    fields: ['date_debut', 'date_fin', 'motif']
  },
  {
    id: 'certificat_grossesse',
    name: 'Certificat de grossesse',
    icon: Baby,
    description: 'Attestation de grossesse',
    fields: ['date_terme', 'semaines']
  },
  {
    id: 'lettre_specialiste',
    name: 'Lettre au spécialiste',
    icon: Heart,
    description: 'Courrier de référence',
    fields: ['specialiste', 'motif_reference']
  },
  {
    id: 'attestation_soins',
    name: 'Attestation de soins',
    icon: Calendar,
    description: 'Attestation de consultation',
    fields: ['date_consultation']
  }
];

export default function DocumentGenerator({ patient }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({});
  const [generatedContent, setGeneratedContent] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const getPatientName = () => {
    const name = patient?.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
  };

  const getPatientNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const generateDocument = () => {
    const patientName = getPatientName();
    const patientNISS = getPatientNISS();
    const doctorName = user?.full_name || 'Dr. [Nom]';
    const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    const birthDate = patient?.birthDate ? format(new Date(patient.birthDate), 'dd/MM/yyyy') : '';

    let content = '';

    switch (selectedType.id) {
      case 'certificat_medical':
        content = `CERTIFICAT MÉDICAL

Je soussigné(e), ${doctorName}, docteur en médecine, certifie avoir examiné ce jour :

Nom : ${patientName}
Date de naissance : ${birthDate}
${patientNISS ? `NISS : ${patientNISS}` : ''}

${formData.motif ? `Motif : ${formData.motif}` : ''}

${formData.duree ? `Durée préconisée : ${formData.duree}` : ''}

Certificat établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.

Fait à _____________, le ${today}

Signature et cachet du médecin`;
        break;

      case 'certificat_aptitude':
        content = `CERTIFICAT D'APTITUDE

Je soussigné(e), ${doctorName}, docteur en médecine, certifie avoir examiné ce jour :

Nom : ${patientName}
Date de naissance : ${birthDate}

Suite à l'examen clinique réalisé ce jour, je certifie que ${patientName} est APTE à la pratique ${formData.type_aptitude === 'sportive' ? 'sportive' : 'professionnelle'} suivante :

${formData.activite || '[Activité]'}

${formData.type_aptitude === 'sportive' ? 'Ce certificat est valable pour une durée d\'un an.' : ''}

Fait à _____________, le ${today}

Signature et cachet du médecin`;
        break;

      case 'arret_travail':
        content = `CERTIFICAT D'INCAPACITÉ DE TRAVAIL

Je soussigné(e), ${doctorName}, docteur en médecine, certifie que l'état de santé de :

Nom : ${patientName}
Date de naissance : ${birthDate}
${patientNISS ? `NISS : ${patientNISS}` : ''}

nécessite un arrêt de travail :

Du : ${formData.date_debut || '[Date début]'}
Au : ${formData.date_fin || '[Date fin]'} (inclus)

${formData.motif ? `Nature de l'affection (si autorisé) : ${formData.motif}` : ''}

□ Sortie autorisée
□ Sortie non autorisée

Fait à _____________, le ${today}

Signature et cachet du médecin`;
        break;

      case 'certificat_grossesse':
        content = `CERTIFICAT DE GROSSESSE

Je soussigné(e), ${doctorName}, docteur en médecine, certifie avoir examiné ce jour :

Nom : ${patientName}
Date de naissance : ${birthDate}

Et atteste que celle-ci présente une grossesse évolutive de ${formData.semaines || '[X]'} semaines d'aménorrhée.

Date présumée du terme : ${formData.date_terme || '[Date]'}

Ce certificat est établi pour faire valoir ce que de droit.

Fait à _____________, le ${today}

Signature et cachet du médecin`;
        break;

      case 'lettre_specialiste':
        content = `LETTRE DE RÉFÉRENCE

${today}

Cher(e) Confrère/Consœur ${formData.specialiste || ''},

Je vous adresse ${patientName}, né(e) le ${birthDate}, pour avis et prise en charge concernant :

${formData.motif_reference || '[Motif de la référence]'}

Antécédents notables :
${patient?.antecedents_medicaux || 'Aucun antécédent significatif signalé'}

${patient?.allergies ? `Allergies connues : ${patient.allergies}` : ''}

${patient?.medicaments_actuels ? `Traitement actuel : ${patient.medicaments_actuels}` : ''}

Je reste à votre disposition pour tout renseignement complémentaire.

Confraternellement,

${doctorName}`;
        break;

      case 'attestation_soins':
        content = `ATTESTATION DE SOINS

Je soussigné(e), ${doctorName}, docteur en médecine, atteste avoir reçu en consultation :

Nom : ${patientName}
Date de naissance : ${birthDate}
${patientNISS ? `NISS : ${patientNISS}` : ''}

Le : ${formData.date_consultation || today}

Cette attestation est délivrée pour servir et valoir ce que de droit.

Fait à _____________, le ${today}

Signature et cachet du médecin`;
        break;

      default:
        content = 'Type de document non reconnu';
    }

    setGeneratedContent(content);
    setShowPreview(true);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType.id}_${getPatientName().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Document téléchargé');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedType?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <pre>${generatedContent}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-1">Générer un document</h3>
        <p className="text-sm text-slate-500">Sélectionnez un type de document à générer automatiquement</p>
      </div>

      {/* Document Types Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {DOCUMENT_TYPES.map(type => {
          const Icon = type.icon;
          const isSelected = selectedType?.id === type.id;
          
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => {
                setSelectedType(type);
                setFormData({});
              }}
            >
              <CardContent className="p-4 text-center">
                <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="font-medium text-sm">{type.name}</p>
                <p className="text-xs text-slate-500 mt-1">{type.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Fields */}
      {selectedType && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="font-medium">{selectedType.name}</h4>
            
            {selectedType.fields.includes('motif') && (
              <div>
                <Label>Motif</Label>
                <Input
                  value={formData.motif || ''}
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  placeholder="Motif du certificat..."
                />
              </div>
            )}

            {selectedType.fields.includes('duree') && (
              <div>
                <Label>Durée</Label>
                <Input
                  value={formData.duree || ''}
                  onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                  placeholder="Ex: 5 jours, 2 semaines..."
                />
              </div>
            )}

            {selectedType.fields.includes('type_aptitude') && (
              <div>
                <Label>Type d'aptitude</Label>
                <Select
                  value={formData.type_aptitude || ''}
                  onValueChange={(v) => setFormData({ ...formData, type_aptitude: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sportive">Sportive</SelectItem>
                    <SelectItem value="professionnelle">Professionnelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedType.fields.includes('activite') && (
              <div>
                <Label>Activité</Label>
                <Input
                  value={formData.activite || ''}
                  onChange={(e) => setFormData({ ...formData, activite: e.target.value })}
                  placeholder="Ex: Football, Natation, Travail en hauteur..."
                />
              </div>
            )}

            {selectedType.fields.includes('date_debut') && (
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.date_debut || ''}
                  onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                />
              </div>
            )}

            {selectedType.fields.includes('date_fin') && (
              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.date_fin || ''}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                />
              </div>
            )}

            {selectedType.fields.includes('date_terme') && (
              <div>
                <Label>Date présumée du terme</Label>
                <Input
                  type="date"
                  value={formData.date_terme || ''}
                  onChange={(e) => setFormData({ ...formData, date_terme: e.target.value })}
                />
              </div>
            )}

            {selectedType.fields.includes('semaines') && (
              <div>
                <Label>Semaines d'aménorrhée</Label>
                <Input
                  type="number"
                  value={formData.semaines || ''}
                  onChange={(e) => setFormData({ ...formData, semaines: e.target.value })}
                  placeholder="Ex: 12"
                />
              </div>
            )}

            {selectedType.fields.includes('specialiste') && (
              <div>
                <Label>Nom du spécialiste</Label>
                <Input
                  value={formData.specialiste || ''}
                  onChange={(e) => setFormData({ ...formData, specialiste: e.target.value })}
                  placeholder="Dr. ..."
                />
              </div>
            )}

            {selectedType.fields.includes('motif_reference') && (
              <div>
                <Label>Motif de la référence</Label>
                <Textarea
                  value={formData.motif_reference || ''}
                  onChange={(e) => setFormData({ ...formData, motif_reference: e.target.value })}
                  placeholder="Décrivez le motif de la référence..."
                  rows={4}
                />
              </div>
            )}

            {selectedType.fields.includes('date_consultation') && (
              <div>
                <Label>Date de consultation</Label>
                <Input
                  type="date"
                  value={formData.date_consultation || format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setFormData({ ...formData, date_consultation: e.target.value })}
                />
              </div>
            )}

            <Button onClick={generateDocument} className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Générer le document
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedType?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-50 p-4 rounded-lg">
              {generatedContent}
            </pre>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handlePrint} className="flex-1">
              Imprimer
            </Button>
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}