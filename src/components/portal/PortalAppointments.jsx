import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusColors = {
  'Planifié': 'bg-blue-100 text-blue-700',
  'Confirmé': 'bg-green-100 text-green-700',
  'Terminé': 'bg-gray-100 text-gray-700',
  'Annulé': 'bg-red-100 text-red-700',
  'En cours': 'bg-yellow-100 text-yellow-700',
};

export default function PortalAppointments({ appointments, isLoading }) {
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const upcoming = appointments
    .filter(a => a.statut !== 'Annulé' && (!isPast(new Date(a.date)) || isToday(new Date(a.date))))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const past = appointments
    .filter(a => isPast(new Date(a.date)) && !isToday(new Date(a.date)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucun rendez-vous</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-blue-600">Prochains rendez-vous</h4>
          <div className="space-y-2">
            {upcoming.map(rdv => (
              <Card key={rdv.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[50px]">
                      <p className="text-lg font-bold">{format(new Date(rdv.date), 'd')}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{format(new Date(rdv.date), 'MMM', { locale: fr })}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{rdv.type_consultation}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {rdv.heure_debut}{rdv.heure_fin ? ` - ${rdv.heure_fin}` : ''}
                      </div>
                      {rdv.motif && <p className="text-xs text-muted-foreground mt-0.5">{rdv.motif}</p>}
                    </div>
                  </div>
                  <Badge className={statusColors[rdv.statut] || 'bg-gray-100'}>{rdv.statut}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Historique</h4>
          <div className="space-y-1">
            {past.slice(0, 10).map(rdv => (
              <div key={rdv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">{format(new Date(rdv.date), 'dd/MM/yy')}</span>
                  <span>{rdv.type_consultation}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{rdv.statut}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}