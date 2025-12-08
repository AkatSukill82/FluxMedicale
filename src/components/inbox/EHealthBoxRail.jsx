import React, { useState, useEffect } from 'react';
import { EHealthBoxMessage } from '@/entities/EHealthBoxMessage';
import { AuditLog } from '@/entities/AuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Paperclip, Download, Eye, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EHealthBoxRail({ patient, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    loadPatientMessages();
  }, [patient.id]);

  const loadPatientMessages = async () => {
    setIsLoading(true);
    try {
      // Récupérer tous les messages eHealthBox
      const allMessages = await EHealthBoxMessage.list('-received_date');
      
      // Filtrer ceux qui correspondent au patient (par NISS ou déjà assignés)
      const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;
      
      const patientMessages = allMessages.filter(msg => 
        msg.assigned_to_patient_id === patient.id ||
        (patientNiss && msg.patient_niss === patientNiss)
      ).slice(0, 5); // Les 5 derniers

      setMessages(patientMessages);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachToTimeline = async (message) => {
    try {
      // Créer un événement Timeline
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'ATTACH_EHEALTHBOX_MESSAGE',
        target_entity: 'EHealthBoxMessage',
        target_id: message.id,
        details: `Message eHealthBox attaché au dossier patient: ${message.subject}`,
        timestamp: new Date().toISOString()
      });

      alert('Message attaché au dossier patient !');
      loadPatientMessages();
    } catch (error) {
      console.error('Erreur attachement:', error);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'LAB_RESULT': return 'bg-green-100 text-green-800';
      case 'RADIOLOGY': return 'bg-purple-100 text-purple-800';
      case 'DISCHARGE_REPORT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Messages eHealthBox
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadPatientMessages}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Chargement des messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun message eHealthBox pour ce patient</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div 
                key={message.id}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTypeColor(message.message_type)}>
                        {message.message_type}
                      </Badge>
                      {message.priority === 'URGENT' && (
                        <Badge className="bg-red-100 text-red-800">URGENT</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {message.subject}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      De: {message.sender_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(message.received_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMessage(message)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    {!message.assigned_to_patient_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAttachToTimeline(message)}
                      >
                        <LinkIcon className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {message.attachments?.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                    <Paperclip className="w-3 h-3" />
                    <span>{message.attachments.length} pièce(s) jointe(s)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Prévisualisation du message sélectionné */}
        {selectedMessage && (
          <div className="mt-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-blue-900">{selectedMessage.subject}</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedMessage(null)}
              >
                ×
              </Button>
            </div>
            <div className="text-sm text-blue-800 mb-3">
              {selectedMessage.content || 'Contenu du message...'}
            </div>
            {selectedMessage.attachments?.map((att, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="mr-2 mb-2"
                onClick={() => window.open(att.file_url, '_blank')}
              >
                <Download className="w-3 h-3 mr-2" />
                {att.filename}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}