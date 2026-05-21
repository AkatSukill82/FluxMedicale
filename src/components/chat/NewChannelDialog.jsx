import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function NewChannelDialog({ onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Canaux disponibles</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Les canaux par défaut sont :</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>#Général</strong> — Discussion générale</li>
            <li><strong>#Urgences</strong> — Communications urgentes</li>
            <li><strong>#Administratif</strong> — Questions administratives</li>
          </ul>
          <p className="text-xs">Les canaux personnalisés seront disponibles prochainement.</p>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}