import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileStack, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GroupedInvoiceModal({ patient, isOpen, onClose }) {
  const [selectedConsultations, setSelectedConsultations] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: consultations = [] } = useQuery({
    queryKey: ['unbilledConsultations', patient?.id],
    queryFn: async () => {
      if (!patient) return [];
      const allConsultations = await base44.entities.ConsultationNote.filter({ 
        patient_id: patient.id 
      }, '-date_consultation', 50);
      
      // Get all invoices for this patient
      const invoices = await base44.entities.Invoice.filter({ patient_id: patient.id });
      const invoiceLines = await base44.entities.InvoiceLine.list();
      
      // Filter out consultations that already have invoices
      const billedConsultationIds = new Set(
        invoiceLines
          .filter(line => line.consultation_id)
          .map(line => line.consultation_id)
      );
      
      return allConsultations.filter(c => !billedConsultationIds.has(c.id));
    },
    enabled: !!patient && isOpen
  });

  const toggleConsultation = (consultationId) => {
    setSelectedConsultations(prev => 
      prev.includes(consultationId)
        ? prev.filter(id => id !== consultationId)
        : [...prev, consultationId]
    );
  };

  const selectedConsultationDetails = consultations.filter(c => 
    selectedConsultations.includes(c.id)
  );

  const totalEstimated = selectedConsultationDetails.length * 25; // Estimation basique

  const handleCreateGroupedInvoice = async () => {
    if (selectedConsultations.length === 0) {
      toast.error('Sélectionnez au moins une consultation');
      return;
    }

    setIsCreating(true);
    try {
      const user = await base44.auth.me();
      
      // Create grouped invoice
      const invoice = await base44.entities.Invoice.create({
        patient_id: patient.id,
        provider_id: user.email,
        type: 'EATTEST',
        status: 'DRAFT',
        total_amount: totalEstimated * 100,
        patient_contribution: 0,
        insurance_contribution: totalEstimated * 100,
        invoice_date: new Date().toISOString().split('T')[0],
        created_by: user.email
      });

      // Create invoice lines for each consultation
      for (const consultation of selectedConsultationDetails) {
        await base44.entities.InvoiceLine.create({
          invoice_id: invoice.id,
          consultation_id: consultation.id,
          nomenclature_code: '101010', // Code de consultation standard
          nomenclature_label: `Consultation du ${format(new Date(consultation.date_consultation), 'dd/MM/yyyy')}`,
          quantity: 1,
          unit_price: 25,
          amount: 25,
          date_prestation: consultation.date_consultation
        });
      }

      toast.success(`Facture groupée créée avec ${selectedConsultations.length} consultations`);
      onClose();
    } catch (error) {
      console.error('Error creating grouped invoice:', error);
      toast.error('Erreur lors de la création de la facture groupée');
    } finally {
      setIsCreating(false);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="w-6 h-6" />
            Créer une facture groupée
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {consultations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="font-semibold mb-2">Aucune consultation non facturée</h3>
                <p className="text-sm text-slate-600">
                  Toutes les consultations de ce patient ont déjà été facturées.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">
                        {consultations.length} consultation(s) disponible(s)
                      </p>
                      <p className="text-sm text-slate-600">
                        {selectedConsultations.length} sélectionnée(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Montant estimé</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {totalEstimated.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {consultations.map(consultation => (
                  <Card key={consultation.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedConsultations.includes(consultation.id)}
                          onCheckedChange={() => toggleConsultation(consultation.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="font-semibold">
                              {format(new Date(consultation.date_consultation), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                            <Badge variant="outline">
                              Dr. {consultation.medecin?.split('@')[0]}
                            </Badge>
                          </div>
                          {consultation.motif_consultation && (
                            <p className="text-sm text-slate-600 mb-2">
                              <strong>Motif:</strong> {consultation.motif_consultation}
                            </p>
                          )}
                          {consultation.diagnostic && (
                            <p className="text-sm text-slate-600">
                              <strong>Diagnostic:</strong> {consultation.diagnostic}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">25.00€</p>
                          <p className="text-xs text-slate-500">Estimation</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleCreateGroupedInvoice}
            disabled={isCreating || selectedConsultations.length === 0}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Créer la facture ({selectedConsultations.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}