import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DoctorAvailabilityView({ currentDate }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: availability, isLoading } = useQuery({
    queryKey: ['doctor-availability', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const [users, slots, appointments] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.CalendarSlot.list(),
        base44.entities.RendezVous.list()
      ]);

      const doctors = users.filter(u => u.role === 'admin');
      
      // Pour chaque médecin, calculer disponibilités par jour
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      
      return doctors.map(doctor => {
        const dailyAvailability = weekDays.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          
          // Créneaux du médecin pour ce jour
          const doctorSlots = slots.filter(s => 
            s.medecin_email === doctor.email &&
            format(new Date(s.start_time), 'yyyy-MM-dd') === dayStr
          );

          // RDV du médecin pour ce jour
          const doctorAppointments = appointments.filter(a =>
            a.medecin_assigne === doctor.email &&
            a.date === dayStr &&
            a.statut !== 'Annulé'
          );

          const totalSlots = doctorSlots.length;
          const bookedSlots = doctorAppointments.length;
          const availableSlots = totalSlots - bookedSlots;

          return {
            date: day,
            totalSlots,
            bookedSlots,
            availableSlots,
            isAvailable: availableSlots > 0
          };
        });

        return {
          doctor,
          dailyAvailability
        };
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Disponibilité des médecins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availability?.map(({ doctor, dailyAvailability }) => (
            <div key={doctor.email} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{doctor.full_name}</p>
                  <p className="text-xs text-slate-600">{doctor.specialite || 'Médecin'}</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dailyAvailability.map(({ date, availableSlots, isAvailable }, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-center ${
                      isAvailable 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {format(date, 'EEE', { locale: fr })}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {format(date, 'd')}
                    </p>
                    <div className="mt-2">
                      {isAvailable ? (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-bold text-green-700">
                            {availableSlots}
                          </span>
                        </div>
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!availability || availability.length === 0) && (
            <div className="text-center py-8 text-slate-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun médecin configuré</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}