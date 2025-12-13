import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Euro, Calendar, CreditCard, Banknote, FileText } from 'lucide-react';

export default function PaymentHistory({ patient }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', patient.id],
    queryFn: () => base44.entities.Payment.filter({ patient_id: patient.id }, '-payment_date', 100)
  });

  const { data: creditNotes = [] } = useQuery({
    queryKey: ['credit_notes', patient.id],
    queryFn: () => base44.entities.CreditNote.filter({ patient_id: patient.id }, '-issue_date', 100)
  });

  const getPaymentIcon = (method) => {
    switch(method) {
      case 'CARD': return <CreditCard className="w-4 h-4" />;
      case 'CASH': return <Euro className="w-4 h-4" />;
      case 'BANK_TRANSFER': return <Banknote className="w-4 h-4" />;
      case 'INSURANCE': return <FileText className="w-4 h-4" />;
      case 'CREDIT_NOTE': return <FileText className="w-4 h-4" />;
      default: return <Euro className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      CARD: 'Carte',
      CASH: 'Espèces',
      BANK_TRANSFER: 'Virement',
      INSURANCE: 'Mutuelle',
      CREDIT_NOTE: 'Avoir'
    };
    return labels[method] || method;
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCredits = creditNotes
    .filter(cn => cn.status === 'APPLIED')
    .reduce((sum, cn) => sum + (cn.amount || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Chargement de l'historique...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total payé</p>
            <p className="text-2xl font-bold text-green-600">
              {(totalPaid / 100).toFixed(2)}€
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.length} paiement(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Avoirs appliqués</p>
            <p className="text-2xl font-bold text-blue-600">
              {(totalCredits / 100).toFixed(2)}€
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {creditNotes.filter(cn => cn.status === 'APPLIED').length} avoir(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des paiements */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Aucun paiement enregistré
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      {getPaymentIcon(payment.payment_method)}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {(payment.amount / 100).toFixed(2)}€
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(payment.payment_date), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                      {payment.reference && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Réf: {payment.reference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </Badge>
                    {payment.reconciled && (
                      <Badge className="ml-2 bg-green-100 text-green-800">
                        Rapproché
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avoirs */}
      {creditNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Avoirs et notes de crédit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creditNotes.map(cn => (
                <div
                  key={cn.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {(cn.amount / 100).toFixed(2)}€
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cn.reason_details || 'Avoir'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(cn.issue_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={
                      cn.status === 'APPLIED' ? 'bg-green-100 text-green-800' :
                      cn.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {cn.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}