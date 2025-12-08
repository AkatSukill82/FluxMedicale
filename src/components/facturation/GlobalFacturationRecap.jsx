import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Download,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function GlobalFacturationRecap({ invoices, transactions, filters, onExportPDF }) {
  const totalFacture = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaye = invoices
    .filter(inv => inv.status === 'ACCEPTED' || inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const resteDu = totalFacture - totalPaye;

  const byType = {
    EFACT: invoices.filter(inv => inv.type === 'EFACT'),
    EATTEST: invoices.filter(inv => inv.type === 'EATTEST'),
    PAPER: invoices.filter(inv => inv.type === 'PAPER')
  };

  const getPeriodLabel = () => {
    switch(filters.period) {
      case 'today': return "aujourd'hui";
      case '7': return 'des 7 derniers jours';
      case '30': return 'des 30 derniers jours';
      default: return 'de la période sélectionnée';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-900">Total facturé</h3>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">
              {totalFacture.toFixed(2)}€
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {invoices.length} facture(s) {getPeriodLabel()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-900">Total payé</h3>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">
              {totalPaye.toFixed(2)}€
            </p>
            <p className="text-sm text-green-700 mt-1">
              {((totalFacture > 0 ? (totalPaye / totalFacture) * 100 : 0).toFixed(0))}% du total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-orange-900">Reste dû</h3>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-900">
              {resteDu.toFixed(2)}€
            </p>
            <p className="text-sm text-orange-700 mt-1">
              En attente de paiement
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Synthèse par type</CardTitle>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Nombre</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant total</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">% du total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byType).map(([type, invoices]) => {
                const total = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
                const percentage = totalFacture > 0 ? (total / totalFacture) * 100 : 0;
                
                return (
                  <tr key={type} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Badge className={
                        type === 'EFACT' ? 'bg-blue-100 text-blue-800' :
                        type === 'EATTEST' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-800'
                      }>
                        {type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {invoices.length}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {total.toFixed(2)}€
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {percentage.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-slate-50">
                <td className="py-3 px-4">TOTAL</td>
                <td className="py-3 px-4 text-right">{invoices.length}</td>
                <td className="py-3 px-4 text-right">{totalFacture.toFixed(2)}€</td>
                <td className="py-3 px-4 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques MyCareNet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Acceptées</p>
              <p className="text-2xl font-bold text-green-700">
                {transactions.filter(tx => tx.status === 'ACCEPTED').length}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Refusées</p>
              <p className="text-2xl font-bold text-red-700">
                {transactions.filter(tx => tx.status === 'REJECTED' || tx.status === 'ERROR').length}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">En cours</p>
              <p className="text-2xl font-bold text-blue-700">
                {transactions.filter(tx => tx.status === 'PENDING' || tx.status === 'SENT').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}