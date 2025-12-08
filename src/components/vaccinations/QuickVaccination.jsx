import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Syringe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const COMMON_VACCINES = [
  {
    name: 'Grippe (Influenza)',
    code: '102735',
    icon: '💉',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  },
  {
    name: 'COVID-19',
    code: '102736',
    icon: '🦠',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
  },
  {
    name: 'Tétanos',
    code: '102010',
    icon: '💉',
    color: 'bg-green-100 text-green-800 hover:bg-green-200'
  },
  {
    name: 'Hépatite B',
    code: '102015',
    icon: '💉',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
  },
  {
    name: 'Pneumocoque',
    code: '102020',
    icon: '💉',
    color: 'bg-red-100 text-red-800 hover:bg-red-200'
  },
  {
    name: 'Zona',
    code: '102025',
    icon: '💉',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
  }
];

export default function QuickVaccination({ patient, isOpen, onClose }) {
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const queryClient = useQueryClient();

  const vaccinationMutation = useMutation({
    mutationFn: async (vaccine) => {
      const currentUser = await base44.auth.me();
      
      // Créer le document de vaccination
      await base44.entities.Document.create({
        patient_id: patient.id,
        type: 'VACCINATION',
        subtype: vaccine.name,
        title: `Vaccination ${vaccine.name}`,
        status: 'SIGNED',
        content_html: `
          <h2>Attestation de vaccination</h2>
          <p><strong>Patient:</strong> ${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family}</p>
          <p><strong>Vaccin:</strong> ${vaccine.name}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-BE')}</p>
          <p><strong>Médecin:</strong> Dr. ${currentUser.full_name}</p>
          <p><strong>INAMI:</strong> ${currentUser.numero_inami || 'N/A'}</p>
        `,
        signature: {
          signed: true,
          method: 'MANUAL',
          timestamp: new Date().toISOString()
        },
        created_by: currentUser.email
      });

      // Créer une facture pour la vaccination
      const invoice = await base44.entities.Invoice.create({
        patient_id: patient.id,
        provider_id: currentUser.email,
        type: 'EATTEST',
        payment_method: 'CARD',
        status: 'SENT',
        total_amount: 2500, // 25€
        patient_contribution: 2500,
        insurance_contribution: 0,
        invoice_date: new Date().toISOString().split('T')[0],
        created_by: currentUser.email
      });

      await base44.entities.InvoiceLine.create({
        invoice_id: invoice.id,
        nomenclature_code: vaccine.code,
        nomenclature_label: vaccine.name,
        quantity: 1,
        unit_price: 25,
        amount: 25,
        date_prestation: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Vaccination enregistrée avec succès');
      onClose();
    },
    onError: (error) => {
      console.error('Erreur vaccination:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleVaccinate = (vaccine) => {
    setSelectedVaccine(vaccine);
    vaccinationMutation.mutate(vaccine);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Syringe className="w-6 h-6" />
            Vaccination rapide
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-6">
            Sélectionnez le vaccin administré au patient
          </p>

          <div className="grid grid-cols-2 gap-4">
            {COMMON_VACCINES.map((vaccine) => (
              <button
                key={vaccine.code}
                onClick={() => handleVaccinate(vaccine)}
                disabled={vaccinationMutation.isPending}
                className={`p-6 border-2 rounded-xl transition-all ${vaccine.color} ${
                  vaccinationMutation.isPending && selectedVaccine?.code === vaccine.code
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{vaccine.icon}</span>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-lg">{vaccine.name}</h3>
                    <p className="text-xs opacity-70">Code: {vaccine.code}</p>
                  </div>
                  {vaccinationMutation.isPending && selectedVaccine?.code === vaccine.code && (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> La vaccination sera automatiquement documentée et facturée (25€).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}