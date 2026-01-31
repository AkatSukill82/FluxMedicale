import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Euro,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  Pill,
  FileText
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PatientDashboardSummary({ patient, onNavigate }) {
  const { data: appointments = [] } = useQuery({
    queryKey: ['patientAppointments', patient.id],
    queryFn: async () => {
      const rdvs = await base44.entities.RendezVous.filter({ patient_id: patient.id });
      return rdvs.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['patientInvoices', patient.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patient.id })
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['patientMessages', patient.id],
    queryFn: () => base44.entities.PatientMessage.filter({ patient_id: patient.id })
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patientPrescriptions', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id })
  });

  // Calculs
  const now = new Date();
  const nextAppointment = appointments.find(a => 
    isFuture(new Date(`${a.date}T${a.heure_debut || '00:00'}`)) && 
    a.statut !== 'Annulé'
  );
  
  const unpaidInvoices = invoices.filter(i => !['PAID', 'CANCELLED', 'DRAFT'].includes(i.status));
  const totalDue = unpaidInvoices.reduce((sum, i) => sum + (i.amount_due || i.total_amount || 0), 0);
  const overdueInvoices = unpaidInvoices.filter(i => i.due_date && isPast(new Date(i.due_date)));

  const unreadMessages = messages.filter(m => !m.read && m.sender_type === 'patient');
  const recentPrescriptions = prescriptions.filter(p => {
    const date = new Date(p.date_prescription);
    const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });

  const lastConsultation = appointments
    .filter(a => a.statut === 'Terminé')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Prochain RDV */}
      <Card className={`border-l-4 ${nextAppointment ? 'border-l-blue-500' : 'border-l-slate-300'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prochain RDV</p>
              {nextAppointment ? (
                <div className="mt-2">
                  <p className="font-semibold text-lg">
                    {format(new Date(nextAppointment.date), 'd MMM', { locale: fr })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nextAppointment.heure_debut} - {nextAppointment.type_consultation}
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {formatDistanceToNow(new Date(`${nextAppointment.date}T${nextAppointment.heure_debut}`), { locale: fr, addSuffix: true })}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Aucun RDV prévu</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${nextAppointment ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Calendar className={`w-5 h-5 ${nextAppointment ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
          </div>
          {!nextAppointment && (
            <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => onNavigate?.('agenda')}>
              Planifier un RDV
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Solde dû */}
      <Card className={`border-l-4 ${totalDue > 0 ? (overdueInvoices.length > 0 ? 'border-l-red-500' : 'border-l-amber-500') : 'border-l-green-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Solde dû</p>
              <p className={`font-bold text-2xl mt-2 ${totalDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {(totalDue / 100).toFixed(2)}€
              </p>
              {totalDue > 0 ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''}
                  </span>
                  {overdueInvoices.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueInvoices.length} en retard
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  À jour
                </p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              totalDue > 0 ? (overdueInvoices.length > 0 ? 'bg-red-100' : 'bg-amber-100') : 'bg-green-100'
            }`}>
              <Euro className={`w-5 h-5 ${
                totalDue > 0 ? (overdueInvoices.length > 0 ? 'text-red-600' : 'text-amber-600') : 'text-green-600'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className={`border-l-4 ${unreadMessages.length > 0 ? 'border-l-purple-500' : 'border-l-slate-300'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Messages</p>
              {unreadMessages.length > 0 ? (
                <div className="mt-2">
                  <p className="font-semibold text-lg text-purple-600">
                    {unreadMessages.length} non lu{unreadMessages.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernier: {formatDistanceToNow(new Date(unreadMessages[0].created_date), { locale: fr, addSuffix: true })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Aucun message</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unreadMessages.length > 0 ? 'bg-purple-100' : 'bg-slate-100'}`}>
              <MessageSquare className={`w-5 h-5 ${unreadMessages.length > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
              {unreadMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages.length}
                </span>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => onNavigate?.('messages')}>
            {unreadMessages.length > 0 ? 'Voir les messages' : 'Envoyer un message'}
          </Button>
        </CardContent>
      </Card>

      {/* Activité récente */}
      <Card className="border-l-4 border-l-slate-300">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activité récente</p>
              <div className="mt-2 space-y-1">
                {lastConsultation && (
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="w-3 h-3 text-blue-500" />
                    <span>Consultation {format(new Date(lastConsultation.date), 'd/MM', { locale: fr })}</span>
                  </div>
                )}
                {recentPrescriptions.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Pill className="w-3 h-3 text-green-500" />
                    <span>{recentPrescriptions.length} ordonnance{recentPrescriptions.length > 1 ? 's' : ''} (30j)</span>
                  </div>
                )}
                {!lastConsultation && recentPrescriptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}