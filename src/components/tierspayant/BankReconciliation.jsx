import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Landmark, Search, CheckCircle, Link2, AlertTriangle, Plus, ArrowRight, Loader2, XCircle, FileText
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function BankReconciliation({ factures }) {
  const queryClient = useQueryClient();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [matchingFacture, setMatchingFacture] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [payment, setPayment] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    reference: '',
    bankRef: '',
    notes: ''
  });

  // Factures en attente de réconciliation (envoyées ou acceptées mais pas encore payées)
  const unreconciledFactures = useMemo(() => {
    return factures
      .filter(f => ['envoyee', 'acceptee', 'partielle'].includes(f.statut))
      .sort((a, b) => (a.date_envoi || a.date_facturation || '').localeCompare(b.date_envoi || b.date_facturation || ''));
  }, [factures]);

  // Factures récemment réconciliées
  const reconciledRecent = useMemo(() => {
    return factures
      .filter(f => f.statut === 'payee' && f.date_paiement)
      .sort((a, b) => (b.date_paiement || '').localeCompare(a.date_paiement || ''))
      .slice(0, 10);
  }, [factures]);

  const totalUnreconciled = unreconciledFactures.reduce((s, f) => s + (f.montant_a_recevoir_mutuelle || 0), 0);

  // Search matching factures by amount, patient, ref
  const searchResults = useMemo(() => {
    if (!bankSearch.trim()) return [];
    const term = bankSearch.toLowerCase();
    const amountSearch = parseFloat(bankSearch.replace(',', '.'));

    return unreconciledFactures.filter(f => {
      if (f.patient_name?.toLowerCase().includes(term)) return true;
      if (f.numero_facture?.toLowerCase().includes(term)) return true;
      if (f.mutuelle_nom?.toLowerCase().includes(term)) return true;
      if (f.mutuelle_code?.toLowerCase().includes(term)) return true;
      if (!isNaN(amountSearch) && Math.abs((f.montant_a_recevoir_mutuelle || 0) - amountSearch) < 0.5) return true;
      return false;
    }).slice(0, 10);
  }, [bankSearch, unreconciledFactures]);

  const handleReconcile = async (facture) => {
    setMatchingFacture(facture);
    setPayment(prev => ({
      ...prev,
      amount: (facture.montant_a_recevoir_mutuelle || 0).toFixed(2)
    }));
    setShowAddPayment(true);
  };

  const handleSaveReconciliation = async () => {
    if (!matchingFacture) return;
    setIsSaving(true);

    const montantPaye = parseFloat(payment.amount.replace(',', '.')) || 0;
    const attendu = matchingFacture.montant_a_recevoir_mutuelle || 0;
    const ecart = montantPaye - attendu;
    const isPartial = montantPaye < attendu * 0.99; // Tolérance 1%

    try {
      await base44.entities.TiersPayantFacture.update(matchingFacture.id, {
        statut: isPartial ? 'partielle' : 'payee',
        date_paiement: payment.date,
        montant_paye: montantPaye,
        ecart_paiement: Math.round(ecart * 100) / 100,
        reference_paiement: payment.bankRef || payment.reference,
        notes: `${matchingFacture.notes || ''}\n[Réconciliation ${format(new Date(), 'dd/MM/yyyy')}] Virement: ${montantPaye.toFixed(2)}€ / Réf: ${payment.bankRef || 'N/A'}${payment.notes ? ' - ' + payment.notes : ''}`.trim()
      });

      toast.success(
        isPartial
          ? `Paiement partiel enregistré (${montantPaye.toFixed(2)}€ / ${attendu.toFixed(2)}€)`
          : `Facture ${matchingFacture.numero_facture} réconciliée avec succès`
      );
      queryClient.invalidateQueries({ queryKey: ['tiersPayantFactures'] });
      setShowAddPayment(false);
      setMatchingFacture(null);
      setBankSearch('');
      setPayment({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', reference: '', bankRef: '', notes: '' });
    } catch (err) {
      toast.error('Erreur de réconciliation');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700 font-medium">À réconcilier</p>
            <p className="text-2xl font-bold text-amber-900">{unreconciledFactures.length}</p>
            <p className="text-xs text-amber-600">{totalUnreconciled.toFixed(2)} € en attente</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-700 font-medium">Réconciliées (récent)</p>
            <p className="text-2xl font-bold text-green-900">{reconciledRecent.length}</p>
            <p className="text-xs text-green-600">
              {reconciledRecent.reduce((s, f) => s + (f.montant_paye || 0), 0).toFixed(2)} € reçus
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex flex-col justify-center items-center gap-2">
            <Button onClick={() => { setMatchingFacture(null); setShowAddPayment(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Réconcilier un virement
            </Button>
            <p className="text-xs text-slate-500">Entrez un montant ou réf. bancaire</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick search reconciliation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Recherche rapide pour réconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par montant, patient, mutuelle, n° facture..."
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {bankSearch.trim() && searchResults.length === 0 && (
            <p className="text-center text-slate-500 py-6">Aucune facture correspondante</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(f => {
                const days = f.date_envoi ? differenceInDays(new Date(), new Date(f.date_envoi)) : null;
                return (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{f.patient_name}</span>
                          <span className="text-xs text-slate-500 font-mono">{f.numero_facture}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{f.mutuelle_nom || f.mutuelle_code}</span>
                          {f.date_envoi && <span>Envoyé le {format(new Date(f.date_envoi), 'dd/MM/yy')}</span>}
                          {days !== null && days >= 60 && (
                            <Badge className="bg-red-100 text-red-700 text-[10px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{days}j
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-700">{(f.montant_a_recevoir_mutuelle || 0).toFixed(2)} €</span>
                      <Button size="sm" onClick={() => handleReconcile(f)} className="gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Réconcilier
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!bankSearch.trim() && unreconciledFactures.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium mb-2">Factures en attente de réconciliation les plus anciennes :</p>
              {unreconciledFactures.slice(0, 5).map(f => {
                const days = f.date_envoi ? differenceInDays(new Date(), new Date(f.date_envoi)) : null;
                return (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg border border-dashed hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-medium">{f.patient_name}</span>
                      <span className="text-xs text-slate-400">{f.mutuelle_nom}</span>
                      {days !== null && <span className="text-xs text-slate-500">{days}j</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{(f.montant_a_recevoir_mutuelle || 0).toFixed(2)} €</span>
                      <Button variant="outline" size="sm" onClick={() => handleReconcile(f)} className="h-7 text-xs">
                        Réconcilier
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Réconciliation dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              Réconcilier un virement bancaire
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {matchingFacture && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold">{matchingFacture.patient_name}</p>
                <div className="flex justify-between text-xs text-blue-800">
                  <span>{matchingFacture.mutuelle_nom}</span>
                  <span>N° {matchingFacture.numero_facture}</span>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  Attendu: {(matchingFacture.montant_a_recevoir_mutuelle || 0).toFixed(2)} €
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date du virement</Label>
                <Input
                  type="date"
                  value={payment.date}
                  onChange={(e) => setPayment(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Montant reçu (€)</Label>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={payment.amount}
                  onChange={(e) => setPayment(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Référence bancaire (communication)</Label>
              <Input
                placeholder="+++123/4567/89012+++"
                value={payment.bankRef}
                onChange={(e) => setPayment(p => ({ ...p, bankRef: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Remarques sur ce virement..."
                value={payment.notes}
                onChange={(e) => setPayment(p => ({ ...p, notes: e.target.value }))}
                className="h-16"
              />
            </div>

            {/* Écart warning */}
            {matchingFacture && payment.amount && (() => {
              const recu = parseFloat(payment.amount.replace(',', '.')) || 0;
              const attendu = matchingFacture.montant_a_recevoir_mutuelle || 0;
              const ecart = recu - attendu;
              if (Math.abs(ecart) < 0.01) return null;
              return (
                <div className={`flex items-start gap-2 p-3 rounded-lg ${ecart < 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${ecart < 0 ? 'text-orange-600' : 'text-green-600'}`} />
                  <div className="text-xs">
                    <p className="font-semibold">
                      Écart de {ecart > 0 ? '+' : ''}{ecart.toFixed(2)} €
                    </p>
                    <p className={ecart < 0 ? 'text-orange-700' : 'text-green-700'}>
                      {ecart < 0 ? 'Le paiement est inférieur au montant attendu. La facture sera marquée comme paiement partiel.' : 'Surplus de paiement. La facture sera marquée comme payée.'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPayment(false)}>Annuler</Button>
            <Button onClick={handleSaveReconciliation} disabled={isSaving || !payment.amount} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirmer la réconciliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}