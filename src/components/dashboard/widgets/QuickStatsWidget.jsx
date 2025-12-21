import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, FileText, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export default function QuickStatsWidget() {
  const today = new Date();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['monthly-consultations'],
    queryFn: async () => {
      const all = await base44.entities.Consultation.list('-date_consultation', 500);
      const monthStart = startOfMonth(today);
      return all.filter(c => new Date(c.date_consultation) >= monthStart);
    }
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['weekly-appointments'],
    queryFn: async () => {
      const all = await base44.entities.RendezVous.list('-date', 200);
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      return all.filter(rdv => new Date(rdv.date) >= weekStart);
    }
  });

  const stats = [
    {
      label: 'Patients totaux',
      value: patients.length,
      icon: <Users className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100'
    },
    {
      label: 'Consultations (mois)',
      value: consultations.length,
      icon: <FileText className="w-5 h-5 text-green-600" />,
      color: 'bg-green-100'
    },
    {
      label: 'RDV (semaine)',
      value: appointments.length,
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-100'
    },
    {
      label: 'Activité',
      value: `+${Math.round((consultations.length / 30) * 100)}%`,
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
      color: 'bg-orange-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, idx) => (
        <div key={idx} className={`${stat.color} p-4 rounded-lg`}>
          <div className="flex items-center gap-2 mb-2">
            {stat.icon}
          </div>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          <p className="text-xs text-slate-600 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}