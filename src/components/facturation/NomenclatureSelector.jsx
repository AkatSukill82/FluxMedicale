import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Calculator, AlertCircle, Edit2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import NomenSearch from '../nomenclature/NomenSearch';
import { useI18n } from '../i18n/i18nContext';
import AssurabilityChecker from './AssurabilityChecker';

export default function NomenclatureSelector({ selectedCodes, onCodesChange, mutuelle, patient }) {
  const { locale } = useI18n();
  const [quantities, setQuantities] = useState({});
  const [useCustomPrices, setUseCustomPrices] = useState(false);
  const [customPrices, setCustomPrices] = useState({});

  const handleAddCode = (code) => {
    onCodesChange([...selectedCodes, code]);
    setQuantities({ ...quantities, [code.id]: 1 });
  };

  const handleRemoveCode = (codeId) => {
    onCodesChange(selectedCodes.filter(c => c.id !== codeId));
    const newQuantities = { ...quantities };
    delete newQuantities[codeId];
    setQuantities(newQuantities);
  };

  const handleQuantityChange = (codeId, quantity) => {
    const qty = parseInt(quantity) || 1;
    setQuantities({ ...quantities, [codeId]: qty });
  };

  const handleCustomPriceChange = (codeId, field, value) => {
    const numValue = parseInt(value) || 0;
    setCustomPrices({
      ...customPrices,
      [codeId]: {
        ...customPrices[codeId],
        [field]: numValue
      }
    });
  };

  const handlePriceCorrection = (codeId, correctedPrices) => {
    setCustomPrices({
      ...customPrices,
      [codeId]: correctedPrices
    });
  };

  const calculateTotals = () => {
    let totalHonorarium = 0;
    let totalReimbursed = 0;
    let totalPatientShare = 0;

    selectedCodes.forEach(code => {
      const qty = quantities[code.id] || 1;
      
      if (useCustomPrices && customPrices[code.id]) {
        const custom = customPrices[code.id];
        totalHonorarium += (custom.honorarium || code.honorarium || 0) * qty;
        totalReimbursed += (custom.reimbursed || code.reimbursed || 0) * qty;
        totalPatientShare += (custom.patient_share || code.patient_share || 0) * qty;
      } else {
        totalHonorarium += (code.honorarium || 0) * qty;
        totalReimbursed += (code.reimbursed || 0) * qty;
        totalPatientShare += (code.patient_share || 0) * qty;
      }
    });

    return { totalHonorarium, totalReimbursed, totalPatientShare };
  };

  const { totalHonorarium, totalReimbursed, totalPatientShare } = calculateTotals();

  const formatAmount = (cents) => {
    if (!cents) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  // Calcul du remboursement réel selon mutuelle
  const getActualReimbursement = (code) => {
    // Si mutuelle conventionnée, remboursement standard
    // Sinon, remboursement réduit (généralement 75% du remboursement standard)
    const isConventioned = mutuelle?.conventioned !== false;
    return isConventioned ? code.reimbursed : Math.floor(code.reimbursed * 0.75);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          Rechercher un code INAMI
        </Label>
        <NomenSearch onSelect={handleAddCode} selectedCodes={selectedCodes} />
      </div>

      {selectedCodes.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-slate-600" />
            <Label className="text-sm font-medium cursor-pointer">
              Utiliser des prix personnalisés
            </Label>
          </div>
          <Switch
            checked={useCustomPrices}
            onCheckedChange={setUseCustomPrices}
          />
        </div>
      )}

      {selectedCodes.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Prestations sélectionnées</Label>
          {selectedCodes.map(code => {
            const title = locale === 'nl' ? code.title_nl : code.title_fr;
            const actualReimbursed = getActualReimbursement(code);
            const actualPatientShare = code.honorarium - actualReimbursed;
            const qty = quantities[code.id] || 1;

            return (
              <Card key={code.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {code.code}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {code.category}
                      </Badge>
                      {useCustomPrices && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                          <Edit2 className="w-3 h-3 mr-1" />
                          Prix personnalisé
                        </Badge>
                      )}
                      {!code.tiers_payant_allowed && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pas de tiers payant
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-1">{title}</p>
                    
                    {useCustomPrices ? (
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Honoraire (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((customPrices[code.id]?.honorarium || code.honorarium) / 100).toFixed(2)}
                            onChange={(e) => handleCustomPriceChange(code.id, 'honorarium', Math.round(parseFloat(e.target.value) * 100))}
                            className="h-8 bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Remboursé (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((customPrices[code.id]?.reimbursed || actualReimbursed) / 100).toFixed(2)}
                            onChange={(e) => handleCustomPriceChange(code.id, 'reimbursed', Math.round(parseFloat(e.target.value) * 100))}
                            className="h-8 bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Ticket mod. (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((customPrices[code.id]?.patient_share || actualPatientShare) / 100).toFixed(2)}
                            onChange={(e) => handleCustomPriceChange(code.id, 'patient_share', Math.round(parseFloat(e.target.value) * 100))}
                            className="h-8 bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-muted-foreground">Honoraire:</span>
                          <p className="font-semibold">
                            {formatAmount(code.honorarium * qty)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Remboursé:</span>
                          <p className="font-semibold text-green-600">
                            {formatAmount(actualReimbursed * qty)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ticket mod.:</span>
                          <p className="font-semibold text-orange-600">
                            {formatAmount(actualPatientShare * qty)}
                          </p>
                        </div>
                      </div>
                    )}

                    {code.frequency_limit && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {code.frequency_limit}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div>
                      <Label className="text-xs mb-1 block">Qté</Label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={qty}
                        onChange={(e) => handleQuantityChange(code.id, e.target.value)}
                        className="w-16 h-9 text-center"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCode(code.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Total récapitulatif */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Total de la facture</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-700 mb-1">Honoraire total</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatAmount(totalHonorarium)}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-700 mb-1">Part mutuelle</p>
                <p className="text-xl font-bold text-green-700">
                  {formatAmount(totalReimbursed)}
                </p>
              </div>
              <div>
                <p className="text-xs text-orange-700 mb-1">Part patient</p>
                <p className="text-xl font-bold text-orange-700">
                  {formatAmount(totalPatientShare)}
                </p>
              </div>
            </div>
            {mutuelle?.conventioned === false && (
              <p className="text-xs text-amber-700 mt-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Mutuelle non conventionnée - remboursement réduit appliqué (75%)
              </p>
            )}
          </Card>
        </div>
      )}

      {selectedCodes.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            Recherchez et ajoutez des codes INAMI pour créer la facture
          </p>
        </Card>
      )}
    </div>
  );
}