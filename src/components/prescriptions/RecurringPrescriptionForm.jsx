import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addMonths, addWeeks, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensuel', months: 1 },
  { value: 'bimonthly', label: 'Bimestriel (2 mois)', months: 2 },
  { value: 'quarterly', label: 'Trimestriel', months: 3 },
  { value: 'biannual', label: 'Semestriel', months: 6 },
  { value: 'annual', label: 'Annuel', months: 12 }
];

const CHRONIC_CONDITIONS = [
  'Hypertension artérielle',
  'Diabète type 2',
  'Diabète type 1',
  'Hypercholestérolémie',
  'Hypothyroïdie',
  'Hyperthyroïdie',
  'Asthme',
  'BPCO',
  'Insuffisance cardiaque',
  'Fibrillation auriculaire',
  'Épilepsie',
  'Dépression',
  'Anxiété chronique',
  'Polyarthrite rhumatoïde',
  'Ostéoporose',
  'Autre'
];

export default function RecurringPrescriptionForm({ 
  value = {}, 
  onChange,
  disabled = false 
}) {
  const [isRecurring, setIsRecurring] = useState(value.is_recurring || false);
  const [frequency, setFrequency] = useState(value.recurring_frequency || 'monthly');
  const [maxRenewals, setMaxRenewals] = useState(value.max_renewals || 12);
  const [chronicCondition, setChronicCondition] = useState(value.chronic_condition || '');
  const [customCondition, setCustomCondition] = useState('');

  const handleToggle = (checked) => {
    setIsRecurring(checked);
    if (checked) {
      updateValue({ is_recurring: true, recurring_frequency: frequency });
    } else {
      updateValue({ is_recurring: false, recurring_frequency: null, max_renewals: null, chronic_condition: null });
    }
  };

  const updateValue = (updates) => {
    const frequencyData = FREQUENCY_OPTIONS.find(f => f.value === (updates.recurring_frequency || frequency));
    const nextRenewal = frequencyData ? addMonths(new Date(), frequencyData.months) : null;
    const endDate = frequencyData && maxRenewals ? addMonths(new Date(), frequencyData.months * maxRenewals) : null;

    onChange?.({
      ...value,
      ...updates,
      next_renewal_date: nextRenewal ? format(nextRenewal, 'yyyy-MM-dd') : null,
      recurring_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null
    });
  };

  const handleFrequencyChange = (newFrequency) => {
    setFrequency(newFrequency);
    updateValue({ recurring_frequency: newFrequency });
  };

  const handleMaxRenewalsChange = (value) => {
    const num = parseInt(value) || 0;
    setMaxRenewals(num);
    updateValue({ max_renewals: num });
  };

  const handleConditionChange = (condition) => {
    setChronicCondition(condition);
    if (condition !== 'Autre') {
      updateValue({ chronic_condition: condition });
    }
  };

  const frequencyData = FREQUENCY_OPTIONS.find(f => f.value === frequency);
  const nextRenewalDate = frequencyData ? addMonths(new Date(), frequencyData.months) : null;
  const totalDuration = frequencyData && maxRenewals ? frequencyData.months * maxRenewals : 0;

  return (
    <Card className={isRecurring ? 'border-purple-300 bg-purple-50/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Prescription récurrente
          </CardTitle>
          <Switch 
            checked={isRecurring} 
            onCheckedChange={handleToggle}
            disabled={disabled}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Pour les traitements chroniques avec renouvellements automatiques
        </p>
      </CardHeader>

      {isRecurring && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Fréquence de renouvellement</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Nombre max. de renouvellements</Label>
              <Input 
                type="number" 
                min="1" 
                max="24"
                value={maxRenewals}
                onChange={(e) => handleMaxRenewalsChange(e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Pathologie chronique</Label>
            <Select value={chronicCondition} onValueChange={handleConditionChange} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une pathologie" />
              </SelectTrigger>
              <SelectContent>
                {CHRONIC_CONDITIONS.map(condition => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chronicCondition === 'Autre' && (
              <Input 
                placeholder="Préciser la pathologie"
                value={customCondition}
                onChange={(e) => {
                  setCustomCondition(e.target.value);
                  updateValue({ chronic_condition: e.target.value });
                }}
                className="mt-2"
                disabled={disabled}
              />
            )}
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <div className="space-y-1">
                <p><strong>Prochain renouvellement:</strong> {nextRenewalDate ? format(nextRenewalDate, 'dd MMMM yyyy', { locale: fr }) : '-'}</p>
                <p><strong>Durée totale:</strong> {totalDuration} mois ({maxRenewals} renouvellements)</p>
                <p><strong>Rappel automatique:</strong> 7 jours avant chaque renouvellement</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Badge variant="outline" className="bg-purple-100 text-purple-800">
              <RefreshCw className="w-3 h-3 mr-1" />
              Récurrente
            </Badge>
            <Badge variant="outline">
              <Calendar className="w-3 h-3 mr-1" />
              {frequencyData?.label}
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
}