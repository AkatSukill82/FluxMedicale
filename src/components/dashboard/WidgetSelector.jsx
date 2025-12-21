import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AVAILABLE_WIDGETS } from './widgetConfig';

export default function WidgetSelector({ isOpen, onClose, selectedWidgets, onToggleWidget }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personnaliser mon tableau de bord</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Sélectionnez les widgets que vous souhaitez afficher sur votre tableau de bord
          </p>
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_WIDGETS.map(widget => (
              <div
                key={widget.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                onClick={() => onToggleWidget(widget.id)}
              >
                <Checkbox
                  checked={selectedWidgets.includes(widget.id)}
                  onCheckedChange={() => onToggleWidget(widget.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {widget.icon}
                    <Label className="font-semibold cursor-pointer">
                      {widget.title}
                    </Label>
                  </div>
                  <p className="text-xs text-slate-600">{widget.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}