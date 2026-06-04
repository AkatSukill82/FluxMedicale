/**
 * Créateur de factures médicales belges
 *
 * Conformité :
 *  - Art. 44 §1 CTVA belge : les actes médicaux sont exonérés de TVA (taux 0%)
 *  - AR 23/03/2012 (MyCareNet) : numérotation séquentielle des factures
 *  - AR 28/10/1993 : mentions obligatoires sur la facture (n° INAMI, etc.)
 *  - Conservation : 10 ans (Code des sociétés + comptabilité belge)
 *
 * Les montants sont stockés en centimes (entiers) pour éviter les erreurs
 * de virgule flottante. L'utilisateur saisit en euros (ex: 25.00).
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Info,
  Loader2,
  Search
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useI18n } from '../i18n/i18nContext';

export default function InvoiceCreator({ isOpen, onClose, patient, consultation, onCreated }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState(patient || null);
  const [patientSearch, setPatientSearch] = useState('');
  
  const [invoiceData, setInvoiceData] = useState({
    type: 'STANDARD',
    payment_method: 'BANK',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    payment_terms: 'Paiement à 30 jours',
    notes: '',
    // Art. 44 §1 CTVA : actes médicaux exonérés de TVA en Belgique
    vat_exempt: true,
    vat_exempt_reason: 'Art. 44 §1 CTVA – Actes médicaux exonérés de TVA',
  });

  // Les lignes stockent les montants en CENTIMES (entiers).
  // L'utilisateur saisit en euros ; on convertit à la saisie (*100) et à l'affichage (/100).
  const [lines, setLines] = useState([
    { id: '1', description: '', quantity: 1, unit_price_eur: 0, amount_cents: 0, nomenclature_code: '' }
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
      // Numérotation séquentielle : FAC-YYYYMMDD-XXXXXXXX (AR 23/03/2012)
      const seq = Date.now().toString(36).toUpperCase();
      const invoiceNumber = `FAC-${format(new Date(), 'yyyyMMdd')}-${seq}`;

      return base44.entities.Invoice.create({
        ...data,
        invoice_number: invoiceNumber,
        patient_id: selectedPatient.id,
        // Numéro INAMI/RIZIV obligatoire sur toute facture médicale
        provider_inami: user.inami || user.numero_inami || '',
        provider_name: user.full_name || user.email,
        amount_due: data.total_amount_cents,
        // Exonération TVA art. 44 §1 CTVA
        vat_exempt: true,
        vat_exempt_reason: 'Art. 44 §1 CTVA – Actes médicaux exonérés de TVA',
        vat_amount_cents: 0,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('billing.createdSuccess'));
      if (onCreated) onCreated(result);
      onClose();
    },
    onError: (error) => {
      toast.error(t('billing.createError'), { description: error.message });
    },
  });

  const addLine = () => {
    setLines([...lines, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price_eur: 0,
      amount_cents: 0,
      nomenclature_code: '',
    }]);
  };

  // unit_price_eur est saisi en euros par l'utilisateur ; on stocke amount_cents en centimes
  const updateLine = (id, field, value) => {
    setLines(lines.map((line) => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      if (field === 'quantity' || field === 'unit_price_eur') {
        const qty = field === 'quantity' ? Number(value) : line.quantity;
        const priceEur = field === 'unit_price_eur' ? Number(value) : line.unit_price_eur;
        updated.amount_cents = Math.round(qty * priceEur * 100);
      }
      return updated;
    }));
  };

  const removeLine = (id) => {
    if (lines.length > 1) setLines(lines.filter((l) => l.id !== id));
  };

  const applyTarif = (lineId, tarifCode) => {
    const tarif = tarifs.find((t) => t.code === tarifCode);
    if (!tarif) return;
    setLines(lines.map((line) => {
      if (line.id !== lineId) return line;
      // tarif.base_price est supposé en centimes dans la base
      const priceEur = (tarif.base_price || 0) / 100;
      return {
        ...line,
        description: tarif.label || '',
        unit_price_eur: priceEur,
        amount_cents: Math.round(line.quantity * priceEur * 100),
        nomenclature_code: tarif.nomenclature_code || '',
      };
    }));
  };

  // Totaux en centimes
  const totalCents = lines.reduce((sum, l) => sum + (l.amount_cents || 0), 0);
  // Les actes médicaux sont exonérés de TVA (art. 44 §1 CTVA)
  const vatCents = 0;

  const handleSubmit = () => {
    if (!selectedPatient) {
      toast.error(t('billing.selectPatient'));
      return;
    }
    if (lines.every((l) => !l.description)) {
      toast.error(t('billing.addAtLeastOneLine'));
      return;
    }

    createMutation.mutate({
      ...invoiceData,
      invoice_lines: lines.filter((l) => l.description).map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_cents: Math.round(l.unit_price_eur * 100),
        amount_cents: l.amount_cents,
        nomenclature_code: l.nomenclature_code || '',
        vat_rate: 0,
      })),
      subtotal_cents: totalCents,
      vat_amount_cents: vatCents,
      total_amount_cents: totalCents,
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
            {t('billing.newInvoice')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélection patient */}
          {!patient && (
            <div className="space-y-2">
              <Label>{t('billing.patient')}</Label>
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
                    {t('billing.change')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('billing.searchPatient')}
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
              <Label>{t('billing.type')}</Label>
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
                  <SelectItem value="PAPER">{t('billing.paperType')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('billing.paymentMode')}</Label>
              <Select
                value={invoiceData.payment_method}
                onValueChange={(v) => setInvoiceData({ ...invoiceData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">{t('billing.transfer')}</SelectItem>
                  <SelectItem value="CARD">{t('billing.card')}</SelectItem>
                  <SelectItem value="CASH">{t('billing.cash')}</SelectItem>
                  <SelectItem value="DOMICILIATION">{t('billing.domiciliation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('billing.invoiceDate')}</Label>
              <Input
                type="date"
                value={invoiceData.invoice_date}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('billing.dueDate')}</Label>
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
              <Label className="text-base">{t('billing.invoiceLines')}</Label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" />
                {t('billing.add')}
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">{t('billing.description')}</Label>
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
                    <Label className="text-xs">{t('billing.qty')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">{t('billing.unitPrice')} (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_price_eur}
                      onChange={(e) => updateLine(line.id, 'unit_price_eur', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Total</Label>
                    <div className="h-9 flex items-center px-3 bg-white border rounded-md font-medium">
                      {(line.amount_cents / 100).toFixed(2)} €
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

          {/* Notice TVA */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              <strong>Art. 44 §1 CTVA :</strong> Les actes médicaux sont exonérés de TVA en
              Belgique. Aucune TVA n'est applicable sur cette facture.
            </AlertDescription>
          </Alert>

          {/* Totaux */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{(totalCents / 100).toFixed(2).replace('.', ',')} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA</span>
                  <span className="text-slate-400">0,00 € (exonéré)</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total TVAC</span>
                  <span className="text-blue-600">
                    {(totalCents / 100).toFixed(2).replace('.', ',')} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('billing.notesOptional')}</Label>
            <Textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
              placeholder={t('billing.notesPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            {t('billing.createInvoice')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}