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
    <div className="space-y-3">
      <div className="sticky top-0 bg-white z-10 pb-3 border-b">
        <h3 className="font-bold text-lg">Historique patient</h3>
        <p className="text-sm text-muted-foreground">
          {allEvents.length} événement(s) enregistré(s)
        </p>
      </div>

      {allEvents.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun événement enregistré</p>
        </div>
      ) : (
        <div className="space-y-3 pb-6">
          {allEvents.map((event, index) => {
            const eventDate = event.sortDate;
            const isValidDate = eventDate && !isNaN(eventDate.getTime());

            return (
              <Card 
                key={`${event.displayType}-${event.id}-${index}`}
                className="hover:shadow-md transition-shadow border-l-4"
                style={{ borderLeftColor: getEventColor(event.event_type).split(' ')[0].replace('bg-', '#') }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getEventColor(event.event_type)}`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-slate-900 leading-tight">
                          {event.title}
                        </h4>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {event.event_type || event.displayType}
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {isValidDate && (
                          <>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(eventDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(eventDate, { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          </>
                        )}
                        
                        {(event.provider || event.created_by) && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {(event.provider || event.created_by)?.split('@')[0]}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Actions selon le type */}
                      {event.displayType === 'consultation' && event.anamnese && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 h-7 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Voir détails
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}