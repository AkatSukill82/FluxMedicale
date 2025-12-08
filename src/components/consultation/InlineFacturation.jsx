import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Banknote, 
  Building, 
  FileText, 
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Send
} from 'lucide-react';
import { useMyCareNet } from '../facturation/useMyCareNet';
import { Assurabilite } from '@/entities/Assurabilite';
import { Invoice } from '@/entities/Invoice';
import { InvoiceLine } from '@/entities/InvoiceLine';

export default function InlineFacturation({ patient, consultation, currentUser }) {
  const [assurabilite, setAssurabilite] = useState(null);
  const [isCheckingAssurability, setIsCheckingAssurability] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [nomenclatureCodes, setNomenclatureCodes] = useState([{ code: '', qty: 1, amount: 0 }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [nomenclatureResults, setNomenclatureResults] = useState([]);
  
  const { isLoading, error, checkAssurability, sendTransaction } = useMyCareNet(currentUser);

  useEffect(() => {
    loadAssurabilite();
  }, [patient.id]);

  const loadAssurabilite = async () => {
    setIsCheckingAssurability(true);
    try {
      // Chercher l'assurabilité en cache
      const cached = await Assurabilite.filter({ patient_id: patient.id }, '-last_checked_at', 1);
      
      if (cached.length > 0) {
        setAssurabilite(cached[0]);
      }
    } catch (err) {
      console.error('Erreur chargement assurabilité:', err);
    } finally {
      setIsCheckingAssurability(false);
    }
  };

  const handleCheckAssurability = async () => {
    const result = await checkAssurability(patient);
    
    if (result) {
      // Sauvegarder l'assurabilité
      const assurabiliteData = {
        patient_id: patient.id,
        patient_niss: result.patient_niss,
        oa_code: result.mutuelle_code,
        oa_name: 'Mutuelle XYZ', // Simulation
        tiers_payant_allowed: result.tiers_payant_allowed,
        tiers_payant_obligatoire: result.tiers_payant_obligatoire,
        special_rights: result.conditions || [],
        last_checked_at: new Date().toISOString(),
        checked_by: currentUser.email,
        transaction_id: `ASSU-${Date.now()}`
      };

      const existing = await Assurabilite.filter({ patient_id: patient.id }, '-id', 1);
      if (existing.length > 0) {
        await Assurabilite.update(existing[0].id, assurabiliteData);
      } else {
        await Assurabilite.create(assurabiliteData);
      }

      setAssurabilite(assurabiliteData);
    }
  };

  const searchNomenclature = async (term) => {
    if (term.length < 2) {
      setNomenclatureResults([]);
      return;
    }

    // Simulation : recherche dans la nomenclature
    const mockNomenclature = [
      { code: '101010', label_fr: 'Consultation au cabinet', base_price: 25.00 },
      { code: '101032', label_fr: 'Visite à domicile', base_price: 35.00 },
      { code: '101076', label_fr: 'Consultation urgente', base_price: 50.00 },
      { code: '102852', label_fr: 'ECG avec interprétation', base_price: 15.00 },
    ];

    const results = mockNomenclature.filter(n => 
      n.code.includes(term) || n.label_fr.toLowerCase().includes(term.toLowerCase())
    );

    setNomenclatureResults(results);
  };

  const handleAddNomenclature = (nomenclature) => {
    setNomenclatureCodes([
      ...nomenclatureCodes,
      { code: nomenclature.code, label: nomenclature.label_fr, qty: 1, amount: nomenclature.base_price }
    ]);
    setSearchTerm('');
    setNomenclatureResults([]);
  };

  const calculateTotal = () => {
    return nomenclatureCodes.reduce((sum, n) => sum + (n.amount * n.qty), 0).toFixed(2);
  };

  const handleSubmitInvoice = async () => {
    // Déterminer le type de facturation
    const invoiceType = assurabilite?.tiers_payant_allowed ? 'EFACT' : 'EATTEST';

    // Créer la facture
    const invoice = await Invoice.create({
      patient_id: patient.id,
      provider_id: currentUser.numero_inami,
      type: invoiceType,
      payment_method: paymentMethod,
      status: 'DRAFT',
      oa_code: assurabilite?.oa_code || '',
      total_amount: parseFloat(calculateTotal()),
      invoice_date: new Date().toISOString().split('T')[0],
      created_by: currentUser.email
    });

    // Créer les lignes de facture
    for (const line of nomenclatureCodes) {
      if (line.code) {
        await InvoiceLine.create({
          invoice_id: invoice.id,
          nomenclature_code: line.code,
          nomenclature_label: line.label || '',
          quantity: line.qty,
          unit_price: line.amount,
          amount: line.amount * line.qty,
          date_prestation: new Date().toISOString().split('T')[0]
        });
      }
    }

    // Envoyer via MyCareNet
    const result = await sendTransaction({
      type: invoiceType,
      patient_id: patient.id,
      totalAmount: calculateTotal(),
      lines: nomenclatureCodes
    });

    if (result.status === 'ACCEPTED') {
      await Invoice.update(invoice.id, {
        status: 'ACCEPTED',
        transaction_id: result.transaction_id
      });
      alert('Facturation acceptée !');
    } else {
      await Invoice.update(invoice.id, {
        status: 'REJECTED',
        oa_error_code: result.message
      });
      alert('Facturation refusée : ' + result.message);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Facturation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Bannière obligation e-facturation */}
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-xs text-orange-800">
            <strong>Obligation légale :</strong> e-facturation obligatoire au 01/09/2025 (eFact & eAttest)
          </AlertDescription>
        </Alert>

        {/* Assurabilité */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Assurabilité MyCareNet</Label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCheckAssurability}
              disabled={isLoading || isCheckingAssurability}
            >
              {(isLoading || isCheckingAssurability) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'Vérifier'
              )}
            </Button>
          </div>

          {assurabilite ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-900">Patient assuré</span>
              </div>
              <div className="text-green-800 space-y-1">
                <div>Mutuelle: {assurabilite.oa_code} - {assurabilite.oa_name}</div>
                <div>
                  Type: {assurabilite.tiers_payant_allowed ? (
                    <Badge className="bg-blue-100 text-blue-800">Tiers Payant (eFact)</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">Comptant (eAttest)</Badge>
                  )}
                </div>
                {assurabilite.special_rights?.length > 0 && (
                  <div className="text-xs">Droits: {assurabilite.special_rights.join(', ')}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
              Assurabilité non vérifiée
            </div>
          )}
        </div>

        <Separator />

        {/* Mode de paiement */}
        <div>
          <Label className="text-sm font-semibold">Mode de paiement</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { value: 'CARD', icon: CreditCard, label: 'Carte' },
              { value: 'CASH', icon: Banknote, label: 'Espèces' },
              { value: 'BANK', icon: Building, label: 'Virement' },
              { value: 'PAPER', icon: FileText, label: 'Papier' }
            ].map(method => (
              <Button
                key={method.value}
                variant={paymentMethod === method.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod(method.value)}
                className="justify-start"
              >
                <method.icon className="w-4 h-4 mr-2" />
                {method.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Nomenclature */}
        <div>
          <Label className="text-sm font-semibold">Prestations</Label>
          <div className="relative mt-2">
            <Input
              placeholder="Rechercher code ou prestation..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchNomenclature(e.target.value);
              }}
              className="text-sm"
            />
            {nomenclatureResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {nomenclatureResults.map(nom => (
                  <button
                    key={nom.code}
                    onClick={() => handleAddNomenclature(nom)}
                    className="w-full p-2 text-left hover:bg-gray-50 text-xs"
                  >
                    <div className="font-semibold">{nom.code} - {nom.label_fr}</div>
                    <div className="text-gray-600">{nom.base_price.toFixed(2)}€</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Liste des prestations */}
          <div className="mt-3 space-y-2">
            {nomenclatureCodes.map((line, idx) => (
              line.code && (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="flex-1">
                    <div className="font-semibold">{line.code}</div>
                    <div className="text-gray-600">{line.label}</div>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(e) => {
                      const newCodes = [...nomenclatureCodes];
                      newCodes[idx].qty = parseInt(e.target.value) || 1;
                      setNomenclatureCodes(newCodes);
                    }}
                    className="w-16 h-8"
                  />
                  <div className="font-semibold w-16 text-right">
                    {(line.amount * line.qty).toFixed(2)}€
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-bold">Total</span>
          <span className="text-xl font-bold text-blue-600">{calculateTotal()}€</span>
        </div>

        {/* Bouton envoi */}
        <Button 
          onClick={handleSubmitInvoice}
          disabled={isLoading || !assurabilite || nomenclatureCodes.every(n => !n.code)}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer à MyCareNet
            </>
          )}
        </Button>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-xs text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}