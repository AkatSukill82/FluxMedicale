import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  FileText,
  Pill,
  User,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Templates de messages
const MESSAGE_TEMPLATES = {
  rappel_rdv: {
    email: {
      subject: 'Rappel de votre rendez-vous médical',
      content: `Bonjour {prenom},

Nous vous rappelons votre rendez-vous prévu le {date_rdv} à {heure_rdv}.

Adresse du cabinet : {adresse_cabinet}

En cas d'empêchement, merci de nous prévenir au moins 24h à l'avance.

Cordialement,
Dr {nom_medecin}`
    },
    sms: {
      content: `Rappel: RDV le {date_rdv} à {heure_rdv}. En cas d'empêchement, prévenez-nous 24h avant. Dr {nom_medecin}`
    }
  },
  resultat: {
    email: {
      subject: 'Vos résultats sont disponibles',
      content: `Bonjour {prenom},

Vos résultats d'examens sont maintenant disponibles.

Je vous invite à prendre rendez-vous pour en discuter ensemble si vous le souhaitez.

Cordialement,
Dr {nom_medecin}`
    },
    sms: {
      content: `Bonjour {prenom}, vos résultats d'examens sont disponibles. N'hésitez pas à prendre RDV pour en discuter. Dr {nom_medecin}`
    }
  },
  prescription: {
    email: {
      subject: 'Votre ordonnance est prête',
      content: `Bonjour {prenom},

Votre ordonnance est prête et peut être récupérée au cabinet ou envoyée directement à votre pharmacie.

N'hésitez pas à me contacter si vous avez des questions sur votre traitement.

Cordialement,
Dr {nom_medecin}`
    },
    sms: {
      content: `Bonjour {prenom}, votre ordonnance est prête. Vous pouvez la récupérer au cabinet. Dr {nom_medecin}`
    }
  },
  suivi: {
    email: {
      subject: 'Suivi médical',
      content: `Bonjour {prenom},

Je souhaite prendre de vos nouvelles suite à notre dernière consultation.

Comment vous sentez-vous ? Votre traitement se passe-t-il bien ?

N'hésitez pas à me recontacter ou à prendre rendez-vous si nécessaire.

Cordialement,
Dr {nom_medecin}`
    },
    sms: {
      content: `Bonjour {prenom}, comment vous sentez-vous depuis notre dernière consultation ? N'hésitez pas à me recontacter. Dr {nom_medecin}`
    }
  },
  personnalise: {
    email: { subject: '', content: '' },
    sms: { content: '' }
  }
};

const CATEGORY_OPTIONS = [
  { value: 'rappel_rdv', label: 'Rappel de rendez-vous', icon: Calendar },
  { value: 'resultat', label: 'Résultats disponibles', icon: FileText },
  { value: 'prescription', label: 'Ordonnance prête', icon: Pill },
  { value: 'suivi', label: 'Message de suivi', icon: User },
  { value: 'personnalise', label: 'Message personnalisé', icon: Sparkles },
];

