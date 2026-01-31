import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  FileText,
  User,
  Euro,
  Calculator,
  Loader2,
  Search
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function InvoiceCreator({ isOpen, onClose, patient, consultation, onCreated }) {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState(patient || null);
  const [patientSearch, setPatientSearch] = useState('');
  
  const [invoiceData, setInvoiceData] = useState({
    type: 'STANDARD',
    payment_method: 'BANK',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    payment_terms: 'Paiement à 30 jours',
    notes: ''
  });

  const [lines, setLines] = useState([
    { id: '1', description: '', quantity: 1, unit_price: 0, amount: 0, vat_rate: 0 }
  ]);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 200),
    enabled: !patient
  });

  const { data: tarifs = [] } = useQuery({
    queryKey: ['tarifs'],
    queryFn: () => base44.entities.Tarif.filter({ is_active: true })
  });

  const filteredPatients = patients.filter(p => {
    if (!patientSearch) return true;
    const name = p.name?.find(n => n.use === 'official');
    const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.toLowerCase();
    return fullName.includes(patientSearch.toLowerCase());
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const invoiceNumber = `FAC-${format(new Date(), 'yyyyMMdd')}-${Date.now().toString().slice(-4)}`;
      
      return base44.entities.Invoice.create({
        ...data,
        invoice_number: invoiceNumber,
        patient_id: selectedPatient.id,
        provider_id: user.inami || user.email,
        amount_due: data.total_amount
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Facture créée avec succès');
      if (onCreated) onCreated(result);
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de la création', { description: error.message });
    }
  });

  const addLine = () => {
    setLines([...lines, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      vat_rate: 0
    }]);
  };

  const updateLine = (id, field, value) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = updated.quantity * updated.unit_price;
      }
      return updated;
    }));
  };

  const removeLine = (id) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const applyTarif = (lineId, tarifCode) => {
    const tarif = tarifs.find(t => t.code === tarifCode);
    if (tarif) {
      updateLine(lineId, 'description', tarif.label);
      updateLine(lineId, 'unit_price', tarif.base_price);
      updateLine(lineId, 'vat_rate', tarif.vat_rate || 0);
      updateLine(lineId, 'nomenclature_code', tarif.nomenclature_code);
    }
  };

  const subtotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const vatAmount = lines.reduce((sum, l) => sum + ((l.amount || 0) * (l.vat_rate || 0) / 100), 0);
  const total = subtotal + vatAmount;

  const handleSubmit = () => {
    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    if (lines.every(l => !l.description)) {
      toast.error('Veuillez ajouter au moins une ligne');
      return;
    }

    createMutation.mutate({
      ...invoiceData,
      invoice_lines: lines.filter(l => l.description),
      subtotal: Math.round(subtotal),
      vat_amount: Math.round(vatAmount),
      total_amount: Math.round(total)
    });
  };

  const getPatientName = (p) => {
    const name = p?.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Nouvelle facture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélection patient */}
          {!patient && (
            <div className="space-y-2">
              <Label>Patient</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{getPatientName(selectedPatient)}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatient.birthDate}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                    Changer
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un patient..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    {filteredPatients.slice(0, 10).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="w-full p-2 text-left hover:bg-slate-50 border-b last:border-0"
                      >
                        <p className="font-medium text-sm">{getPatientName(p)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Informations facture */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={invoiceData.type}
                onValueChange={(v) => setInvoiceData({ ...invoiceData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="EFACT">eFact</SelectItem>
                  <SelectItem value="EATTEST">eAttest</SelectItem>
                  <SelectItem value="PAPER">Papier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                value={invoiceData.payment_method}
                onValueChange={(v) => setInvoiceData({ ...invoiceData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">Virement</SelectItem>
                  <SelectItem value="CARD">Carte</SelectItem>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="DOMICILIATION">Domiciliation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date facture</Label>
              <Input
                type="date"
                value={invoiceData.invoice_date}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Échéance</Label>
              <Input
                type="date"
                value={invoiceData.due_date}
                onChange={(e) => setInvoiceData({ ...invoiceData, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Lignes de facturation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Lignes de facturation</Label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <div className="flex gap-1">
                      <Select onValueChange={(v) => applyTarif(line.id, v)}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Tarif" />
                        </SelectTrigger>
                        <SelectContent>
                          {tarifs.map(t => (
                            <SelectItem key={t.id} value={t.code}>
                              {t.code} - {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Qté</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Prix unit. (ct)</Label>
                    <Input
                      type="number"
                      value={line.unit_price}
                      onChange={(e) => updateLine(line.id, 'unit_price', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Total</Label>
                    <div className="h-9 flex items-center px-3 bg-white border rounded-md font-medium">
                      {(line.amount / 100).toFixed(2)}€
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totaux */}
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{(subtotal / 100).toFixed(2)}€</span>
                  </div>
                  {vatAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA</span>
                      <span>{(vatAmount / 100).toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">{(total / 100).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
              placeholder="Notes internes ou informations supplémentaires..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Créer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}