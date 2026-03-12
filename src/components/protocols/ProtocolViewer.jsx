import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, CheckCircle, ArrowLeft, ClipboardCopy } from 'lucide-react';
import ProtocolStepRenderer from './ProtocolStepRenderer';

export default function ProtocolViewer({ protocol, isOpen, onClose, onApplyToConsultation }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [scoreValues, setScoreValues] = useState({});

  if (!protocol) return null;

  const handleToggleItem = (key) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleScoreChange = (key, value) => {
    setScoreValues(prev => ({ ...prev, [key]: value }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCheckable = protocol.steps.reduce((sum, step) => {
    if (step.items) return sum + step.items.length;
    if (step.checklist) return sum + step.checklist.length;
    return sum;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{protocol.icon}</span>
            <div className="flex-1">
              <DialogTitle className="text-xl">{protocol.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{protocol.description}</p>
            </div>
            <Badge variant="outline" className="shrink-0">{protocol.category}</Badge>
          </div>
          {totalCheckable > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 rounded-full h-2 transition-all"
                  style={{ width: `${totalCheckable > 0 ? (checkedCount / totalCheckable) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{checkedCount}/{totalCheckable}</span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <div className="space-y-4">
            {protocol.steps.map((step, idx) => (
              <ProtocolStepRenderer
                key={idx}
                step={step}
                checkedItems={checkedItems}
                onToggleItem={handleToggleItem}
                scoreValues={scoreValues}
                onScoreChange={handleScoreChange}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          {onApplyToConsultation && (
            <Button
              onClick={() => {
                onApplyToConsultation(protocol.consultation_prefill);
                onClose();
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <ClipboardCopy className="w-4 h-4 mr-2" />
              Appliquer à la consultation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}