import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  User, 
  Loader2,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { generateConversationKey } from './encryptionUtils';

export default function NewConversationDialog({ isOpen, onClose, patient, onCreated }) {
  const [selectedPatient, setSelectedPatient] = useState(patient || null);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients-for-messaging'],
    queryFn: () => base44.entities.Patient.list('-created_date', 200),
    enabled: isOpen && !patient
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Get patient name
      const patientName = selectedPatient.name?.find(n => n.use === 'official');
      const fullName = patientName 
        ? `${(patientName.given || []).join(' ')} ${patientName.family || ''}`.trim()
        : 'Patient';

      // Create conversation
      const conversation = await base44.entities.SecureConversation.create({
        patient_id: selectedPatient.id,
        patient_name: fullName,
        doctor_email: currentUser.email,
        doctor_name: currentUser.full_name || currentUser.email.split('@')[0],
        subject: subject || 'Nouvelle conversation',
        status: 'active',
        is_urgent: isUrgent,
        encryption_key_id: generateConversationKey(),
        last_message_at: new Date().toISOString(),
        last_message_preview: firstMessage ? (firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage) : ''
      });

      // Create first message if provided
      if (firstMessage) {
        const { encryptMessage } = await import('./encryptionUtils');
        await base44.entities.SecureMessage.create({
          conversation_id: conversation.id,
          patient_id: selectedPatient.id,
          sender_email: currentUser.email,
          sender_type: 'doctor',
          content_encrypted: encryptMessage(firstMessage),
          content_preview: firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage,
          message_type: 'text',
          is_read: false,
          encryption_version: 'AES-256-GCM'
        });
      }

      // Audit log
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'SECURE_CONVERSATION_CREATED',
        target_entity: 'SecureConversation',
        target_id: conversation.id,
        details: `Conversation sécurisée créée avec patient ${fullName}`,
        timestamp: new Date().toISOString()
      });

      return conversation;
    },
    onSuccess: (conversation) => {
      toast.success('Conversation créée');
      onCreated(conversation);
      resetForm();
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const resetForm = () => {
    if (!patient) setSelectedPatient(null);
    setSubject('');
    setFirstMessage('');
    setIsUrgent(false);
    setSearchTerm('');
  };

  const getPatientName = (p) => {
    const name = p.name?.find(n => n.use === 'official');
    return name ? `${(name.given || []).join(' ')} ${name.family || ''}`.trim() : 'Patient';
  };

  const filteredPatients = patients.filter(p => {
    const name = getPatientName(p).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const handleSubmit = () => {
    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    createConversationMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Nouvelle conversation sécurisée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Sélection patient */}
          {!patient && (
            <div className="space-y-2">
              <Label>Patient *</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{getPatientName(selectedPatient)}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher un patient..."
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-40 border rounded-lg">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredPatients.slice(0, 20).map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPatient(p)}
                            className="w-full p-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{getPatientName(p)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </div>
          )}

          {patient && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{getPatientName(patient)}</span>
              </div>
            </div>
          )}

          {/* Sujet */}
          <div className="space-y-2">
            <Label>Sujet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Suivi traitement, Résultats d'analyses..."
            />
          </div>

          {/* Premier message */}
          <div className="space-y-2">
            <Label>Premier message</Label>
            <Textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={4}
            />
          </div>

          {/* Urgent */}
          <div className="flex items-center gap-2">
            <Checkbox 
              id="urgent" 
              checked={isUrgent}
              onCheckedChange={setIsUrgent}
            />
            <Label htmlFor="urgent" className="flex items-center gap-1 cursor-pointer">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Marquer comme urgent
            </Label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1"
              disabled={createConversationMutation.isPending || !selectedPatient}
            >
              {createConversationMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Créer la conversation
            </Button>
          </div>

          <p className="text-xs text-center text-slate-400">
            🔒 Tous les messages seront chiffrés de bout en bout
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}