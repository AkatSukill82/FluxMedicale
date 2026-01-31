import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Plus,
  Paperclip,
  Clock,
  CheckCircle,
  User,
  Stethoscope,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'suivi', label: 'Suivi traitement' },
  { value: 'question', label: 'Question médicale' },
  { value: 'resultat', label: 'Résultats' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'urgence', label: 'Urgent', color: 'destructive' }
];

export default function PatientSecureMessaging({ patient }) {
  const queryClient = useQueryClient();
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['patientMessages', patient.id],
    queryFn: () => base44.entities.PatientMessage.filter({ patient_id: patient.id })
  });

  // Grouper par thread (reply_to_id)
  const threads = messages.reduce((acc, msg) => {
    const threadId = msg.reply_to_id || msg.id;
    if (!acc[threadId]) {
      acc[threadId] = {
        id: threadId,
        messages: [],
        subject: msg.subject || 'Sans objet',
        category: msg.category || 'general',
        lastDate: msg.created_date,
        hasUnread: false
      };
    }
    acc[threadId].messages.push(msg);
    if (!msg.read && msg.sender_type === 'patient') {
      acc[threadId].hasUnread = true;
    }
    if (new Date(msg.created_date) > new Date(acc[threadId].lastDate)) {
      acc[threadId].lastDate = msg.created_date;
    }
    return acc;
  }, {});

  const threadList = Object.values(threads)
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
    .filter(t => !searchQuery || t.subject.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentThread = selectedThread ? threads[selectedThread] : null;

  // Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.PatientMessage.update(id, { read: true, read_date: new Date().toISOString() })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries(['patientMessages', patient.id])
  });

  // Envoyer message
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const patientName = patient.name?.find(n => n.use === 'official');
      return base44.entities.PatientMessage.create({
        patient_id: patient.id,
        patient_name: `${(patientName?.given || []).join(' ')} ${patientName?.family || ''}`.trim(),
        sender_type: 'medecin',
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['patientMessages', patient.id]);
      toast.success('Message envoyé');
      setReplyText('');
    }
  });

  // Marquer thread comme lu quand sélectionné
  useEffect(() => {
    if (currentThread) {
      const unreadIds = currentThread.messages
        .filter(m => !m.read && m.sender_type === 'patient')
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedThread]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages.length]);

  const handleReply = () => {
    if (!replyText.trim() || !currentThread) return;
    sendMutation.mutate({
      content: replyText,
      subject: currentThread.subject,
      category: currentThread.category,
      reply_to_id: currentThread.id
    });
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messagerie sécurisée
          </CardTitle>
          <Button size="sm" onClick={() => setShowNewMessage(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex gap-4 overflow-hidden p-4 pt-0">
        {/* Liste des conversations */}
        <div className="w-1/3 flex flex-col border-r pr-4">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : threadList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune conversation
              </p>
            ) : (
              <div className="space-y-1">
                {threadList.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedThread === thread.id 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'hover:bg-slate-50'
                    } ${thread.hasUnread ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {thread.hasUnread && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <p className={`text-sm truncate ${thread.hasUnread ? 'font-semibold' : ''}`}>
                            {thread.subject}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(thread.lastDate), { locale: fr, addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {CATEGORIES.find(c => c.value === thread.category)?.label || thread.category}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Zone de conversation */}
        <div className="flex-1 flex flex-col">
          {currentThread ? (
            <>
              {/* Header conversation */}
              <div className="pb-3 border-b mb-3">
                <h3 className="font-medium">{currentThread.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  {currentThread.messages.length} message{currentThread.messages.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-4">
                  {currentThread.messages
                    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                    .map(msg => {
                      const isDoctor = msg.sender_type === 'medecin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${isDoctor ? 'order-2' : ''}`}>
                            <div className={`p-3 rounded-xl ${
                              isDoctor 
                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                : 'bg-slate-100 rounded-bl-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                              isDoctor ? 'justify-end' : ''
                            }`}>
                              {isDoctor ? <Stethoscope className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              <span>{msg.sender_name || (isDoctor ? 'Médecin' : 'Patient')}</span>
                              <span>•</span>
                              <span>{format(new Date(msg.created_date), 'dd/MM HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Zone de réponse */}
              <div className="pt-3 border-t mt-3">
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Votre réponse..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleReply();
                    }}
                  />
                  <Button 
                    onClick={handleReply} 
                    disabled={!replyText.trim() || sendMutation.isPending}
                    className="self-end"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ctrl+Entrée pour envoyer</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal nouveau message */}
      <NewMessageDialog
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onSend={(data) => {
          sendMutation.mutate(data);
          setShowNewMessage(false);
        }}
        isLoading={sendMutation.isPending}
      />
    </Card>
  );
}

function NewMessageDialog({ isOpen, onClose, onSend, isLoading }) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');

  const handleSubmit = () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    onSend({ subject, content, category });
    setSubject('');
    setContent('');
    setCategory('general');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Objet</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet du message"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catégorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Votre message..."
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}