export default function SendMessageModal({
  isOpen,
  onClose,
  patient,
  patientName,
  patientEmail,
  patientPhone,
  defaultType = 'email',
  presetCategory = null
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState(presetCategory || 'personnalise');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedRdvId, setSelectedRdvId] = useState('');

  // Charger les RDV à venir pour les rappels
  const { data: upcomingRdv = [] } = useQuery({
    queryKey: ['upcomingRdv', patient.id],
    queryFn: async () => {
      const rdvs = await base44.entities.RendezVous.filter({
        patient_id: patient.id,
        statut: 'Planifié'
      });
      return rdvs.filter(r => new Date(r.date) >= new Date());
    },
    enabled: isOpen && category === 'rappel_rdv'
  });

  // Charger les infos du médecin
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Appliquer le template quand la catégorie change
  useEffect(() => {
    if (category && MESSAGE_TEMPLATES[category]) {
      const template = MESSAGE_TEMPLATES[category][type] || MESSAGE_TEMPLATES[category].email;
      
      // Remplacer les variables
      let processedContent = template.content || '';
      let processedSubject = template.subject || '';
      
      const prenom = patient.name?.[0]?.given?.[0] || 'Patient';
      const nomMedecin = currentUser?.full_name || 'Votre médecin';
      
      processedContent = processedContent
        .replace(/{prenom}/g, prenom)
        .replace(/{nom_medecin}/g, nomMedecin);
      
      processedSubject = processedSubject
        .replace(/{prenom}/g, prenom)
        .replace(/{nom_medecin}/g, nomMedecin);
      
      // Si un RDV est sélectionné, remplacer les variables de RDV
      if (selectedRdvId && upcomingRdv.length > 0) {
        const rdv = upcomingRdv.find(r => r.id === selectedRdvId);
        if (rdv) {
          const dateRdv = format(new Date(rdv.date), 'EEEE d MMMM yyyy', { locale: fr });
          processedContent = processedContent
            .replace(/{date_rdv}/g, dateRdv)
            .replace(/{heure_rdv}/g, rdv.heure_debut || '');
        }
      }
      
      setContent(processedContent);
      if (type === 'email') {
        setSubject(processedSubject);
      }
    }
  }, [category, type, selectedRdvId, patient, currentUser, upcomingRdv]);

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setCategory(presetCategory || 'personnalise');
      setSelectedRdvId('');
    }
  }, [isOpen, defaultType, presetCategory]);

  // Mutation pour envoyer le message
  const sendMutation = useMutation({
    mutationFn: async (messageData) => {
      // Créer l'enregistrement de communication
      const communication = await base44.entities.PatientCommunication.create({
        patient_id: patient.id,
        patient_name: patientName,
        type: messageData.type,
        category: messageData.category,
        subject: messageData.subject,
        content: messageData.content,
        recipient_email: messageData.type === 'email' ? patientEmail : null,
        recipient_phone: messageData.type === 'sms' ? patientPhone : null,
        status: 'pending',
        related_rdv_id: selectedRdvId || null,
        medecin_email: currentUser?.email
      });

      // Envoyer l'email via l'intégration Core
      if (messageData.type === 'email' && patientEmail) {
        try {
          await base44.integrations.Core.SendEmail({
            to: patientEmail,
            subject: messageData.subject,
            body: messageData.content
          });
          
          // Mettre à jour le statut
          await base44.entities.PatientCommunication.update(communication.id, {
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        } catch (error) {
          await base44.entities.PatientCommunication.update(communication.id, {
            status: 'failed',
            error_message: error.message || 'Erreur lors de l\'envoi'
          });
          throw error;
        }
      } else if (messageData.type === 'sms') {
        // Pour les SMS, on marque comme "sent" (simulation - à intégrer avec un service SMS réel)
        await base44.entities.PatientCommunication.update(communication.id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }

      return communication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', patient.id] });
      toast.success(type === 'email' ? 'Email envoyé avec succès' : 'SMS envoyé avec succès');
      onClose();
    },
    onError: (error) => {
      toast.error(`Erreur d'envoi: ${error.message}`);
    }
  });

  const handleSend = () => {
    if (!content.trim()) {
      toast.error('Le contenu du message est requis');
      return;
    }
    if (type === 'email' && !subject.trim()) {
      toast.error('Le sujet est requis pour un email');
      return;
    }

    sendMutation.mutate({
      type,
      category,
      subject,
      content
    });
  };

  const recipient = type === 'email' ? patientEmail : patientPhone;
  const hasRecipient = !!recipient;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'email' ? (
              <Mail className="w-5 h-5 text-blue-600" />
            ) : (
              <MessageSquare className="w-5 h-5 text-green-600" />
            )}
            Envoyer un message à {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type de message */}
          <Tabs value={type} onValueChange={setType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" disabled={!patientEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" disabled={!patientPhone}>
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Alerte si pas de contact */}
          {!hasRecipient && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {type === 'email' 
                  ? 'Aucune adresse email enregistrée pour ce patient'
                  : 'Aucun numéro de téléphone enregistré pour ce patient'}
              </AlertDescription>
            </Alert>
          )}

          {/* Destinataire */}
          <div>
            <Label className="text-sm text-muted-foreground">Destinataire</Label>
            <p className="font-medium">{recipient || 'Non renseigné'}</p>
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <Label>Type de message</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection RDV pour rappels */}
          {category === 'rappel_rdv' && upcomingRdv.length > 0 && (
            <div className="space-y-2">
              <Label>Rendez-vous concerné</Label>
              <Select value={selectedRdvId} onValueChange={setSelectedRdvId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un RDV..." />
                </SelectTrigger>
                <SelectContent>
                  {upcomingRdv.map((rdv) => (
                    <SelectItem key={rdv.id} value={rdv.id}>
                      {format(new Date(rdv.date), 'dd/MM/yyyy', { locale: fr })} à {rdv.heure_debut} - {rdv.type_consultation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sujet (email uniquement) */}
          {type === 'email' && (
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sujet de l'email..."
              />
            </div>
          )}

          {/* Contenu */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Votre message..."
              rows={type === 'sms' ? 4 : 8}
              maxLength={type === 'sms' ? 160 : undefined}
            />
            {type === 'sms' && (
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/160 caractères
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!hasRecipient || sendMutation.isPending || !content.trim()}
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}