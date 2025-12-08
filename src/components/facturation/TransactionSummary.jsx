import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function TransactionSummary({ patient, assurability, prestations, onSend, isLoading, onBack }) {
  const total = prestations.reduce((sum, p) => sum + p.montant * p.quantite, 0).toFixed(2);
  const transactionType = assurability.tiers_payant_allowed ? 'eFact (Tiers Payant)' : 'eAttest (Paiement Comptant)';
  
  const officialName = patient.name?.find(n => n.use === 'official') || { family: '', given: [] };
  const given = Array.isArray(officialName.given) ? officialName.given : [];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Récapitulatif de la transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Patient</h4>
          <p>{given.join(' ')} {officialName.family || ''}</p>
        </div>
        <div>
          <h4 className="font-semibold">Type de transaction</h4>
          <p>{transactionType}</p>
        </div>
        <div>
          <h4 className="font-semibold">Prestations</h4>
          <ul>
            {prestations.map((p, i) => (
              <li key={i}>{p.code_nomenclature}: {p.quantite} x {p.montant.toFixed(2)}€ = {(p.quantite * p.montant).toFixed(2)}€</li>
            ))}
          </ul>
        </div>
        <div className="text-xl font-bold">
          Total: {total}€
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Retour</Button>
        <Button onClick={onSend} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Envoyer à MyCareNet
        </Button>
      </CardFooter>
    </Card>
  );
}