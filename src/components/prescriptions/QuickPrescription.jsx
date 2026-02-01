import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, Thermometer, Droplets, Wind, Loader2, Plus, X, Search, FileText, Mail, Archive, Settings } from 'lucide-react';
import { handleError, handleSuccess } from '../utils/ErrorHandler';
import MedicationSearch from '../medications/MedicationSearch';
import SAMv2Search from '../medications/SAMv2Search';
import AdvancedMedicationSearch from '../medications/AdvancedMedicationSearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DosageScheduler from '../medications/DosageScheduler';
import GenericAlternatives from '../medications/GenericAlternatives';
import InteractionChecker from '../medications/InteractionChecker';
import PrescriptionHistory from './PrescriptionHistory';
import PrescriptionPDFGenerator from './PrescriptionPDFGenerator';
import PrescriptionTemplateSettings from './PrescriptionTemplateSettings';
import DrugInteractionChecker from '../clinical/DrugInteractionChecker';
import RecurringPrescriptionForm from './RecurringPrescriptionForm';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Database, History, RefreshCw, AlertTriangle } from 'lucide-react';
import { recipE } from '@/functions/recipE';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Templates de prescriptions courantes
const PRESCRIPTION_TEMPLATES = [
  {
    id: 'grippe',
    name: 'Grippe / Syndrome grippal',
    icon: Thermometer,
    color: 'bg-red-100 text-red-800',
    medications: [
      { name: 'PARACETAMOL 1000mg', posology: '1 comprimé 3x/jour', duration: '5 jours' },
      { name: 'IBUPROFENE 400mg', posology: '1 comprimé max 3x/jour si nécessaire', duration: '5 jours' }
    ]
  },
  {
    id: 'angine',
    name: 'Angine / Pharyngite',
    icon: Wind,
    color: 'bg-orange-100 text-orange-800',
    medications: [
      { name: 'AMOXICILLINE 500mg', posology: '1 comprimé 3x/jour', duration: '7 jours' },
      { name: 'PARACETAMOL 1000mg', posology: '1 comprimé 3x/jour', duration: '5 jours' }
    ]
  },
  {
    id: 'toux',
    name: 'Toux sèche',
    icon: Droplets,
    color: 'bg-blue-100 text-blue-800',
    medications: [
      { name: 'SIROP ANTITUSSIF', posology: '10ml 3x/jour', duration: '5 jours' }
    ]
  }
];

