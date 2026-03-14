import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, Send, Phone, Mail, ExternalLink } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

function getOverdueLevel(days) {
  if (days >= 120) return { label: 'Critique', color: 'bg-red-600 text-white', textColor: 'text-red-700', bgRow: 'bg-red-50' };
  if (days >= 90) return { label: 'Urgent', color: 'bg-red-100 text-red-800', textColor: 'text-red-600', bgRow: 'bg-orange-50' };
  return { label: 'En retard', color: 'bg-orange-100 text-orange-800', textColor: 'text-orange-600', bgRow: 'bg-yellow-50/50' };
}

export default function OverdueInvoicesAlert({ factures, onSelectFacture }) {
  const today = new Date();

  const overdueFactures = factures
    .filter(f => {
      if (!['envoyee', 'acceptee', 'partielle'].includes(f.statut)) return false;
      if (!f.date_envoi && !f.date_facturation) return false;
      const refDate = new Date(f.date_envoi || f.date_facturation);
      return differenceInDays(today, refDate) >= 60;
    })
    .map(f => {
      const refDate = new Date(f.date_envoi || f.date_facturation);
      const daysOverdue = differenceInDays(today, refDate);
      return { ...f, daysOverdue, level: getOverdueLevel(daysOverdue) };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const totalOverdue = overdueFactures.reduce((s, f) => s + (f.montant_a_recevoir_mutuelle || 0), 0);
  const criticalCount = overdueFactures.filter(f => f.daysOverdue >= 120).length;

  const handleSendReminder = async (facture) => {
    try {
      await base44.entities.TiersPayantFacture.update(facture.id, {
        notes: `${facture.notes || ''}\n[${format(today, 'dd/MM/yyyy')}] Relance envoyée (${facture.daysOverdue}j de retard)`.trim()
      });
      toast.success(`Relance enregistrée pour ${facture.patient_name}`);
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  if (overdueFactures.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      <Alert variant="destructive" className="border-red-300 bg-red-50">
        <AlertTriangle className="w-5 h-5" />
        <AlertTitle className="text-base font-bold">
          {overdueFactures.length} facture(s) impayée(s) depuis plus de 60 jours
        </AlertTitle>
        <AlertDescription className="mt-1">
          <span className="font-semibold">{totalOverdue.toFixed(2)} €</span> en attente de paiement mutuelle.
          {criticalCount > 0 && (
            <span className="ml-2 text-red-800 font-bold">
              ⚠️ {criticalCount} facture(s) dépasse(nt) 120 jours — action immédiate requise.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Overdue list */}
      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-600" />
            Détail des factures en retard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Retard</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Patient</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Mutuelle</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Date envoi</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-600">Montant dû</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Niveau</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdueFactures.map(f => (
                  <tr key={f.id} className={`border-b border-slate-100 ${f.level.bgRow} hover:bg-slate-100 transition-colors`}>
                    <td className="py-2.5 px-4">
                      <span className={`text-lg font-bold ${f.level.textColor}`}>{f.daysOverdue}j</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-sm">{f.patient_name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{f.numero_facture}</p>
                    </td>
                    <td className="py-2.5 px-4 text-sm">{f.mutuelle_nom || f.mutuelle_code}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-600">
                      {f.date_envoi ? format(new Date(f.date_envoi), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-bold text-sm">{(f.montant_a_recevoir_mutuelle || 0).toFixed(2)} €</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge className={f.level.color}>{f.level.label}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendReminder(f)} title="Enregistrer relance">
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSelectFacture?.(f)} title="Voir détails">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}