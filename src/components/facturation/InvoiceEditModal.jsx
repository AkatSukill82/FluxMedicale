import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Save, Loader2, Trash2, Plus, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import NomenSearch from '../nomenclature/NomenSearch';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  { value: 'NOT_SENT', label: 'Non envoyée', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SENT', label: 'Envoyée', color: 'bg-blue-100 text-blue-800' },
  { value: 'ACCEPTED', label: 'Acceptée', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Refusée', color: 'bg-red-100 text-red-800' },
  { value: 'PAID', label: 'Payée', color: 'bg-purple-100 text-purple-800' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'CARD', label: 'Carte bancaire' },
  { value: 'TRANSFER', label: 'Virement' },
  { value: 'THIRD_PARTY', label: 'Tiers-payant' },
];

export default function InvoiceEditModal({ invoice, isOpen, onClose, onSave }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    invoice_date: '',
    status: 'DRAFT',
    payment_method: '',
    amount_paid: 0,
    total_amount: 0,
    type: 'STANDARD'
  });

  const [invoiceLines, setInvoiceLines] = useState([]);
  const [showNomenclature, setShowNomenclature] = useState(false);

  // Charger les lignes de facture
  const { data: existingLines = [] } = useQuery({
    queryKey: ['invoiceLines', invoice?.id],
    queryFn: () => base44.entities.InvoiceLine.filter({ invoice_id: invoice?.id }),
    enabled: !!invoice?.id
  });

  useEffect(() => {
    if (invoice) {
      const invDate = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date();
      
      setFormData({
        invoice_date: isValid(invDate) ? format(invDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        status: invoice.status || 'DRAFT',
        payment_method: invoice.payment_method || '',
        amount_paid: (invoice.amount_paid || 0) / 100,
        total_amount: (invoice.total_amount || 0) / 100,
        type: invoice.type || 'STANDARD'
      });
    }
  }, [invoice]);

  useEffect(() => {
    if (existingLines.length > 0) {
      setInvoiceLines(existingLines.map(line => ({
        id: line.id,
        code: line.nomenclature_code,
        description: line.description,
        quantity: line.quantity || 1,
        unit_price: (line.unit_price || 0) / 100,
        total: (line.total_amount || 0) / 100
      })));
    }
  }, [existingLines]);

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      // Mettre à jour la facture
      await base44.entities.Invoice.update(invoice.id, {
        invoice_date: data.invoice_date,
        status: data.status,
        payment_method: data.payment_method,
        amount_paid: Math.round(data.amount_paid * 100),
        total_amount: Math.round(data.total_amount * 100),
        type: data.type
      });

      // Mettre à jour les lignes
      for (const line of invoiceLines) {
        if (line.id) {
          await base44.entities.InvoiceLine.update(line.id, {
            nomenclature_code: line.code,
            description: line.description,
            quantity: line.quantity,
            unit_price: Math.round(line.unit_price * 100),
            total_amount: Math.round(line.total * 100)
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_invoices'] });
      toast.success('Facture mise à jour');
      onSave?.();
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  });

  const handleAddLine = (nomenclature) => {
    const newLine = {
      id: null,
      code: nomenclature.code,
      description: nomenclature.description || nomenclature.libelle_fr,
      quantity: 1,
      unit_price: (nomenclature.honoraire || 0) / 100,
      total: (nomenclature.honoraire || 0) / 100
    };
    setInvoiceLines([...invoiceLines, newLine]);
    setShowNomenclature(false);
    recalculateTotal([...invoiceLines, newLine]);
  };

  const handleUpdateLine = (index, field, value) => {
    const updated = [...invoiceLines];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    setInvoiceLines(updated);
    recalculateTotal(updated);
  };

  const handleRemoveLine = (index) => {
    const updated = invoiceLines.filter((_, i) => i !== index);
    setInvoiceLines(updated);
    recalculateTotal(updated);
  };

  const recalculateTotal = (lines) => {
    const total = lines.reduce((sum, line) => sum + (line.total || 0), 0);
    setFormData(prev => ({ ...prev, total_amount: total }));
  };

  const handleSave = () => {
    updateInvoiceMutation.mutate(formData);
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            Modifier la facture
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              {invoice.id?.substring(0, 8)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Infos générales */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date de facturation</Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={opt.color}>{opt.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="ATTESTATION">Attestation</SelectItem>
                  <SelectItem value="EFACT">eFact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lignes de facture */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Lignes de facturation</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowNomenclature(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter un acte
              </Button>
            </div>

            {invoiceLines.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Aucune ligne de facturation
              </p>
            ) : (
              <div className="space-y-2">
                {invoiceLines.map((line, idx) => (
                  <Card key={idx} className="bg-slate-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {line.code}
                            </Badge>
                            <span className="text-sm font-medium">{line.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleUpdateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm text-muted-foreground">×</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => handleUpdateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24 h-8"
                          />
                          <span className="text-sm font-medium w-20 text-right">
                            {line.total.toFixed(2)}€
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-100"
                            onClick={() => handleRemoveLine(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Paiement */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-100 rounded-lg">
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant payé</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
                />
                <Euro className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total facture</Label>
              <div className="p-2 bg-white rounded border text-lg font-bold text-center">
                {formData.total_amount.toFixed(2)} €
              </div>
            </div>
          </div>

          {/* Solde */}
          {formData.total_amount > 0 && (
            <div className="flex justify-end">
              <div className={`px-4 py-2 rounded-lg ${
                formData.amount_paid >= formData.total_amount 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                <span className="text-sm">Solde restant: </span>
                <span className="font-bold">
                  {Math.max(0, formData.total_amount - formData.amount_paid).toFixed(2)} €
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateInvoiceMutation.isPending}
            className="gap-2"
          >
            {updateInvoiceMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>

        {/* Modal nomenclature */}
        {showNomenclature && (
          <Dialog open={showNomenclature} onOpenChange={setShowNomenclature}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un acte</DialogTitle>
              </DialogHeader>
              <NomenSearch onSelect={handleAddLine} />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}