import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * EAttestCancelButton
 * Allows cancelling an eAttest invoice sent the same day.
 * Belgian eAttest rules allow same-day cancellation.
 * 
 * Props:
 *  - invoice: Invoice object (must have type EATTEST, status SENT/ACCEPTED, and invoice_date === today)
 *  - onCancelled: callback after successful cancellation
 */
export default function EAttestCancelButton({ invoice, onCancelled }) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  // Check if cancellation is allowed
  const today = format(new Date(), 'yyyy-MM-dd');
  const invoiceDate = invoice?.invoice_date?.split('T')[0];
  const isEAttest = invoice?.type === 'EATTEST';
  const isCancellableStatus = ['SENT', 'ACCEPTED', 'PENDING'].includes(invoice?.status);
  const isSameDay = invoiceDate === today;
  const canCancel = isEAttest && isCancellableStatus && isSameDay;

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // 1. Create a credit note linked to the original invoice
      const creditNote = await base44.entities.Invoice.create({
        patient_id: invoice.patient_id,
        patient_name: invoice.patient_name,
        provider_id: invoice.provider_id,
        type: 'EATTEST',
        payment_method: invoice.payment_method,
        status: 'CREDIT_NOTE',
        oa_code: invoice.oa_code,
        oa_name: invoice.oa_name,
        total_amount: -(invoice.total_amount || 0),
        patient_contribution: -(invoice.patient_contribution || 0),
        insurance_contribution: -(invoice.insurance_contribution || 0),
        invoice_date: today,
        credit_note_for: invoice.id,
        notes: `Annulation eAttest du ${invoiceDate}. Motif: ${reason || 'Erreur de facturation'}`,
      });

      // 2. Update original invoice status to CANCELLED
      await base44.entities.Invoice.update(invoice.id, {
        status: 'CANCELLED',
        notes: `${invoice.notes || ''}\n[ANNULÉ ${format(new Date(), 'dd/MM/yyyy HH:mm')}] ${reason || 'Erreur de facturation'}`.trim(),
      });

      // 3. Log the MyCareNet cancellation transaction
      const user = await base44.auth.me();
      await base44.entities.MyCareNetTransaction.create({
        patient_id: invoice.patient_id,
        transaction_type: 'EATTEST',
        status: 'SENT',
        consultation_id: invoice.transaction_id || '',
        mutuelle_code: invoice.oa_code || '',
        created_by: user.email,
        sent_at: new Date().toISOString(),
        prestations: [{
          code_nomenclature: 'ANNULATION',
          libelle: `Annulation eAttest ${invoice.id.slice(0, 8)}`,
          quantite: 1,
          montant: -(invoice.total_amount || 0),
          date_prestation: invoiceDate,
        }],
      });

      return creditNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['facturation_initial_data'] });
      toast.success('eAttest annulée — note de crédit créée');
      setShowDialog(false);
      setReason('');
      onCancelled?.();
    },
    onError: (err) => {
      toast.error('Erreur lors de l\'annulation');
      console.error(err);
    },
  });

  if (!canCancel) return null;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Ban className="w-4 h-4" />
        Annuler eAttest
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Annuler l'eAttest
            </DialogTitle>
            <DialogDescription>
              Cette action va annuler l'attestation envoyée et créer une note de crédit.
              L'annulation est possible car l'eAttest a été envoyée aujourd'hui.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm space-y-1">
              <p><strong>Patient:</strong> {invoice.patient_name}</p>
              <p><strong>Montant:</strong> {((invoice.total_amount || 0) / 100).toFixed(2).replace('.', ',')} €</p>
              <p><strong>Mutuelle:</strong> {invoice.oa_name || 'N/A'}</p>
              <p><strong>Date:</strong> {invoiceDate}</p>
              <Badge variant="outline" className="mt-1 bg-red-100 text-red-800 border-red-300">
                {invoice.status}
              </Badge>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Motif d'annulation</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Erreur de code, mauvais patient, doublon..."
                className="h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Garder l'attestation
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="gap-2"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}