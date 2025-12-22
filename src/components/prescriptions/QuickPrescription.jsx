import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, Thermometer, Droplets, Wind, Loader2, Plus, X, Search } from 'lucide-react';
import { handleError, handleSuccess } from '../utils/ErrorHandler';
import MedicationSearch from '../medications/MedicationSearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DosageScheduler from '../medications/DosageScheduler';
import GenericAlternatives from '../medications/GenericAlternatives';
import InteractionChecker from '../medications/InteractionChecker';

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

export default function QuickPrescription({ patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMedications, setCustomMedications] = useState([]);
  const [activeTab, setActiveTab] = useState('templates');

  const prescribeMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      
      let medicamentsData;
      if (data.isCustom) {
        medicamentsData = data.medications.map(med => ({
          nom_produit: med.product_name || med.name,
          posologie: med.posology,
          duree_traitement: med.duration
        }));
      } else {
        medicamentsData = data.medications.map(med => ({
          nom_produit: med.name,
          posologie: med.posology,
          duree_traitement: med.duration
        }));
      }

      return base44.entities.Prescription.create({
        patient_id: patient.id,
        medecin_email: currentUser.email,
        date_prescription: new Date().toISOString(),
        medicaments: medicamentsData,
        statut_recip_e: 'Envoyé'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      handleSuccess('Prescription envoyée via Recip-e');
      setCustomMedications([]);
      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Prescription rapide
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choisissez un template ou cherchez dans la base de médicaments
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates standards</TabsTrigger>
            <TabsTrigger value="custom">
              <Search className="w-4 h-4 mr-2" />
              Recherche médicaments
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

          <TabsContent value="custom" className="space-y-4">
            <MedicationSearch 
              onSelect={handleAddMedication}
              selectedMedications={customMedications}
            />

            {customMedications.length > 0 && (
              <div className="space-y-4">
                <InteractionChecker
                  selectedMedications={customMedications}
                  patientId={patient.id}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}