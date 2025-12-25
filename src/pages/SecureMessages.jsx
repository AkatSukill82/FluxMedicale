import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareLock } from 'lucide-react';

export default function SecureMessages() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareLock className="w-5 h-5 text-blue-600" />
            Messages sécurisés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Cette fonctionnalité est en cours de développement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}