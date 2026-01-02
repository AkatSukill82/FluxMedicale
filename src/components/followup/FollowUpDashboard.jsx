import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  ClipboardList,
  Target,
  TrendingUp,
  MessageSquare,
  FileText,
  Search,
  Plus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import TreatmentPlansList from './TreatmentPlansList';
import TreatmentPlanForm from './TreatmentPlanForm';
import PatientMessagesPanel from './PatientMessagesPanel';
import FollowUpReportsList from './FollowUpReportsList';

export default function FollowUpDashboard({ patient = null }) {
  const [activeTab, setActiveTab] = useState('plans');
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [search, setSearch] = useState('');

  // Si pas de patient spécifique, charger tous les plans actifs
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['treatmentPlans', patient?.id],
    queryFn: async () => {
      if (patient?.id) {
        return base44.entities.TreatmentPlan.filter({ patient_id: patient.id }, '-created_date');
      }
      return base44.entities.TreatmentPlan.filter({ status: 'actif' }, '-created_date', 100);
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['patientMessages', patient?.id],
    queryFn: async () => {
      if (patient?.id) {
        return base44.entities.PatientMessage.filter({ patient_id: patient.id }, '-created_date', 50);
      }
      const currentUser = await base44.auth.me();
      return base44.entities.PatientMessage.filter({ sender_email: currentUser.email }, '-created_date', 50);
    }
  });

  // Stats
  const stats = React.useMemo(() => {
    const activePlans = plans.filter(p => p.status === 'actif');
    const needsReview = activePlans.filter(p => {
      if (!p.next_review_date) return false;
      return differenceInDays(new Date(p.next_review_date), new Date()) <= 7;
    });
    const unreadMessages = messages.filter(m => !m.read && m.sender_type === 'patient');
    const avgProgress = activePlans.length > 0 
      ? Math.round(activePlans.reduce((sum, p) => sum + (p.overall_progress || 0), 0) / activePlans.length)
      : 0;

    return {
      activePlans: activePlans.length,
      needsReview: needsReview.length,
      unreadMessages: unreadMessages.length,
      avgProgress
    };
  }, [plans, messages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {patient ? `Suivi de ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}` : 'Suivi des patients'}
          </h1>
          <p className="text-muted-foreground">Plans de traitement et progression</p>
        </div>
        <Button onClick={() => setShowCreatePlan(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activePlans}</p>
                <p className="text-xs text-muted-foreground">Plans actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                <p className="text-xs text-muted-foreground">Progression moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.needsReview > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
                <Clock className={`w-5 h-5 ${stats.needsReview > 0 ? 'text-orange-600' : 'text-slate-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsReview}</p>
                <p className="text-xs text-muted-foreground">À revoir cette semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.unreadMessages > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                <MessageSquare className={`w-5 h-5 ${stats.unreadMessages > 0 ? 'text-red-600' : 'text-slate-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                <p className="text-xs text-muted-foreground">Messages non lus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Target className="w-4 h-4" />
            Plans de traitement
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
            {stats.unreadMessages > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{stats.unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            Rapports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <TreatmentPlansList 
            plans={plans} 
            isLoading={isLoading}
            patientId={patient?.id}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <PatientMessagesPanel 
            patientId={patient?.id}
            messages={messages}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <FollowUpReportsList patientId={patient?.id} />
        </TabsContent>
      </Tabs>

      {/* Modal création plan */}
      {showCreatePlan && (
        <TreatmentPlanForm
          isOpen={showCreatePlan}
          onClose={() => setShowCreatePlan(false)}
          patient={patient}
        />
      )}
    </div>
  );
}