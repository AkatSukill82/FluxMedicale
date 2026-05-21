import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

export default function ChatMessageBubble({ message, isOwn }) {
  return (
    <div className={cn('flex gap-2 mb-3', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {message.sender_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}
      <div className={cn('max-w-[75%]', isOwn && 'flex flex-col items-end')}>
        {!isOwn && (
          <p className="text-xs text-muted-foreground mb-1">{message.sender_name}</p>
        )}
        <div className={cn(
          'rounded-2xl px-4 py-2',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-900',
          message.is_urgent && 'border-2 border-red-400'
        )}>
          {message.is_urgent && (
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs font-bold">URGENT</span>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1">
          {message.created_date ? format(new Date(message.created_date), 'HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}