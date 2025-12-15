import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Pill, 
  CreditCard, 
  File, 
  Loader2,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PatientTimeline({ patient }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['timeline_events', patient?.id],
    queryFn: async () => {
      try {
        return await base44.entities.TimelineEvent.filter({ 
          patient_id: patient.id 
        }, '-event_date', 100);
      } catch (error) {
        console.log('TimelineEvent fetch failed, entity may not exist yet');
        return [];
      }
    },
    enabled: !!patient?.id
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations_timeline', patient?.id],
    queryFn: () => base44.entities.Consultation.filter({ 
      patient_id: patient.id 
    }, '-date_consultation', 50),
    enabled: !!patient?.id
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions_timeline', patient?.id],
    queryFn: () => base44.entities.Prescription.filter({ 
      patient_id: patient.id 
    }, '-created_date', 50),
    enabled: !!patient?.id
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices_timeline', patient?.id],
    queryFn: () => base44.entities.Invoice.filter({ 
      patient_id: patient.id 
    }, '-invoice_date', 50),
    enabled: !!patient?.id
  });

  // Combiner tous les événements
  const allEvents = [
    ...events.map(e => ({
      ...e,
      sortDate: new Date(e.event_date),
      displayType: 'timeline_event'
    })),
    ...consultations.map(c => ({
      ...c,
      sortDate: new Date(c.date_consultation),
      displayType: 'consultation',
      event_type: 'CONSULTATION',
      title: c.motif || 'Consultation',
      description: c.anamnese?.substring(0, 150)
    })),
    ...prescriptions.map(p => ({
      ...p,
      sortDate: new Date(p.created_date),
      displayType: 'prescription',
      event_type: 'PRESCRIPTION',
      title: 'Prescription',
      description: `${p.medications?.length || 0} médicament(s) prescrit(s)`
    })),
    ...invoices.map(i => ({
      ...i,
      sortDate: new Date(i.invoice_date),
      displayType: 'invoice',
      event_type: 'INVOICE',
      title: `Facturation - ${((i.total_amount || 0) / 100).toFixed(2)}€`,
      description: `${i.type} - ${i.status}`
    }))
  ].sort((a, b) => b.sortDate - a.sortDate);

  const getEventIcon = (type) => {
    switch (type) {
      case 'CONSULTATION':
        return <FileText className="w-4 h-4" />;
      case 'PRESCRIPTION':
        return <Pill className="w-4 h-4" />;
      case 'INVOICE':
        return <CreditCard className="w-4 h-4" />;
      case 'DOCUMENT':
        return <File className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'CONSULTATION':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'PRESCRIPTION':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'INVOICE':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'DOCUMENT':
        return 'bg-orange-100 text-orange-600 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="sticky top-0 bg-white z-10 pb-2 border-b">
        <h3 className="font-bold text-base">Historique</h3>
        <p className="text-xs text-muted-foreground">{allEvents.length} événements</p>
      </div>

      {allEvents.length === 0 ? (
        <div className="text-center py-6 text-slate-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Aucun événement</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allEvents.slice(0, 10).map((event, index) => {
            const eventDate = event.sortDate;
            const isValidDate = eventDate && !isNaN(eventDate.getTime());

            return (
              <div 
                key={`${event.displayType}-${event.id}-${index}`}
                className="p-2 border rounded hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${getEventColor(event.event_type)}`}>
                    {getEventIcon(event.event_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs text-slate-900 leading-tight line-clamp-1">
                      {event.title}
                    </h4>
                    
                    {event.description && (
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                        {event.description}
                      </p>
                    )}

                    <div className="text-xs text-slate-500 mt-1">
                      {isValidDate && format(eventDate, 'dd/MM HH:mm', { locale: fr })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}