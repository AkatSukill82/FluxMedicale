import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export default function MessagingNotificationBadge() {
  const { data: conversations = [] } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: () => base44.entities.SecureConversation.list('-last_message_at', 100),
    refetchInterval: 30000 // Check every 30 seconds
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_doctor || 0), 0);

  if (totalUnread === 0) {
    return <MessageSquare className="w-5 h-5" />;
  }

  return (
    <div className="relative">
      <MessageSquare className="w-5 h-5" />
      <Badge 
        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-xs"
      >
        {totalUnread > 9 ? '9+' : totalUnread}
      </Badge>
    </div>
  );
}