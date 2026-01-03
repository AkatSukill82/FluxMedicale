import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  User,
  Play,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { format, isToday, isFuture, isPast, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TeleconsultationScheduler from './TeleconsultationScheduler';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Planifiée', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  WAITING_ROOM: { label: 'Salle d\'attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  IN_PROGRESS: { label: 'En cours', color: 'bg-green-100 text-green-700', icon: Video },
  COMPLETED: { label: 'Terminée', color: 'bg-slate-100 text-slate-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  NO_SHOW: { label: 'Absent', color: 'bg-orange-100 text-orange-700', icon: XCircle }
};

export default function TeleconsultationDashboard() {
  const [showScheduler, setShowScheduler] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teleconsultations'],
    queryFn: () => base44.entities.TeleconsultationSession.list('-scheduled_start', 100)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForTeleconsult'],
    queryFn: () => base44.entities.Patient.list('-created_date', 300)
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient';
    const name = patient.name?.[0];
    return name ? `${name.given?.[0] || ''} ${name.family || ''}`.trim() : 'Patient';
  };

  // Catégoriser les sessions
  const todaySessions = sessions.filter(s => 
    isToday(new Date(s.scheduled_start)) && 
    ['SCHEDULED', 'WAITING_ROOM', 'IN_PROGRESS'].includes(s.status)
  );

  const upcomingSessions = sessions.filter(s => 
    isFuture(new Date(s.scheduled_start)) && 
    !isToday(new Date(s.scheduled_start)) &&
    s.status === 'SCHEDULED'
  );

  const pastSessions = sessions.filter(s => 
    ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(s.status)
  );

  const filteredSessions = sessions.filter(s => {
    if (!searchTerm) return true;
    const patientName = getPatientName(s.patient_id).toLowerCase();
    return patientName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-7 h-7 text-blue-600" />
            Téléconsultations
          </h1>
          <p className="text-muted-foreground">Gérez vos consultations vidéo</p>
        </div>
        <Button onClick={() => setShowScheduler(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle téléconsultation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-blue-700">{todaySessions.length}</p>
            <p className="text-sm text-blue-600">Aujourd'hui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{upcomingSessions.length}</p>
            <p className="text-sm text-muted-foreground">À venir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-green-600">
              {sessions.filter(s => s.status === 'IN_PROGRESS').length}
            </p>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold">
              {pastSessions.filter(s => s.status === 'COMPLETED').length}
            </p>
            <p className="text-sm text-muted-foreground">Terminées ce mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions du jour */}
      {todaySessions.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaySessions.map(session => {
              const statusConfig = STATUS_CONFIG[session.status];
              const StatusIcon = statusConfig.icon;
              const startTime = new Date(session.scheduled_start);
              const minutesUntil = differenceInMinutes(startTime, new Date());
              const canJoin = minutesUntil <= 15 && minutesUntil >= -60;

              return (
                <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{format(startTime, 'HH:mm')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.scheduled_end), 'HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">{getPatientName(session.patient_id)}</p>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canJoin && (
                      <Link to={createPageUrl(`TeleconsultationRoom?session=${session.id}`)}>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <Play className="w-4 h-4 mr-2" />
                          Rejoindre
                        </Button>
                      </Link>
                    )}
                    {minutesUntil > 15 && (
                      <span className="text-sm text-muted-foreground">
                        Dans {minutesUntil} min
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recherche et liste complète */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Toutes les téléconsultations</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-muted-foreground">Aucune téléconsultation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.slice(0, 20).map(session => {
                const statusConfig = STATUS_CONFIG[session.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{getPatientName(session.patient_id)}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(session.scheduled_start), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal planification */}
      {showScheduler && (
        <TeleconsultationScheduler
          isOpen={showScheduler}
          onClose={() => setShowScheduler(false)}
        />
      )}
    </div>
  );
}