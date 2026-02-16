import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, Check, Users, X, Calendar, Pill, FlaskConical, 
  Syringe, MessageSquare, FileText, AlertTriangle, Clock,
  CheckCircle2, Archive, Trash2, Filter, Search, Mail,
  MailOpen, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, formatDistanceToNow, subDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['allNotifications', user?.email, showArchived],
    queryFn: async () => {
      if (!user?.email) return [];
      const filter = { recipient_email: user.email };
      if (!showArchived) filter.archived = false;
      return base44.entities.Notification.filter(filter, '-created_date', 200);
    },
    enabled: !!user?.email
  });

  const markAsReadMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => base44.entities.Notification.update(id, { read: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedIds([]);
      toast.success('Notifications marquées comme lues');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => base44.entities.Notification.update(id, { archived: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedIds([]);
      toast.success('Notifications archivées');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => base44.entities.Notification.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedIds([]);
      setShowDeleteDialog(false);
      toast.success('Notifications supprimées');
    }
  });

  const markActionCompletedMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { action_completed: true, action_required: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Filtrage
  const filteredNotifications = notifications.filter(n => {
    // Tab filter
    if (activeTab === 'unread' && n.read) return false;
    if (activeTab === 'action' && (!n.action_required || n.action_completed)) return false;
    if (activeTab === 'today' && !isAfter(new Date(n.created_date), subDays(new Date(), 1))) return false;

    // Type filter
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;

    // Priority filter
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return n.title?.toLowerCase().includes(query) || 
             n.message?.toLowerCase().includes(query) ||
             n.patient_name?.toLowerCase().includes(query);
    }

    return true;
  });

  // Statistiques
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    actionRequired: notifications.filter(n => n.action_required && !n.action_completed).length,
    urgent: notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length,
    today: notifications.filter(n => isAfter(new Date(n.created_date), subDays(new Date(), 1))).length
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate([notification.id]);
    }
    if (notification.link) {
      navigate(createPageUrl(notification.link));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Non lues</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
              <Mail className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Actions</p>
                <p className="text-2xl font-bold">{stats.actionRequired}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Urgentes</p>
                <p className="text-2xl font-bold">{stats.urgent}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Aujourd'hui</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <Clock className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone principale */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Centre de notifications</CardTitle>
              <CardDescription>Gérez toutes vos notifications et alertes</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualiser
              </Button>
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4 mr-1" />
                {showArchived ? 'Masquer archivées' : 'Voir archivées'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Filtres et recherche */}
          <div className="p-4 border-b bg-slate-50 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher dans les notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="rdv_reminder">RDV</SelectItem>
                  <SelectItem value="prescription_renewal">Prescriptions</SelectItem>
                  <SelectItem value="lab_result">Résultats labo</SelectItem>
                  <SelectItem value="vaccination_due">Vaccinations</SelectItem>
                  <SelectItem value="follow_up">Suivis</SelectItem>
                  <SelectItem value="message_received">Messages</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions groupées */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">{selectedIds.length} sélectionnée(s)</span>
                <Button size="sm" variant="ghost" onClick={() => markAsReadMutation.mutate(selectedIds)}>
                  <MailOpen className="w-4 h-4 mr-1" />
                  Marquer lu
                </Button>
                <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate(selectedIds)}>
                  <Archive className="w-4 h-4 mr-1" />
                  Archiver
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
              <TabsTrigger value="all">Toutes ({stats.total})</TabsTrigger>
              <TabsTrigger value="unread">Non lues ({stats.unread})</TabsTrigger>
              <TabsTrigger value="action">Actions ({stats.actionRequired})</TabsTrigger>
              <TabsTrigger value="today">Aujourd'hui ({stats.today})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="m-0">
              {/* En-tête de liste */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 text-sm font-medium text-slate-600">
                <Checkbox
                  checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="flex-1">Notification</span>
                <span className="w-24 text-center hidden md:block">Type</span>
                <span className="w-24 text-center hidden md:block">Date</span>
                <span className="w-20 text-right">Actions</span>
              </div>

              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-300" />
                    <p>Chargement...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Aucune notification</p>
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
                          "flex items-center gap-3 px-4 py-3 border-b hover:bg-slate-50 transition-colors",
                          !notification.read && "bg-blue-50/30",
                          notification.priority === 'urgent' && "border-l-4 border-l-red-500",
                          notification.priority === 'high' && "border-l-4 border-l-orange-500",
                          notification.archived && "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.includes(notification.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds(prev => 
                              checked 
                                ? [...prev, notification.id]
                                : prev.filter(id => id !== notification.id)
                            );
                          }}
                        />
                        
                        <div 
                          className="flex-1 flex items-center gap-3 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", colorClass.bg)}>
                            <Icon className={cn("w-5 h-5", colorClass.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn("text-sm truncate", !notification.read && "font-semibold")}>
                                {notification.title}
                              </p>
                              {notification.action_required && !notification.action_completed && (
                                <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 flex-shrink-0">
                                  Action requise
                                </Badge>
                              )}
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{notification.message}</p>
                            {notification.patient_name && (
                              <p className="text-xs text-gray-400 mt-0.5">Patient: {notification.patient_name}</p>
                            )}
                          </div>
                        </div>

                        <Badge variant="outline" className={cn("w-24 justify-center hidden md:flex", colorClass.border, colorClass.text)}>
                          {config.label}
                        </Badge>

                        <span className="w-24 text-xs text-gray-400 text-center hidden md:block">
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: fr })}
                        </span>

                        <div className="w-20 flex justify-end gap-1">
                          {notification.action_required && !notification.action_completed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markActionCompletedMutation.mutate(notification.id)}
                              title="Marquer comme fait"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => archiveMutation.mutate([notification.id])}
                            title="Archiver"
                          >
                            <Archive className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedIds.length} notification(s) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(selectedIds)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}