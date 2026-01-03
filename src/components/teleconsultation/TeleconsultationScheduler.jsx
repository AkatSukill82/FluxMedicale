import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Calendar,
  User,
  Mail,
  Clock,
  Send,
  Loader2,
  Link as LinkIcon,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addMinutes, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TeleconsultationScheduler({ isOpen, onClose, preSelectedPatient = null, preSelectedDate = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    patient_id: preSelectedPatient?.id || '',
    date: preSelectedDate || format(new Date(), 'yyyy-MM-dd'),
    time: format(addHours(new Date(), 1), 'HH:00'),
    duration: 30,
    motif: '',
    send_email: true,
    send_sms: false
  });
  const [createdSession, setCreatedSession] = useState(null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForTeleconsult'],
    queryFn: () => base44.entities.Patient.list('-created_date', 300)
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      
      // Générer un ID de salle unique
      const roomId = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const patientToken = `pt-${Math.random().toString(36).substr(2, 16)}`;
      const medecinToken = `md-${Math.random().toString(36).substr(2, 16)}`;

      const scheduledStart = new Date(`${data.date}T${data.time}`);
      const scheduledEnd = addMinutes(scheduledStart, data.duration);

      // Créer la session
      const session = await base44.entities.TeleconsultationSession.create({
        patient_id: data.patient_id,
        medecin_email: currentUser.email,
        status: 'SCHEDULED',
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        video_room_id: roomId,
        patient_join_token: patientToken,
        medecin_join_token: medecinToken,
        consultation_notes: '',
        hipaa_compliant: true,
        encryption_enabled: true
      });

      // Créer le rendez-vous associé
      await base44.entities.RendezVous.create({
        patient_id: data.patient_id,
        date: data.date,
        heure_debut: data.time,
        heure_fin: format(scheduledEnd, 'HH:mm'),
        type_consultation: 'Téléconsultation',
        motif: data.motif || 'Téléconsultation',
        statut: 'Planifié',
        medecin_assigne: currentUser.email,
        notes_rdv: `Session ID: ${session.id}`
      });

      // Envoyer les invitations
      if (data.send_email) {
        const patient = patients.find(p => p.id === data.patient_id);
        const patientEmail = patient?.telecom?.find(t => t.system === 'email')?.value;
        
        if (patientEmail) {
          const patientLink = `${window.location.origin}/TeleconsultationRoom?token=${patientToken}&room=${roomId}`;
          
          await base44.integrations.Core.SendEmail({
            to: patientEmail,
            subject: `Votre téléconsultation du ${format(scheduledStart, 'dd/MM/yyyy à HH:mm')}`,
            body: `Bonjour,

Votre téléconsultation avec Dr. ${currentUser.full_name} est prévue le ${format(scheduledStart, 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}.

Pour rejoindre la consultation, cliquez sur le lien suivant à l'heure prévue:
${patientLink}

Assurez-vous d'avoir:
- Une connexion internet stable
- Une caméra et un microphone fonctionnels
- Un endroit calme et confidentiel

Si vous devez annuler ou reporter, veuillez nous contacter au plus vite.

Cordialement,
Cabinet médical`
          });
        }
      }

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['agendaData'] });
      queryClient.invalidateQueries({ queryKey: ['teleconsultations'] });
      setCreatedSession(session);
      toast.success('Téléconsultation planifiée');
    }
  });

  const selectedPatient = patients.find(p => p.id === formData.patient_id);
  const patientName = selectedPatient?.name?.[0] 
    ? `${selectedPatient.name[0].given?.[0] || ''} ${selectedPatient.name[0].family || ''}`.trim()
    : '';

  const copyLink = (token, room) => {
    const link = `${window.location.origin}/TeleconsultationRoom?token=${token}&room=${room}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Planifier une téléconsultation
          </DialogTitle>
        </DialogHeader>

        {!createdSession ? (
          <div className="space-y-4">
            {/* Sélection patient */}
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(v) => setFormData({ ...formData, patient_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => {
                    const name = p.name?.[0];
                    const fullName = name ? `${name.given?.[0] || ''} ${name.family || ''}`.trim() : 'Patient';
                    return (
                      <SelectItem key={p.id} value={p.id}>{fullName}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            {/* Durée */}
            <div className="space-y-2">
              <Label>Durée</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(v) => setFormData({ ...formData, duration: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motif */}
            <div className="space-y-2">
              <Label>Motif (optionnel)</Label>
              <Textarea
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                placeholder="Suivi, renouvellement ordonnance..."
                rows={2}
              />
            </div>

            {/* Options d'envoi */}
            <Card className="bg-slate-50">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Notifications</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_email}
                    onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                    className="rounded"
                  />
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">Envoyer invitation par email</span>
                </label>
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={() => createSessionMutation.mutate(formData)}
              disabled={!formData.patient_id || createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Video className="w-4 h-4 mr-2" />
              )}
              Planifier la téléconsultation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Video className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Téléconsultation planifiée</h3>
              <p className="text-muted-foreground">
                {format(new Date(createdSession.scheduled_start), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Patient:</span>
                  <span className="font-medium">{patientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Salle:</span>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">{createdSession.video_room_id}</code>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm font-medium">Liens d'accès</p>
              
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm flex-1">Lien médecin</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => copyLink(createdSession.medecin_join_token, createdSession.video_room_id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <LinkIcon className="w-4 h-4 text-green-600" />
                <span className="text-sm flex-1">Lien patient</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => copyLink(createdSession.patient_join_token, createdSession.video_room_id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}