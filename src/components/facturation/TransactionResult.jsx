import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

export default function TransactionResult({ result, error, onReset }) {
  const isSuccess = result && result.status === 'ACCEPTED';
  
  return (
    <Card className={`max-w-md mx-auto ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <CardContent className="p-6 text-center">
        {isSuccess ? (
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        ) : (
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        )}
        <h3 className="text-xl font-semibold mb-2">
          {isSuccess ? 'Transaction Réussie' : 'Échec de la transaction'}
        </h3>
        <p className="text-slate-700">{result?.message || error}</p>
        {isSuccess && <p className="text-sm text-slate-500 mt-2">ID Transaction: {result.transaction_id}</p>}
        <Button onClick={onReset} className="mt-6">Nouvelle Facturation</Button>
      </CardContent>
    </Card>
  );
}