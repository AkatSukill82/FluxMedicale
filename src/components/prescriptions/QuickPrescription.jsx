import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pill, Thermometer, Droplets, Wind, Loader2 } from 'lucide-react';
import { handleError, handleSuccess } from '../utils/ErrorHandler';

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

  const prescribeMutation = useMutation({
    mutationFn: async (template) => {
      const currentUser = await base44.auth.me();
      
      const medicamentsData = template.medications.map(med => ({
        nom_produit: med.name,
        posologie: med.posology,
        duree_traitement: med.duration
      }));

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
      onClose();
    },
    onError: (error) => {
      handleError(error, 'Prescription');
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Prescription rapide
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un traitement standard pour prescrire en 1 clic
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
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
              onClick={() => prescribeMutation.mutate(selectedTemplate)}
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
            <p className="text-xs text-center text-muted-foreground mt-2">
              La prescription sera envoyée électroniquement au pharmacien
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}