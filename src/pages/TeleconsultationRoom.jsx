
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  FileText,
  Send,
  Brain,
  Sparkles,
  Activity,
  Loader2 // Added for AI tab loading indicator
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PostConsultationWorkflow from '../components/followup/PostConsultationWorkflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TeleconsultationRoom() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(new URLSearchParams(window.location.search).get('session'));
  
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  
  const [chatMessage, setChatMessage] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [aiDiagnosticSuggestions, setAiDiagnosticSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIDiagnostics, setShowAIDiagnostics] = useState(false); // Default to false
  const [transcribedText, setTranscribedText] = useState(''); // Not fully used in this change, but added as per outline
  const [showFollowUpWorkflow, setShowFollowUpWorkflow] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState(null);
  const [createdConsultation, setCreatedConsultation] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  
  const { data: session } = useQuery({
    queryKey: ['teleconsultation', sessionId],
    queryFn: () => base44.entities.TeleconsultationSession.filter({ id: sessionId }).then(res => res[0]),
    enabled: !!sessionId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['teleconsultation-messages', sessionId],
    queryFn: () => base44.entities.TeleconsultationMessage.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 2000 // Poll every 2 seconds
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', session?.patient_id],
    queryFn: () => base44.entities.Patient.filter({ id: session.patient_id }).then(res => res[0]),
    enabled: !!session?.patient_id
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message) => base44.entities.TeleconsultationMessage.create(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teleconsultation-messages', sessionId] });
      setChatMessage('');
    }
  });

  const endSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.TeleconsultationSession.update(sessionId, data),
    onSuccess: () => {
      toast.success('Téléconsultation terminée');
      navigate(createPageUrl('Telemedicine'));
    },
    onError: (error) => {
      console.error('Error ending session:', error);
      toast.error('Erreur lors de la fin de la téléconsultation');
    }
  });

  // Initialiser média local
  useEffect(() => {
    if (sessionId) {
      startLocalMedia();
      // Mettre à jour le statut de la session
      base44.entities.TeleconsultationSession.update(sessionId, {
        status: 'IN_PROGRESS',
        actual_start: new Date().toISOString(),
        'connection_info.medecin_joined_at': new Date().toISOString()
      });
    }

    return () => {
      stopLocalMedia();
    };
  }, [sessionId]);

  // NEW: Real-time AI diagnostic suggestions
  useEffect(() => {
    if (session?.status === 'IN_PROGRESS' && consultationNotes.length > 50 && patient) {
      // Debounce AI analysis
      const timer = setTimeout(() => {
        analyzeInRealTime();
      }, 3000);
      return () => clearTimeout(timer);
    } else if (consultationNotes.length < 50 && aiDiagnosticSuggestions.length > 0) {
      // Clear suggestions if notes are too short
      setAiDiagnosticSuggestions([]);
    }
  }, [consultationNotes, session?.status, patient]);

  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Impossible d\'accéder à la caméra/microphone');
    }
  };

  const stopLocalMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        // Replace video track with screen share
        setScreenSharing(true);
        toast.success('Partage d\'écran activé');
      } catch (error) {
        console.error('Error sharing screen:', error);
        toast.error('Impossible de partager l\'écran');
      }
    } else {
      setScreenSharing(false);
      toast.info('Partage d\'écran arrêté');
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    sendMessageMutation.mutate({
      session_id: sessionId,
      sender_email: user.email,
      sender_role: 'MEDECIN',
      message_type: 'TEXT',
      content: chatMessage,
      timestamp: new Date().toISOString()
    });
  };

  const getPatientName = () => {
    if (!patient) return 'Patient';
    const officialName = patient.name?.find(n => n.use === 'official') || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  };

  const analyzeInRealTime = async () => {
    if (isAnalyzing || !patient) return;
    
    setIsAnalyzing(true);
    try {
      const prompt = `En tant qu'assistant médical IA en temps réel, analyse les notes de consultation suivantes et fournis des suggestions diagnostiques:

NOTES ACTUELLES:
${consultationNotes}

CONTEXTE:
- Patient: ${getPatientName()}
- Antécédents: ${patient.antecedents_medicaux || 'Non disponibles'}
- Médicaments actuels: ${patient.medicaments_actuels || 'Aucun'}
- Allergies: ${patient.allergies || 'Aucune'}

Fournis:
1. 2-3 diagnostics différentiels probables
2. Examens complémentaires à envisager
3. Drapeaux rouges potentiels
4. Recommandations de suivi

Format JSON concis pour affichage temps réel`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            differential_diagnoses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  diagnosis: { type: "string" },
                  probability: { type: "string" },
                  rationale: { type: "string" }
                },
                required: ["diagnosis", "probability", "rationale"]
              }
            },
            suggested_tests: {
              type: "array",
              items: { type: "string" }
            },
            red_flags: {
              type: "array",
              items: { type: "string" }
            },
            follow_up: { type: "string" }
          },
          required: ["differential_diagnoses"]
        }
      });

      if (response) {
        setAiDiagnosticSuggestions([response]);
      } else {
        setAiDiagnosticSuggestions([]);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Erreur lors de l\'analyse IA');
      setAiDiagnosticSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // NEW: Generate AI session summary
  const generateSessionSummary = async () => {
    try {
      const prompt = `Génère un résumé structuré de cette téléconsultation:

PATIENT: ${getPatientName()}
DURÉE: ${session.actual_start ? Math.round((new Date() - new Date(session.actual_start)) / 60000) : 0} minutes

NOTES DU MÉDECIN:
${consultationNotes}

MESSAGES ÉCHANGÉS:
${messages.slice(-10).map(m => `${m.sender_role}: ${m.content}`).join('\n')}

Génère un résumé médical structuré incluant:
1. MOTIF DE CONSULTATION
2. SYMPTÔMES PRINCIPAUX
3. DIAGNOSTIC RETENU
4. TRAITEMENT PRESCRIT
5. EXAMENS DEMANDÉS (si applicable)
6. PLAN DE SUIVI
7. NOTES IMPORTANTES

Format JSON structuré pour enregistrement dans le dossier médical`;

      const summary = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            motif: { type: "string" },
            symptomes: { type: "array", items: { type: "string" } },
            diagnostic: { type: "string" },
            traitement: { type: "string" },
            examens_demandes: { type: "array", items: { type: "string" } },
            plan_suivi: { type: "string" },
            notes_importantes: { type: "string" }
          },
          required: ["motif", "symptomes", "diagnostic", "traitement", "examens_demandes", "plan_suivi", "notes_importantes"]
        }
      });

      return summary;
    } catch (error) {
      console.error('Summary generation error:', error);
      toast.error('Erreur lors de la génération du résumé IA');
      return null;
    }
  };

  const handleEndSession = async () => {
    if (confirm('Êtes-vous sûr de vouloir terminer cette téléconsultation ?')) {
      // Generate AI summary
      let summary = null;
      if (consultationNotes.length > 0) { // Only generate summary if there are notes
        summary = await generateSessionSummary();
        setGeneratedSummary(summary);
      }
      
      const summaryText = summary ? `
RÉSUMÉ AUTOMATIQUE (IA):

Motif: ${summary.motif}

Symptômes: ${summary.symptomes?.join(', ') || ''}

Diagnostic: ${summary.diagnostic}

Traitement: ${summary.traitement}

Examens demandés: ${summary.examens_demandes?.join(', ') || ''}

Plan de suivi: ${summary.plan_suivi}

Notes importantes: ${summary.notes_importantes}

---
NOTES MÉDECIN:
${consultationNotes}
` : consultationNotes;

      // Create consultation record
      if (patient && user) {
        try {
          const newConsultation = await base44.entities.Consultation.create({
            patient_id: patient.id,
            medecin_email: user.email,
            date_consultation: new Date().toISOString(),
            motif: summary?.motif || 'Téléconsultation',
            anamnese: summary?.symptomes?.join(', ') || '',
            diagnostic: summary?.diagnostic || '',
            prescriptions: summary?.traitement || '',
            fichiers_joints: [],
            statut: 'Completee'
          });
          
          setCreatedConsultation(newConsultation);
          toast.success('Consultation enregistrée dans le dossier patient');
        } catch (createError) {
          console.error('Error creating Consultation record:', createError);
          toast.error('Erreur lors de la sauvegarde de la consultation');
        }
      }

      endSessionMutation.mutate({
        status: 'COMPLETED',
        actual_end: new Date().toISOString(),
        consultation_notes: summaryText,
        'connection_info.medecin_left_at': new Date().toISOString()
      });

      if (summary) {
        toast.success('Résumé IA généré');
        // Show follow-up workflow dialog
        setShowFollowUpWorkflow(true);
      }
    }
  };

  if (!session) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  const scheduledStartDate = session.scheduled_start ? new Date(session.scheduled_start) : null;
  const isValidScheduledStart = scheduledStartDate && !isNaN(scheduledStartDate.getTime());

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">Téléconsultation en cours</span>
          </div>
          <span className="text-gray-400">•</span>
          <span className="text-white">{getPatientName()}</span>
        </div>
        <div className="text-gray-400 text-sm">
          {isValidScheduledStart 
            ? format(scheduledStartDate, 'HH:mm', { locale: fr })
            : 'Heure non disponible'
          }
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative">
          {/* Remote video (patient) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-gray-950"
          />
          
          {/* Placeholder si pas de vidéo distante */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl text-white">
                  {getPatientName().charAt(0)}
                </span>
              </div>
              <p className="text-white text-lg">{getPatientName()}</p>
              <p className="text-gray-400 text-sm mt-2">En attente de connexion...</p>
            </div>
          </div>

          {/* Local video (médecin) - PiP */}
          <div className="absolute bottom-6 right-6 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-600">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-gray-500" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-full px-6 py-4 flex items-center gap-3 shadow-2xl">
              <Button
                size="icon"
                variant={audioEnabled ? 'default' : 'destructive'}
                className="rounded-full w-12 h-12"
                onClick={toggleAudio}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              <Button
                size="icon"
                variant={videoEnabled ? 'default' : 'destructive'}
                className="rounded-full w-12 h-12"
                onClick={toggleVideo}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
              <Button
                size="icon"
                variant={screenSharing ? 'default' : 'outline'}
                className="rounded-full w-12 h-12"
                onClick={toggleScreenShare}
              >
                {screenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="rounded-full w-14 h-14"
                onClick={handleEndSession}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-full w-12 h-12"
                onClick={() => setShowNotes(!showNotes)}
              >
                <FileText className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-full w-12 h-12"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - Chat, Notes & AI Diagnostics */}
        {(showChat || showNotes || showAIDiagnostics) && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  showChat && !showNotes && !showAIDiagnostics ? 'text-white bg-gray-700' : 'text-gray-400'
                }`}
                onClick={() => { setShowChat(true); setShowNotes(false); setShowAIDiagnostics(false); }}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Chat
              </button>
              <button
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  showNotes && !showChat && !showAIDiagnostics ? 'text-white bg-gray-700' : 'text-gray-400'
                }`}
                onClick={() => { setShowNotes(true); setShowChat(false); setShowAIDiagnostics(false); }}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Notes
              </button>
              <button
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  showAIDiagnostics && !showChat && !showNotes ? 'text-white bg-gray-700' : 'text-gray-400'
                }`}
                onClick={() => { setShowAIDiagnostics(true); setShowChat(false); setShowNotes(false); }}
              >
                <Brain className="w-4 h-4 inline mr-2" />
                IA
                {isAnalyzing && <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />}
              </button>
            </div>

            {/* Chat panel */}
            {showChat && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'MEDECIN' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.sender_role === 'MEDECIN'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.timestamp), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Tapez votre message..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Notes panel */}
            {showNotes && (
              <div className="flex-1 flex flex-col p-4">
                <h3 className="text-white font-semibold mb-3">Notes de consultation</h3>
                <Textarea
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  placeholder="Notez vos observations pendant la consultation..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white resize-none"
                />
                <Alert className="mt-2 bg-blue-900/30 border-blue-700">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <AlertDescription className="text-xs text-blue-200">
                    L'IA analysera vos notes en temps réel et générera un résumé automatique à la fin
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* AI Diagnostics panel */}
            {showAIDiagnostics && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Assistant Diagnostique IA
                </h3>

                {consultationNotes.length < 50 && (
                  <Alert className="bg-yellow-900/30 border-yellow-700 mb-4">
                    <AlertDescription className="text-xs text-yellow-200">
                      Ajoutez au moins 50 caractères de notes pour activer les suggestions diagnostiques en temps réel
                    </AlertDescription>
                  </Alert>
                )}

                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours...
                  </div>
                )}

                {!isAnalyzing && aiDiagnosticSuggestions.length === 0 && consultationNotes.length >= 50 && (
                  <Alert className="bg-gray-700 border-gray-600 mb-4">
                    <AlertDescription className="text-xs text-gray-300">
                      Aucune suggestion diagnostique pour le moment. Continuez à prendre des notes.
                    </AlertDescription>
                  </Alert>
                )}


                {aiDiagnosticSuggestions.length > 0 && aiDiagnosticSuggestions[0] && (
                  <div className="space-y-4">
                    {/* Differential Diagnoses */}
                    {aiDiagnosticSuggestions[0].differential_diagnoses && aiDiagnosticSuggestions[0].differential_diagnoses.length > 0 && (
                      <div className="bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-400" />
                          Diagnostics différentiels
                        </h4>
                        {aiDiagnosticSuggestions[0].differential_diagnoses.map((diag, idx) => (
                          <div key={idx} className="bg-gray-800 rounded p-2 mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-white font-medium">{diag.diagnosis}</span>
                              <Badge variant="outline" className="text-xs">{diag.probability}</Badge>
                            </div>
                            <p className="text-xs text-gray-400">{diag.rationale}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested Tests */}
                    {aiDiagnosticSuggestions[0].suggested_tests && aiDiagnosticSuggestions[0].suggested_tests.length > 0 && (
                      <div className="bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-white mb-2">Examens suggérés</h4>
                        <ul className="space-y-1">
                          {aiDiagnosticSuggestions[0].suggested_tests.map((test, idx) => (
                            <li key={idx} className="text-xs text-gray-300">• {test}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Red Flags */}
                    {aiDiagnosticSuggestions[0].red_flags && aiDiagnosticSuggestions[0].red_flags.length > 0 && (
                      <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-red-300 mb-2">⚠️ Drapeaux rouges</h4>
                        <ul className="space-y-1">
                          {aiDiagnosticSuggestions[0].red_flags.map((flag, idx) => (
                            <li key={idx} className="text-xs text-red-200">• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Follow-up */}
                    {aiDiagnosticSuggestions[0].follow_up && (
                      <div className="bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-white mb-2">Plan de suivi</h4>
                        <p className="text-xs text-gray-300">{aiDiagnosticSuggestions[0].follow_up}</p>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <Alert className="bg-amber-900/30 border-amber-700">
                      <AlertDescription className="text-xs text-amber-200">
                        <strong>⚠️ Rappel:</strong> Ces suggestions sont générées par IA et doivent être validées par votre expertise clinique.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-up Workflow Dialog */}
      <Dialog open={showFollowUpWorkflow} onOpenChange={setShowFollowUpWorkflow}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Suivi Post-Consultation</DialogTitle>
            <DialogDescription>
              L'IA peut générer automatiquement les actions de suivi nécessaires
            </DialogDescription>
          </DialogHeader>
          
          {createdConsultation && patient && (
            <PostConsultationWorkflow
              consultation={createdConsultation}
              patient={patient}
              aiSummary={generatedSummary}
              onComplete={() => {
                setShowFollowUpWorkflow(false);
                toast.success('Actions de suivi créées - consultez l\'onglet Tâches');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
