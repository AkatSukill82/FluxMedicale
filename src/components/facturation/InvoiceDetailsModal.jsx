import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  FileText, 
  Download, 
  Send, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Plus,
  Calendar,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import NomenSearch from '../nomenclature/NomenSearch';
import OAErrorExplainer from './OAErrorExplainer';

export default function InvoiceDetailsModal({ invoice, patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLines, setEditedLines] = useState([]);
  const [showAddLine, setShowAddLine] = useState(false);

  const { data: invoiceLines = [], isLoading } = useQuery({
    queryKey: ['invoiceLines', invoice?.id],
    queryFn: async () => {
      if (!invoice) return [];
      const lines = await base44.entities.InvoiceLine.filter({ invoice_id: invoice.id });
      setEditedLines(lines.map(line => ({ ...line })));
      return lines;
    },
    enabled: !!invoice && isOpen
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, lines }) => {
      // Delete all existing lines
      await Promise.all(
        invoiceLines.map(line => base44.entities.InvoiceLine.delete(line.id))
      );

      // Create new lines
      await Promise.all(
        lines.map(line => 
          base44.entities.InvoiceLine.create({
            invoice_id: invoiceId,
            nomenclature_code: line.nomenclature_code,
            nomenclature_label: line.nomenclature_label,
            quantity: line.quantity,
            unit_price: line.unit_price,
            amount: line.amount,
            date_prestation: line.date_prestation || invoice.invoice_date
          })
        )
      );

      // Update invoice total
      const newTotal = lines.reduce((sum, line) => sum + (line.amount || 0), 0);
      await base44.entities.Invoice.update(invoiceId, {
        total_amount: newTotal * 100,
        patient_contribution: Math.round(newTotal * 100 * 0.2),
        insurance_contribution: Math.round(newTotal * 100 * 0.8)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceLines', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['facturation_initial_data'] });
      setIsEditing(false);
      toast.success('Facture mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const resendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId) => {
      await base44.entities.Invoice.update(invoiceId, {
        status: 'SENT',
        sent_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturation_initial_data'] });
      toast.success('Facture renvoyée');
      onClose();
    }
  });

  const handleLineChange = (index, field, value) => {
    const newLines = [...editedLines];
    newLines[index][field] = field === 'quantity' || field === 'unit_price' ? parseFloat(value) : value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newLines[index].amount = (newLines[index].quantity || 0) * (newLines[index].unit_price || 0);
    }
    
    setEditedLines(newLines);
  };

  const handleRemoveLine = (index) => {
    const newLines = editedLines.filter((_, i) => i !== index);
    setEditedLines(newLines);
  };

  const handleAddCode = (nomenCode) => {
    const newLine = {
      nomenclature_code: nomenCode.code,
      nomenclature_label: nomenCode.title_fr || nomenCode.title_nl,
      quantity: 1,
      unit_price: (nomenCode.honorarium || 0) / 100,
      amount: (nomenCode.honorarium || 0) / 100,
      date_prestation: invoice.invoice_date
    };
    setEditedLines([...editedLines, newLine]);
    setShowAddLine(false);
  };

  const handleSave = () => {
    updateInvoiceMutation.mutate({
      invoiceId: invoice.id,
      lines: editedLines
    });
  };

  const handleCancel = () => {
    setEditedLines(invoiceLines.map(line => ({ ...line })));
    setIsEditing(false);
    setShowAddLine(false);
  };

  const handleResend = () => {
    if (window.confirm('Êtes-vous sûr de vouloir renvoyer cette facture ?')) {
      resendInvoiceMutation.mutate(invoice.id);
    }
  };

  if (!invoice) return null;

  const totalAmount = editedLines.reduce((sum, line) => sum + (line.amount || 0), 0);

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || colors.DRAFT;
  };

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyée',
      ACCEPTED: 'Acceptée',
      REJECTED: 'Refusée',
      PAID: 'Payée'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              Facture {invoice.id.substring(0, 12)}...
            </DialogTitle>
            <Badge className={getStatusColor(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* En-tête facture */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">Date:</span>
                    <span className="font-semibold">
                      {format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">Patient:</span>
                    <span className="font-semibold">{patient?.name?.[0]?.given?.join(' ')} {patient?.name?.[0]?.family}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">Paiement:</span>
                    <span className="font-semibold">{invoice.payment_method}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total facture:</span>
                    <span className="font-bold text-lg">{((invoice.total_amount || 0) / 100).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Part mutuelle:</span>
                    <span className="text-green-600 font-semibold">
                      {((invoice.insurance_contribution || 0) / 100).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Part patient:</span>
                    <span className="text-blue-600 font-semibold">
                      {((invoice.patient_contribution || 0) / 100).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Codes nomenclature */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Codes nomenclature</h3>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} size="sm" variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                    <Button onClick={handleSave} size="sm" disabled={updateInvoiceMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <p className="text-center text-slate-500 py-8">Chargement...</p>
              ) : (
                <div className="space-y-3">
                  {editedLines.map((line, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-slate-50">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-2">
                          <Label className="text-xs">Code</Label>
                          {isEditing ? (
                            <Input
                              value={line.nomenclature_code}
                              onChange={(e) => handleLineChange(index, 'nomenclature_code', e.target.value)}
                              className="h-9 font-mono"
                            />
                          ) : (
                            <p className="font-mono font-semibold">{line.nomenclature_code}</p>
                          )}
                        </div>
                        
                        <div className="col-span-4">
                          <Label className="text-xs">Description</Label>
                          {isEditing ? (
                            <Input
                              value={line.nomenclature_label}
                              onChange={(e) => handleLineChange(index, 'nomenclature_label', e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <p className="text-sm">{line.nomenclature_label}</p>
                          )}
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Quantité</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <p className="font-semibold">{line.quantity}</p>
                          )}
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Prix unitaire</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <p className="font-semibold">{line.unit_price?.toFixed(2)}€</p>
                          )}
                        </div>

                        <div className="col-span-1">
                          <Label className="text-xs">Total</Label>
                          <p className="font-bold text-blue-600">{line.amount?.toFixed(2)}€</p>
                        </div>

                        {isEditing && (
                          <div className="col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLine(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isEditing && !showAddLine && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAddLine(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un code
                    </Button>
                  )}

                  {showAddLine && (
                    <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <Label>Rechercher un code nomenclature</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddLine(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <NomenSearch onSelect={handleAddCode} selectedCodes={editedLines} />
                    </div>
                  )}
                </div>
              )}

              <Separator className="my-4" />

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total calculé:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {totalAmount.toFixed(2)}€
                  </span>
                </div>
                {isEditing && totalAmount !== (invoice.total_amount / 100) && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Le total a changé. Sauvegardez pour mettre à jour la facture.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResend} disabled={resendInvoiceMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              Renvoyer
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}