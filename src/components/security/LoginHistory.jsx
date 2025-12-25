import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, Monitor, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function LoginHistory({ userEmail }) {
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['login-history', userEmail],
    queryFn: async () => {
      const filter = userEmail ? { user_email: userEmail } : {};
      return base44.entities.LoginAttempt.filter(filter, '-timestamp', 50);
    }
  });

  const getReasonLabel = (reason) => {
    const labels = {
      invalid_password: 'Mot de passe incorrect',
      account_locked: 'Compte verrouillé',
      session_expired: 'Session expirée',
      manual_logout: 'Déconnexion manuelle',
      inactivity_timeout: 'Inactivité'
    };
    return labels[reason] || reason;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Historique des connexions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {attempts.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucun historique</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <div 
                  key={attempt.id}
                  className={`p-3 rounded-lg border ${
                    attempt.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {attempt.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {attempt.success ? 'Connexion réussie' : 'Échec de connexion'}
                        </p>
                        {!attempt.success && attempt.failure_reason && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {getReasonLabel(attempt.failure_reason)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(attempt.timestamp), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    {attempt.ip_address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {attempt.ip_address}
                      </span>
                    )}
                    {attempt.user_agent && (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <Monitor className="w-3 h-3" />
                        {attempt.user_agent.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}