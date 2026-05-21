import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, FileSpreadsheet } from 'lucide-react';

export default function ExportPreview({ invoices, exportType, onClose }) {
  const preview = invoices.slice(0, 20);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Aperçu de l'export {exportType} ({invoices.length} lignes)
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>N° Facture</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead className="text-right">Montant HT</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead className="text-right">Montant TTC</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map(inv => (
              <TableRow key={inv.id}>
                <TableCell className="text-xs">{inv.invoice_date || '-'}</TableCell>
                <TableCell className="text-xs font-mono">{inv.invoice_number || '-'}</TableCell>
                <TableCell className="text-xs">{inv.patient_name || '-'}</TableCell>
                <TableCell className="text-xs text-right">{((inv.subtotal || 0) / 100).toFixed(2)}€</TableCell>
                <TableCell className="text-xs text-right">{((inv.vat_amount || 0) / 100).toFixed(2)}€</TableCell>
                <TableCell className="text-xs text-right font-medium">{((inv.total_amount || 0) / 100).toFixed(2)}€</TableCell>
                <TableCell className="text-xs">{inv.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {invoices.length > 20 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            ... et {invoices.length - 20} lignes supplémentaires
          </p>
        )}
      </CardContent>
    </Card>
  );
}