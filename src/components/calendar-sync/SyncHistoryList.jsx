import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  synced: { label: 'Synchronisé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', icon: XCircle },
  conflict: { label: 'Conflit', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle }
};

const providerLabels = { doctolib: 'Doctolib', doctena: 'Doctena', google_calendar: 'Google Calendar' };

export default function SyncHistoryList({ syncs, isLoading }) {
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  if (syncs.length === 0) return <div className="text-center py-12 text-muted-foreground">Aucun historique de synchronisation</div>;

  return (
    <div className="space-y-2">
      {syncs.map(s => {
        const sc = statusConfig[s.sync_status] || statusConfig.pending;
        const StatusIcon = sc.icon;
        return (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-5 h-5 ${s.sync_status === 'synced' ? 'text-green-600' : s.sync_status === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{providerLabels[s.provider] || s.provider}</Badge>
                    <Badge className={sc.color}>{sc.label}</Badge>
                    {s.sync_direction && <span className="text-xs text-muted-foreground">{s.sync_direction}</span>}
                  </div>
                  {s.error_message && <p className="text-xs text-red-600 mt-1">{s.error_message}</p>}
                </div>
              </div>
              {s.last_synced_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(s.last_synced_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}