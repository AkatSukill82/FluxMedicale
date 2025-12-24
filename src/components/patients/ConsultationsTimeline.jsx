import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Stethoscope, 
  FileText, 
  ChevronRight, 
  Calendar,
  User,
  Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ConsultationsTimeline({ patient, onSelectConsultation, maxItems = 10 }) {
  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['patientConsultations', patient.id],
    queryFn: async () => {
      const all = await base44.entities.Consultation.filter(
        { patient_id: patient.id },
        '-date_consultation',
        maxItems
      );
      return all;
    },
    enabled: !!patient.id
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Consultations récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Consultations récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune consultation enregistrée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'Completee':
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>;
      case 'Brouillon':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'Verrouillee':
        return <Badge className="bg-blue-100 text-blue-800">Verrouillée</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Consultations récentes
          </CardTitle>
          <Badge variant="outline">{consultations.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {consultations.map((consultation, index) => {
            const consultDate = consultation.date_consultation 
              ? new Date(consultation.date_consultation) 
              : null;
            
            return (
              <button
                key={consultation.id}
                onClick={() => onSelectConsultation?.(consultation)}
                className="w-full p-4 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="flex items-start gap-3">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    {index < consultations.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-200 mt-2 min-h-[20px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 truncate">
                            {consultation.motif || 'Consultation'}
                          </span>
                          {getStatusBadge(consultation.statut)}
                        </div>
                        
                        {consultDate && (
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(consultDate, 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="text-xs">
                              {formatDistanceToNow(consultDate, { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        )}

                        {consultation.diagnostic && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-1">
                            <span className="font-medium">Diagnostic:</span> {consultation.diagnostic}
                          </p>
                        )}

                        {consultation.medecin_email && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <User className="w-3 h-3" />
                            {consultation.medecin_email.split('@')[0]}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}