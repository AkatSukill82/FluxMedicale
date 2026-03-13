import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, FileText, Upload } from 'lucide-react';

export default function ConditionsChecklist({ 
  conditions, 
  checkedConditions, 
  onToggleCondition,
  conditionValues,
  onValueChange,
  documents,
  groupRules 
}) {
  // Vérifier les règles de groupe
  const groupErrors = {};
  if (groupRules) {
    Object.entries(groupRules).forEach(([groupId, rule]) => {
      const groupConditions = conditions.filter(c => c.group === groupId);
      const checkedInGroup = groupConditions.filter(c => checkedConditions[c.id]);
      if (checkedInGroup.length < rule.min) {
        groupErrors[groupId] = rule.message;
      }
    });
  }

  // Grouper les conditions
  const ungrouped = conditions.filter(c => !c.group);
  const groups = {};
  conditions.forEach(c => {
    if (c.group) {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    }
  });

  const renderCondition = (condition) => {
    const isChecked = !!checkedConditions[condition.id];
    
    // Gérer les exclusions mutuelles
    const isDisabled = condition.exclusive && checkedConditions[condition.exclusive];

    return (
      <div key={condition.id} className="space-y-2">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors bg-white">
          <Checkbox
            id={condition.id}
            checked={isChecked}
            disabled={isDisabled}
            onCheckedChange={(checked) => onToggleCondition(condition.id, checked)}
            className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
          <div className="flex-1">
            <Label htmlFor={condition.id} className={`text-sm cursor-pointer ${isDisabled ? 'text-slate-400' : ''}`}>
              {condition.text}
              {condition.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        </div>
        
        {/* Champ de valeur si nécessaire */}
        {condition.needsValue && isChecked && (
          <div className="ml-10">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500 whitespace-nowrap">{condition.valueLabel}:</Label>
              <Input
                type={condition.valueType === 'number' ? 'number' : 'text'}
                step="0.1"
                placeholder={condition.valueLabel}
                value={conditionValues[condition.id] || ''}
                onChange={(e) => onValueChange(condition.id, e.target.value)}
                className="h-8 w-32 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Conditions par groupe (indications) */}
      {Object.entries(groups).map(([groupId, groupConditions]) => (
        <div key={groupId} className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-700">Indication (cochez celle qui s'applique):</p>
            {groupErrors[groupId] && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {groupErrors[groupId]}
              </Badge>
            )}
          </div>
          <div className="space-y-1.5 pl-2 border-l-2 border-purple-200">
            {groupConditions.map(renderCondition)}
          </div>
        </div>
      ))}

      {/* Conditions sans groupe */}
      {ungrouped.length > 0 && (
        <div className="space-y-2">
          {Object.keys(groups).length > 0 && (
            <p className="text-sm font-medium text-slate-700">Conditions supplémentaires:</p>
          )}
          <div className="space-y-1.5">
            {ungrouped.map(renderCondition)}
          </div>
        </div>
      )}

      {/* Documents requis */}
      {documents && documents.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-700">Documents à conserver / joindre:</p>
          </div>
          <div className="space-y-1.5 pl-2 border-l-2 border-blue-200">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                <Upload className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-blue-900">{doc.text}</span>
                {doc.required && <Badge className="bg-blue-600 text-[10px] px-1.5">Obligatoire</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}