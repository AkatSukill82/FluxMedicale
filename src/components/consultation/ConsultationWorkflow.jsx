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
  X
} from 'lucide-react';
import { toast } from 'sonner';
import NomenSearch from '../nomenclature/NomenSearch';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);

  // Charger les médicaments
  const { data: allDrugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 500)
  });

  const [drugSearch, setDrugSearch] = useState('');
  const filteredDrugs = allDrugs.filter(drug => 
    drug.product_name.toLowerCase().includes(drugSearch.toLowerCase()) ||
    drug.substance_name?.toLowerCase().includes(drugSearch.toLowerCase())
  ).slice(0, 10);

  const handleAddMedication = (drug) => {
    if (!selectedMedications.find(m => m.id === drug.id)) {
      setSelectedMedications([...selectedMedications, {
        ...drug,
        dosage_prescribed: `${drug.strength}${drug.unit}`,
        frequency: '1x/jour',
        duration: '7 jours'
      }]);
    }
    setDrugSearch('');
  };

  const handleRemoveMedication = (drugId) => {
    setSelectedMedications(selectedMedications.filter(m => m.id !== drugId));
  };

  const handleMedicationChange = (drugId, field, value) => {
    setSelectedMedications(selectedMedications.map(m => 
      m.id === drugId ? { ...m, [field]: value } : m
    ));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      const currentUser = await base44.auth.me();
      
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

      // 2. Créer la prescription si médicaments
      if (selectedMedications.length > 0) {
        const medicaments = selectedMedications.map(m => ({
          nom_produit: m.product_name,
          posologie: `${m.dosage_prescribed} - ${m.frequency}`,
          duree_traitement: m.duration
        }));

        await base44.entities.Prescription.create({
          patient_id: patient.id,
          medecin_email: currentUser.email,
          date_prescription: new Date().toISOString(),
          medicaments: medicaments,
          statut_recip_e: 'Brouillon'
        });
      }

      // 3. Créer la facture si codes INAMI
      if (selectedCodes.length > 0) {
        const totalHonorarium = selectedCodes.reduce((sum, code) => sum + (code.honorarium || 0), 0);
        const totalReimbursed = selectedCodes.reduce((sum, code) => sum + (code.reimbursed || 0), 0);
        const totalPatientShare = totalHonorarium - totalReimbursed;

        const invoice = await base44.entities.Invoice.create({
          patient_id: patient.id,
          provider_id: currentUser.email,
          type: 'EATTEST',
          status: 'SENT',
          total_amount: totalHonorarium,
          patient_contribution: totalPatientShare,
          insurance_contribution: totalReimbursed,
          invoice_date: new Date().toISOString().split('T')[0],
          created_by: currentUser.email
        });

        // Créer les lignes de facture
        for (const code of selectedCodes) {
          await base44.entities.InvoiceLine.create({
            invoice_id: invoice.id,
            nomenclature_code: code.code,
            nomenclature_label: code.title_fr,
            quantity: 1,
            unit_price: code.honorarium,
            amount: code.honorarium,
            date_prestation: new Date().toISOString().split('T')[0]
          });
        }
      }

      return consultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Consultation enregistrée avec succès');
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

  const formatAmount = (cents) => {
    if (!cents) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  const totalFacturation = selectedCodes.reduce((sum, code) => sum + (code.honorarium || 0), 0);

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
              <div>
                <Label className="text-lg font-semibold mb-3 block">Anamnèse</Label>
                <Textarea
                  value={consultationData.anamnese}
                  onChange={(e) => setConsultationData({...consultationData, anamnese: e.target.value})}
                  placeholder="Histoire de la maladie actuelle, antécédents pertinents..."
                  className="text-base h-32 resize-none"
                />
              </div>
              <div>
                <Label className="text-lg font-semibold mb-3 block">Examen clinique *</Label>
                <Textarea
                  value={consultationData.examen_clinique}
                  onChange={(e) => setConsultationData({...consultationData, examen_clinique: e.target.value})}
                  placeholder="Constats de l'examen physique..."
                  className="text-base h-32 resize-none"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-lg font-semibold mb-3 block">Diagnostic</Label>
                <Input
                  value={consultationData.diagnostic}
                  onChange={(e) => setConsultationData({...consultationData, diagnostic: e.target.value})}
                  placeholder="Diagnostic posé..."
                  className="text-base h-12"
                />
              </div>
            </div>
          )}

          {/* Étape 3: Prescription */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <Label className="text-lg font-semibold mb-3 block">Rechercher un médicament</Label>
                <Input
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  placeholder="Nom du médicament ou substance active..."
                  className="text-base h-12"
                  autoFocus
                />
                {drugSearch && filteredDrugs.length > 0 && (
                  <Card className="mt-2 p-2 max-h-64 overflow-y-auto">
                    {filteredDrugs.map(drug => (
                      <button
                        key={drug.id}
                        onClick={() => handleAddMedication(drug)}
                        className="w-full p-3 hover:bg-slate-50 rounded-lg text-left transition-colors"
                      >
                        <div className="font-semibold text-base">{drug.product_name}</div>
                        <div className="text-sm text-slate-600">
                          {drug.substance_name} • {drug.form} • {drug.strength}{drug.unit}
                        </div>
                      </button>
                    ))}
                  </Card>
                )}
              </div>

              {selectedMedications.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold block">Médicaments prescrits</Label>
                  {selectedMedications.map(med => (
                    <Card key={med.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg">{med.product_name}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMedication(med.id)}
                              className="text-red-500 hover:bg-red-50"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-sm">Dosage</Label>
                              <Input
                                value={med.dosage_prescribed}
                                onChange={(e) => handleMedicationChange(med.id, 'dosage_prescribed', e.target.value)}
                                className="h-10 text-base"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Fréquence</Label>
                              <Input
                                value={med.frequency}
                                onChange={(e) => handleMedicationChange(med.id, 'frequency', e.target.value)}
                                className="h-10 text-base"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Durée</Label>
                              <Input
                                value={med.duration}
                                onChange={(e) => handleMedicationChange(med.id, 'duration', e.target.value)}
                                className="h-10 text-base"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
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
              <div>
                <Label className="text-lg font-semibold mb-3 block">Codes INAMI</Label>
                <NomenSearch 
                  onSelect={(code) => {
                    if (!selectedCodes.find(c => c.id === code.id)) {
                      setSelectedCodes([...selectedCodes, code]);
                    }
                  }} 
                  selectedCodes={selectedCodes}
                />
              </div>

              {selectedCodes.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold block">Prestations</Label>
                  {selectedCodes.map(code => (
                    <Card key={code.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-base">
                              {code.code}
                            </Badge>
                            <Badge variant="secondary">{code.category}</Badge>
                          </div>
                          <p className="font-medium text-base">{code.title_fr}</p>
                          <div className="flex gap-6 mt-2 text-sm">
                            <span className="text-slate-600">
                              Honoraire: <strong>{formatAmount(code.honorarium)}</strong>
                            </span>
                            <span className="text-green-600">
                              Remboursé: <strong>{formatAmount(code.reimbursed)}</strong>
                            </span>
                            <span className="text-orange-600">
                              Patient: <strong>{formatAmount(code.patient_share)}</strong>
                            </span>
                          </div>
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
                  ))}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-blue-900">Total Honoraires</span>
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

          <div className="text-sm text-slate-500">
            Étape {currentStep + 1} sur {STEPS.length}
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
      </DialogContent>
    </Dialog>
  );
}