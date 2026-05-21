import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ChatMessageArea({ messages, currentUser, isLoading, onSend, channelName }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedByDate = {};
  messages.forEach(m => {
    const dateKey = format(new Date(m.created_date), 'yyyy-MM-dd');
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(m);
  });

  return (
    <div className="flex-1 bg-white rounded-xl border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Hash className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-semibold">{channelName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-1">Aucun message</p>
            <p className="text-sm">Soyez le premier à écrire dans ce canal !</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([dateKey, dayMessages]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-muted-foreground px-2">
                  {format(new Date(dateKey), 'EEEE d MMMM', { locale: fr })}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              {dayMessages.map((m, i) => {
                const isMe = m.sender_email === currentUser?.email;
                const showAvatar = i === 0 || dayMessages[i - 1]?.sender_email !== m.sender_email;
                return (
                  <div key={m.id} className={cn('flex gap-3 mb-1', !showAvatar && 'pl-11')}>
                    {showAvatar && (
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                        isMe ? 'bg-primary' : 'bg-slate-500'
                      )}>
                        {(m.sender_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-sm">{m.sender_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(m.created_date), 'HH:mm')}
                          </span>
                          {m.is_urgent && <span className="text-xs text-red-600 font-medium">🔴 Urgent</span>}
                        </div>
                      )}
                      <p className="text-sm">{m.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder={`Écrire dans #${channelName}...`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!text.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}