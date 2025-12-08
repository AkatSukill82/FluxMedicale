
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  VideoOff,
  CheckCircle,
  Loader2,
  Monitor,
  Brain // Added Brain icon
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIPatientTriage from '../components/telemedicine/AIPatientTriage'; // New import
import { // New import
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Telemedicine() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showTriageDialog, setShowTriageDialog] = useState(false); // New state
  const [triagePatient, setTriagePatient] = useState(null); // New state

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teleconsultations', filterStatus],
    queryFn: async () => {
      const allSessions = await base44.entities.TeleconsultationSession.list('-scheduled_start');
      if (filterStatus === 'ALL') return allSessions;
      return allSessions.filter(s => s.status === filterStatus);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const officialName = patient.name?.find(n => n.use === 'official') || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  };

  const getStatusBadge = (status) => {
    const config = {
      SCHEDULED: { color: 'bg-blue-100 text-blue-800', label: 'Planifiée' },
      WAITING_ROOM: { color: 'bg-yellow-100 text-yellow-800', label: 'Salle d\'attente' },
      IN_PROGRESS: { color: 'bg-green-100 text-green-800', label: 'En cours' },
      COMPLETED: { color: 'bg-gray-100 text-gray-800', label: 'Terminée' },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Annulée' },
      NO_SHOW: { color: 'bg-orange-100 text-orange-800', label: 'Absent' }
    };
    const { color, label } = config[status] || config.SCHEDULED;
    return <Badge className={color}>{label}</Badge>;
  };

  const joinSession = (session) => {
    navigate(createPageUrl(`TeleconsultationRoom?session=${session.id}`));
  };

  const filteredSessions = sessions.filter(s => {
    const patientName = getPatientName(s.patient_id).toLowerCase();
    return patientName.includes(searchTerm.toLowerCase());
  });

  const upcomingSessions = filteredSessions.filter(s =>
    s.status === 'SCHEDULED' && new Date(s.scheduled_start) > new Date()
  );
  const activeSessions = filteredSessions.filter(s =>
    s.status === 'IN_PROGRESS' || s.status === 'WAITING_ROOM'
  );

  const handleScheduleWithTriage = (patient) => {
    setTriagePatient(patient);
    setShowTriageDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            Télémédecine
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultations à distance sécurisées et conformes
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate(createPageUrl('Agenda'))}>
          <Plus className="w-4 h-4 mr-2" />
          Planifier téléconsultation
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Actives</p>
                <p className="text-2xl font-bold text-foreground">{activeSessions.length}</p>
              </div>
              <Monitor className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">À venir</p>
                <p className="text-2xl font-bold text-foreground">{upcomingSessions.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ce mois-ci</p>
                <p className="text-2xl font-bold text-foreground">
                  {sessions.filter(s => {
                    const start = new Date(s.scheduled_start);
                    const now = new Date();
                    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de présence</p>
                <p className="text-2xl font-bold text-foreground">
                  {sessions.length > 0
                    ? Math.round((sessions.filter(s => s.status === 'COMPLETED').length / sessions.length) * 100)
                    : 0}%
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Rechercher un patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map(status => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'ALL' ? 'Toutes' : status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions actives */}
      {activeSessions.length > 0 && (
        <Card className="border-2 border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Video className="w-5 h-5" />
              Sessions actives ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{getPatientName(session.patient_id)}</h4>
                      <p className="text-sm text-muted-foreground">
                        Démarré à {format(new Date(session.actual_start), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => joinSession(session)}>
                    <Video className="w-4 h-4 mr-2" />
                    Rejoindre
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les téléconsultations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <VideoOff className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucune téléconsultation trouvée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map(session => {
                const scheduledStart = session.scheduled_start ? new Date(session.scheduled_start) : null;
                const isValidDate = scheduledStart && !isNaN(scheduledStart.getTime());

                return (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{getPatientName(session.patient_id)}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="w-4 h-4" />
                          {isValidDate
                            ? format(scheduledStart, 'dd MMM yyyy à HH:mm', { locale: fr })
                            : 'Date non disponible'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(session.status)}
                      {(session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS' || session.status === 'WAITING_ROOM') && (
                        <Button variant="outline" size="sm" onClick={() => joinSession(session)}>
                          <Video className="w-4 h-4 mr-2" />
                          {session.status === 'IN_PROGRESS' ? 'Rejoindre' : 'Démarrer'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conformité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Conformité Télémédecine</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✓ Chiffrement end-to-end (AES-256)</li>
                <li>✓ Conforme RGPD et législation belge</li>
                <li>✓ Serveurs hébergés en Europe (AWS)</li>
                <li>✓ Consentement patient enregistré</li>
                <li>✓ Traçabilité complète des sessions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Triage Dialog */}
      <Dialog open={showTriageDialog} onOpenChange={setShowTriageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Triage IA Pré-Consultation
            </DialogTitle>
            <DialogDescription>
              Analysez les symptômes du patient pour prioriser et préparer la téléconsultation
            </DialogDescription>
          </DialogHeader>

          {triagePatient && (
            <AIPatientTriage
              patient={triagePatient}
              onTriageComplete={(assessment) => {
                toast.success('Triage enregistré');
                setShowTriageDialog(false);
                // Could redirect to scheduling with urgency info
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
