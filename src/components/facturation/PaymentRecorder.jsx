import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Euro,
  CreditCard,
  Banknote,
  Building,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: Building },
  { value: 'CARD', label: 'Carte bancaire', icon: CreditCard },
  { value: 'CASH', label: 'Espèces', icon: Banknote },
  { value: 'INSURANCE', label: 'Assurance/Mutuelle', icon: Building },
  { value: 'DOMICILIATION', label: 'Domiciliation', icon: Building },
  { value: 'CHECK', label: 'Chèque', icon: Banknote },
];

export default function PaymentRecorder({ isOpen, onClose, invoice = null, onRecorded }) {
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState(invoice);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const [paymentData, setPaymentData] = useState({
    amount: invoice ? (invoice.amount_due || invoice.total_amount) : 0,
    payment_method: 'BANK_TRANSFER',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_type: 'FULL',
    reference: '',
    notes: ''
  });

  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ['unpaidInvoices'],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.list('-invoice_date', 200);
      return invoices.filter(inv => 
        inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
      );
    },
    enabled: !invoice
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500)
  });

  const filteredInvoices = unpaidInvoices.filter(inv => {
    if (!invoiceSearch) return true;
    const patient = patients.find(p => p.id === inv.patient_id);
    const name = patient?.name?.find(n => n.use === 'official');
    const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.toLowerCase();
    return fullName.includes(invoiceSearch.toLowerCase()) || 
           inv.invoice_number?.toLowerCase().includes(invoiceSearch.toLowerCase());
  });

  const recordMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Créer le paiement
      const payment = await base44.entities.Payment.create({
        invoice_id: selectedInvoice.id,
        patient_id: selectedInvoice.patient_id,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        payment_type: data.payment_type,
        reference: data.reference,
        notes: data.notes,
        reconciled: true,
        reconciled_by: user.email,
        reconciled_at: new Date().toISOString()
      });

      // Mettre à jour la facture
      const newAmountPaid = (selectedInvoice.amount_paid || 0) + data.amount;
      const newAmountDue = selectedInvoice.total_amount - newAmountPaid;
      const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIAL';

      await base44.entities.Invoice.update(selectedInvoice.id, {
        amount_paid: newAmountPaid,
        amount_due: Math.max(0, newAmountDue),
        status: newStatus,
        paid_at: newStatus === 'PAID' ? new Date().toISOString() : undefined
      });

      return { payment, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['unpaidInvoices'] });
      
      toast.success(
        newStatus === 'PAID' ? 'Facture soldée' : 'Paiement partiel enregistré',
        { description: `Paiement de ${(paymentData.amount / 100).toFixed(2)}€` }
      );
      
      if (onRecorded) onRecorded();
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement', { description: error.message });
    }
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    const name = patient?.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim() || 'Patient';
  };

  const handleAmountChange = (value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = selectedInvoice?.amount_due || selectedInvoice?.total_amount || 0;
    
    setPaymentData({
      ...paymentData,
      amount: Math.min(amount, maxAmount),
      payment_type: amount < maxAmount ? 'PARTIAL' : 'FULL'
    });
  };

  const handleSubmit = () => {
    if (!selectedInvoice) {
      toast.error('Veuillez sélectionner une facture');
      return;
    }
    if (paymentData.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    recordMutation.mutate(paymentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-green-600" />
            Enregistrer un paiement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sélection de la facture */}
          {!invoice && (
            <div className="space-y-2">
              <Label>Facture</Label>
              {selectedInvoice ? (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedInvoice.invoice_number || `Facture ${selectedInvoice.id.slice(0, 8)}`}</p>
                        <p className="text-sm text-muted-foreground">{getPatientName(selectedInvoice.patient_id)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{((selectedInvoice.amount_due || selectedInvoice.total_amount) / 100).toFixed(2)}€</p>
                        <Badge variant={selectedInvoice.status === 'PARTIAL' ? 'secondary' : 'outline'}>
                          {selectedInvoice.status === 'PARTIAL' ? 'Partiel' : 'À payer'}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSelectedInvoice(null)}>
                      Changer de facture
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par patient ou n° facture..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {filteredInvoices.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground">Aucune facture en attente</p>
                    ) : (
                      filteredInvoices.map(inv => (
                        <button
                          key={inv.id}
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentData({
                              ...paymentData,
                              amount: inv.amount_due || inv.total_amount
                            });
                          }}
                          className="w-full p-3 text-left hover:bg-slate-50 border-b last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium text-sm">{inv.invoice_number || inv.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{getPatientName(inv.patient_id)}</p>
                          </div>
                          <span className="font-bold">{((inv.amount_due || inv.total_amount) / 100).toFixed(2)}€</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Montant */}
          <div className="space-y-2">
            <Label>Montant (centimes)</Label>
            <div className="relative">
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pr-12 text-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                = {(paymentData.amount / 100).toFixed(2)}€
              </span>
            </div>
            {selectedInvoice && paymentData.amount < (selectedInvoice.amount_due || selectedInvoice.total_amount) && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                Paiement partiel - Reste: {(((selectedInvoice.amount_due || selectedInvoice.total_amount) - paymentData.amount) / 100).toFixed(2)}€
              </div>
            )}
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <Select
              value={paymentData.payment_method}
              onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center gap-2">
                      <method.icon className="w-4 h-4" />
                      {method.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de paiement */}
          <div className="space-y-2">
            <Label>Date du paiement</Label>
            <Input
              type="date"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
            />
          </div>

          {/* Référence */}
          <div className="space-y-2">
            <Label>Référence (optionnel)</Label>
            <Input
              value={paymentData.reference}
              onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
              placeholder="N° de virement, transaction..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              placeholder="Commentaires..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={recordMutation.isPending || !selectedInvoice}
            className="bg-green-600 hover:bg-green-700"
          >
            {recordMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}