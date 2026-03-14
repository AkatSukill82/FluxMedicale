import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DraftRecoveryBanner({ draftData, onRestore, onDiscard }) {
  if (!draftData) return null;

  const savedAt = draftData._savedAt 
    ? format(new Date(draftData._savedAt), "dd/MM à HH:mm", { locale: fr })
    : 'date inconnue';

  return (
    <Alert className="border-amber-400 bg-amber-50 mx-6 mt-4">
      <RotateCcw className="w-4 h-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span className="text-sm text-amber-900">
          <strong>Brouillon récupéré</strong> — Consultation non terminée du {savedAt}.
          {draftData.consultationData?.motif && (
            <span className="text-amber-700"> Motif : « {draftData.consultationData.motif.substring(0, 40)}... »</span>
          )}
        </span>
        <div className="flex gap-2 ml-4 shrink-0">
          <Button size="sm" variant="outline" onClick={onDiscard} className="h-7 text-xs border-amber-400">
            <X className="w-3 h-3 mr-1" /> Ignorer
          </Button>
          <Button size="sm" onClick={onRestore} className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
            <RotateCcw className="w-3 h-3 mr-1" /> Restaurer
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}