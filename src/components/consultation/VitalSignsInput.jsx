import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Heart,
  Thermometer,
  Activity,
  Scale,
  Ruler,
  Droplets,
  Wind,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Valeurs normales pour adultes
const NORMAL_RANGES = {
  systolic: { min: 90, max: 140, unit: 'mmHg', danger_low: 80, danger_high: 180 },
  diastolic: { min: 60, max: 90, unit: 'mmHg', danger_low: 50, danger_high: 120 },
  heart_rate: { min: 60, max: 100, unit: 'bpm', danger_low: 40, danger_high: 150 },
  temperature: { min: 36.1, max: 37.2, unit: '°C', danger_low: 35, danger_high: 39 },
  spo2: { min: 95, max: 100, unit: '%', danger_low: 90, danger_high: 101 },
  respiratory_rate: { min: 12, max: 20, unit: '/min', danger_low: 8, danger_high: 30 },
  weight: { min: 40, max: 120, unit: 'kg' },
  height: { min: 140, max: 200, unit: 'cm' },
  pain_score: { min: 0, max: 10, unit: '/10' }
};

const getStatusColor = (value, field) => {
  const range = NORMAL_RANGES[field];
  if (!range || value === '' || value === null) return 'bg-slate-100 text-slate-600';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'bg-slate-100 text-slate-600';
  
  if (range.danger_low && numValue < range.danger_low) return 'bg-red-100 text-red-700 border-red-300';
  if (range.danger_high && numValue > range.danger_high) return 'bg-red-100 text-red-700 border-red-300';
  if (numValue < range.min || numValue > range.max) return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-green-100 text-green-700 border-green-300';
};

export default function VitalSignsInput({ data, onChange, patientBirthDate }) {
  const [expanded, setExpanded] = useState(true);
  const [vitals, setVitals] = useState({
    systolic: data?.systolic || '',
    diastolic: data?.diastolic || '',
    heart_rate: data?.heart_rate || '',
    temperature: data?.temperature || '',
    spo2: data?.spo2 || '',
    respiratory_rate: data?.respiratory_rate || '',
    weight: data?.weight || '',
    height: data?.height || '',
    pain_score: data?.pain_score || 0,
    glycemia: data?.glycemia || '',
    notes: data?.notes || ''
  });

  // Calculer IMC
  const calculateBMI = () => {
    const weight = parseFloat(vitals.weight);
    const height = parseFloat(vitals.height) / 100; // cm to m
    if (weight && height) {
      return (weight / (height * height)).toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: 'Insuffisance', color: 'bg-blue-100 text-blue-700' };
    if (value < 25) return { label: 'Normal', color: 'bg-green-100 text-green-700' };
    if (value < 30) return { label: 'Surpoids', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Obésité', color: 'bg-red-100 text-red-700' };
  };

  const handleChange = (field, value) => {
    const newVitals = { ...vitals, [field]: value };
    setVitals(newVitals);
    onChange(newVitals);
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  // Détecter les alertes
  const alerts = [];
  if (vitals.systolic && parseFloat(vitals.systolic) > 180) alerts.push('TA systolique très élevée');
  if (vitals.systolic && parseFloat(vitals.systolic) < 80) alerts.push('TA systolique très basse');
  if (vitals.temperature && parseFloat(vitals.temperature) > 39) alerts.push('Fièvre élevée');
  if (vitals.spo2 && parseFloat(vitals.spo2) < 90) alerts.push('SpO2 critique');
  if (vitals.heart_rate && parseFloat(vitals.heart_rate) > 150) alerts.push('Tachycardie sévère');
  if (vitals.heart_rate && parseFloat(vitals.heart_rate) < 40) alerts.push('Bradycardie sévère');

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Constantes vitales
          </span>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {alerts.length} alerte(s)
              </Badge>
            )}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Alertes */}
          {alerts.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alertes
              </p>
              <ul className="text-sm text-red-700 mt-1">
                {alerts.map((alert, i) => (
                  <li key={i}>• {alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tension artérielle */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-red-500" />
                TA Systolique
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.systolic}
                  onChange={(e) => handleChange('systolic', e.target.value)}
                  placeholder="120"
                  className={`w-24 ${getStatusColor(vitals.systolic, 'systolic')}`}
                />
                <span className="text-xs text-slate-500">mmHg</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-red-500" />
                TA Diastolique
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.diastolic}
                  onChange={(e) => handleChange('diastolic', e.target.value)}
                  placeholder="80"
                  className={`w-24 ${getStatusColor(vitals.diastolic, 'diastolic')}`}
                />
                <span className="text-xs text-slate-500">mmHg</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-pink-500" />
                Fréquence cardiaque
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.heart_rate}
                  onChange={(e) => handleChange('heart_rate', e.target.value)}
                  placeholder="75"
                  className={`w-24 ${getStatusColor(vitals.heart_rate, 'heart_rate')}`}
                />
                <span className="text-xs text-slate-500">bpm</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Thermometer className="w-4 h-4 text-orange-500" />
                Température
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => handleChange('temperature', e.target.value)}
                  placeholder="37.0"
                  className={`w-24 ${getStatusColor(vitals.temperature, 'temperature')}`}
                />
                <span className="text-xs text-slate-500">°C</span>
              </div>
            </div>
          </div>

          {/* Oxygénation & Respiration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-blue-500" />
                SpO2
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.spo2}
                  onChange={(e) => handleChange('spo2', e.target.value)}
                  placeholder="98"
                  className={`w-24 ${getStatusColor(vitals.spo2, 'spo2')}`}
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-cyan-500" />
                Fréq. respiratoire
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.respiratory_rate}
                  onChange={(e) => handleChange('respiratory_rate', e.target.value)}
                  placeholder="16"
                  className={`w-24 ${getStatusColor(vitals.respiratory_rate, 'respiratory_rate')}`}
                />
                <span className="text-xs text-slate-500">/min</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-purple-500" />
                Glycémie
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.glycemia}
                  onChange={(e) => handleChange('glycemia', e.target.value)}
                  placeholder="100"
                  className="w-24"
                />
                <span className="text-xs text-slate-500">mg/dL</span>
              </div>
            </div>
          </div>

          {/* Poids & Taille */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Scale className="w-4 h-4 text-green-500" />
                Poids
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={vitals.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="70"
                  className="w-24"
                />
                <span className="text-xs text-slate-500">kg</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Ruler className="w-4 h-4 text-indigo-500" />
                Taille
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vitals.height}
                  onChange={(e) => handleChange('height', e.target.value)}
                  placeholder="175"
                  className="w-24"
                />
                <span className="text-xs text-slate-500">cm</span>
              </div>
            </div>

            {bmi && (
              <div className="space-y-2">
                <Label className="text-sm">IMC calculé</Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{bmi}</span>
                  {bmiCategory && (
                    <Badge className={bmiCategory.color}>{bmiCategory.label}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Score de douleur EVA */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              Score de douleur (EVA)
              <Badge variant="outline">{vitals.pain_score}/10</Badge>
            </Label>
            <div className="flex items-center gap-4">
              <span className="text-green-600 text-sm">😊 0</span>
              <Slider
                value={[vitals.pain_score]}
                onValueChange={([value]) => handleChange('pain_score', value)}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-red-600 text-sm">10 😢</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 px-2">
              <span>Pas de douleur</span>
              <span>Modérée</span>
              <span>Douleur max</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}