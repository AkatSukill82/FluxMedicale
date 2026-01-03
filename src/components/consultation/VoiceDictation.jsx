import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  Wand2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceDictation({ onTranscript, targetField = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        clearInterval(timerRef.current);
        
        if (audioChunksRef.current.length > 0) {
          await processAudio();
        }
      };

      mediaRecorder.start(1000); // Collecter des chunks toutes les secondes
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Erreur micro:', err);
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });

      // Convertir en base64 pour l'envoi
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        try {
          // Upload du fichier audio
          const file = new File([audioBlob], 'dictation.webm', { type: audioBlob.type });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });

          // Transcription via LLM avec le fichier audio
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Transcris fidèlement le contenu audio médical suivant. 
            Si c'est une dictée médicale, structure le texte en paragraphes clairs.
            Corrige l'orthographe des termes médicaux si nécessaire.
            Ne rajoute rien, transcris uniquement ce qui est dit.
            ${targetField ? `Contexte: ${targetField}` : ''}`,
            file_urls: [file_url],
            response_json_schema: {
              type: 'object',
              properties: {
                transcription: { type: 'string', description: 'Texte transcrit' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                medical_terms: { type: 'array', items: { type: 'string' } }
              },
              required: ['transcription']
            }
          });

          if (result.transcription) {
            setTranscript(result.transcription);
            onTranscript?.(result.transcription);
            toast.success('Transcription terminée');
          } else {
            throw new Error('Aucune transcription obtenue');
          }
        } catch (err) {
          console.error('Erreur transcription:', err);
          setError('Erreur lors de la transcription. Réessayez.');
          toast.error('Erreur de transcription');
        } finally {
          setIsProcessing(false);
        }
      };

    } catch (err) {
      console.error('Erreur traitement audio:', err);
      setError('Erreur lors du traitement audio.');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Bouton principal */}
          <div className="flex flex-col items-center gap-2">
            {!isRecording && !isProcessing ? (
              <Button
                onClick={startRecording}
                className="rounded-full w-14 h-14 bg-purple-600 hover:bg-purple-700"
              >
                <Mic className="w-6 h-6" />
              </Button>
            ) : isRecording ? (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="rounded-full w-14 h-14 animate-pulse"
              >
                <Square className="w-6 h-6" />
              </Button>
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            )}
            
            {isRecording && (
              <Badge variant="destructive" className="gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {formatTime(recordingTime)}
              </Badge>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1">
            <p className="font-medium text-purple-900">
              {isRecording 
                ? 'Enregistrement en cours...' 
                : isProcessing 
                  ? 'Transcription IA en cours...'
                  : 'Dictée vocale'
              }
            </p>
            <p className="text-sm text-purple-700">
              {isRecording 
                ? 'Cliquez sur stop pour terminer' 
                : isProcessing 
                  ? 'Veuillez patienter'
                  : 'Cliquez sur le micro pour commencer'
              }
            </p>
            {targetField && (
              <Badge variant="outline" className="mt-1 text-xs">
                → {targetField}
              </Badge>
            )}
          </div>

          {/* Icône Wand pour IA */}
          <Wand2 className="w-5 h-5 text-purple-400" />
        </div>

        {/* Erreur */}
        {error && (
          <Alert className="mt-3 bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Transcription */}
        {transcript && !isRecording && !isProcessing && (
          <div className="mt-3 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Transcription</span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}