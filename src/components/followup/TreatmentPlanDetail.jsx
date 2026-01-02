import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Target,
  ListChecks,
  TrendingUp,
  Calendar,
  Edit,
  Plus,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import TreatmentPlanForm from './TreatmentPlanForm';
import ProgressEntryForm from './ProgressEntryForm';
import GenerateReportModal from './GenerateReportModal';

const STEP_STATUS = {
  a_faire: { label: 'À faire', color: 'bg-slate-100 text-slate-800' },
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  termine: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  annule: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
};

const OBJ_STATUS = {
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  atteint: { label: 'Atteint', color: 'bg-green-100 text-green-800' },
  non_atteint: { label: 'Non atteint', color: 'bg-red-100 text-red-800' },
  en_attente: { label: 'En attente', color: 'bg-slate-100 text-slate-800' }
};

export default function TreatmentPlanDetail({ plan, onBack }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Charger l'historique des progressions
  const { data: progressEntries = [] } = useQuery({
    queryKey: ['treatmentProgress', plan.id],
    queryFn: () => base44.entities.TreatmentProgress.filter({ plan_id: plan.id }, '-date', 100)
  });

  // Mutation pour mettre à jour le statut d'une étape
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, newStatus }) => {
      const updatedSteps = plan.steps.map(s => 
        s.id === stepId ? { ...s, status: newStatus } : s
      );
      
      // Recalculer la progression
      const completedSteps = updatedSteps.filter(s => s.status === 'termine').length;
      const totalSteps = updatedSteps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      await base44.entities.TreatmentPlan.update(plan.id, {
        steps: updatedSteps,
        overall_progress: progress
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatmentPlans'] });
      toast.success('Étape mise à jour');
    }
  });

  // Mutation pour mettre à jour un objectif
  const updateObjectiveMutation = useMutation({
    mutationFn: async ({ objectiveId, updates }) => {
      const updatedObjectives = plan.objectives.map(o =>
        o.id === objectiveId ? { ...o, ...updates } : o
      );
      await base44.entities.TreatmentPlan.update(plan.id, { objectives: updatedObjectives });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatmentPlans'] });
      toast.success('Objectif mis à jour');
    }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{plan.title}</h2>
            <p className="text-muted-foreground">{plan.patient_name}</p>
            {plan.condition && (
              <Badge variant="outline" className="mt-1">{plan.condition}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowReportModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Générer rapport
          </Button>
          <Button variant="outline" onClick={() => setShowEditForm(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Progression globale */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression globale</span>
            <span className="text-2xl font-bold">{plan.overall_progress || 0}%</span>
          </div>
          <Progress value={plan.overall_progress || 0} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Début: {format(new Date(plan.start_date), 'dd/MM/yyyy')}</span>
            {plan.target_end_date && (
              <span>Fin prévue: {format(new Date(plan.target_end_date), 'dd/MM/yyyy')}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Target className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Objectifs */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Objectifs ({plan.objectives?.length || 0})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowProgressForm(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter mesure
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.objectives?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun objectif défini</p>
              ) : (
                plan.objectives?.map(obj => (
                  <div key={obj.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{obj.title}</p>
                          <Badge className={OBJ_STATUS[obj.status]?.color}>
                            {OBJ_STATUS[obj.status]?.label}
                          </Badge>
                        </div>
                        {obj.target_value && (
                          <div className="flex items-center gap-4 text-sm">
                            <span>Actuel: <strong>{obj.current_value || '-'}</strong></span>
                            <span>→</span>
                            <span>Cible: <strong>{obj.target_value} {obj.unit}</strong></span>
                          </div>
                        )}
                        {obj.progress_percent > 0 && (
                          <Progress value={obj.progress_percent} className="h-2 mt-2" />
                        )}
                      </div>
                      <Select 
                        value={obj.status} 
                        onValueChange={(v) => updateObjectiveMutation.mutate({ objectiveId: obj.id, updates: { status: v }})}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="atteint">Atteint</SelectItem>
                          <SelectItem value="non_atteint">Non atteint</SelectItem>
                          <SelectItem value="en_attente">En attente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Étapes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Étapes du traitement ({plan.steps?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.steps?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune étape définie</p>
              ) : (
                plan.steps?.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'termine' ? 'bg-green-600 text-white' : 'bg-slate-200'
                    }`}>
                      {step.status === 'termine' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${step.status === 'termine' ? 'line-through text-muted-foreground' : ''}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.frequency}
                      </p>
                    </div>
                    <Select 
                      value={step.status} 
                      onValueChange={(v) => updateStepMutation.mutate({ stepId: step.id, newStatus: v })}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_faire">À faire</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="termine">Terminé</SelectItem>
                        <SelectItem value="annule">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des mesures</CardTitle>
            </CardHeader>
            <CardContent>
              {progressEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune mesure enregistrée
                </p>
              ) : (
                <div className="space-y-3">
                  {progressEntries.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{entry.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                        {entry.numeric_value && (
                          <p className="font-bold mt-1">{entry.numeric_value} {entry.unit}</p>
                        )}
                        {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                        {entry.mood && (
                          <Badge className="mt-1" variant="secondary">Humeur: {entry.mood}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showEditForm && (
        <TreatmentPlanForm
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          plan={plan}
        />
      )}

      {showProgressForm && (
        <ProgressEntryForm
          isOpen={showProgressForm}
          onClose={() => setShowProgressForm(false)}
          plan={plan}
        />
      )}

      {showReportModal && (
        <GenerateReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          plan={plan}
          progressEntries={progressEntries}
        />
      )}
    </div>
  );
}