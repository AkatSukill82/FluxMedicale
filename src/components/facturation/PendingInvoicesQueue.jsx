import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Package, Clock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BatchSendDialog from './BatchSendDialog';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

export default function PendingInvoicesQueue({ invoices, isLoading }) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendGroups, setSendGroups] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING');

  // Grouper par mutuelle
  const groups = Object.values(
    pendingInvoices.reduce((acc, inv) => {
      const key = inv.oa_code || inv.oa_name || 'INCONNU';
      const name = inv.oa_name || inv.oa_code || 'Mutuelle inconnue';
      if (!acc[key]) {
        acc[key] = { oa_code: key, oa_name: name, invoices: [], total: 0, insuranceTotal: 0, patientTotal: 0 };
      }
      acc[key].invoices.push(inv);
      acc[key].total += inv.total_amount || 0;
      acc[key].insuranceTotal += inv.insurance_contribution || 0;
      acc[key].patientTotal += inv.patient_contribution || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.invoices.length - a.invoices.length);

  // Ouvrir le récap pour tout envoyer
  const handleSendAll = () => {
    setSendGroups(groups);
    setShowSendDialog(true);
  };

  // Ouvrir le récap pour un seul groupe
  const handleSendGroup = (group) => {
    setSendGroups([group]);
    setShowSendDialog(true);
  };

  // Confirmer l'envoi (reçoit les groupes avec batchNumber modifié)
  const handleConfirmSend = async (enrichedGroups) => {
    setIsSending(true);
    let totalSent = 0;

    for (const group of enrichedGroups) {
      const batchNumber = group.batchNumber;

      const batch = await base44.entities.InvoiceBatch.create({
        batch_number: batchNumber,
        oa_code: group.oa_code,
        oa_name: group.oa_name,
        invoice_count: group.invoices.length,
        total_amount: group.total,
        insurance_total: group.insuranceTotal,
        patient_total: group.patientTotal,
        status: 'SENT',
        invoice_ids: group.invoices.map(i => i.id),
        trigger: 'manual',
        sent_at: new Date().toISOString()
      });

      for (const inv of group.invoices) {
        await base44.entities.Invoice.update(inv.id, {
          status: 'SENT',
          batch_id: batch.id,
          sent_at: new Date().toISOString()
        });
      }

      totalSent += group.invoices.length;
    }

    toast.success(`${totalSent} attestation(s) envoyée(s)`, {
      description: `${enrichedGroups.length} lot(s) créé(s) avec succès`
    });
    queryClient.invalidateQueries({ queryKey: ['facturation_data'] });
    setIsSending(false);
    setShowSendDialog(false);
  };

  if (isLoading) {
    return (
      <Card><CardContent className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
      </CardContent></Card>
    );
  }

  if (pendingInvoices.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">File d'attente vide</h3>
          <p className="text-sm text-slate-500 mt-1">
            Les attestations créées depuis le dossier patient apparaîtront ici automatiquement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Bandeau résumé + bouton tout envoyer */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">
                    {pendingInvoices.length} attestation(s) en attente
                  </h2>
                  <p className="text-sm text-blue-700">
                    {groups.length} mutuelle(s) • Total: {formatAmount(pendingInvoices.reduce((s, i) => s + (i.total_amount || 0), 0))}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSendAll}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-6 text-base gap-2"
              >
                <Send className="w-5 h-5" />
                Tout envoyer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Groupes par mutuelle */}
        {groups.map(group => (
          <Card key={group.oa_code} className="hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{group.oa_name}</h3>
                      {group.oa_code !== 'INCONNU' && (
                        <Badge variant="outline" className="font-mono text-xs">{group.oa_code}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                      <span>{group.invoices.length} facture(s)</span>
                      <span className="text-slate-300">|</span>
                      <span>Mutuelle: <strong className="text-green-700">{formatAmount(group.insuranceTotal)}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>Patient: <strong className="text-orange-700">{formatAmount(group.patientTotal)}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>Total: <strong>{formatAmount(group.total)}</strong></span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleSendGroup(group)} variant="outline" className="gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer
                </Button>
              </div>

              {/* Aperçu des factures */}
              <div className="border-t bg-slate-50/50 px-4 py-2">
                <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-slate-500 mb-1 px-2">
                  <span>Patient</span>
                  <span>Date</span>
                  <span>N° Facture</span>
                  <span className="text-right">Montant</span>
                </div>
                {group.invoices.slice(0, 5).map(inv => (
                  <div key={inv.id} className="grid grid-cols-4 gap-4 text-sm py-1.5 px-2 rounded hover:bg-white">
                    <span className="font-medium truncate">{inv.patient_name || 'Patient'}</span>
                    <span className="text-slate-600">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '-'}</span>
                    <span className="font-mono text-xs text-slate-500">{inv.invoice_number || inv.id.slice(0, 8)}</span>
                    <span className="text-right font-semibold">{formatAmount(inv.total_amount)}</span>
                  </div>
                ))}
                {group.invoices.length > 5 && (
                  <p className="text-xs text-slate-500 text-center py-1">
                    +{group.invoices.length - 5} autre(s)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog récapitulatif d'envoi */}
      <BatchSendDialog
        groups={sendGroups}
        open={showSendDialog}
        onOpenChange={(val) => { if (!isSending) setShowSendDialog(val); }}
        onConfirm={handleConfirmSend}
        isSending={isSending}
      />
    </>
  );
}