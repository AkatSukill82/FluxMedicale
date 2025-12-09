import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function UnpaidInvoicesReport({ analytics, isLoading }) {
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  if (isLoading || !analytics) {
    return <div className="text-center py-12">Chargement des données...</div>;
  }

  const unpaidWithDetails = analytics.unpaidInvoices.map(inv => {
    const patient = patients.find(p => p.id === inv.patient_id);
    const patientName = patient?.name?.[0] 
      ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
      : 'Patient inconnu';
    const daysOverdue = differenceInDays(new Date(), new Date(inv.invoice_date));
    
    return {
      ...inv,
      patientName,
      daysOverdue,
      priority: daysOverdue > 60 ? 'high' : daysOverdue > 30 ? 'medium' : 'low'
    };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);

  const totalUnpaid = unpaidWithDetails.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
  const highPriority = unpaidWithDetails.filter(inv => inv.priority === 'high');
  const mediumPriority = unpaidWithDetails.filter(inv => inv.priority === 'medium');
  const lowPriority = unpaidWithDetails.filter(inv => inv.priority === 'low');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Total impayé</p>
            <p className="text-3xl font-bold text-red-600">{totalUnpaid.toFixed(2)}€</p>
            <p className="text-xs text-slate-500 mt-1">{unpaidWithDetails.length} factures</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Priorité haute</p>
            <p className="text-3xl font-bold text-red-600">{highPriority.length}</p>
            <p className="text-xs text-slate-500 mt-1">&gt; 60 jours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Priorité moyenne</p>
            <p className="text-3xl font-bold text-orange-600">{mediumPriority.length}</p>
            <p className="text-xs text-slate-500 mt-1">30-60 jours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Priorité basse</p>
            <p className="text-3xl font-bold text-yellow-600">{lowPriority.length}</p>
            <p className="text-xs text-slate-500 mt-1">&lt; 30 jours</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {unpaidWithDetails.map(inv => (
          <Card key={inv.id} className={
            inv.priority === 'high' ? 'border-red-300 bg-red-50' : 
            inv.priority === 'medium' ? 'border-orange-300 bg-orange-50' : ''
          }>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-5 h-5 ${
                      inv.priority === 'high' ? 'text-red-600' :
                      inv.priority === 'medium' ? 'text-orange-600' : 'text-yellow-600'
                    }`} />
                    <h4 className="font-semibold">{inv.patientName}</h4>
                    <Badge variant={
                      inv.priority === 'high' ? 'destructive' :
                      inv.priority === 'medium' ? 'default' : 'outline'
                    }>
                      {inv.daysOverdue} jours de retard
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-slate-600">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Facture: {format(new Date(inv.invoice_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                    <p className="text-slate-600">
                      Type: {inv.type || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {((inv.total_amount || 0) / 100).toFixed(2)}€
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Relancer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}