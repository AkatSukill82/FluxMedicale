import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Calendar,
  Syringe,
  RefreshCw,
  Heart,
  Clock,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function UpcomingReminders({ 
  patient, 
  vaccinations, 
  prescriptionsToRenew,
  dmgExpiresSoon,
  dmgData 
}) {
  const reminders = [];

  // Renouvellements d'ordonnances
  prescriptionsToRenew?.forEach(p => {
    const medications = p.medicaments?.map(m => m.nom_produit).join(', ');
    reminders.push({
      id: `renewal-${p.id}`,
      type: 'prescription',
      icon: RefreshCw,
      priority: 'high',
      title: 'Renouvellement ordonnance',
      description: medications,
      color: 'text-orange-600 bg-orange-100'
    });
  });

  // DMG
  if (dmgExpiresSoon && dmgData?.date_expiration) {
    const daysUntil = differenceInDays(new Date(dmgData.date_expiration), new Date());
    reminders.push({
      id: 'dmg-renewal',
      type: 'dmg',
      icon: Heart,
      priority: 'medium',
      title: 'Renouvellement DMG',
      description: `Expire dans ${daysUntil} jours`,
      date: dmgData.date_expiration,
      color: 'text-purple-600 bg-purple-100'
    });
  }

  // Prochains rappels vaccins (basé sur date_prochain_rappel)
  vaccinations
    ?.filter(v => v.date_prochain_rappel)
    .forEach(v => {
      const rappelDate = new Date(v.date_prochain_rappel);
      const daysUntil = differenceInDays(rappelDate, new Date());
      if (daysUntil <= 30 && daysUntil >= 0) {
        reminders.push({
          id: `vaccine-${v.id}`,
          type: 'vaccine',
          icon: Syringe,
          priority: daysUntil <= 7 ? 'high' : 'medium',
          title: `Rappel ${v.nom_vaccin}`,
          description: `Prévu le ${format(rappelDate, 'd MMMM yyyy', { locale: fr })}`,
          date: v.date_prochain_rappel,
          color: 'text-blue-600 bg-blue-100'
        });
      }
    });

  // Trier par priorité
  const sortedReminders = reminders.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-500" />
          Rappels importants
          {sortedReminders.length > 0 && (
            <Badge className="bg-orange-500">{sortedReminders.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedReminders.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucun rappel en attente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedReminders.slice(0, 5).map(reminder => {
              const Icon = reminder.icon;
              return (
                <div 
                  key={reminder.id}
                  className={`p-3 rounded-lg flex items-start gap-3 ${
                    reminder.priority === 'high' ? 'bg-red-50 border border-red-200' : 'bg-slate-50'
                  }`}
                >
                  <div className={`p-1.5 rounded-full ${reminder.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{reminder.title}</p>
                    <p className="text-xs text-slate-500 truncate">{reminder.description}</p>
                  </div>
                  {reminder.priority === 'high' && (
                    <Badge className="bg-red-600 text-xs">Urgent</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}