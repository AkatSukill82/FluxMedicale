import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send, Package, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

/**
 * BatchSendDialog - Récapitulatif d'envoi groupé
 * Supporte un seul groupe (envoi par mutuelle) ou tous les groupes (envoi global)
 * 
 * Props:
 *  - groups: Array of {oa_code, oa_name, invoices, total, insuranceTotal, patientTotal}
 *  - open / onOpenChange
 *  - onConfirm(groupsWithBatchNumbers)
 *  - isSending
 */
export default function BatchSendDialog({ groups, open, onOpenChange, onConfirm, isSending }) {
  const [batchNumbers, setBatchNumbers] = useState({});

  // Générer les numéros d'envoi par défaut
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const dateStr = format(new Date(), 'yyyyMMdd');
    const initial = {};
    groups.forEach((g, i) => {
      const code = (g.oa_code || 'XX').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
      initial[g.oa_code] = `LOT-${dateStr}-${code}-${String(i + 1).padStart(3, '0')}`;
    });
    setBatchNumbers(initial);
  }, [groups]);

  if (!groups || groups.length === 0) return null;

  const totalInvoices = groups.reduce((s, g) => s + g.invoices.length, 0);
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const grandInsurance = groups.reduce((s, g) => s + g.insuranceTotal, 0);
  const grandPatient = groups.reduce((s, g) => s + g.patientTotal, 0);

  const handleConfirm = () => {
    const enriched = groups.map(g => ({
      ...g,
      batchNumber: batchNumbers[g.oa_code] || ''
    }));
    onConfirm(enriched);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span>Récapitulatif d'envoi</span>
              <p className="text-sm font-normal text-slate-500 mt-0.5">
                {totalInvoices} attestation(s) vers {groups.length} mutuelle(s)
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Par mutuelle */}
          {groups.map((group) => (
            <div key={group.oa_code} className="rounded-lg border bg-white overflow-hidden">
              {/* En-tête mutuelle */}
              <div className="p-4 bg-slate-50 border-b">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-900">{group.oa_name}</span>
                    {group.oa_code !== 'INCONNU' && (
                      <Badge variant="outline" className="font-mono text-xs">{group.oa_code}</Badge>
                    )}
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {group.invoices.length} facture(s)
                  </Badge>
                </div>
                
                {/* Numéro d'envoi modifiable */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 whitespace-nowrap">N° d'envoi:</span>
                  <Input
                    value={batchNumbers[group.oa_code] || ''}
                    onChange={(e) => setBatchNumbers(prev => ({ ...prev, [group.oa_code]: e.target.value }))}
                    className="h-8 text-sm font-mono bg-white"
                  />
                </div>
              </div>

              {/* Détail financier */}
              <div className="p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Part mutuelle</span>
                  <span className="font-semibold text-green-700">{formatAmount(group.insuranceTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Part patient</span>
                  <span className="font-semibold text-orange-700">{formatAmount(group.patientTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatAmount(group.total)}</span>
                </div>
              </div>

              {/* Liste factures */}
              <div className="border-t bg-slate-50/50 px-4 py-2 max-h-32 overflow-y-auto">
                {group.invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-xs py-1 text-slate-600">
                    <span className="font-medium text-slate-800 truncate max-w-[40%]">{inv.patient_name || 'Patient'}</span>
                    <span>{inv.invoice_date || '-'}</span>
                    <span className="font-mono">{inv.invoice_number || inv.id.slice(0, 8)}</span>
                    <span className="font-semibold text-slate-900">{formatAmount(inv.total_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Alerte si mutuelle inconnue */}
          {groups.some(g => g.oa_code === 'INCONNU') && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Certaines factures n'ont pas de code mutuelle. Vérifiez les dossiers patients.
              </p>
            </div>
          )}

          {/* Total général */}
          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-700">Total mutuelle</span>
              <span className="font-bold text-green-700">{formatAmount(grandInsurance)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-blue-700">Total patient</span>
              <span className="font-bold text-orange-700">{formatAmount(grandPatient)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-blue-200 pt-2">
              <span className="text-lg font-bold text-blue-900">TOTAL GÉNÉRAL</span>
              <span className="text-2xl font-bold text-blue-900">{formatAmount(grandTotal)}</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {totalInvoices} attestation(s) • {groups.length} lot(s)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isSending}
            className="bg-blue-600 hover:bg-blue-700 gap-2 h-11 px-6 text-base"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer {totalInvoices} attestation(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}