
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Bell,
  FileText,
  Loader2,
  Filter,
  Sparkles,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FollowUpTasks() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [filterPriority, setFilterPriority] = useState('ALL');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['followup-tasks', filterStatus],
    queryFn: async () => {
      const allTasks = await base44.entities.FollowUpTask.list('-due_date');
      if (filterStatus === 'ALL') return allTasks;
      return allTasks.filter(t => t.status === filterStatus);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.FollowUpTask.update(id, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      execution_details: {
        ...tasks.find(t => t.id === id)?.execution_details,
        completion_notes: notes
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      toast.success('Tâche marquée comme terminée');
    }
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const officialName = patient.name?.find(n => n.use === 'official') || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      URGENT: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      NORMAL: 'bg-blue-100 text-blue-800',
      LOW: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || colors.NORMAL;
  };

  const getTaskIcon = (type) => {
    const icons = {
      SCHEDULE_APPOINTMENT: Calendar,
      MEDICATION_RENEWAL: Bell,
      LAB_TEST_REMINDER: FileText,
      IMAGING_REMINDER: FileText,
      SPECIALIST_REFERRAL: User,
      VITAL_SIGNS_CHECK: CheckCircle,
      CUSTOM: CheckCircle
    };
    return icons[type] || CheckCircle;
  };

  const filteredTasks = tasks.filter(task => {
    const priorityMatch = filterPriority === 'ALL' || task.priority === filterPriority;
    return priorityMatch;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === 'PENDING');
  const completedTasks = filteredTasks.filter(t => t.status === 'COMPLETED');
  const overdueTasks = pendingTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-primary" />
          Tâches de Suivi Patient
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestion automatisée des suivis post-consultation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-foreground">{pendingTasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-foreground">{overdueTasks.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terminées</p>
                <p className="text-2xl font-bold text-foreground">{completedTasks.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto-générées</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter(t => t.auto_generated).length}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminées</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes priorités</SelectItem>
                <SelectItem value="URGENT">Urgentes</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
                <SelectItem value="NORMAL">Normale</SelectItem>
                <SelectItem value="LOW">Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Tâches de suivi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">Aucune tâche en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const TaskIcon = getTaskIcon(task.task_type);
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                const isValidDueDate = dueDate && !isNaN(dueDate.getTime());
                const isOverdue = isValidDueDate && dueDate < new Date();

                return (
                  <div 
                    key={task.id}
                    className={`p-4 border-l-4 rounded-lg ${
                      isOverdue ? 'border-red-500 bg-red-50' :
                      task.priority === 'URGENT' ? 'border-orange-500 bg-orange-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        task.status === 'COMPLETED' ? 'bg-green-200' : 'bg-blue-200'
                      }`}>
                        <TaskIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{task.title}</h4>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          {task.auto_generated && (
                            <Badge variant="outline" className="bg-purple-50">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {getPatientName(task.patient_id)}
                        </p>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {isValidDueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Échéance: {format(dueDate, 'dd MMM yyyy', { locale: fr })}
                              {isOverdue && <span className="text-red-600 font-semibold ml-1">RETARD</span>}
                            </div>
                          )}
                          <div>Assigné à: {task.assigned_to}</div>
                        </div>

                        {task.ai_suggestion && (
                          <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                            <strong>Suggestion IA:</strong> {task.ai_suggestion.recommended_action}
                          </div>
                        )}
                      </div>

                      {task.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => completeTaskMutation.mutate({ id: task.id, notes: 'Terminé' })}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Terminer
                        </Button>
                      )}

                      {task.status === 'COMPLETED' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Terminée
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
