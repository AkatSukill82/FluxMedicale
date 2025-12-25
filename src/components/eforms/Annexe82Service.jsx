import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Annexe82Service({ patient, onFormCreated }) {
  const [isLoading, setIsLoading] = useState(false);

  const createAnnexe82 = async () => {
    setIsLoading(true);
    try {
      // Placeholder pour la création d'une annexe 82
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Formulaire Annexe 82 créé');
      onFormCreated?.();
    } catch (error) {
      console.error('Erreur création Annexe 82:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-blue-600" />
          Annexe 82 - Demande d'imagerie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Créez une demande d'examen d'imagerie médicale (IRM, CT, RX, etc.) conforme à l'Annexe 82.
        </p>

        <Button onClick={createAnnexe82} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Nouvelle demande
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}