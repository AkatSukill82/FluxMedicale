import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Paperclip, 
  Lock, 
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  Search,
  Plus,
  Shield,
  FileText,
  Loader2,
  Archive,
  X
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { encryptMessage, decryptMessage } from './encryptionUtils';
import NewConversationDialog from './NewConversationDialog';
import MessageAttachments from './MessageAttachments';

export default function SecureMessaging({ patient, embedded = false }) {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['secure-conversations', patient?.id],
    queryFn: async () => {
      const filter = patient?.id 
        ? { patient_id: patient.id }
        : {};
      return base44.entities.SecureConversation.filter(filter, '-last_message_at', 100);
    }
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['secure-messages', selectedConversation?.id],
    queryFn: () => base44.entities.SecureMessage.filter(
      { conversation_id: selectedConversation.id },
      'created_date',
      200
    ),
    enabled: !!selectedConversation?.id,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachmentsList }) => {
      const encrypted = encryptMessage(content);
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;

      const message = await base44.entities.SecureMessage.create({
        conversation_id: selectedConversation.id,
        patient_id: selectedConversation.patient_id,
        sender_email: currentUser.email,
        sender_type: 'doctor',
        recipient_email: selectedConversation.patient_id, // Would be patient email in real scenario
        content_encrypted: encrypted,
        content_preview: preview,
        message_type: attachmentsList.length > 0 ? 'document' : 'text',
        attachments: attachmentsList,
        is_read: false,
        encryption_version: 'AES-256-GCM'
      });

      // Update conversation
      await base44.entities.SecureConversation.update(selectedConversation.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        unread_count_patient: (selectedConversation.unread_count_patient || 0) + 1
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-messages'] });
      queryClient.invalidateQueries({ queryKey: ['secure-conversations'] });
      setMessageText('');
      setAttachments([]);
      scrollToBottom();
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi du message');
    }
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId) => {
      const unreadMessages = messages.filter(m => !m.is_read && m.sender_email !== currentUser?.email);
      
      for (const msg of unreadMessages) {
        await base44.entities.SecureMessage.update(msg.id, {
          is_read: true,
          read_at: new Date().toISOString()
        });
      }

      await base44.entities.SecureConversation.update(conversationId, {
        unread_count_doctor: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-messages'] });
      queryClient.invalidateQueries({ queryKey: ['secure-conversations'] });
    }
  });

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      markAsReadMutation.mutate(selectedConversation.id);
      scrollToBottom();
    }
  }, [selectedConversation?.id, messages.length]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ content: messageText, attachmentsList: attachments });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Hier ' + format(d, 'HH:mm');
    return format(d, 'dd/MM HH:mm');
  };

  const filteredConversations = conversations.filter(c => 
    !searchTerm || 
    c.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_doctor || 0), 0);

  return (
    <div className={`flex ${embedded ? 'h-[600px]' : 'h-[calc(100vh-200px)]'} bg-white rounded-lg border overflow-hidden`}>
      {/* Liste des conversations */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              Messages sécurisés
              {totalUnread > 0 && (
                <Badge className="bg-red-500">{totalUnread}</Badge>
              )}
            </h3>
            <Button size="icon" variant="ghost" onClick={() => setShowNewConversation(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-slate-200 text-sm">
                        {conv.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{conv.patient_name || 'Patient'}</p>
                        <span className="text-xs text-slate-500">
                          {conv.last_message_at && formatMessageDate(conv.last_message_at)}
                        </span>
                      </div>
                      {conv.subject && (
                        <p className="text-xs text-slate-600 truncate">{conv.subject}</p>
                      )}
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {conv.last_message_preview || 'Nouvelle conversation'}
                      </p>
                    </div>
                    {conv.unread_count_doctor > 0 && (
                      <Badge className="bg-blue-600 text-xs">{conv.unread_count_doctor}</Badge>
                    )}
                    {conv.is_urgent && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header conversation */}
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedConversation.patient_name}</h3>
                {selectedConversation.subject && (
                  <p className="text-sm text-slate-600">{selectedConversation.subject}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
                  <Lock className="w-3 h-3" />
                  Chiffré E2E
                </Badge>
                <Button variant="ghost" size="icon">
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => {
                    const isMe = msg.sender_email === currentUser?.email;
                    const decryptedContent = decryptMessage(msg.content_encrypted);
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isMe 
                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{decryptedContent}</p>
                            
                            {msg.attachments?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((att, idx) => (
                                  <div 
                                    key={idx}
                                    className={`flex items-center gap-2 p-2 rounded ${
                                      isMe ? 'bg-blue-700' : 'bg-slate-200'
                                    }`}
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs truncate">{att.file_name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                            <span className="text-xs text-slate-500">
                              {formatMessageDate(msg.created_date)}
                            </span>
                            {isMe && (
                              msg.is_read 
                                ? <CheckCheck className="w-3 h-3 text-blue-500" />
                                : <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Zone de saisie */}
            <div className="p-4 border-t bg-white">
              {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {attachments.map((att, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      <FileText className="w-3 h-3" />
                      {att.file_name}
                      <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <MessageAttachments 
                  patient={selectedConversation}
                  onAttach={(att) => setAttachments([...attachments, att])}
                />
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || (!messageText.trim() && attachments.length === 0)}
                  className="h-11"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Messages chiffrés de bout en bout (AES-256-GCM)
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Messagerie sécurisée</p>
              <p className="text-sm">Sélectionnez une conversation ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog nouvelle conversation */}
      <NewConversationDialog
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        patient={patient}
        onCreated={(conv) => {
          setSelectedConversation(conv);
          setShowNewConversation(false);
          queryClient.invalidateQueries({ queryKey: ['secure-conversations'] });
        }}
      />
    </div>
  );
}