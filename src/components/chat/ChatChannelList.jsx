import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Hash, Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_CHANNELS = [
  { id: 'general', name: 'Général', icon: Hash },
  { id: 'urgences', name: 'Urgences', icon: Hash },
  { id: 'admin', name: 'Administratif', icon: Hash },
  { id: 'labo', name: 'Laboratoire', icon: Hash },
];

export default function ChatChannelList({ activeChannel, onSelectChannel, unreadCounts = {} }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Canaux</p>
      {DEFAULT_CHANNELS.map(ch => (
        <button
          key={ch.id}
          onClick={() => onSelectChannel(ch.id)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
            activeChannel === ch.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <ch.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 truncate">{ch.name}</span>
          {unreadCounts[ch.id] > 0 && (
            <Badge className="bg-red-500 text-white text-xs h-5 min-w-5 flex items-center justify-center">
              {unreadCounts[ch.id]}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}