import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Stethoscope } from 'lucide-react';

export default function TemplatePreview({ template, onClose }) {
  const fields = [
    { key: 'motif', label: 'Motif de consultation' },
    { key: 'anamnese', label: 'Anamnèse / Antécédents' },
    { key: 'examen_clinique', label: 'Examen clinique' },
    { key: 'diagnostic', label: 'Diagnostic' },
    { key: 'prescriptions', label: 'Prescriptions' },
  ];

  const highlightVariables = (text) => {
    if (!text) return <span className="text-muted-foreground italic">Non défini</span>;
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) =>
      part.startsWith('[') && part.endsWith(']') ? (
        <span key={i} className="bg-amber-100 text-amber-800 px-1 rounded font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            {template.name}
            <Badge variant="outline" className="ml-2">{template.category}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {fields.map(({ key, label }) => {
            const value = template.content?.[key];
            if (!value) return null;
            return (
              <div key={key} className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{label}</h4>
                <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed">
                  {highlightVariables(value)}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
          Les champs en <span className="bg-amber-100 text-amber-800 px-1 rounded">[jaune]</span> sont à remplir lors de la consultation.
        </p>
      </DialogContent>
    </Dialog>
  );
}