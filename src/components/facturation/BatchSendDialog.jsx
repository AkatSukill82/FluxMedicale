import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

export default function BatchSendDialog({ group, open, onOpenChange, onConfirm }) {
  if (!group) return null;

  const batchNumber = `LOT-${format(new Date(), 'yyyyMMdd')}-${(group.oa_code || 'XX').slice(0, 6)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Confirmer l'envoi groupé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Batch info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">N° d'envoi</span>
              <span className="font-mono font-bold text-blue-900">{batchNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Mutuelle</span>
              <span className="font-semibold">{group.oa_name}</span>
            </div>
            {group.oa_code !== 'INCONNU' && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Code OA</span>
                <Badge variant="outline" className="font-mono">{group.oa_code}</Badge>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Nombre de factures</span>
              <span className="font-bold text-lg">{group.invoices.length}</span>
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Part mutuelle</span>
              <span className="font-semibold text-green-700">{formatAmount(group.insuranceTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Part patient</span>
              <span className="font-semibold text-orange-700">{formatAmount(group.patientTotal)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="font-bold text-slate-900">Total honoraires</span>
              <span className="font-bold text-lg">{formatAmount(group.total)}</span>
            </div>
          </div>

          {group.oa_code === 'INCONNU' && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Certaines factures n'ont pas de code mutuelle associé. Vérifiez les dossiers patients avant l'envoi.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Send className="w-4 h-4" />
            Confirmer l'envoi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}