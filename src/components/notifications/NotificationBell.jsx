import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, Check, Users, X, Calendar, Pill, FlaskConical, 
  Syringe, MessageSquare, FileText, AlertTriangle, Clock,
  CheckCircle2, Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const NOTIFICATION_CONFIG = {
  liaison_request: { icon: Users, color: 'blue', label: 'Liaison' },
  liaison_accepted: { icon: Check, color: 'green', label: 'Liaison' },
  liaison_revoked: { icon: X, color: 'red', label: 'Liaison' },
  rdv_reminder: { icon: Calendar, color: 'blue', label: 'RDV' },
  rdv_cancelled: { icon: Calendar, color: 'red', label: 'RDV annulé' },
  rdv_confirmed: { icon: Calendar, color: 'green', label: 'RDV confirmé' },
  prescription_renewal: { icon: Pill, color: 'orange', label: 'Prescription' },
  prescription_expiring: { icon: Pill, color: 'yellow', label: 'Prescription' },
  lab_result: { icon: FlaskConical, color: 'purple', label: 'Labo' },
  lab_critical: { icon: AlertTriangle, color: 'red', label: 'Labo URGENT' },
  vaccination_due: { icon: Syringe, color: 'teal', label: 'Vaccination' },
  follow_up: { icon: Clock, color: 'indigo', label: 'Suivi' },
  message_received: { icon: MessageSquare, color: 'blue', label: 'Message' },
  document_ready: { icon: FileText, color: 'gray', label: 'Document' },
  general: { icon: Bell, color: 'gray', label: 'Info' }
};

const PRIORITY_STYLES = {
  urgent: 'border-l-4 border-l-red-500 bg-red-50',
  high: 'border-l-4 border-l-orange-500 bg-orange-50',
  normal: '',
  low: 'opacity-75'
};

const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600' }
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Notification.filter(
        { recipient_email: user.email, archived: false },
        '-created_date',
        50
      );
    },
    enabled: !!user?.email,
    refetchInterval: 30000
  });

  // Souscrire aux nouvelles notifications en temps réel
  useEffect(() => {
    if (!user?.email) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data.recipient_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        // Jouer un son pour les notifications urgentes
        if (event.data.priority === 'urgent' || event.data.priority === 'high') {
          playNotificationSound();
        }
      }
    });

    return () => unsubscribe();
  }, [user?.email, queryClient]);

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwUYrPFvp5hOx9RkLu+p29MIkd8rbW0fnkkQHKrtLOIbjMpXJuzs5F9VigvVpCpqqCMdEMoR3+dnaCVj14wLz53k5eXl5aOYzYkMGWJjY+PkZGIcT0kJVF8hYiMjY6MhHhFJSA8aH6EiIuNjYuGfVErHi1VdIGIjI6OjoqFfVYsHidKbH+IjI+Pj4yIgGQxGyA/ZXyGi46Pj46LhoJtOBsZMVlzhYuOj4+PjYmFd0QcFyVLaoCHjI6Pj46LiIN8TiEVHDtfdoWLjo+Pj42KhoJ2UiYTFzBUcIOKjY+Pj46MiYR+ZzAREyZFZ36Ii42Pj4+NioaDdVczDxEfOFpzg4qNj4+PjouJhH1lPBMOGS9QbYGJjY+Pj4+NioaDemBBFwwSJUJjfIiMjo+Pj42LiIR9Z0oaDQ8dNVRvgomNj4+Pj42LiIV+bFQgDA0YKkRmeIeMjo+Pj46MiYaDfnNcJwsLFC49X3WFi46Pj4+PjYuJhoR+eWMuCgkQIC9RaoOKjY+Pj4+OjIqIhoR/fnNkMwkIDBokQWJ7h4yOj4+Pj42LiYeGhIJ/fHReOwgHCRQcMlNsgouOj4+Pj46Mi4mHhoSDgoF+fHhlRAgGCA4WJkFge4eLjo+Pj4+OjYuKiIeGhYSDgYB+fHxyTA==');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const archiveMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { archived: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markActionCompletedMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { 
      action_completed: true, 
      action_required: false 
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(createPageUrl(notification.link));
    }
    setIsOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => !n.read && (n.priority === 'urgent' || n.priority === 'high')).length;
  const actionRequiredCount = notifications.filter(n => n.action_required && !n.action_completed).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'action') return n.action_required && !n.action_completed;
    return true;
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn("w-5 h-5", urgentCount > 0 && "text-red-500")} />
          {unreadCount > 0 && (
            <Badge 
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-white text-xs",
                urgentCount > 0 ? "bg-red-500 animate-pulse" : "bg-blue-500"
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b bg-slate-50">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            {actionRequiredCount > 0 && (
              <p className="text-xs text-orange-600">{actionRequiredCount} action(s) requise(s)</p>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => markAllAsReadMutation.mutate()}
              >
                <Check className="w-3 h-3 mr-1" />
                Tout lu
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-9">
            <TabsTrigger value="all" className="text-xs">Toutes</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Non lues {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="action" className="text-xs">
              Actions {actionRequiredCount > 0 && `(${actionRequiredCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-80">
              {filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.general;
                  const Icon = config.icon;
                  const colorClass = COLOR_CLASSES[config.color] || COLOR_CLASSES.gray;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors group",
                        !notification.read && "bg-blue-50/50",
                        PRIORITY_STYLES[notification.priority]
                      )}
                    >
                      <div className="flex gap-3" onClick={() => handleNotificationClick(notification)}>
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", colorClass.bg)}>
                          <Icon className={cn("w-4 h-4", colorClass.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-sm line-clamp-1", !notification.read && "font-semibold")}>
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: fr })}
                            </p>
                            {notification.action_required && !notification.action_completed && (
                              <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
                                Action requise
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      
                      {/* Actions rapides */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notification.action_required && !notification.action_completed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              markActionCompletedMutation.mutate(notification.id);
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Fait
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveMutation.mutate(notification.id);
                          }}
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Archiver
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-2 border-t bg-slate-50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => {
              navigate(createPageUrl('Notifications'));
              setIsOpen(false);
            }}
          >
            Voir toutes les notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}