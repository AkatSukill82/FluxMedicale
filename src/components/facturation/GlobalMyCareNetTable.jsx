import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  RefreshCw,
  Download,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import OAErrorExplainer from './OAErrorExplainer';

export default function GlobalMyCareNetTable({ transactions, invoices, currentUser, isLoading, onRefresh }) {
  const getStatusBadge = (status) => {
    const config = {
      PENDING: { icon: Clock, label: 'En cours', className: 'bg-slate-100 text-slate-800' },
      SENT: { icon: Send, label: 'Envoyée', className: 'bg-blue-100 text-blue-800' },
      ACK_RECEIVED: { icon: CheckCircle, label: 'Accusé reçu', className: 'bg-blue-100 text-blue-800' },
      ACCEPTED: { icon: CheckCircle, label: 'Acceptée', className: 'bg-green-100 text-green-800' },
      REJECTED: { icon: XCircle, label: 'Refusée', className: 'bg-red-100 text-red-800' },
      ERROR: { icon: AlertTriangle, label: 'Erreur', className: 'bg-red-100 text-red-800' }
    };

    const statusConfig = config[status] || config.PENDING;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.className}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const [detailTransaction, setDetailTransaction] = useState(null);

  const handleViewDetails = (transaction) => {
    setDetailTransaction(transaction);
  };

  const handleResend = (transaction) => {
    console.log('[Resend] Transaction:', transaction.transaction_id);
    alert('Correction et renvoi (TODO: préremplit formulaire avec données transaction)');
  };

  const handleDownloadAck = (transaction) => {
    console.log('[Download] Accusé pour:', transaction.transaction_id);
    alert(`Téléchargement accusé OA pour ${transaction.transaction_id}...`);
  };

  const handleOpenPatient = (transaction) => {
    const url = createPageUrl('Patients') + `?patient=${transaction.patient_id}`;
    window.open(url, '_blank');
  };

  const enrichedTransactions = transactions.map(tx => {
    const totalAmount = tx.total_amount || tx.prestations?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
    const paidAmount = tx.status === 'ACCEPTED' ? totalAmount : 0;
    const remainingAmount = tx.status === 'ACCEPTED' ? 0 : totalAmount;
    
    return {
      ...tx,
      totalAmount,
      paidAmount,
      remainingAmount
    };
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-600">Chargement des transactions...</p>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Send className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Aucun envoi MyCareNet
          </h3>
          <p className="text-slate-500">
            Aucune transaction MyCareNet ne correspond aux filtres.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envois aux mutualités (MyCareNet) - {transactions.length}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-900">
            <strong>eFact/eAttest (MyCareNet)</strong> - Retours OA en temps réel depuis l'environnement d'acceptance.
            En production, les statuts et montants payés seront synchronisés automatiquement.
            Obligation e-facturation pour tous au 01/09/2025.
          </AlertDescription>
        </Alert>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date envoi</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Patient</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">OA</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Réf. envoi</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Attendu</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Payé</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Reste dû</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">État</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrichedTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm">
                    {tx.sent_at ? format(new Date(tx.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleOpenPatient(tx)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                    >
                      {tx.patient_name}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold">
                    {tx.mutuelle_code || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-600">
                    {tx.transaction_id ? tx.transaction_id.substring(0, 12) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={tx.transaction_type === 'EFACT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                      {tx.transaction_type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {(tx.totalAmount || 0).toFixed(2)}€
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-700">
                    {(tx.paidAmount || 0).toFixed(2)}€
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-orange-700">
                    {(tx.remainingAmount || 0).toFixed(2)}€
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {getStatusBadge(tx.status)}
                      {(tx.status === 'REJECTED' || tx.status === 'ERROR') && (tx.error_code || tx.error_message) && (
                        <OAErrorExplainer
                          errorCode={tx.error_code}
                          errorMessage={tx.error_message}
                          compact={true}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewDetails(tx)}
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(tx.status === 'REJECTED' || tx.status === 'ERROR') && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleResend(tx)}
                          title="Corriger & renvoyer"
                        >
                          <RefreshCw className="w-4 h-4 text-orange-600" />
                        </Button>
                      )}
                      {(tx.status === 'ACCEPTED' || tx.status === 'ACK_RECEIVED') && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadAck(tx)}
                          title="Télécharger accusé"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          <p>{transactions.length} transaction(s) MyCareNet</p>
        </div>
      </CardContent>
    </Card>
  );
}