import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Plus,
  User,
  Stethoscope,
  Clock,
  CheckCheck,
  Loader2,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'suivi', label: 'Suivi', color: 'bg-blue-100 text-blue-800' },
  { value: 'question', label: 'Question', color: 'bg-purple-100 text-purple-800' },
  { value: 'resultat', label: 'Résultat', color: 'bg-green-100 text-green-800' },
  { value: 'rappel', label: 'Rappel', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'urgence', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  { value: 'general', label: 'Général', color: 'bg-slate-100 text-slate-800' }
];

export default function PatientMessagesPanel({ patientId, messages = [] }) {
  const queryClient = useQueryClient();
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [search, setSearch] = useState('');

  const filteredMessages = messages.filter(m =>
    m.subject?.toLowerCase().includes(search.toLowerCase()) ||
    m.content?.toLowerCase().includes(search.toLowerCase()) ||
    m.patient_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.PatientMessage.update(messageId, {
        read: true,
        read_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientMessages'] });
    }
  });

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.read && message.sender_type === 'patient') {
      markAsReadMutation.mutate(message.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowNewMessage(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau message
        </Button>
      </div>

      {/* Liste des messages */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Liste */}
        <Card className="h-[500px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Messages ({filteredMessages.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Aucun message</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMessages.map(message => {
                  const isFromPatient = message.sender_type === 'patient';
                  const categoryConfig = CATEGORIES.find(c => c.value === message.category);
                  
                  return (
                    <button
                      key={message.id}
                      onClick={() => handleSelectMessage(message)}
                      className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                        selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                      } ${!message.read && isFromPatient ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isFromPatient ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {isFromPatient ? (
                            <User className="w-4 h-4 text-green-600" />
                          ) : (
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {message.subject || 'Sans sujet'}
                            </span>
                            {!message.read && isFromPatient && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {isFromPatient ? message.patient_name : 'Vous'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-xs ${categoryConfig?.color}`}>
                              {categoryConfig?.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.created_date), 'dd/MM HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Détail message */}
        <Card className="h-[500px] overflow-hidden flex flex-col">
          {selectedMessage ? (
            <>
              <CardHeader className="pb-2 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedMessage.subject || 'Sans sujet'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedMessage.sender_type === 'patient' ? selectedMessage.patient_name : 'Vous'} • {' '}
                      {format(new Date(selectedMessage.created_date), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  {selectedMessage.read && (
                    <Badge variant="outline" className="gap-1">
                      <CheckCheck className="w-3 h-3" />
                      Lu
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </CardContent>
              <div className="p-3 border-t">
                <Button 
                  className="w-full" 
                  onClick={() => setShowNewMessage({ replyTo: selectedMessage })}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Répondre
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Sélectionnez un message</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal nouveau message */}
      {showNewMessage && (
        <NewMessageModal
          isOpen={!!showNewMessage}
          onClose={() => setShowNewMessage(false)}
          patientId={patientId}
          replyTo={showNewMessage.replyTo}
        />
      )}
    </div>
  );
}

function NewMessageModal({ isOpen, onClose, patientId, replyTo }) {
  const queryClient = useQueryClient();
  
  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForMessage'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100),
    enabled: !patientId && !replyTo
  });

  const [formData, setFormData] = useState({
    patient_id: patientId || replyTo?.patient_id || '',
    patient_name: replyTo?.patient_name || '',
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    content: '',
    category: 'suivi',
    priority: 'normale'
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      await base44.entities.PatientMessage.create({
        ...data,
        sender_type: 'medecin',
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reply_to_id: replyTo?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientMessages'] });
      toast.success('Message envoyé');
      onClose();
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi");
    }
  });

  const handlePatientSelect = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setFormData({
        ...formData,
        patient_id: patientId,
        patient_name: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim()
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {replyTo ? 'Répondre' : 'Nouveau message'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!patientId && !replyTo && (
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={formData.patient_id} onValueChange={handlePatientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name?.[0]?.given?.[0]} {p.name?.[0]?.family}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sujet</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Objet du message..."
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              placeholder="Votre message..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={() => sendMutation.mutate(formData)} 
            disabled={!formData.patient_id || !formData.content || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}