import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Euro,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function EnregistrerPaiementModal({ facture, isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [montantRecu, setMontantRecu] = useState(facture.montant_a_recevoir_mutuelle || 0);
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [referencePaiement, setReferencePaiement] = useState('');
  const [motifEcart, setMotifEcart] = useState('');
  const [action, setAction] = useState('accepter'); // accepter, refuser, partiel

  const ecart = montantRecu - (facture.montant_a_recevoir_mutuelle || 0);
  const hasEcart = Math.abs(ecart) > 0.01;

  const paiementMutation = useMutation({
    mutationFn: async () => {
      let statut = 'payee';
      if (action === 'refuser') {
        statut = 'refusee';
      } else if (hasEcart && montantRecu > 0) {
        statut = 'partielle';
      }

      await base44.entities.TiersPayantFacture.update(facture.id, {
        statut,
        date_paiement: datePaiement,
        montant_paye: montantRecu,
        ecart_paiement: ecart,
        reference_paiement: referencePaiement,
        motif_refus: action === 'refuser' ? motifEcart : null,
        notes: hasEcart ? `Écart de ${ecart.toFixed(2)}€. ${motifEcart}` : facture.notes,
        date_reponse_mutuelle: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiersPayantFactures'] });
      toast.success(action === 'refuser' ? 'Refus enregistré' : 'Paiement enregistré');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Enregistrer le paiement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info facture */}
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p><strong>Facture:</strong> {facture.numero_facture}</p>
            <p><strong>Patient:</strong> {facture.patient_name}</p>
            <p><strong>Mutuelle:</strong> {facture.mutuelle_nom}</p>
            <p><strong>Montant attendu:</strong> <span className="font-bold text-blue-600">{facture.montant_a_recevoir_mutuelle?.toFixed(2)} €</span></p>
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label>Réponse de la mutuelle</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accepter">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Paiement reçu
                  </span>
                </SelectItem>
                <SelectItem value="partiel">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Paiement partiel
                  </span>
                </SelectItem>
                <SelectItem value="refuser">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Refus de paiement
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action !== 'refuser' && (
            <>
              {/* Montant reçu */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Montant reçu
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={montantRecu}
                  onChange={(e) => setMontantRecu(Number(e.target.value))}
                />
              </div>

              {/* Alerte écart */}
              {hasEcart && (
                <Alert className={ecart < 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}>
                  <AlertTriangle className={`w-4 h-4 ${ecart < 0 ? 'text-red-600' : 'text-orange-600'}`} />
                  <AlertDescription>
                    <strong>Écart détecté:</strong> {ecart > 0 ? '+' : ''}{ecart.toFixed(2)} €
                    <p className="text-sm mt-1">
                      {ecart < 0 ? 'Montant inférieur au prévu' : 'Montant supérieur au prévu'}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Date paiement */}
              <div className="space-y-2">
                <Label>Date du paiement</Label>
                <Input
                  type="date"
                  value={datePaiement}
                  onChange={(e) => setDatePaiement(e.target.value)}
                />
              </div>

              {/* Référence */}
              <div className="space-y-2">
                <Label>Référence de paiement</Label>
                <Input
                  value={referencePaiement}
                  onChange={(e) => setReferencePaiement(e.target.value)}
                  placeholder="N° virement, référence mutuelle..."
                />
              </div>
            </>
          )}

          {/* Motif (si écart ou refus) */}
          {(hasEcart || action === 'refuser') && (
            <div className="space-y-2">
              <Label>{action === 'refuser' ? 'Motif du refus' : 'Motif de l\'écart'}</Label>
              <Textarea
                value={motifEcart}
                onChange={(e) => setMotifEcart(e.target.value)}
                placeholder={action === 'refuser' ? 'Raison du refus...' : 'Explication de l\'écart...'}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={() => paiementMutation.mutate()} 
            disabled={paiementMutation.isPending}
            className={action === 'refuser' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {paiementMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {action === 'refuser' ? 'Enregistrer le refus' : 'Enregistrer le paiement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}