import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  Plus, 
  X, 
  Upload, 
  FileText, 
  Loader2,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Paramètres courants avec leurs normes
const COMMON_PARAMETERS = {
  BIOCHIMIE: [
    { parametre: 'Glycémie à jeun', code_loinc: '1558-6', unite: 'mg/dL', valeur_min: 70, valeur_max: 100 },
    { parametre: 'HbA1c', code_loinc: '4548-4', unite: '%', valeur_min: 4.0, valeur_max: 5.6 },
    { parametre: 'Cholestérol total', code_loinc: '2093-3', unite: 'mg/dL', valeur_min: 0, valeur_max: 200 },
    { parametre: 'HDL', code_loinc: '2085-9', unite: 'mg/dL', valeur_min: 40, valeur_max: 200 },
    { parametre: 'LDL', code_loinc: '2089-1', unite: 'mg/dL', valeur_min: 0, valeur_max: 100 },
    { parametre: 'Triglycérides', code_loinc: '2571-8', unite: 'mg/dL', valeur_min: 0, valeur_max: 150 },
    { parametre: 'Créatinine', code_loinc: '2160-0', unite: 'mg/dL', valeur_min: 0.6, valeur_max: 1.2 },
    { parametre: 'Urée', code_loinc: '3094-0', unite: 'mg/dL', valeur_min: 15, valeur_max: 45 },
    { parametre: 'Acide urique', code_loinc: '3084-1', unite: 'mg/dL', valeur_min: 2.5, valeur_max: 7.0 },
    { parametre: 'ASAT (GOT)', code_loinc: '1920-8', unite: 'U/L', valeur_min: 0, valeur_max: 40 },
    { parametre: 'ALAT (GPT)', code_loinc: '1742-6', unite: 'U/L', valeur_min: 0, valeur_max: 41 },
    { parametre: 'GGT', code_loinc: '2324-2', unite: 'U/L', valeur_min: 0, valeur_max: 60 },
    { parametre: 'Bilirubine totale', code_loinc: '1975-2', unite: 'mg/dL', valeur_min: 0.1, valeur_max: 1.2 },
    { parametre: 'Protéines totales', code_loinc: '2885-2', unite: 'g/dL', valeur_min: 6.0, valeur_max: 8.3 },
    { parametre: 'Albumine', code_loinc: '1751-7', unite: 'g/dL', valeur_min: 3.5, valeur_max: 5.5 },
    { parametre: 'Sodium', code_loinc: '2951-2', unite: 'mEq/L', valeur_min: 136, valeur_max: 145 },
    { parametre: 'Potassium', code_loinc: '2823-3', unite: 'mEq/L', valeur_min: 3.5, valeur_max: 5.0 },
    { parametre: 'Calcium', code_loinc: '17861-6', unite: 'mg/dL', valeur_min: 8.5, valeur_max: 10.5 },
    { parametre: 'Fer sérique', code_loinc: '2498-4', unite: 'µg/dL', valeur_min: 60, valeur_max: 170 },
    { parametre: 'Ferritine', code_loinc: '2276-4', unite: 'ng/mL', valeur_min: 12, valeur_max: 300 },
    { parametre: 'CRP', code_loinc: '1988-5', unite: 'mg/L', valeur_min: 0, valeur_max: 5 },
  ],
  HEMATOLOGIE: [
    { parametre: 'Hémoglobine', code_loinc: '718-7', unite: 'g/dL', valeur_min: 12.0, valeur_max: 17.5 },
    { parametre: 'Hématocrite', code_loinc: '4544-3', unite: '%', valeur_min: 36, valeur_max: 50 },
    { parametre: 'Globules rouges', code_loinc: '789-8', unite: 'M/µL', valeur_min: 4.0, valeur_max: 5.5 },
    { parametre: 'Globules blancs', code_loinc: '6690-2', unite: 'K/µL', valeur_min: 4.0, valeur_max: 10.0 },
    { parametre: 'Plaquettes', code_loinc: '777-3', unite: 'K/µL', valeur_min: 150, valeur_max: 400 },
    { parametre: 'VGM', code_loinc: '787-2', unite: 'fL', valeur_min: 80, valeur_max: 100 },
    { parametre: 'TCMH', code_loinc: '785-6', unite: 'pg', valeur_min: 27, valeur_max: 33 },
    { parametre: 'CCMH', code_loinc: '786-4', unite: 'g/dL', valeur_min: 32, valeur_max: 36 },
    { parametre: 'Neutrophiles', code_loinc: '751-8', unite: '%', valeur_min: 40, valeur_max: 70 },
    { parametre: 'Lymphocytes', code_loinc: '731-0', unite: '%', valeur_min: 20, valeur_max: 40 },
    { parametre: 'Monocytes', code_loinc: '742-7', unite: '%', valeur_min: 2, valeur_max: 8 },
    { parametre: 'Vitesse sédimentation', code_loinc: '4537-7', unite: 'mm/h', valeur_min: 0, valeur_max: 20 },
  ],
  HORMONOLOGIE: [
    { parametre: 'TSH', code_loinc: '3016-3', unite: 'mUI/L', valeur_min: 0.4, valeur_max: 4.0 },
    { parametre: 'T4 libre', code_loinc: '3024-7', unite: 'ng/dL', valeur_min: 0.8, valeur_max: 1.8 },
    { parametre: 'T3 libre', code_loinc: '3051-0', unite: 'pg/mL', valeur_min: 2.3, valeur_max: 4.2 },
    { parametre: 'Cortisol', code_loinc: '2143-6', unite: 'µg/dL', valeur_min: 5, valeur_max: 25 },
    { parametre: 'Vitamine D', code_loinc: '1989-3', unite: 'ng/mL', valeur_min: 30, valeur_max: 100 },
    { parametre: 'Vitamine B12', code_loinc: '2132-9', unite: 'pg/mL', valeur_min: 200, valeur_max: 900 },
    { parametre: 'Acide folique', code_loinc: '2284-8', unite: 'ng/mL', valeur_min: 3, valeur_max: 17 },
    { parametre: 'PSA total', code_loinc: '2857-1', unite: 'ng/mL', valeur_min: 0, valeur_max: 4.0 },
  ],
  SEROLOGIE: [
    { parametre: 'Anti-HBs', code_loinc: '5193-8', unite: 'mUI/mL', valeur_min: 10, valeur_max: 99999 },
  ],
  URINAIRE: [
    { parametre: 'Protéinurie', code_loinc: '2888-6', unite: 'mg/24h', valeur_min: 0, valeur_max: 150 },
    { parametre: 'Microalbuminurie', code_loinc: '14957-5', unite: 'mg/L', valeur_min: 0, valeur_max: 30 },
  ]
};

