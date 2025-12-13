import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Euro, Calendar, CheckCircle2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ManualPaymentRecorder({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    reference: '',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Récupérer les factures non payées
  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ['unpaid_invoices'],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.list('-invoice_date', 200);
      return allInvoices.filter(inv => 
        inv.status !== 'PAID' && 
        (inv.status === 'ACCEPTED' || inv.status === 'SENT')
      );
    },
    enabled: isOpen
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients_for_payment'],
    queryFn: () => base44.entities.Patient.list(),
    enabled: isOpen
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Créer le paiement
      const payment = await base44.entities.Payment.create({
        invoice_id: selectedInvoice?.id,
        patient_id: selectedInvoice?.patient_id,
        amount: parseFloat(formData.amount) * 100,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference: formData.reference,
        notes: formData.notes,
        reconciled: true,
        reconciled_by: currentUser.email,
        reconciled_at: new Date().toISOString(),
        created_by: currentUser.email
      });

      // Mettre à jour la facture si le montant correspond
      if (selectedInvoice && parseFloat(formData.amount) * 100 >= selectedInvoice.total_amount) {
        await base44.entities.Invoice.update(selectedInvoice.id, {
          status: 'PAID',
          paid_at: new Date().toISOString()
        });
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['unpaid_invoices']);
      toast.success('Paiement enregistré et rapproché avec succès');
      onClose();
    },
    onError: (error) => {
      console.error('Erreur enregistrement paiement:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    }
  });

  const filteredInvoices = unpaidInvoices.filter(inv => {
    const patient = patients.find(p => p.id === inv.patient_id);
    const patientName = patient?.name?.[0] 
      ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`.toLowerCase()
      : '';
    return patientName.includes(searchTerm.toLowerCase()) || 
           inv.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Euro className="w-6 h-6" />
            Enregistrer un paiement manuel
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Sélection facture */}
          <div className="space-y-4">
            <div>
              <Label>Rechercher une facture impayée</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom du patient ou ID facture..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredInvoices.map(invoice => {
                const patient = patients.find(p => p.id === invoice.patient_id);
                const patientName = patient?.name?.[0] 
                  ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
                  : 'Patient inconnu';
                
                return (
                  <Card
                    key={invoice.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedInvoice?.id === invoice.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setFormData(prev => ({
                        ...prev,
                        amount: ((invoice.total_amount || 0) / 100).toFixed(2)
                      }));
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {invoice.id.substring(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">
                          {((invoice.total_amount || 0) / 100).toFixed(2)}€
                        </p>
                        <Badge variant="outline">{invoice.status}</Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Formulaire paiement */}
          <div className="space-y-4">
            {selectedInvoice && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Facture sélectionnée</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {((selectedInvoice.total_amount || 0) / 100).toFixed(2)}€
                </p>
              </Card>
            )}

            <div>
              <Label>Montant payé (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Mode de paiement</Label>
              <Select 
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="CARD">Carte bancaire</SelectItem>
                  <SelectItem value="INSURANCE">Paiement mutuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date du paiement</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Référence (n° virement, etc.)</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="REF-2024-001"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes sur ce paiement..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={() => recordPaymentMutation.mutate()}
                disabled={!selectedInvoice || !formData.amount || recordPaymentMutation.isPending}
              >
                {recordPaymentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Enregistrer le paiement
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}