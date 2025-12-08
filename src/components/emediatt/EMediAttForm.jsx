import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Send, 
  Loader2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useMediAtt } from './useMediAtt';
import { toast } from 'sonner';

export default function EMediAttForm({ patient, onClose, onSuccess }) {
  const { isGenerating, isSending, generateAttestation, sendToMedex } = useMediAtt();
  const [generatedDoc, setGeneratedDoc] = useState(null);

  // Extraire données patient
  const officialName = patient.name?.find(n => n.use === 'official') || {};
  const niss = patient.identifier?.find(
    id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
  )?.value;

  const [formData, setFormData] = useState({
    dateDebut: '',
    dateFin: '',
    type: 'sickness',
    motif: '',
    hospitalisation: false,
    sortieAutorisee: true,
    dateReprise: '',
    observations: '',
    patientNiss: niss || '',
    patientFirstName: (officialName.given || []).join(' '),
    patientLastName: officialName.family || '',
    patientBirthDate: patient.birthDate || ''
  });

  const handleGenerate = async () => {
    // Validation
    if (!formData.dateDebut || !formData.dateFin) {
      toast.error('Veuillez remplir les dates de début et fin');
      return;
    }

    if (!formData.motif) {
      toast.error('Veuillez indiquer le motif de l\'incapacité');
      return;
    }

    try {
      const doc = await generateAttestation(patient.id, formData);
      setGeneratedDoc(doc);
      toast.success('Attestation générée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    }
  };

  const handleSend = async () => {
    if (!generatedDoc) return;

    try {
      const result = await sendToMedex(generatedDoc.id);
      toast.success(`Attestation envoyée à Medex - ID: ${result.messageId}`);
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Nouvelle attestation eMediAtt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info patient */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-900">
            <strong>Patient:</strong> {formData.patientFirstName} {formData.patientLastName}
            <br />
            <strong>NISS:</strong> {formData.patientNiss}
          </AlertDescription>
        </Alert>

        {/* Période */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Période d'incapacité</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input
                id="dateDebut"
                type="date"
                value={formData.dateDebut}
                onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateFin">Date de fin *</Label>
              <Input
                id="dateFin"
                type="date"
                value={formData.dateFin}
                onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Type et motif */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Type d'incapacité</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sickness">Maladie</SelectItem>
                <SelectItem value="accident">Accident</SelectItem>
                <SelectItem value="pregnancy">Maternité</SelectItem>
                <SelectItem value="prophylaxis">Prophylaxie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="motif">Motif / Diagnostic *</Label>
            <Textarea
              id="motif"
              value={formData.motif}
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
              rows={3}
              placeholder="Description du motif de l'incapacité..."
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hospitalisation"
              checked={formData.hospitalisation}
              onCheckedChange={(checked) => setFormData({ ...formData, hospitalisation: checked })}
            />
            <Label htmlFor="hospitalisation">
              Hospitalisation requise
            </Label>
          </div>

          {!formData.hospitalisation && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sortieAutorisee"
                checked={formData.sortieAutorisee}
                onCheckedChange={(checked) => setFormData({ ...formData, sortieAutorisee: checked })}
              />
              <Label htmlFor="sortieAutorisee">
                Sorties autorisées
              </Label>
            </div>
          )}
        </div>

        {/* Date de reprise */}
        <div>
          <Label htmlFor="dateReprise">Date de reprise prévue (optionnel)</Label>
          <Input
            id="dateReprise"
            type="date"
            value={formData.dateReprise}
            onChange={(e) => setFormData({ ...formData, dateReprise: e.target.value })}
          />
        </div>

        {/* Observations */}
        <div>
          <Label htmlFor="observations">Observations</Label>
          <Textarea
            id="observations"
            value={formData.observations}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            rows={3}
            placeholder="Observations complémentaires..."
          />
        </div>

        {/* Lien aide Medex */}
        <Alert className="bg-slate-50 border-slate-200">
          <AlertDescription className="text-slate-700 text-sm">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <a 
                href="https://www.medex.be/fr/eServices/emediatt" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                En savoir plus sur eMediAtt (Medex)
              </a>
            </div>
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          
          <div className="flex gap-2">
            {!generatedDoc ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Générer
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer à Medex
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {generatedDoc && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Attestation générée avec succès (KMEHR + PDF)
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}