import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Send, 
  Loader2,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';
import { useAnnexe82 } from './useAnnexe82';

export default function Annexe82Form({ patient, currentUser, onSuccess }) {
  const [formData, setFormData] = useState({
    type_examen: '',
    region_anatomique: '',
    indication_clinique: '',
    renseignements_cliniques: '',
    question_clinique: '',
    urgence: false,
    avec_produit_contraste: false,
    grossesse_possible: false,
    allergie_produit_contraste: false,
    creatinine: '',
    date_creatinine: '',
    examens_anterieurs: '',
    traitement_en_cours: '',
    radiologue_prefere: ''
  });

  const [destinataireNIHII, setDestinataireNIHII] = useState('');
  const [generatedAnnexe, setGeneratedAnnexe] = useState(null);
  
  const { isGenerating, isSending, error, generateAnnexe82, sendViaEHealthBox } = useAnnexe82(currentUser);

  const handleGenerate = async () => {
    if (!formData.type_examen || !formData.region_anatomique || !formData.question_clinique) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const annexe = await generateAnnexe82(patient, formData);
    
    if (annexe) {
      setGeneratedAnnexe(annexe);
    }
  };

  const handleSend = async () => {
    if (!destinataireNIHII) {
      alert('Veuillez indiquer le NIHII du destinataire');
      return;
    }

    const result = await sendViaEHealthBox(generatedAnnexe, destinataireNIHII);
    
    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Annexe 82 - Demande d'imagerie médicale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {generatedAnnexe ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Formulaire généré</strong><br />
                N° demande: {generatedAnnexe.numero_demande}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label>NIHII du radiologue destinataire</Label>
              <Input
                placeholder="ex: 12345678901"
                value={destinataireNIHII}
                onChange={(e) => setDestinataireNIHII(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer via eHealthBox
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setGeneratedAnnexe(null)}
              >
                Nouvelle demande
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type d'examen *</Label>
                <Select
                  value={formData.type_examen}
                  onValueChange={(value) => setFormData({...formData, type_examen: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IRM">IRM</SelectItem>
                    <SelectItem value="CT">CT-Scan</SelectItem>
                    <SelectItem value="RX">Radiographie</SelectItem>
                    <SelectItem value="ECHO">Échographie</SelectItem>
                    <SelectItem value="MAMMOGRAPHIE">Mammographie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Région anatomique *</Label>
                <Input
                  placeholder="ex: Genou droit"
                  value={formData.region_anatomique}
                  onChange={(e) => setFormData({...formData, region_anatomique: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question clinique *</Label>
              <Textarea
                placeholder="Question précise posée au radiologue"
                value={formData.question_clinique}
                onChange={(e) => setFormData({...formData, question_clinique: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Renseignements cliniques pertinents</Label>
              <Textarea
                placeholder="Anamnèse, symptômes, examens antérieurs..."
                value={formData.renseignements_cliniques}
                onChange={(e) => setFormData({...formData, renseignements_cliniques: e.target.value})}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.urgence}
                  onCheckedChange={(checked) => setFormData({...formData, urgence: checked})}
                />
                <Label>Examen urgent</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.avec_produit_contraste}
                  onCheckedChange={(checked) => setFormData({...formData, avec_produit_contraste: checked})}
                />
                <Label>Avec produit de contraste</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.grossesse_possible}
                  onCheckedChange={(checked) => setFormData({...formData, grossesse_possible: checked})}
                />
                <Label>Grossesse possible</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.allergie_produit_contraste}
                  onCheckedChange={(checked) => setFormData({...formData, allergie_produit_contraste: checked})}
                />
                <Label>Allergie produit de contraste</Label>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Générer le formulaire
                </>
              )}
            </Button>
          </>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-900 text-xs">
            <strong>Annexe 82 - Mentions obligatoires</strong><br />
            Conformément à la réglementation INAMI, une demande par problématique clinique.
            Le formulaire sera signé électroniquement (eID) et envoyé via eHealthBox.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}