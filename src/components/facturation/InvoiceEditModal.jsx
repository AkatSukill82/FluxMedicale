import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Save, Calendar, CreditCard, Ban, Edit, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function InvoiceEditModal({ invoice, patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [cancellationReason, setCancellationReason] = useState('');

  const isEAttest = invoice?.type === 'EATTEST';
  const isEFact = invoice?.type === 'EFACT';
  const canCancel = isEAttest && invoice?.status !== 'CANCELLED';
  const canEdit = isEFact && invoice?.status !== 'CANCELLED' && invoice?.status !== 'PAID';

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Invoice.update(invoice.id, {
        status: 'CANCELLED',
        oa_response: `Annulé le ${format(new Date(), 'dd/MM/yyyy HH:mm')}. Motif: ${cancellationReason || 'Non spécifié'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientInvoices'] });
      toast.success('eAttest annulée avec succès');
      onUpdate?.();
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'annulation');
    }
  });

  const invoiceDate = invoice?.invoice_date ? new Date(invoice.invoice_date) : null;

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-slate-100 text-slate-800',
      NOT_SENT: 'bg-yellow-100 text-yellow-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      DRAFT: 'Brouillon',
      NOT_SENT: 'Pas envoyé',
      SENT: 'Envoyé',
      ACCEPTED: 'Acceptée',
      REJECTED: 'Refusée',
      PAID: 'Payée',
      CANCELLED: 'Annulée'
    };
    return <Badge className={styles[status] || styles.DRAFT}>{labels[status] || status}</Badge>;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      CARD: 'Carte bancaire',
      CASH: 'Espèces',
      BANK: 'Virement bancaire',
      PAPER: 'Chèque/Papier'
    };
    return labels[method] || method;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Détails de la facture
          </DialogTitle>
          <DialogDescription>
            {isEAttest ? 'eAttest - Attestation électronique' : isEFact ? 'eFact - Facturation électronique' : 'Facture'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Infos principales */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">
                    {invoiceDate && !isNaN(invoiceDate.getTime()) && format(invoiceDate, 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(invoice?.status)}
                  <Badge variant="outline">{invoice?.type}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Montant total</p>
                  <p className="text-xl font-bold">{((invoice?.total_amount || 0) / 100).toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Part patient</p>
                  <p className="text-lg font-semibold">{((invoice?.patient_contribution || 0) / 100).toFixed(2)}€</p>
                </div>
              </div>

              {invoice?.payment_method && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Mode de paiement</p>
                  <p className="font-medium">{getPaymentMethodLabel(invoice.payment_method)}</p>
                </div>
              )}

              {invoice?.transaction_id && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">ID Transaction MyCareNet</p>
                  <p className="font-mono text-sm">{invoice.transaction_id}</p>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">ID Facture</p>
                <p className="font-mono text-sm">{invoice?.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Réponse OA si présente */}
          {invoice?.oa_response && (
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Réponse organisme assureur</p>
                <p className="text-sm">{invoice.oa_response}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions selon le type */}
          {invoice?.status === 'CANCELLED' ? (
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Info className="w-5 h-5 text-gray-500" />
              <p className="text-sm text-gray-600">Cette facture a été annulée et ne peut plus être modifiée.</p>
            </div>
          ) : (
            <>
              {/* eAttest - Annulation uniquement */}
              {canCancel && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-orange-800">
                      <Ban className="w-5 h-5" />
                      <span className="font-semibold">Annuler cette eAttest</span>
                    </div>
                    <p className="text-sm text-orange-700">
                      L'annulation d'une eAttest est irréversible. Elle sera marquée comme annulée dans le système.
                    </p>
                    
                    <div>
                      <Label htmlFor="cancellationReason" className="text-orange-800">Motif d'annulation</Label>
                      <Textarea
                        id="cancellationReason"
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        placeholder="Entrez le motif de l'annulation..."
                        className="mt-1"
                      />
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full gap-2">
                          <Ban className="w-4 h-4" />
                          Annuler l'eAttest
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Confirmer l'annulation
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir annuler cette eAttest ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Non, annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cancelMutation.mutate()}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Oui, annuler l'eAttest
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              )}

              {/* eFact - Modification */}
              {canEdit && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Edit className="w-5 h-5" />
                      <span className="font-semibold">Modifier cette eFact</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Vous pouvez modifier les détails de cette facturation électronique tant qu'elle n'a pas été payée ou annulée.
                    </p>
                    
                    <Button variant="outline" className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-100">
                      <Edit className="w-4 h-4" />
                      Ouvrir l'éditeur de facturation
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* eAttest déjà envoyée et acceptée */}
              {isEAttest && !canCancel && invoice?.status !== 'CANCELLED' && (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Info className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-700">Cette eAttest a été acceptée et ne peut plus être annulée.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}