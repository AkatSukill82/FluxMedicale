import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  FileText,
  Pill,
  CreditCard,
  User,
  Clock,
  Settings,
  Maximize,
  Minimize,
  Send,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function VideoConsultationRoom({ session, patient, onEnd }) {
  const queryClient = useQueryClient();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [consultationNotes, setConsultationNotes] = useState(session?.consultation_notes || '');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Timer pour la durée
  useEffect(() => {
    const timer = setInterval(() => {
      if (isConnected) {
        setCallDuration(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  // Simuler la connexion
  useEffect(() => {
    // Accéder à la caméra locale
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsConnected(true);
        toast.success('Connecté à la salle de consultation');
      })
      .catch(err => {
        toast.error('Impossible d\'accéder à la caméra: ' + err.message);
      });

    return () => {
      // Nettoyer les streams
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sauvegarder les notes
  const saveNotesMutation = useMutation({
    mutationFn: () => base44.entities.TeleconsultationSession.update(session.id, {
      consultation_notes: consultationNotes
    }),
    onSuccess: () => toast.success('Notes sauvegardées')
  });

  // Terminer la consultation
  const endConsultationMutation = useMutation({
    mutationFn: async () => {
      // Arrêter les streams
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      // Mettre à jour la session
      await base44.entities.TeleconsultationSession.update(session.id, {
        status: 'COMPLETED',
        actual_end: new Date().toISOString(),
        consultation_notes: consultationNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teleconsultations'] });
      toast.success('Téléconsultation terminée');
      onEnd?.();
    }
  });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const patientName = patient?.name?.[0]
    ? `${patient.name[0].given?.[0] || ''} ${patient.name[0].family || ''}`.trim()
    : 'Patient';

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleMic = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  const sendChatMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages([...chatMessages, {
      sender: 'doctor',
      text: newMessage,
      time: new Date()
    }]);
    setNewMessage('');
  };

  return (
    <div className={`flex h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Zone vidéo principale */}
      <div className="flex-1 flex flex-col bg-slate-900 relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600">
                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                En direct
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(callDuration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-white border-white">
                <User className="w-3 h-3 mr-1" />
                {patientName}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Vidéo distante (patient) - placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div ref={remoteVideoRef} className="w-full h-full bg-slate-800 flex items-center justify-center">
            <div className="text-center text-white">
              <User className="w-24 h-24 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">En attente du patient...</p>
              <p className="text-sm text-slate-500 mt-2">{patientName}</p>
            </div>
          </div>
        </div>

        {/* Vidéo locale (médecin) - petit encart */}
        <div className="absolute bottom-24 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover bg-slate-700"
          />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-slate-500" />
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isMicOn ? 'secondary' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleMic}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>

            <Button
              variant={isVideoOn ? 'secondary' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleVideo}
            >
              {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => endConsultationMutation.mutate()}
              disabled={endConsultationMutation.isPending}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Panneau latéral - Notes et outils */}
      {!isFullscreen && (
        <div className="w-96 border-l bg-white flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="notes" className="flex-1 gap-1">
                <FileText className="w-4 h-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-1">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 gap-1">
                <Settings className="w-4 h-4" />
                Actions
              </TabsTrigger>
            </TabsList>

            {/* Notes de consultation */}
            <TabsContent value="notes" className="flex-1 p-4 flex flex-col m-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Notes de consultation</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => saveNotesMutation.mutate()}
                  disabled={saveNotesMutation.isPending}
                >
                  {saveNotesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Sauvegarder
                </Button>
              </div>
              <Textarea
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder="Motif de consultation, anamnèse, examen, diagnostic, plan de traitement..."
                className="flex-1 resize-none"
              />
            </TabsContent>

            {/* Chat */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-0">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Aucun message
                  </p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg text-sm ${
                        msg.sender === 'doctor' 
                          ? 'bg-blue-100 ml-8' 
                          : 'bg-slate-100 mr-8'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(msg.time, 'HH:mm')}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message..."
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                />
                <Button size="icon" onClick={sendChatMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            {/* Actions rapides */}
            <TabsContent value="actions" className="p-4 space-y-3 m-0">
              <h3 className="font-semibold mb-4">Actions rapides</h3>
              
              <Button variant="outline" className="w-full justify-start gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                Créer une prescription
              </Button>

              <Button variant="outline" className="w-full justify-start gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                Facturer la téléconsultation
              </Button>

              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Générer un certificat
              </Button>

              <Separator className="my-4" />

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Code INAMI:</strong> 101990 - Téléconsultation médecin généraliste
                  <br />
                  <span className="text-xs">Honoraire: 20,00 €</span>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}