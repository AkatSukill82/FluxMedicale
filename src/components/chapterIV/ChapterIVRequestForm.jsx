import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, Send, Loader2, Upload, Info, Pill, User,
  Clock, CheckCircle, Building2, FileText, AlertTriangle, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import ConditionsChecklist from './ConditionsChecklist';
import { 
  PARAGRAPH_CONDITIONS, 
  MUTUAL_ORGANIZATIONS, 
  AUTH_MODELS, 
  findParagraphForMedication 
} from './paragraphConditions';

const STEPS = ['info', 'conditions', 'documents', 'review'];
const STEP_LABELS = {
  info: 'Patient & Médicament',
  conditions: 'Conditions de remboursement',
  documents: 'Documents & Annexes',
  review: 'Vérification & Envoi'
};

export default function ChapterIVRequestForm({ 
  isOpen, onClose, patient, medication, onSuccess 
}) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  // Déterminer automatiquement le paragraphe
  const detectedParagraph = useMemo(() => {
    if (medication?.chapter_iv?.paragraph) return medication.chapter_iv.paragraph;
    return findParagraphForMedication(medication?.product_name || medication?.nom_produit || '');
  }, [medication]);

  const [formData, setFormData] = useState({
    requestType: 'first', // first ou renewal
    paragraph: detectedParagraph || '',
    checkedConditions: {},
    conditionValues: {},
    justificationNotes: '',
    attachments: [],
    attachmentFiles: [],
    mutualCode: '',
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  useEffect(() => {
    if (detectedParagraph && !formData.paragraph) {
      setFormData(prev => ({ ...prev, paragraph: detectedParagraph }));
    }
  }, [detectedParagraph]);

  // Paragraphe sélectionné
  const paragraphConfig = PARAGRAPH_CONDITIONS[formData.paragraph];
  const currentPhase = formData.requestType === 'first' 
    ? paragraphConfig?.firstRequest 
    : paragraphConfig?.renewal;

  const getNISS = (p) => p?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  const getPatientName = (p) => {
    const n = p?.name?.find(n => n.use === 'official');
    return n ? `${(n.given || []).join(' ')} ${n.family || ''}`.trim() : 'Patient';
  };

  // Vérifier que toutes les conditions requises sont cochées
  const requiredConditionsMet = useMemo(() => {
    if (!currentPhase) return false;
    const required = currentPhase.conditions.filter(c => c.required);
    return required.every(c => formData.checkedConditions[c.id]);
  }, [currentPhase, formData.checkedConditions]);

  // Vérifier les règles de groupe
  const groupRulesMet = useMemo(() => {
    if (!currentPhase?.groupRules) return true;
    return Object.entries(currentPhase.groupRules).every(([groupId, rule]) => {
      const groupConditions = currentPhase.conditions.filter(c => c.group === groupId);
      const checkedCount = groupConditions.filter(c => formData.checkedConditions[c.id]).length;
      return checkedCount >= rule.min;
    });
  }, [currentPhase, formData.checkedConditions]);

  // Vérifier les valeurs requises
  const valuesMet = useMemo(() => {
    if (!currentPhase) return true;
    const needValues = currentPhase.conditions.filter(c => c.needsValue && formData.checkedConditions[c.id]);
    return needValues.every(c => formData.conditionValues[c.id]);
  }, [currentPhase, formData.checkedConditions, formData.conditionValues]);

  const canProceed = (step) => {
    if (step === 0) return !!formData.paragraph && !!paragraphConfig;
    if (step === 1) return requiredConditionsMet && groupRulesMet && valuesMet;
    if (step === 2) return true; // Documents are optional at this stage
    return true;
  };

  // Soumission
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Upload files if any
      let uploadedAttachments = [];
      for (const file of formData.attachmentFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedAttachments.push({ name: file.name, url: file_url, type: file.type });
      }

      // Créer la demande ChapterIVRequest
      const checkedTexts = currentPhase.conditions
        .filter(c => formData.checkedConditions[c.id])
        .map(c => {
          let text = c.text;
          if (c.needsValue && formData.conditionValues[c.id]) {
            text += ` — Valeur: ${formData.conditionValues[c.id]}`;
          }
          return text;
        });

      const justification = [
        `Type: ${formData.requestType === 'first' ? 'Première demande' : 'Prolongation'}`,
        `Paragraphe: § ${formData.paragraph} - ${paragraphConfig.title}`,
        `Modèle d'autorisation: ${AUTH_MODELS[paragraphConfig.authModel]?.name}`,
        '',
        'Conditions attestées par le médecin:',
        ...checkedTexts.map(t => `✓ ${t}`),
        '',
        formData.justificationNotes ? `Notes complémentaires: ${formData.justificationNotes}` : '',
      ].filter(Boolean).join('\n');

      return base44.entities.ChapterIVRequest.create({
        patient_id: patient.id,
        patient_niss: getNISS(patient),
        request_type: 'medication',
        medication_cnk: medication?.cnk || '',
        medication_name: medication?.product_name || medication?.nom_produit || '',
        paragraph: formData.paragraph,
        diagnosis_code: '',
        diagnosis_description: paragraphConfig.title,
        justification,
        prescriber_email: currentUser?.email,
        prescriber_nihii: currentUser?.numero_inami || '',
        duration_requested: formData.requestType === 'first' 
          ? paragraphConfig.duration.first 
          : paragraphConfig.duration.renewal,
        status: 'DRAFT',
        oa_code: formData.mutualCode,
        oa_name: MUTUAL_ORGANIZATIONS.find(m => m.code === formData.mutualCode)?.name || '',
        attachments: uploadedAttachments,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter4-requests'] });
      queryClient.invalidateQueries({ queryKey: ['chapter4-patient'] });
      toast.success('Demande Chapitre IV créée en brouillon', {
        description: 'Vous pouvez la soumettre à la mutualité via MyCareNet/CIVARS'
      });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la demande', {
        description: error.message
      });
    }
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachmentFiles: [...prev.attachmentFiles, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachmentFiles: prev.attachmentFiles.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Demande de remboursement Chapitre IV
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Formulaire conforme à la réglementation INAMI — Envoi via MyCareNet/CIVARS à la mutualité du patient
          </p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center flex-1">
              <button
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-all w-full justify-center ${
                  idx === currentStep ? 'bg-purple-600 text-white' 
                  : idx < currentStep ? 'bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200' 
                  : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="font-bold">{idx + 1}</span>
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </button>
              {idx < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 mx-1 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Étape 1: Patient & Médicament */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-500">Patient</span>
                  </div>
                  <p className="font-semibold text-sm">{getPatientName(patient)}</p>
                  <p className="text-xs text-slate-500 font-mono">NISS: {getNISS(patient) || 'Non renseigné'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Pill className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-slate-500">Médicament</span>
                  </div>
                  <p className="font-semibold text-sm">{medication?.product_name || medication?.nom_produit || 'Non spécifié'}</p>
                  {medication?.cnk && <Badge variant="outline" className="text-xs mt-1">CNK: {medication.cnk}</Badge>}
                </CardContent>
              </Card>
            </div>

            {/* Type de demande */}
            <div className="space-y-2">
              <Label>Type de demande *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, requestType: 'first', checkedConditions: {} }))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.requestType === 'first' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-sm">Première demande</p>
                  <p className="text-xs text-slate-500">Nouvelle autorisation de remboursement</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, requestType: 'renewal', checkedConditions: {} }))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.requestType === 'renewal' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-sm">Prolongation</p>
                  <p className="text-xs text-slate-500">Renouvellement d'une autorisation existante</p>
                </button>
              </div>
            </div>

            {/* Paragraphe */}
            <div className="space-y-2">
              <Label>Paragraphe Chapitre IV *</Label>
              <Select
                value={formData.paragraph}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paragraph: value, checkedConditions: {} }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le paragraphe" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PARAGRAPH_CONDITIONS).map(([code, config]) => (
                    <SelectItem key={code} value={code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-purple-600">§ {code}</span>
                        <span className="text-sm">{config.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {paragraphConfig && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{paragraphConfig.category}</Badge>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    {AUTH_MODELS[paragraphConfig.authModel]?.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Durée: {formData.requestType === 'first' ? paragraphConfig.duration.first : paragraphConfig.duration.renewal} mois
                  </Badge>
                  {paragraphConfig.renewalAutomatic && (
                    <Badge className="bg-green-100 text-green-800 text-xs">Renouvellement auto possible</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Mutualité */}
            <div className="space-y-2">
              <Label>Mutualité du patient (organisme assureur)</Label>
              <Select
                value={formData.mutualCode}
                onValueChange={(value) => setFormData(prev => ({ ...prev, mutualCode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la mutualité" />
                </SelectTrigger>
                <SelectContent>
                  {MUTUAL_ORGANIZATIONS.map(m => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.code} - {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Étape 2: Conditions de remboursement */}
        {currentStep === 1 && paragraphConfig && currentPhase && (
          <div className="space-y-4">
            <Alert className="bg-purple-50 border-purple-200">
              <Info className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-purple-900 text-sm">
                <strong>{currentPhase.label} — § {formData.paragraph}</strong><br />
                Cochez les conditions de remboursement applicables à votre patient. 
                Les conditions marquées d'un <span className="text-red-500">*</span> sont obligatoires.
              </AlertDescription>
            </Alert>

            <ConditionsChecklist
              conditions={currentPhase.conditions}
              checkedConditions={formData.checkedConditions}
              onToggleCondition={(id, checked) => {
                setFormData(prev => ({
                  ...prev,
                  checkedConditions: { ...prev.checkedConditions, [id]: checked }
                }));
              }}
              conditionValues={formData.conditionValues}
              onValueChange={(id, value) => {
                setFormData(prev => ({
                  ...prev,
                  conditionValues: { ...prev.conditionValues, [id]: value }
                }));
              }}
              documents={currentPhase.documents}
              groupRules={currentPhase.groupRules}
            />

            {/* Notes complémentaires */}
            <div className="space-y-2 pt-2">
              <Label>Notes complémentaires (optionnel)</Label>
              <Textarea
                placeholder="Informations complémentaires pour le médecin-conseil (historique thérapeutique, particularités cliniques...)"
                value={formData.justificationNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, justificationNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Étape 3: Documents & Annexes */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Alert>
              <FileText className="w-4 h-4" />
              <AlertDescription className="text-sm">
                Vous pouvez joindre des documents justificatifs (rapports, résultats de labo, imagerie).
                Le médecin conserve les originaux dans le dossier du patient.
              </AlertDescription>
            </Alert>

            {/* Rappel des documents requis */}
            {currentPhase?.documents?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Documents requis pour ce paragraphe:</p>
                {currentPhase.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded bg-blue-50 border border-blue-100 text-sm">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{doc.text}</span>
                    {doc.required && <Badge className="bg-blue-600 text-[10px]">Obligatoire</Badge>}
                  </div>
                ))}
              </div>
            )}

            {/* Upload */}
            <div className="space-y-3">
              <Label>Joindre des fichiers (PDF, images)</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-purple-300 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 mb-2">
                  Glissez vos documents ici ou cliquez pour sélectionner
                </p>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
              </div>

              {formData.attachmentFiles.length > 0 && (
                <div className="space-y-2">
                  {formData.attachmentFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(idx)} className="text-red-500 h-7">
                        Supprimer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Étape 4: Vérification */}
        {currentStep === 3 && paragraphConfig && currentPhase && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900 text-sm">
                Vérifiez les informations ci-dessous avant de créer la demande. 
                Elle sera sauvegardée en brouillon et pourra être soumise via MyCareNet/CIVARS.
              </AlertDescription>
            </Alert>

            {/* Résumé */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Patient</p>
                    <p className="font-medium">{getPatientName(patient)}</p>
                    <p className="text-xs font-mono text-slate-500">NISS: {getNISS(patient)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Médicament</p>
                    <p className="font-medium">{medication?.product_name || medication?.nom_produit || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Paragraphe</p>
                    <p className="font-medium">§ {formData.paragraph}</p>
                    <p className="text-xs text-slate-500">{paragraphConfig.title}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Demande</p>
                    <p className="font-medium">{formData.requestType === 'first' ? 'Première demande' : 'Prolongation'}</p>
                    <p className="text-xs text-slate-500">
                      Durée: {formData.requestType === 'first' ? paragraphConfig.duration.first : paragraphConfig.duration.renewal} mois
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs text-slate-500 mb-2">Conditions attestées:</p>
                  <div className="space-y-1">
                    {currentPhase.conditions
                      .filter(c => formData.checkedConditions[c.id])
                      .map(c => (
                        <div key={c.id} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{c.text}
                            {c.needsValue && formData.conditionValues[c.id] && (
                              <span className="text-purple-600 font-medium ml-1">({formData.conditionValues[c.id]})</span>
                            )}
                          </span>
                        </div>
                    ))}
                  </div>
                </div>

                {formData.attachmentFiles.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-slate-500 mb-1">Annexes: {formData.attachmentFiles.length} fichier(s)</p>
                  </div>
                )}

                {formData.mutualCode && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-slate-500">Envoi à:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">
                        {MUTUAL_ORGANIZATIONS.find(m => m.code === formData.mutualCode)?.name}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attestation du médecin */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                <strong>Attestation du médecin prescripteur:</strong><br />
                En soumettant cette demande, j'atteste que les conditions de remboursement fixées 
                au § {formData.paragraph} du Chapitre IV sont remplies pour ce patient et que je dispose 
                des justificatifs nécessaires dans son dossier médical.
              </AlertDescription>
            </Alert>

            {/* Info réglementaire */}
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription className="text-sm">
                <strong>Délai:</strong> Le médecin-conseil dispose de 10 jours ouvrables pour répondre. 
                En l'absence de réponse, l'accord est considéré comme tacite.
                La demande sera envoyée au médecin-conseil de la mutualité du patient via MyCareNet.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => currentStep === 0 ? onClose() : setCurrentStep(s => s - 1)}
          >
            {currentStep === 0 ? 'Annuler' : 'Précédent'}
          </Button>
          
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed(currentStep)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Créer la demande
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}