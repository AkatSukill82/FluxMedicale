import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Sparkles,
  Loader2,
  Download,
  Copy,
  RefreshCw,
  ClipboardList,
  FileSignature,
  ScrollText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DOCUMENT_TYPES = [
  { id: 'certificat_medical', label: 'Certificat médical', icon: FileSignature },
  { id: 'attestation_soins', label: 'Attestation de soins', icon: ScrollText },
  { id: 'rapport_medical', label: 'Rapport médical', icon: ClipboardList },
  { id: 'lettre_confrere', label: 'Lettre à un confrère', icon: FileText },
  { id: 'prescription_kine', label: 'Prescription kiné', icon: FileText },
  { id: 'demande_examen', label: 'Demande d\'examen', icon: FileText }
];

export default function AIDocumentGenerator({ patients = [] }) {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Charger les données du patient sélectionné
  const { data: patientConsultations = [] } = useQuery({
    queryKey: ['patientConsultations', selectedPatient],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: selectedPatient }, '-date_consultation', 10),
    enabled: !!selectedPatient
  });

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const generateDocument = async () => {
    if (!selectedPatient || !selectedType) {
      toast.error('Veuillez sélectionner un patient et un type de document');
      return;
    }

    setIsGenerating(true);

    try {
      const currentUser = await base44.auth.me();
      const patientName = selectedPatientData ? 
        `${selectedPatientData.name?.[0]?.given?.[0] || ''} ${selectedPatientData.name?.[0]?.family || ''}`.trim() : '';
      const birthDate = selectedPatientData?.birthDate ? format(new Date(selectedPatientData.birthDate), 'dd/MM/yyyy') : '';
      const niss = selectedPatientData?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';

      // Construire le contexte patient
      let patientContext = `Patient: ${patientName}\nDate de naissance: ${birthDate}\n`;
      if (niss) patientContext += `NISS: ${niss}\n`;
      if (selectedPatientData?.address?.[0]) {
        const addr = selectedPatientData.address[0];
        patientContext += `Adresse: ${addr.line?.[0] || ''}, ${addr.postalCode || ''} ${addr.city || ''}\n`;
      }

      // Ajouter les dernières consultations
      if (patientConsultations.length > 0) {
        patientContext += `\nDernières consultations:\n`;
        patientConsultations.slice(0, 3).forEach(c => {
          patientContext += `- ${format(new Date(c.date_consultation), 'dd/MM/yyyy')}: ${c.motif || 'Consultation'}\n`;
          if (c.diagnostic) patientContext += `  Diagnostic: ${c.diagnostic}\n`;
        });
      }

      // Antécédents et allergies
      if (selectedPatientData?.antecedents_medicaux) {
        patientContext += `\nAntécédents: ${selectedPatientData.antecedents_medicaux}\n`;
      }
      if (selectedPatientData?.allergies) {
        patientContext += `Allergies: ${selectedPatientData.allergies}\n`;
      }

      // Prompt selon le type de document
      const typeLabel = DOCUMENT_TYPES.find(t => t.id === selectedType)?.label || '';
      
      const prompt = `Tu es un assistant médical. Génère un ${typeLabel} professionnel en français pour le patient suivant.

${patientContext}

Instructions supplémentaires: ${additionalInfo || 'Aucune'}

Médecin: Dr. ${currentUser.full_name}
Date: ${format(new Date(), 'dd/MM/yyyy')}

Génère le document complet, formel et professionnel. Inclus tous les éléments légaux requis pour ce type de document en Belgique.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            document_content: { type: 'string' },
            title: { type: 'string' }
          }
        }
      });

      setGeneratedContent(result.document_content || '');
      toast.success('Document généré');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copié dans le presse-papiers');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Générer un document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection patient */}
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name?.[0]?.given?.[0]} {p.name?.[0]?.family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de document */}
          <div className="space-y-2">
            <Label>Type de document</Label>
            <div className="grid grid-cols-2 gap-2">
              {DOCUMENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedType === type.id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${selectedType === type.id ? 'text-purple-600' : 'text-slate-500'}`} />
                    <p className="text-sm font-medium">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructions supplémentaires */}
          <div className="space-y-2">
            <Label>Instructions supplémentaires (optionnel)</Label>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Ex: Mentionner l'arrêt de travail de 5 jours..."
              rows={3}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={generateDocument}
            disabled={!selectedPatient || !selectedType || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Générer avec l'IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Aperçu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Aperçu du document
            </span>
            {generatedContent && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={generateDocument}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generatedContent ? (
            <div className="bg-white border rounded-lg p-4 min-h-[400px] whitespace-pre-wrap text-sm">
              {generatedContent}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed rounded-lg p-8 min-h-[400px] flex items-center justify-center text-center">
              <div>
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-muted-foreground">Le document généré apparaîtra ici</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}