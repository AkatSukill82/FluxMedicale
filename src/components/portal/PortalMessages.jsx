import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PortalMessages({ messages, isLoading, patientId }) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (content) => base44.entities.PatientMessage.create({
      patient_id: patientId,
      content,
      sender_type: 'patient',
      is_read: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages', patientId] });
      setNewMessage('');
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Messages List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun message</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                msg.sender_type === 'patient'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.sender_type === 'patient' ? 'text-blue-100' : 'text-muted-foreground'}`}>
                  {msg.created_date ? format(new Date(msg.created_date), 'dd/MM HH:mm', { locale: fr }) : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="Écrire un message à votre médecin..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
            <Button
              size="icon"
              className="flex-shrink-0 h-[60px] w-[60px]"
              disabled={!newMessage.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate(newMessage.trim())}
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}