import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ClipboardCheck,
  Stethoscope,
  Pill,
  TestTube,
  Calendar,
  Receipt
} from 'lucide-react';

const STEP_ICONS = {
  checklist: ClipboardCheck,
  alert: AlertTriangle,
  exam: Stethoscope,
  prescription: Pill,
  score: ClipboardCheck,
  laborders: TestTube,
  followup: Calendar,
  billing: Receipt
};

const SEVERITY_STYLES = {
  critical: 'border-red-500 bg-red-50',
  high: 'border-orange-400 bg-orange-50',
  medium: 'border-yellow-400 bg-yellow-50',
  info: 'border-blue-400 bg-blue-50',
  low: 'border-slate-300 bg-slate-50'
};

const SEVERITY_TEXT = {
  critical: 'text-red-800',
  high: 'text-orange-800',
  medium: 'text-yellow-800',
  info: 'text-blue-800',
  low: 'text-slate-700'
};

export default function ProtocolStepRenderer({ step, checkedItems, onToggleItem, scoreValues, onScoreChange }) {
  const Icon = STEP_ICONS[step.type] || Info;

  // Checklist step
  if (step.type === 'checklist') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            {step.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {step.items.map((item, idx) => {
            const key = `${step.title}-${idx}`;
            return (
              <label key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={checkedItems?.[key] || false}
                  onCheckedChange={() => onToggleItem(key)}
                  className="mt-0.5"
                />
                <span className={`text-sm ${checkedItems?.[key] ? 'text-slate-500 line-through' : ''}`}>
                  {item}
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Alert / Red flags step
  if (step.type === 'alert') {
    const severity = step.severity || 'medium';
    return (
      <Card className={`border-2 ${SEVERITY_STYLES[severity]}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 ${SEVERITY_TEXT[severity]}`}>
            {severity === 'critical' || severity === 'high' ? (
              <AlertCircle className="w-5 h-5" />
            ) : severity === 'info' ? (
              <Info className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {step.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {step.items.map((item, idx) => {
            const key = `${step.title}-${idx}`;
            return (
              <label key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 cursor-pointer">
                <Checkbox
                  checked={checkedItems?.[key] || false}
                  onCheckedChange={() => onToggleItem(key)}
                  className="mt-0.5"
                />
                <span className={`text-sm font-medium ${checkedItems?.[key] ? 'text-red-700' : ''}`}>
                  {item}
                </span>
              </label>
            );
          })}
          {step.action && (
            <Alert className="mt-3 bg-white/70">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-sm font-semibold">
                {step.action}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Score step
  if (step.type === 'score') {
    const totalScore = step.criteria.reduce((sum, _, idx) => {
      return sum + (scoreValues?.[`${step.scoreName}-${idx}`] || 0);
    }, 0);

    const interpretation = step.interpretation.find(i =>
      totalScore >= i.range[0] && totalScore <= i.range[1]
    );

    const interpColors = { green: 'bg-green-100 text-green-800 border-green-300', yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300', orange: 'bg-orange-100 text-orange-800 border-orange-300', red: 'bg-red-100 text-red-800 border-red-300' };

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            {step.title}
            <Badge variant="outline" className="ml-auto text-lg px-3">{totalScore}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step.criteria.map((criterion, idx) => {
            const key = `${step.scoreName}-${idx}`;
            return (
              <label key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={(scoreValues?.[key] || 0) > 0}
                  onCheckedChange={(checked) => onScoreChange(key, checked ? criterion.points || 1 : 0)}
                />
                <span className="text-sm flex-1">{criterion.label}</span>
                <Badge variant="outline" className="text-xs">
                  +{criterion.points || 1}
                </Badge>
              </label>
            );
          })}
          {interpretation && (
            <div className={`p-3 rounded-lg border ${interpColors[interpretation.color] || interpColors.yellow}`}>
              <p className="text-sm font-semibold">{interpretation.text}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Exam step
  if (step.type === 'exam') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-green-600" />
            {step.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {step.fields && (
            <div className="flex flex-wrap gap-2 mb-3">
              {step.fields.map(f => (
                <Badge key={f} variant="outline" className="bg-green-50 text-green-700">
                  {f.toUpperCase()}
                </Badge>
              ))}
            </div>
          )}
          {step.checklist?.map((item, idx) => {
            const key = `${step.title}-${idx}`;
            return (
              <label key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={checkedItems?.[key] || false}
                  onCheckedChange={() => onToggleItem(key)}
                  className="mt-0.5"
                />
                <span className={`text-sm ${checkedItems?.[key] ? 'text-slate-500 line-through' : ''}`}>
                  {item}
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Prescription step
  if (step.type === 'prescription') {
    return (
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-600" />
            {step.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step.medications.map((med, idx) => (
            <div key={idx} className={`p-3 rounded-lg border ${med.optional ? 'bg-slate-50 border-dashed' : 'bg-purple-50 border-purple-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{med.name}</span>
                {med.optional && <Badge variant="outline" className="text-xs">Optionnel</Badge>}
              </div>
              <p className="text-sm text-slate-600">Posologie : {med.posology}</p>
              <p className="text-sm text-slate-600">Durée : {med.duration}</p>
            </div>
          ))}
          {step.instructions && (
            <Alert className="bg-amber-50 border-amber-200">
              <Info className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                {step.instructions}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Lab orders step
  if (step.type === 'laborders') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube className="w-5 h-5 text-cyan-600" />
            {step.title}
            {step.frequency && <Badge variant="outline" className="ml-auto text-xs">{step.frequency}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {step.tests.map((test, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-cyan-50 rounded-lg">
                <TestTube className="w-3 h-3 text-cyan-600" />
                <span className="text-sm">{test}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Billing step
  if (step.type === 'billing') {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-sm text-emerald-800">{step.title}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {step.codes.map(code => (
              <Badge key={code} className="bg-emerald-100 text-emerald-800 border-emerald-300">
                Code {code}
              </Badge>
            ))}
          </div>
          {step.notes && <p className="text-xs text-emerald-700 mt-2">{step.notes}</p>}
        </CardContent>
      </Card>
    );
  }

  // Follow-up step
  if (step.type === 'followup') {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-blue-800">{step.title}</span>
            {step.delay && (
              <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-700">{step.delay}</Badge>
            )}
          </div>
          <p className="text-sm text-blue-800">{step.text}</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}