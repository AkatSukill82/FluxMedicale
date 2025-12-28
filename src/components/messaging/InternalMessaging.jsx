import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Paperclip,
  User,
  Users,
  UserCircle,
  AlertCircle,
  Check,
  CheckCheck,
  X,
  MoreVertical,
  Archive,
  Trash2,
  Bell,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import NewThreadDialog from './NewThreadDialog';
import MessageAttachments from './MessageAttachments';

export default function InternalMessaging({ patientContext = null }) {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['messageThreads'],
    queryFn: async () => {
      const allThreads = await base44.entities.MessageThread.filter(
        { is_archived: false },
        '-last_message_at'
      );
      // Filtrer pour ne garder que les threads où l'utilisateur est participant
      return allThreads.filter(t => t.participants?.includes(currentUser?.email));
    },
    enabled: !!currentUser
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['threadMessages', selectedThread?.id],
    queryFn: () => base44.entities.InternalMessage.filter(
      { thread_id: selectedThread.id },
      'created_date'
    ),
    enabled: !!selectedThread,
    refetchInterval: 5000 // Polling toutes les 5 secondes
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  // Marquer les messages comme lus
  useEffect(() => {
    if (selectedThread && messages.length > 0 && currentUser) {
      const unreadMessages = messages.filter(
        m => !m.read_by?.includes(currentUser.email) && m.sender_email !== currentUser.email
      );
      
      unreadMessages.forEach(async (msg) => {
        await base44.entities.InternalMessage.update(msg.id, {
          read_by: [...(msg.read_by || []), currentUser.email]
        });
      });

      if (unreadMessages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['threadMessages', selectedThread.id] });
        queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
      }
    }
  }, [messages, selectedThread, currentUser]);

  // Scroll vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (messageData) => {
      const message = await base44.entities.InternalMessage.create({
        thread_id: selectedThread.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: messageData.content,
        attachments: messageData.attachments || [],
        read_by: [currentUser.email]
      });

      // Mettre à jour le thread
      await base44.entities.MessageThread.update(selectedThread.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: messageData.content.substring(0, 100)
      });

      return message;
    },
    onSuccess: () => {
      setNewMessage('');
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['threadMessages', selectedThread.id] });
      queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
    }
  });

  const handleSend = () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    sendMutation.mutate({ content: newMessage, attachments });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return {
            name: file.name,
            url: file_url,
            type: file.type,
            size: file.size
          };
        })
      );
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${files.length} fichier(s) ajouté(s)`);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const archiveThread = async (threadId) => {
    await base44.entities.MessageThread.update(threadId, { is_archived: true });
    queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
    if (selectedThread?.id === threadId) setSelectedThread(null);
    toast.success('Conversation archivée');
  };

  const filteredThreads = threads.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(query) ||
      t.patient_name?.toLowerCase().includes(query) ||
      t.last_message_preview?.toLowerCase().includes(query)
    );
  });

  const getThreadTitle = (thread) => {
    if (thread.title) return thread.title;
    if (thread.type === 'patient' && thread.patient_name) {
      return `Patient: ${thread.patient_name}`;
    }
    const otherParticipants = thread.participants?.filter(p => p !== currentUser?.email) || [];
    if (otherParticipants.length === 1) {
      const user = users.find(u => u.email === otherParticipants[0]);
      return user?.full_name || otherParticipants[0];
    }
    return `Groupe (${otherParticipants.length + 1})`;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getUnreadCount = (thread) => {
    if (!thread.unread_count || !currentUser) return 0;
    return thread.unread_count[currentUser.email] || 0;
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-lg border overflow-hidden">
      {/* Liste des conversations */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Messages</h2>
            <Button size="sm" onClick={() => setShowNewThread(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {threadsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredThreads.map(thread => {
              const unread = getUnreadCount(thread);
              const isSelected = selectedThread?.id === thread.id;
              
              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-3 border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={`text-xs ${
                        thread.type === 'patient' ? 'bg-green-100 text-green-700' :
                        thread.type === 'group' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {thread.type === 'patient' ? <UserCircle className="w-5 h-5" /> :
                         thread.type === 'group' ? <Users className="w-5 h-5" /> :
                         getInitials(getThreadTitle(thread))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium truncate ${unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                          {getThreadTitle(thread)}
                        </h3>
                        {unread > 0 && (
                          <Badge className="bg-blue-600 text-xs ml-2">{unread}</Badge>
                        )}
                      </div>
                      {thread.is_urgent && (
                        <Badge variant="destructive" className="text-xs mb-1">
                          <AlertCircle className="w-3 h-3 mr-1" /> Urgent
                        </Badge>
                      )}
                      <p className={`text-sm truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                        {thread.last_message_preview || 'Nouvelle conversation'}
                      </p>
                      {thread.last_message_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(thread.last_message_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Zone de conversation */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Header de la conversation */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className={`${
                    selectedThread.type === 'patient' ? 'bg-green-100 text-green-700' :
                    selectedThread.type === 'group' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedThread.type === 'patient' ? <UserCircle className="w-5 h-5" /> :
                     selectedThread.type === 'group' ? <Users className="w-5 h-5" /> :
                     getInitials(getThreadTitle(selectedThread))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{getThreadTitle(selectedThread)}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedThread.participants?.length} participant(s)
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => archiveThread(selectedThread.id)}>
                    <Archive className="w-4 h-4 mr-2" /> Archiver
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwn = message.sender_email === currentUser?.email;
                    const showAvatar = index === 0 || 
                      messages[index - 1]?.sender_email !== message.sender_email;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {showAvatar && !isOwn && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs bg-slate-200">
                                {getInitials(message.sender_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {!showAvatar && !isOwn && <div className="w-8" />}
                          
                          <div>
                            {showAvatar && !isOwn && (
                              <p className="text-xs text-slate-500 mb-1 ml-1">
                                {message.sender_name}
                              </p>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? 'bg-blue-600 text-white rounded-br-md'
                                  : 'bg-slate-100 text-slate-900 rounded-bl-md'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              {message.attachments?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((att, i) => (
                                    <a
                                      key={i}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 text-sm underline ${
                                        isOwn ? 'text-blue-100' : 'text-blue-600'
                                      }`}
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      {att.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-xs text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
                              <span>
                                {format(new Date(message.created_date), 'HH:mm')}
                              </span>
                              {isOwn && (
                                message.read_by?.length > 1 ? (
                                  <CheckCheck className="w-3 h-3 text-blue-500" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )
                              )}
                            </div>
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
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Paperclip className="w-3 h-3" />
                      {att.name}
                      <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}>
                        <X className="w-3 h-3 ml-1" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button 
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && attachments.length === 0) || sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="font-medium text-lg mb-2">Sélectionnez une conversation</h3>
              <p className="text-sm">ou créez-en une nouvelle</p>
              <Button className="mt-4" onClick={() => setShowNewThread(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nouvelle conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewThreadDialog
        open={showNewThread}
        onOpenChange={setShowNewThread}
        users={users}
        currentUser={currentUser}
        patientContext={patientContext}
        onThreadCreated={(thread) => {
          setSelectedThread(thread);
          queryClient.invalidateQueries({ queryKey: ['messageThreads'] });
        }}
      />
    </div>
  );
}