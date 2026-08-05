import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, AlertTriangle, MessageCircle, Loader2 } from 'lucide-react';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatChannelList from '@/components/chat/ChatChannelList';

export default function ChatInterne() {
  const [user, setUser] = useState(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: activeChannel }, '-created_date', 100),
    refetchInterval: 3000,
  });

  const sortedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', activeChannel] });
      setNewMessage('');
      setIsUrgent(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages]);

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.channel === activeChannel) {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', activeChannel] });
      }
    });
    return unsubscribe;
  }, [activeChannel, queryClient]);

  const handleSend = () => {
    if (!newMessage.trim() || !user) return;
    sendMutation.mutate({
      channel: activeChannel,
      sender_email: user.email,
      sender_name: user.full_name,
      content: newMessage.trim(),
      is_urgent: isUrgent,
      is_read_by: [user.email],
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const channelNames = { general: 'Général', urgences: 'Urgences', admin: 'Administratif', labo: 'Laboratoire' };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-7 h-7" />
          Chat Interne
        </h1>
        <p className="text-muted-foreground">Messagerie temps réel entre praticiens du cabinet</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-16rem)]">
        {/* Channels sidebar */}
        <Card className="lg:col-span-1">
          <CardContent className="p-3">
            <ChatChannelList
              activeChannel={activeChannel}
              onSelectChannel={setActiveChannel}
            />
          </CardContent>
        </Card>

        {/* Messages area */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="py-3 px-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">#{channelNames[activeChannel] || activeChannel}</span>
              <Badge variant="outline" className="text-xs">{messages.length} messages</Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun message dans ce canal</p>
                <p className="text-sm">Soyez le premier à écrire !</p>
              </div>
            ) : (
              <>
                {sortedMessages.map(msg => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_email === user?.email}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input area */}
          <div className="p-3 border-t flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant={isUrgent ? 'destructive' : 'ghost'}
                size="icon"
                onClick={() => setIsUrgent(!isUrgent)}
                title="Marquer comme urgent"
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message dans #${channelNames[activeChannel] || activeChannel}...`}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}