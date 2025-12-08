import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Trash2, 
  Send, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { Invoice } from '@/entities/Invoice';
import { InvoiceLine } from '@/entities/InvoiceLine';
import { useMyCareNet } from './useMyCareNet';
import NomenclatureSearch from './NomenclatureSearch';
import { format } from 'date-fns';

export default function InlineFacturation({ patient, consultation, currentUser, onSuccess }) {
  const [assurability, setAssurability] = useState(null);
  const [prestations, setPrestations] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  
  const { isLoading, error, checkAssurability, sendTransaction } = useMyCareNet(currentUser);

  useEffect(() => {
    loadAssurability();
  }, [patient]);

  const loadAssurability = async () => {
    const assurabilityData = await checkAssurability(patient);
    setAssurability(assurabilityData);
  };

  const handleAddPrestation = (nomenclature) => {
    const quantity = 1;
    const unitPrice = nomenclature.base_price || 0;
    setPrestations([...prestations, {
      nomenclature_code: nomenclature.code,
      nomenclature_label: nomenclature.label_fr,
      quantity: quantity,
      unit_price: unitPrice,
      amount: unitPrice * quantity
    }]);
  };

  const handleRemovePrestation = (index) => {
    setPrestations(prestations.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...prestations];
    const qty = parseInt(quantity) || 1;
    updated[index].quantity = qty;
    updated[index].amount = (updated[index].unit_price || 0) * qty;
    setPrestations(updated);
  };

  const totalAmount = prestations.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleSendInvoice = async () => {
    if (prestations.length === 0) {
      alert('Veuillez ajouter au moins une prestation');
      return;
    }

    if (!currentUser.numero_inami) {
      alert('Numéro INAMI manquant. Veuillez compléter votre profil.');
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const transactionType = assurability?.tiers_payant_allowed ? 'EFACT' : 'EATTEST';

      console.log('[Facturation] Création facture:', {
        patient_id: patient.id,
        provider_id: currentUser.numero_inami,
        type: transactionType,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        prestations_count: prestations.length
      });

      const invoice = await Invoice.create({
        patient_id: patient.id,
        provider_id: currentUser.numero_inami,
        type: transactionType,
        payment_method: paymentMethod,
        status: 'DRAFT',
        oa_code: assurability?.mutuelle_code || '000',
        total_amount: totalAmount,
        patient_contribution: transactionType === 'EATTEST' ? totalAmount : 0,
        insurance_contribution: transactionType === 'EFACT' ? totalAmount : 0,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        created_by: currentUser.email
      });

      console.log('[Facturation] Facture créée:', invoice.id);

      for (const prestation of prestations) {
        await InvoiceLine.create({
          invoice_id: invoice.id,
          nomenclature_code: prestation.nomenclature_code,
          nomenclature_label: prestation.nomenclature_label,
          quantity: prestation.quantity,
          unit_price: prestation.unit_price || 0,
          amount: prestation.amount || 0,
          date_prestation: format(new Date(), 'yyyy-MM-dd')
        });
      }

      console.log('[Facturation] Lignes créées');

      const transactionData = {
        patient_id: patient.id,
        type: transactionType,
        prestations: prestations,
        totalAmount: totalAmount
      };

      const mycareNetResult = await sendTransaction(transactionData);

      console.log('[Facturation] Résultat MyCareNet:', mycareNetResult);

      await Invoice.update(invoice.id, {
        status: mycareNetResult.status === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED',
        transaction_id: mycareNetResult.transaction_id,
        oa_response: mycareNetResult.message
      });

      setResult({
        success: mycareNetResult.status === 'ACCEPTED',
        message: mycareNetResult.message,
        invoice_id: invoice.id,
        transaction_id: mycareNetResult.transaction_id
      });

      if (mycareNetResult.status === 'ACCEPTED') {
        setPrestations([]);
        if (onSuccess) onSuccess(invoice);
      }

    } catch (err) {
      console.error('Erreur envoi facture:', err);
      setResult({
        success: false,
        message: err.message || 'Erreur lors de l\'envoi de la facture'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <CreditCard className="w-5 h-5" />
          Facturation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Assurabilité */}
        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600 mb-2" />
            <p className="text-sm text-slate-600">Vérification assurabilité...</p>
          </div>
        ) : assurability ? (
          <Alert className={assurability.tiers_payant_allowed ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <strong>Type:</strong> {assurability.tiers_payant_allowed ? 'eFact (Tiers Payant)' : 'eAttest (Comptant)'}
              <br />
              <strong>OA:</strong> {assurability.mutuelle_code}
              {assurability.conditions?.length > 0 && (
                <>
                  <br />
                  <strong>Droits:</strong> {assurability.conditions.join(', ')}
                </>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-slate-50 border-slate-200">
            <AlertTriangle className="w-4 h-4 text-slate-600" />
            <AlertDescription className="text-slate-700">
              Assurabilité non vérifiée. La facturation utilisera le mode comptant (eAttest).
            </AlertDescription>
          </Alert>
        )}

        {/* Recherche nomenclature */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Ajouter une prestation
          </label>
          <NomenclatureSearch 
            onSelect={handleAddPrestation}
            userINAMI={currentUser.numero_inami}
          />
        </div>

        {/* Liste des prestations */}
        {prestations.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Prestations</label>
            {prestations.map((prestation, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-sm">{prestation.nomenclature_code}</p>
                  <p className="text-xs text-slate-600">{prestation.nomenclature_label}</p>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={prestation.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  className="w-16 text-center"
                />
                <p className="font-bold text-sm w-20 text-right">
                  {(prestation.amount || 0).toFixed(2)}€
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePrestation(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}

            <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg font-bold">
              <span>Total</span>
              <span className="text-lg">{(totalAmount || 0).toFixed(2)}€</span>
            </div>
          </div>
        )}

        {/* Mode de paiement */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Mode de paiement
          </label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CARD">Carte bancaire</SelectItem>
              <SelectItem value="CASH">Espèces</SelectItem>
              <SelectItem value="BANK">Virement</SelectItem>
              <SelectItem value="PAPER">Papier (exception)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Résultat */}
        {result && (
          <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            {result.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? "text-green-900" : "text-red-900"}>
              <strong>{result.success ? 'Facture envoyée avec succès' : 'Erreur'}</strong>
              <br />
              {result.message}
              {result.transaction_id && (
                <>
                  <br />
                  <span className="text-xs font-mono">TX: {result.transaction_id}</span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Bouton d'envoi */}
        <Button 
          onClick={handleSendInvoice}
          disabled={prestations.length === 0 || isSending}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer la facture ({(totalAmount || 0).toFixed(2)}€)
            </>
          )}
        </Button>

        {!currentUser.numero_inami && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Numéro INAMI manquant</strong>
              <br />
              Veuillez compléter votre numéro INAMI dans vos paramètres pour facturer.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}