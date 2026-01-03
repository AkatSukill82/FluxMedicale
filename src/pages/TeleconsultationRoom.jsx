import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Video,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  User,
  Calendar,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import VideoConsultationRoom from '../components/teleconsultation/VideoConsultationRoom';

export default function TeleconsultationRoom() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const roomId = urlParams.get('room');
  const sessionId = urlParams.get('session');

  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Charger la session par ID ou par room
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['teleconsultSession', sessionId, roomId],
    queryFn: async () => {
      if (sessionId) {
        const sessions = await base44.entities.TeleconsultationSession.filter({ id: sessionId });
        return sessions[0];
      }
      if (roomId) {
        const sessions = await base44.entities.TeleconsultationSession.filter({ video_room_id: roomId });
        return sessions[0];
      }
      return null;
    },
    enabled: !!(sessionId || roomId)
  });

  // Charger le patient
  const { data: patient } = useQuery({
    queryKey: ['teleconsultPatient', session?.patient_id],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: session.patient_id });
      return patients[0];
    },
    enabled: !!session?.patient_id
  });

  // Vérifier l'autorisation
  const isAuthorized = () => {
    if (!session) return false;
    
    // Médecin avec le bon token ou même email
    if (token === session.medecin_join_token) return true;
    if (currentUser?.email === session.medecin_email) return true;
    
    // Patient avec le bon token
    if (token === session.patient_join_token) return true;
    
    return false;
  };

  const isDoctor = currentUser?.email === session?.medecin_email || token === session?.medecin_join_token;

  const patientName = patient?.name?.[0]
    ? `${patient.name[0].given?.[0] || ''} ${patient.name[0].family || ''}`.trim()
    : 'Patient';

  // Écran de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-muted-foreground">Connexion à la salle de téléconsultation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session non trouvée
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session non trouvée</h2>
            <p className="text-muted-foreground mb-6">
              Cette téléconsultation n'existe pas ou a été annulée.
            </p>
            {currentUser && (
              <Link to={createPageUrl('Agenda')}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à l'agenda
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non autorisé
  if (!isAuthorized()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas accès à cette téléconsultation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session terminée ou annulée
  if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {session.status === 'COMPLETED' ? 'Consultation terminée' : 'Consultation annulée'}
            </h2>
            <p className="text-muted-foreground mb-6">
              Cette téléconsultation est terminée.
            </p>
            {isDoctor && (
              <Link to={createPageUrl('Agenda')}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à l'agenda
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Salle d'attente avant de rejoindre
  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Video className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Téléconsultation</h1>
              <Badge className={session.status === 'IN_PROGRESS' ? 'bg-green-600' : 'bg-blue-600'}>
                {session.status === 'IN_PROGRESS' ? 'En cours' : 'Planifiée'}
              </Badge>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isDoctor ? 'Patient' : 'Médecin'}
                  </p>
                  <p className="font-medium">
                    {isDoctor ? patientName : `Dr. ${session.medecin_email?.split('@')[0]}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Calendar className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Date prévue</p>
                  <p className="font-medium">
                    {format(new Date(session.scheduled_start), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Clock className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Heure</p>
                  <p className="font-medium">
                    {format(new Date(session.scheduled_start), 'HH:mm')} - {format(new Date(session.scheduled_end), 'HH:mm')}
                  </p>
                </div>
              </div>
            </div>

            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <strong>Avant de rejoindre:</strong>
                <ul className="list-disc ml-4 mt-1">
                  <li>Vérifiez votre caméra et microphone</li>
                  <li>Choisissez un endroit calme</li>
                  <li>Assurez une bonne connexion internet</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setIsJoined(true)}
            >
              <Video className="w-5 h-5 mr-2" />
              Rejoindre la consultation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interface de consultation
  return (
    <div className="h-screen">
      <VideoConsultationRoom
        session={session}
        patient={patient}
        onEnd={() => {
          setIsJoined(false);
        }}
      />
    </div>
  );
}