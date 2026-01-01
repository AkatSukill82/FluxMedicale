import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Calendar,
  Pill,
  FileText,
  Settings,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Zap
} from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import RemindersList from './RemindersList';
import ReminderTemplatesManager from './ReminderTemplatesManager';
import CreateReminderModal from './CreateReminderModal';
import AutoReminderScanner from './AutoReminderScanner';

export default function PatientRemindersSystem() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Charger les rappels
  const { data: reminders = [], isLoading, refetch } = useQuery({
    queryKey: ['patientReminders'],
    queryFn: () => base44.entities.PatientReminder.list('-date_rappel', 200)
  });

  // Stats
  const stats = {
    planifies: reminders.filter(r => r.statut === 'planifie').length,
    envoyes: reminders.filter(r => r.statut === 'envoye').length,
    echecs: reminders.filter(r => r.statut === 'echec').length,
    aujourdhui: reminders.filter(r => {
      if (r.statut !== 'planifie') return false;
      const today = startOfDay(new Date());
      const reminderDate = startOfDay(new Date(r.date_rappel));
      return reminderDate.getTime() === today.getTime();
    }).length
  };

  // Filtrer les rappels
  const pendingReminders = reminders.filter(r => r.statut === 'planifie');
  const sentReminders = reminders.filter(r => r.statut === 'envoye');
  const failedReminders = reminders.filter(r => r.statut === 'echec');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600" />
            Rappels Automatisés
          </h1>
          <p className="text-muted-foreground">
            Gérez les rappels SMS et Email pour vos patients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScanner(true)}>
            <Zap className="w-4 h-4 mr-2" />
            Scanner auto
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau rappel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Aujourd'hui</p>
                <p className="text-2xl font-bold text-orange-900">{stats.aujourdhui}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Planifiés</p>
                <p className="text-2xl font-bold text-blue-900">{stats.planifies}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Envoyés</p>
                <p className="text-2xl font-bold text-green-900">{stats.envoyes}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Échecs</p>
                <p className="text-2xl font-bold text-red-900">{stats.echecs}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            En attente
            <Badge variant="secondary">{pendingReminders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Envoyés
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-2">
            <XCircle className="w-4 h-4" />
            Échecs
            {stats.echecs > 0 && <Badge className="bg-red-500">{stats.echecs}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="w-4 h-4" />
            Modèles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <RemindersList reminders={pendingReminders} onRefresh={refetch} showActions />
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          <RemindersList reminders={sentReminders} onRefresh={refetch} />
        </TabsContent>

        <TabsContent value="failed" className="mt-6">
          <RemindersList reminders={failedReminders} onRefresh={refetch} showRetry />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <ReminderTemplatesManager />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateReminderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />

      <AutoReminderScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSuccess={() => {
          refetch();
          setShowScanner(false);
        }}
      />
    </div>
  );
}