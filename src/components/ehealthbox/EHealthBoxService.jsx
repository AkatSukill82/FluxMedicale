import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Inbox, Send, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function EHealthBoxService({ onMessageReceived }) {
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const checkMessages = async () => {
    setIsLoading(true);
    try {
      // Simulation de vérification des messages eHealthBox
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessageCount(0);
      toast.success('Boîte eHealthBox vérifiée');
    } catch (error) {
      console.error('Erreur vérification eHealthBox:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5 text-blue-600" />
          eHealthBox
          {messageCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {messageCount} nouveau(x)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Service de messagerie sécurisée eHealth pour l'échange de documents médicaux.
        </p>

        <div className="flex gap-2">
          <Button onClick={checkMessages} disabled={isLoading} variant="outline">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </>
            )}
          </Button>
          <Button variant="outline">
            <Inbox className="w-4 h-4 mr-2" />
            Boîte de réception
          </Button>
          <Button variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}