export default function QuickPrescription({ patient, isOpen, onClose, initialMedications = null }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMedications, setCustomMedications] = useState([]);
  const [activeTab, setActiveTab] = useState(initialMedications ? 'custom' : 'templates');
  const [createdPrescription, setCreatedPrescription] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [recurringOptions, setRecurringOptions] = useState({});
  const [interactionWarnings, setInteractionWarnings] = useState([]);

  // Pré-remplir avec les médicaments initiaux (duplication)
  React.useEffect(() => {
    if (initialMedications && initialMedications.length > 0) {
      setCustomMedications(initialMedications.map(med => ({
        product_name: med.nom_produit || med.product_name,
        cnk: med.cnk,
        substance_name: med.substance_name,
        posology: med.posologie || med.posology || '',
        duration: med.duree_traitement || med.duration || '',
        quantity: med.quantite || med.quantity || 1,
        instructions: med.instructions || ''
      })));
      setActiveTab('custom');
    }
  }, [initialMedications]);

  // Récupérer NISS du patient
  const getNISS = (patient) => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const prescribeMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      
      let medicamentsData;
      if (data.isCustom) {
        medicamentsData = data.medications.map(med => ({
          nom_produit: med.product_name || med.name,
          cnk: med.cnk,
          posologie: med.posology,
          duree_traitement: med.duration,
          quantite: med.quantity || 1,
          instructions: med.instructions
        }));
      } else {
        medicamentsData = data.medications.map(med => ({
          nom_produit: med.name,
          posologie: med.posology,
          duree_traitement: med.duration,
          quantite: 1
        }));
      }

      // Créer la prescription dans la base de données
      const prescription = await base44.entities.Prescription.create({
        patient_id: patient.id,
        medecin_email: currentUser.email,
        date_prescription: new Date().toISOString(),
        medicaments: medicamentsData,
        statut_recip_e: 'Brouillon',
        tracking_status: 'PENDING',
        // Options récurrentes
        is_recurring: recurringOptions.is_recurring || false,
        recurring_frequency: recurringOptions.recurring_frequency,
        max_renewals: recurringOptions.max_renewals,
        chronic_condition: recurringOptions.chronic_condition,
        next_renewal_date: recurringOptions.next_renewal_date,
        recurring_end_date: recurringOptions.recurring_end_date,
        renewal_count: 0
      });

      // Envoyer via Recip-e
      try {
        const response = await recipE({
          action: 'create_prescription',
          patient_id: patient.id,
          patient_niss: getNISS(patient),
          medications: medicamentsData,
          prescriber_nihii: currentUser.numero_inami,
          validity_days: 3
        });

        // Mettre à jour avec les infos Recip-e
        await base44.entities.Prescription.update(prescription.id, {
          recip_e_rid: response.data?.rid,
          recip_e_barcode: response.data?.barcode,
          statut_recip_e: 'Envoyé',
          tracking_status: 'ACTIVE'
        });

        return { ...prescription, ...response.data };
      } catch (error) {
        // Même en cas d'erreur Recip-e, la prescription est sauvegardée
        console.warn('Erreur Recip-e, prescription sauvegardée localement:', error);
        return prescription;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-history'] });
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patient?.id] });
      setCreatedPrescription(data);
      handleSuccess(`Prescription créée${data.rid ? ` (RID: ${data.rid})` : ''}`);
      setCustomMedications([]);
    },
    onError: (error) => {
      handleError(error, 'Prescription');
    }
  });

  const handleAddMedication = (drug) => {
    setCustomMedications([...customMedications, {
      ...drug,
      posology: '',
      duration: ''
    }]);
  };

  const handleRemoveMedication = (index) => {
    setCustomMedications(customMedications.filter((_, i) => i !== index));
  };

  const handleUpdateMedication = (index, field, value) => {
    const updated = [...customMedications];
    updated[index][field] = value;
    setCustomMedications(updated);
  };

  const handlePrescribeCustom = () => {
    if (customMedications.length === 0) return;
    if (customMedications.some(m => !m.posology || !m.duration)) {
      handleError(new Error('Veuillez remplir tous les champs'), 'Prescription');
      return;
    }
    prescribeMutation.mutate({ medications: customMedications, isCustom: true });
  };

  // Si une prescription a été créée, afficher les options PDF/email
  if (createdPrescription) {
    return (
      <Dialog open={isOpen} onOpenChange={() => { setCreatedPrescription(null); onClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              ✓ Prescription créée
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium">{createdPrescription.medicaments?.length} médicament(s) prescrit(s)</p>
              {createdPrescription.recip_e_rid && (
                <p className="text-sm text-green-700 mt-1">
                  RID Recip-e: <span className="font-mono">{createdPrescription.recip_e_rid}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Actions disponibles:</p>
              <PrescriptionPDFGenerator 
                prescription={createdPrescription}
                patient={patient}
                onGenerated={(url) => console.log('PDF généré:', url)}
              />
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => { setCreatedPrescription(null); onClose(); }}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Afficher les paramètres de template
  if (showSettings) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <PrescriptionTemplateSettings onClose={() => setShowSettings(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5" />
              Prescription rapide
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-1" />
              Template PDF
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Choisissez un template ou cherchez dans la base de médicaments
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="sam" className="gap-1">
              <Database className="w-4 h-4" />
              SAM v2
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Search className="w-4 h-4 mr-2" />
              Recherche
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {PRESCRIPTION_TEMPLATES.map(template => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${template.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{template.name}</h3>
                          <div className="space-y-1">
                            {template.medications.map((med, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground">
                                • {med.name} - {med.posology}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedTemplate && (
              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => prescribeMutation.mutate({ ...selectedTemplate, isCustom: false })}
                  disabled={prescribeMutation.isPending}
                >
                  {prescribeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Pill className="w-4 h-4 mr-2" />
                      Prescrire via Recip-e
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sam" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-600 gap-1">
                <Sparkles className="w-3 h-3" />
                Source Authentique des Médicaments
              </Badge>
              <span className="text-xs text-slate-500">Données officielles AFMPS, CBIP, INAMI</span>
            </div>
            
            <SAMv2Search
              onSelect={handleAddMedication}
              selectedMedications={customMedications}
              patient={patient}
              patientStatus={patient?.assurabilite?.special_rights?.includes('BIM') ? 'bim' : 
                            patient?.assurabilite?.special_rights?.includes('OMNIO') ? 'omnio' : 'normal'}
            />

            {customMedications.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                {/* Alertes interactions médicamenteuses */}
                <DrugInteractionChecker 
                  medications={customMedications.map(m => m.product_name || m.substance_name)}
                  patientMedications={patient.medicaments_actuels?.split(',').map(m => m.trim()) || []}
                  showInline={true}
                />

                <InteractionChecker
                  selectedMedications={customMedications}
                  patientId={patient.id}
                />

                {/* Options prescription récurrente */}
                <RecurringPrescriptionForm 
                  value={recurringOptions}
                  onChange={setRecurringOptions}
                />

                <h3 className="font-semibold text-sm">Médicaments sélectionnés ({customMedications.length})</h3>
                {customMedications.map((med, index) => (
                  <div key={index} className="space-y-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{med.product_name}</p>
                            <p className="text-xs text-slate-600">
                              {med.substance_name} {med.strength && `• ${med.strength}${med.unit}`}
                            </p>
                            {med.cnk && <Badge variant="outline" className="text-xs mt-1">CNK: {med.cnk}</Badge>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <DosageScheduler
                          medication={med}
                          onChange={(data) => {
                            handleUpdateMedication(index, 'posology', data.frequency);
                            handleUpdateMedication(index, 'duration', data.duration);
                            handleUpdateMedication(index, 'instructions', data.instructions);
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ))}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePrescribeCustom}
                  disabled={prescribeMutation.isPending || customMedications.some(m => !m.posology || !m.duration)}
                >
                  {prescribeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Pill className="w-4 h-4 mr-2" />
                      Prescrire {customMedications.length} médicament(s) via Recip-e
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                💊 <strong>{customMedications.length === 0 ? 'Aucun médicament sélectionné' : `${customMedications.length} médicament(s) sélectionné(s)`}</strong>
              </p>
            </div>
            <AdvancedMedicationSearch 
              onSelect={handleAddMedication}
              selectedMedications={customMedications}
              patient={patient}
              showHistory={true}
            />

            {customMedications.length > 0 && (
              <div className="space-y-4">
                {/* Alertes interactions médicamenteuses */}
                <DrugInteractionChecker 
                  medications={customMedications.map(m => m.product_name || m.substance_name)}
                  patientMedications={patient.medicaments_actuels?.split(',').map(m => m.trim()) || []}
                  showInline={true}
                />

                <InteractionChecker
                  selectedMedications={customMedications}
                  patientId={patient.id}
                />

                {/* Options prescription récurrente */}
                <RecurringPrescriptionForm 
                  value={recurringOptions}
                  onChange={setRecurringOptions}
                />

                <h3 className="font-semibold text-sm">Médicaments sélectionnés ({customMedications.length})</h3>
                {customMedications.map((med, index) => (
                  <div key={index} className="space-y-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{med.product_name}</p>
                            <p className="text-xs text-slate-600">
                              {med.substance_name} {med.strength && `• ${med.strength}${med.unit}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <DosageScheduler
                          medication={med}
                          onChange={(data) => {
                            handleUpdateMedication(index, 'posology', data.frequency);
                            handleUpdateMedication(index, 'duration', data.duration);
                            handleUpdateMedication(index, 'instructions', data.instructions);
                          }}
                        />
                      </CardContent>
                    </Card>

                    <GenericAlternatives
                      medication={med}
                      onSelectAlternative={(alt) => {
                        const updated = [...customMedications];
                        updated[index] = {
                          ...alt,
                          posology: med.posology,
                          duration: med.duration,
                          instructions: med.instructions
                        };
                        setCustomMedications(updated);
                      }}
                    />
                  </div>
                ))}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePrescribeCustom}
                  disabled={prescribeMutation.isPending || customMedications.some(m => !m.posology || !m.duration)}
                >
                  {prescribeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Pill className="w-4 h-4 mr-2" />
                      Prescrire {customMedications.length} médicament(s) via Recip-e
                    </>
                  )}
                </Button>
              </div>
            )}

            {customMedications.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Recherchez et ajoutez des médicaments</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <PrescriptionHistory patient={patient} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}