const CONDITIONS = [
  'Diabète type 1', 'Diabète type 2', 'Hypercholestérolémie', 'Hypertension',
  'Insuffisance rénale', 'Hypothyroïdie', 'Hyperthyroïdie', 'Anémie',
  'Infection', 'Inflammation', 'Hépatopathie', 'Suivi grossesse'
];

export default function LabResultForm({ patient, consultations, isOpen, onClose, existingResult }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [formData, setFormData] = useState(existingResult || {
    patient_id: patient.id,
    date_prelevement: new Date().toISOString().split('T')[0],
    date_resultat: new Date().toISOString().split('T')[0],
    laboratoire: '',
    type_analyse: 'BIOCHIMIE',
    resultats: [],
    documents: [],
    conditions_liees: [],
    interpretation: '',
    urgence: false,
    consultation_id: ''
  });
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Calculer le statut de chaque paramètre
      const resultatsWithStatus = data.resultats.map(r => ({
        ...r,
        statut: calculateStatus(r)
      }));
      
      const finalData = { ...data, resultats: resultatsWithStatus };
      
      if (existingResult) {
        return base44.entities.LabResult.update(existingResult.id, finalData);
      }
      return base44.entities.LabResult.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-results', patient.id] });
      toast.success(existingResult ? 'Résultat mis à jour' : 'Résultat enregistré');
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const calculateStatus = (param) => {
    if (!param.valeur || param.valeur_min === undefined || param.valeur_max === undefined) {
      return 'NORMAL';
    }
    const val = parseFloat(param.valeur);
    const min = parseFloat(param.valeur_min);
    const max = parseFloat(param.valeur_max);
    
    // Seuils critiques (20% au-delà des limites)
    const criticalLow = min - (min * 0.2);
    const criticalHigh = max + (max * 0.2);
    
    if (val < criticalLow) return 'CRITIQUE_BAS';
    if (val > criticalHigh) return 'CRITIQUE_HAUT';
    if (val < min) return 'BAS';
    if (val > max) return 'HAUT';
    return 'NORMAL';
  };

  const handleAddParameter = (param) => {
    setFormData(prev => ({
      ...prev,
      resultats: [...prev.resultats, { ...param, valeur: '' }]
    }));
  };

  const handleUpdateParameter = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.resultats];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, resultats: updated };
    });
  };

  const handleRemoveParameter = (index) => {
    setFormData(prev => ({
      ...prev,
      resultats: prev.resultats.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedDocs.push({
          nom: file.name,
          url: file_url,
          type: file.type,
          uploaded_at: new Date().toISOString()
        });
      }
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...uploadedDocs]
      }));
      toast.success(`${uploadedDocs.length} document(s) uploadé(s)`);
    } catch (error) {
      toast.error('Erreur upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const toggleCondition = (condition) => {
    setFormData(prev => ({
      ...prev,
      conditions_liees: prev.conditions_liees.includes(condition)
        ? prev.conditions_liees.filter(c => c !== condition)
        : [...prev.conditions_liees, condition]
    }));
  };

  const availableParams = COMMON_PARAMETERS[formData.type_analyse] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            {existingResult ? 'Modifier le résultat' : 'Nouveau résultat de laboratoire'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
            <TabsTrigger value="upload">Upload document</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Informations générales */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de prélèvement *</Label>
                    <Input
                      type="date"
                      value={formData.date_prelevement}
                      onChange={(e) => setFormData({ ...formData, date_prelevement: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Date de réception</Label>
                    <Input
                      type="date"
                      value={formData.date_resultat}
                      onChange={(e) => setFormData({ ...formData, date_resultat: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Laboratoire</Label>
                    <Input
                      placeholder="Nom du laboratoire"
                      value={formData.laboratoire}
                      onChange={(e) => setFormData({ ...formData, laboratoire: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type d'analyse *</Label>
                    <Select
                      value={formData.type_analyse}
                      onValueChange={(value) => setFormData({ ...formData, type_analyse: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BIOCHIMIE">Biochimie</SelectItem>
                        <SelectItem value="HEMATOLOGIE">Hématologie</SelectItem>
                        <SelectItem value="HORMONOLOGIE">Hormonologie</SelectItem>
                        <SelectItem value="SEROLOGIE">Sérologie</SelectItem>
                        <SelectItem value="URINAIRE">Urinaire</SelectItem>
                        <SelectItem value="MICROBIOLOGIE">Microbiologie</SelectItem>
                        <SelectItem value="AUTRE">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Lier à une consultation</Label>
                    <Select
                      value={formData.consultation_id}
                      onValueChange={(value) => setFormData({ ...formData, consultation_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Aucune</SelectItem>
                        {consultations.slice(0, 10).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {new Date(c.date_consultation).toLocaleDateString('fr-BE')} - {c.motif || 'Consultation'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={formData.urgence}
                      onCheckedChange={(checked) => setFormData({ ...formData, urgence: checked })}
                    />
                    <Label className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Résultat urgent
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <TabsContent value="manual" className="mt-0 space-y-4">
              {/* Paramètres courants */}
              <Card>
                <CardContent className="p-4">
                  <Label className="mb-2 block">Ajouter des paramètres courants</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableParams.slice(0, 12).map((param, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddParameter(param)}
                        disabled={formData.resultats.some(r => r.parametre === param.parametre)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {param.parametre}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres sélectionnés */}
              {formData.resultats.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Label>Valeurs des paramètres</Label>
                    {formData.resultats.map((param, index) => {
                      const status = calculateStatus(param);
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{param.parametre}</p>
                            <p className="text-xs text-slate-500">
                              Normes: {param.valeur_min} - {param.valeur_max} {param.unite}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              placeholder="Valeur"
                              value={param.valeur}
                              onChange={(e) => handleUpdateParameter(index, 'valeur', e.target.value)}
                            />
                            <span className="text-sm text-slate-500 w-16">{param.unite}</span>
                            {param.valeur && (
                              <Badge className={
                                status === 'NORMAL' ? 'bg-green-600' :
                                status.includes('CRITIQUE') ? 'bg-red-600' : 'bg-orange-500'
                              }>
                                {status === 'NORMAL' ? '✓' : status === 'HAUT' || status === 'CRITIQUE_HAUT' ? '↑' : '↓'}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveParameter(index)}
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Paramètre personnalisé */}
              <Card>
                <CardContent className="p-4">
                  <Label className="mb-2 block">Ajouter un paramètre personnalisé</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Nom du paramètre" id="custom-param" />
                    <Input placeholder="Unité" id="custom-unit" className="w-24" />
                    <Input type="number" placeholder="Min" id="custom-min" className="w-20" />
                    <Input type="number" placeholder="Max" id="custom-max" className="w-20" />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const param = document.getElementById('custom-param').value;
                        const unite = document.getElementById('custom-unit').value;
                        const min = document.getElementById('custom-min').value;
                        const max = document.getElementById('custom-max').value;
                        if (param) {
                          handleAddParameter({
                            parametre: param,
                            unite,
                            valeur_min: min ? parseFloat(min) : undefined,
                            valeur_max: max ? parseFloat(max) : undefined
                          });
                          document.getElementById('custom-param').value = '';
                          document.getElementById('custom-unit').value = '';
                          document.getElementById('custom-min').value = '';
                          document.getElementById('custom-max').value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <Label className="mb-2 block">Documents (PDF, images)</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {uploading ? (
                        <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                      ) : (
                        <Upload className="w-12 h-12 mx-auto text-slate-400" />
                      )}
                      <p className="mt-2 text-sm text-slate-600">
                        Cliquez pour uploader ou glissez vos fichiers
                      </p>
                      <p className="text-xs text-slate-400">PDF, PNG, JPG jusqu'à 10MB</p>
                    </label>
                  </div>

                  {/* Documents uploadés */}
                  {formData.documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">{doc.nom}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">Voir</a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDocument(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conditions liées */}
            <Card>
              <CardContent className="p-4">
                <Label className="mb-2 block">Conditions/pathologies liées</Label>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map(condition => (
                    <Badge
                      key={condition}
                      variant={formData.conditions_liees.includes(condition) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCondition(condition)}
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interprétation */}
            <Card>
              <CardContent className="p-4">
                <Label className="mb-2 block">Interprétation médicale</Label>
                <Textarea
                  placeholder="Notes et interprétation des résultats..."
                  value={formData.interpretation}
                  onChange={(e) => setFormData({ ...formData, interpretation: e.target.value })}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || !formData.date_prelevement}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {existingResult ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}