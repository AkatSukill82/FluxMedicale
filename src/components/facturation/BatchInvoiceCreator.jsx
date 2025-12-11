import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  FileText, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function BatchInvoiceCreator({ invoicesToBatch, onBack }) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  // Regrouper les factures par mutuelle
  const groupedByMutuelle = React.useMemo(() => {
    const groups = {};
    
    invoicesToBatch.forEach(invoice => {
      const mutuelle = invoice.oa_code || 'SANS_MUTUELLE';
      if (!groups[mutuelle]) {
        groups[mutuelle] = {
          mutuelle_name: invoice.oa_code || 'Sans mutuelle',
          oa_code: invoice.oa_code,
          invoices: [],
          total_amount: 0,
          invoice_count: 0
        };
      }
      
      groups[mutuelle].invoices.push(invoice);
      groups[mutuelle].total_amount += (invoice.total_amount || 0);
      groups[mutuelle].invoice_count += 1;
    });
    
    return Object.values(groups);
  }, [invoicesToBatch]);

  const totalGlobal = groupedByMutuelle.reduce((sum, group) => sum + group.total_amount, 0);

  const handleSendBatch = async (group) => {
    setIsSending(true);
    try {
      // Générer un numéro de lot
      const batchNumber = `BATCH-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Créer le lot
      const batch = await base44.entities.InvoiceBatch.create({
        batch_number: batchNumber,
        mutuelle_name: group.mutuelle_name,
        oa_code: group.oa_code,
        invoice_count: group.invoice_count,
        total_amount: group.total_amount,
        invoice_ids: group.invoices.map(inv => inv.id),
        status: 'SENT',
        sent_at: new Date().toISOString()
      });

      // Mettre à jour les factures
      await Promise.all(
        group.invoices.map(invoice => 
          base44.entities.Invoice.update(invoice.id, {
            status: 'SENT',
            batch_id: batch.id
          })
        )
      );

      queryClient.invalidateQueries(['invoices']);
      toast.success(`Lot ${batchNumber} envoyé avec succès`);
    } catch (error) {
      console.error('Erreur envoi lot:', error);
      toast.error('Erreur lors de l\'envoi du lot');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAll = async () => {
    setIsSending(true);
    try {
      for (const group of groupedByMutuelle) {
        await handleSendBatch(group);
      }
      toast.success('Tous les lots envoyés avec succès');
      onBack();
    } catch (error) {
      console.error('Erreur envoi global:', error);
      toast.error('Erreur lors de l\'envoi global');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Création de factures groupées</h2>
            <p className="text-sm text-muted-foreground">
              {invoicesToBatch.length} facture(s) à regrouper par mutuelle
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleSendAll} 
          disabled={isSending}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer tous les lots
            </>
          )}
        </Button>
      </div>

      {/* Résumé global */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-blue-700 mb-1">Nombre de mutuelles</p>
              <p className="text-3xl font-bold text-blue-900">{groupedByMutuelle.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 mb-1">Nombre total de factures</p>
              <p className="text-3xl font-bold text-blue-900">{invoicesToBatch.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 mb-1">Montant total</p>
              <p className="text-3xl font-bold text-blue-900">{(totalGlobal / 100).toFixed(2)}€</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des mutuelles */}
      <Card>
        <CardHeader>
          <CardTitle>Regroupement par mutuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro d'envoi</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Nom de la mutuelle</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Nombre de factures</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedByMutuelle.map((group, index) => {
                  const batchNumber = `BATCH-${format(new Date(), 'yyyyMMdd')}-${index + 1}`;
                  return (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="font-mono">{batchNumber}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.mutuelle_name}</span>
                          {group.oa_code && (
                            <Badge variant="secondary" className="text-xs">{group.oa_code}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Badge className="bg-blue-100 text-blue-800">
                          {group.invoice_count} facture(s)
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-lg font-bold text-slate-900">
                          {(group.total_amount / 100).toFixed(2)}€
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendBatch(group)}
                            disabled={isSending}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Envoyer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan="3" className="py-4 px-4 text-right">
                    TOTAL GÉNÉRAL
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-xl text-blue-600">
                      {(totalGlobal / 100).toFixed(2)}€
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}