import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileDown, Calculator, Loader2, CheckCircle2, AlertTriangle,
  Calendar, Download, FileSpreadsheet, History, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import ExportHistoryList from '../components/accounting/ExportHistoryList';
import ExportPreview from '../components/accounting/ExportPreview';

const EXPORT_FORMATS = [
  { value: 'BOB', label: 'BOB Software', description: 'Format BOB 50/BOB Next', icon: '🅱️' },
  { value: 'HORUS', label: 'Horus', description: 'Format Horus Comptabilité', icon: '🔵' },
  { value: 'OCTOPUS', label: 'Octopus', description: 'Format Octopus Online', icon: '🐙' },
  { value: 'WINBOOKS', label: 'WinBooks', description: 'Format WinBooks Classic/Connect', icon: '📗' },
  { value: 'CSV_GENERIC', label: 'CSV Générique', description: 'Format CSV standard', icon: '📊' },
];

export default function ExportComptable() {
  const [exportType, setExportType] = useState('');
  const [periodStart, setPeriodStart] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices-export', periodStart, periodEnd],
    queryFn: () => base44.entities.Invoice.filter({}, '-invoice_date', 5000),
    select: (data) => data.filter(inv => {
      if (!inv.invoice_date) return false;
      return inv.invoice_date >= periodStart && inv.invoice_date <= periodEnd;
    }),
  });

  const { data: exportHistory = [] } = useQuery({
    queryKey: ['export-history'],
    queryFn: () => base44.entities.AccountingExportLog.list('-created_date', 50),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments-export', periodStart, periodEnd],
    queryFn: () => base44.entities.Payment.filter({}, '-created_date', 5000),
    select: (data) => data.filter(p => {
      if (!p.created_date) return false;
      const d = p.created_date.split('T')[0];
      return d >= periodStart && d <= periodEnd;
    }),
  });

  const summary = useMemo(() => {
    const totalHT = invoices.reduce((acc, inv) => acc + (inv.subtotal || 0), 0);
    const totalTVA = invoices.reduce((acc, inv) => acc + (inv.vat_amount || 0), 0);
    const totalTTC = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
    const totalPaid = invoices.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0);
    const totalDue = totalTTC - totalPaid;
    const paidCount = invoices.filter(inv => inv.status === 'PAID').length;
    const pendingCount = invoices.filter(inv => ['PENDING', 'SENT', 'ACCEPTED'].includes(inv.status)).length;
    return { totalHT, totalTVA, totalTTC, totalPaid, totalDue, paidCount, pendingCount, count: invoices.length };
  }, [invoices]);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      // Generate CSV content
      const lines = generateExportData(invoices, exportType);
      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], `export_${exportType}_${periodStart}_${periodEnd}.csv`, { type: 'text/csv' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.AccountingExportLog.create({
        export_type: exportType,
        period_start: periodStart,
        period_end: periodEnd,
        invoice_count: invoices.length,
        total_amount: summary.totalTTC,
        file_url,
        status: 'completed',
        exported_by: user.email,
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = file_url;
      link.download = `export_${exportType}_${periodStart}_${periodEnd}.csv`;
      link.click();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-history'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="w-8 h-8 text-emerald-600" />
            Export Comptable
          </h1>
          <p className="text-muted-foreground">
            Exportez vos données vers BOB, Horus, Octopus, WinBooks ou CSV
          </p>
        </div>
      </div>

      {/* Period & Format Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Date de début</label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date de fin</label>
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Format d'export</label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger><SelectValue placeholder="Choisir un format..." /></SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>
                      <span className="flex items-center gap-2">
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="bg-muted/50"><CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{summary.count}</p>
              <p className="text-[10px] text-muted-foreground">Factures</p>
            </CardContent></Card>
            <Card className="bg-muted/50"><CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{(summary.totalHT / 100).toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">Total HT</p>
            </CardContent></Card>
            <Card className="bg-muted/50"><CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{(summary.totalTVA / 100).toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">TVA</p>
            </CardContent></Card>
            <Card className="bg-green-50"><CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">{(summary.totalPaid / 100).toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">Payé</p>
            </CardContent></Card>
            <Card className={summary.totalDue > 0 ? 'bg-red-50' : 'bg-muted/50'}><CardContent className="p-3 text-center">
              <p className={`text-lg font-bold ${summary.totalDue > 0 ? 'text-red-600' : ''}`}>{(summary.totalDue / 100).toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">Restant dû</p>
            </CardContent></Card>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!exportType || invoices.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Aperçu
            </Button>
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={!exportType || invoices.length === 0 || exportMutation.isPending}
            >
              {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Exporter ({summary.count} factures)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Preview */}
      {showPreview && (
        <ExportPreview invoices={invoices} exportType={exportType} onClose={() => setShowPreview(false)} />
      )}

      {/* Export History */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <History className="w-5 h-5" />
          Historique des exports
        </h2>
        <ExportHistoryList history={exportHistory} />
      </div>
    </div>
  );
}

function generateExportData(invoices, exportType) {
  const headers = {
    BOB: 'Journal;Date;Numéro;Compte;Libellé;Montant;DC;TVA',
    HORUS: 'DATE;JOURNAL;PIECE;COMPTE;LIBELLE;DEBIT;CREDIT;TVA_CODE',
    OCTOPUS: 'BookingYear;BookingPeriod;Journal;DocNumber;DocDate;AccountNumber;Description;Amount;VATCode',
    WINBOOKS: 'DBK_CODE;DBK_TYPE;FIS_YEAR;FIS_PERIOD;DOC_NUMBER;DOC_DATE;ACCOUNT;DESCRIPTION;AMOUNT_EUR;VAT_CODE',
    CSV_GENERIC: 'Date;Numéro Facture;Patient;Description;Montant HT;TVA;Montant TTC;Payé;Statut',
  };

  const lines = [headers[exportType] || headers.CSV_GENERIC];

  invoices.forEach((inv, i) => {
    const date = inv.invoice_date || '';
    const num = inv.invoice_number || `FAC-${i + 1}`;
    const name = inv.patient_name || '';
    const ht = ((inv.subtotal || 0) / 100).toFixed(2);
    const tva = ((inv.vat_amount || 0) / 100).toFixed(2);
    const ttc = ((inv.total_amount || 0) / 100).toFixed(2);
    const paid = ((inv.amount_paid || 0) / 100).toFixed(2);

    switch (exportType) {
      case 'BOB':
        lines.push(`VEN;${date};${num};700000;Honoraires ${name};${ttc};C;21`);
        break;
      case 'HORUS':
        lines.push(`${date};VEN;${num};700000;Honoraires ${name};0;${ttc};21`);
        break;
      case 'OCTOPUS':
        const year = date.split('-')[0] || '';
        const period = date.split('-')[1] || '';
        lines.push(`${year};${period};VEN;${num};${date};700000;Honoraires ${name};${ttc};21`);
        break;
      case 'WINBOOKS':
        lines.push(`VEN;0;${date.split('-')[0] || ''};${date.split('-')[1] || ''};${num};${date};700000;Honoraires ${name};${ttc};21`);
        break;
      default:
        lines.push(`${date};${num};${name};Consultation;${ht};${tva};${ttc};${paid};${inv.status || ''}`);
    }
  });

  return lines;
}