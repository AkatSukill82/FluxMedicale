import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Package, Clock, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BatchSendDialog from './BatchSendDialog';

const formatAmount = (cents) => {
  if (!cents) return '0,00 €';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
};

export default function PendingInvoicesQueue({ invoices, isLoading }) {
  const [sendingAll, setSendingAll] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const queryClient = useQueryClient();

  const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING');

  // Group by mutuelle (oa_code or oa_name)
  const groupedByMutuelle = pendingInvoices.reduce((acc, inv) => {
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
  }, {});

  const groups = Object.values(groupedByMutuelle).sort((a, b) => b.invoices.length - a.invoices.length);

  const sendBatch = async (group, trigger = 'manual') => {
    const batchNumber = `LOT-${format(new Date(), 'yyyyMMdd')}-${group.oa_code.slice(0, 6)}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;

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
      trigger,
      sent_at: new Date().toISOString()
    });

    // Update all invoices in this batch
    for (const inv of group.invoices) {
      await base44.entities.Invoice.update(inv.id, {
        status: 'SENT',
        batch_id: batch.id,
        sent_at: new Date().toISOString()
      });
    }

    return batch;
  };

  const handleSendGroup = async (group) => {
    setSelectedGroup(group);
  };

  const handleConfirmSend = async (group) => {
    try {
      const batch = await sendBatch(group, 'manual');
      toast.success(`Lot ${batch.batch_number} envoyé`, {
        description: `${group.invoices.length} facture(s) à ${group.oa_name}`
      });
      queryClient.invalidateQueries({ queryKey: ['facturation_data'] });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
      console.error(error);
    }
    setSelectedGroup(null);
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    let totalSent = 0;
    try {
      for (const group of groups) {
        await sendBatch(group, 'manual');
        totalSent += group.invoices.length;
      }
      toast.success(`${totalSent} facture(s) envoyée(s) en ${groups.length} lot(s)`);
      queryClient.invalidateQueries({ queryKey: ['facturation_data'] });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi groupé');
    }
    setSendingAll(false);
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
            Toutes les factures ont été envoyées. Les nouvelles attestations de la journée apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Summary header */}
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
              disabled={sendingAll}
              className="bg-blue-600 hover:bg-blue-700 h-12 px-6 text-base"
            >
              {sendingAll ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
              Tout envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Groups by mutuelle */}
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
              <Button onClick={() => handleSendGroup(group)} className="gap-2">
                <Send className="w-4 h-4" />
                Envoyer ce lot
              </Button>
            </div>

            {/* Invoice list preview */}
            <div className="border-t bg-slate-50/50 px-4 py-2">
              <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-slate-500 mb-1 px-2">
                <span>Patient</span>
                <span>Date</span>
                <span>Type</span>
                <span className="text-right">Montant</span>
              </div>
              {group.invoices.slice(0, 5).map(inv => (
                <div key={inv.id} className="grid grid-cols-4 gap-4 text-sm py-1.5 px-2 rounded hover:bg-white">
                  <span className="font-medium truncate">{inv.patient_name || 'Patient'}</span>
                  <span className="text-slate-600">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '-'}</span>
                  <Badge variant="outline" className="w-fit text-xs">{inv.type}</Badge>
                  <span className="text-right font-semibold">{formatAmount(inv.total_amount)}</span>
                </div>
              ))}
              {group.invoices.length > 5 && (
                <p className="text-xs text-slate-500 text-center py-1">
                  +{group.invoices.length - 5} autre(s) facture(s)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {selectedGroup && (
      <BatchSendDialog
        group={selectedGroup}
        open={!!selectedGroup}
        onOpenChange={() => setSelectedGroup(null)}
        onConfirm={() => handleConfirmSend(selectedGroup)}
      />
    )}
    </>
  );
}