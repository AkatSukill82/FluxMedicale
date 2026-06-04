import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, Clock, Heart, Euro, Shield } from 'lucide-react';

export default function QuickStats({
  totalPatients,
  todayAppointments,
  pendingAppointments,
  dmgCount,
  monthRevenueCents,
  bimCount,
  isLoading,
}) {
  const stats = [
    {
      title: 'Patients actifs',
      value: totalPatients ?? '—',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      sub: dmgCount != null ? `${dmgCount} avec DMG` : null,
    },
    {
      title: "RDV aujourd'hui",
      value: todayAppointments ?? '—',
      icon: Calendar,
      color: 'from-green-500 to-green-600',
      sub: pendingAppointments != null ? `${pendingAppointments} en attente` : null,
    },
    {
      title: 'CA du mois',
      value: monthRevenueCents != null
        ? `${(monthRevenueCents / 100).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €`
        : '—',
      icon: Euro,
      color: 'from-emerald-500 to-emerald-600',
      sub: 'Honoraires facturés',
    },
    {
      title: 'Patients BIM/OMNIO',
      value: bimCount ?? '—',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      sub: 'Tiers payant obligatoire',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  {stat.sub && (
                    <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                  )}
                </div>
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
