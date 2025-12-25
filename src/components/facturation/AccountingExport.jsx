import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { logDataExport } from '../security/AuditTrailService';

const EXPORT_FORMATS = [
  { id: 'csv', label: 'CSV (Excel)', icon: FileSpreadsheet, description: 'Compatible Excel, Numbers, Google Sheets' },
  { id: 'bob50', label: 'BOB 50', icon: FileText, description: 'Format BOB Software' },
  { id: 'winbooks', label: 'Winbooks', icon: FileText, description: 'Format Winbooks comptabilité' },
  { id: 'xml', label: 'XML CODA', icon: FileText, description: 'Format bancaire belge CODA' }
];

const PERIOD_PRESETS = [
  { id: 'current_month', label: 'Mois en cours' },
  { id: 'last_month', label: 'Mois précédent' },
  { id: 'last_quarter', label: 'Dernier trimestre' },
  { id: 'custom', label: 'Période personnalisée' }
];

export default function AccountingExport({ isOpen, onClose }) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [periodPreset, setPeriodPreset] = useState('last_month');
  const [startDate, setStartDate] = useState(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState(endOfMonth(subMonths(new Date(), 1)));
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const handlePeriodChange = (preset) => {
    setPeriodPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'current_month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last_month':
        setStartDate(startOfMonth(subMonths(now, 1)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
      case 'last_quarter':
        setStartDate(startOfMonth(subMonths(now, 3)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
      default:
        break;
    }
  };

  const generateCSV = (invoices, lines) => {
    const headers = [
      'Date', 'N° Facture', 'Patient', 'NISS', 'Code Nomenclature', 
      'Libellé', 'Montant HT', 'Part Mutuelle', 'Part Patient', 
      'Mode Paiement', 'Statut'
    ];

    const rows = invoices.flatMap(inv => {
      const invLines = lines.filter(l => l.invoice_id === inv.id);
      if (invLines.length === 0) {
        return [[
          inv.invoice_date,
          inv.id,
          inv.patient_name || '',
          inv.patient_niss || '',
          '',
          'Consultation',
          (inv.total_amount / 100).toFixed(2),
          (inv.insurance_contribution / 100).toFixed(2),
          (inv.patient_contribution / 100).toFixed(2),
          inv.payment_method,
          inv.status
        ]];
      }
      return invLines.map(line => [
        inv.invoice_date,
        inv.id,
        inv.patient_name || '',
        inv.patient_niss || '',
        line.nomenclature_code,
        line.nomenclature_label,
        (line.amount / 100).toFixed(2),
        ((line.amount * 0.75) / 100).toFixed(2),
        ((line.amount * 0.25) / 100).toFixed(2),
        inv.payment_method,
        inv.status
      ]);
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    return csvContent;
  };

  const generateBOB50 = (invoices) => {
    // Format BOB 50 simplifié
    const lines = invoices.map((inv, idx) => {
      const docNum = `VE${format(new Date(inv.invoice_date), 'yyyyMM')}${String(idx + 1).padStart(4, '0')}`;
      return [
        docNum,
        format(new Date(inv.invoice_date), 'dd/MM/yyyy'),
        '70000000', // Compte ventes
        '', // Contrepartie
        (inv.total_amount / 100).toFixed(2),
        'D',
        inv.id
      ].join('\t');
    });

    return lines.join('\n');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      // Récupérer les factures de la période
      const allInvoices = await base44.entities.Invoice.list('-invoice_date', 1000);
      const invoices = allInvoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= startDate && invDate <= endDate;
      });

      // Récupérer les lignes de facture
      const allLines = await base44.entities.InvoiceLine.list();
      const invoiceIds = invoices.map(i => i.id);
      const lines = allLines.filter(l => invoiceIds.includes(l.invoice_id));

      // Enrichir avec les données patient
      const patients = await base44.entities.Patient.list();
      const enrichedInvoices = invoices.map(inv => {
        const patient = patients.find(p => p.id === inv.patient_id);
        const officialName = patient?.name?.find(n => n.use === 'official') || {};
        return {
          ...inv,
          patient_name: patient ? `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim() : '',
          patient_niss: patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || ''
        };
      });

      // Générer le fichier selon le format
      let content, filename, mimeType;

      switch (exportFormat) {
        case 'csv':
          content = generateCSV(enrichedInvoices, lines);
          filename = `export_comptable_${format(startDate, 'yyyy-MM')}_${format(endDate, 'yyyy-MM')}.csv`;
          mimeType = 'text/csv;charset=utf-8';
          break;
        case 'bob50':
          content = generateBOB50(enrichedInvoices);
          filename = `bob50_${format(startDate, 'yyyyMM')}.txt`;
          mimeType = 'text/plain;charset=utf-8';
          break;
        case 'winbooks':
          content = generateCSV(enrichedInvoices, lines); // Simplifié
          filename = `winbooks_${format(startDate, 'yyyyMM')}.csv`;
          mimeType = 'text/csv;charset=utf-8';
          break;
        default:
          content = JSON.stringify(enrichedInvoices, null, 2);
          filename = `export_${format(startDate, 'yyyy-MM')}.json`;
          mimeType = 'application/json';
      }

      // Logger l'export pour audit
      await logDataExport('GLOBAL', exportFormat, ['invoices', 'invoice_lines']);

      // Télécharger
      const blob = new Blob(['\ufeff' + content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExportResult({
        success: true,
        invoiceCount: invoices.length,
        total: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0) / 100
      });

      toast.success(`Export réussi: ${invoices.length} factures`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
      setExportResult({ success: false, error: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Export comptable
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format d'export */}
          <div className="space-y-2">
            <Label>Format d'export</Label>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setExportFormat(fmt.id)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    exportFormat === fmt.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <fmt.icon className={`w-5 h-5 ${exportFormat === fmt.id ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{fmt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{fmt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Période */}
          <div className="space-y-2">
            <Label>Période</Label>
            <Select value={periodPreset} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {periodPreset === 'custom' && (
              <div className="flex gap-4 mt-3">
                <div className="flex-1">
                  <Label className="text-xs">Du</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(startDate, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Au</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(endDate, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Période: du {format(startDate, 'd MMMM yyyy', { locale: fr })} au {format(endDate, 'd MMMM yyyy', { locale: fr })}
            </p>
          </div>

          {/* Résultat */}
          {exportResult && (
            <Card className={exportResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="p-4">
                {exportResult.success ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Export réussi</p>
                      <p className="text-sm text-green-700">
                        {exportResult.invoiceCount} factures • Total: {exportResult.total.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-700">Erreur: {exportResult.error}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button onClick={handleExport} disabled={isExporting} className="bg-green-600 hover:bg-green-700">
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}