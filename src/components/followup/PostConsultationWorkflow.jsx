import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Calendar,
  Bell,
  FileText,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { addWeeks, addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Automated Post-Consultation Follow-up Workflow
 * Triggered after consultation completion
 * Analyzes AI summary or manual notes to:
 * 1. Schedule follow-up appointments
 * 2. Send medication/lab reminders
 * 3. Generate physician tasks
 */
export default function PostConsultationWorkflow({ consultation, patient, aiSummary, onComplete }) {
  const queryClient = useQueryClient();
  const [workflowStatus, setWorkflowStatus] = useState('ANALYZING');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [scheduledAppointment, setScheduledAppointment] = useState(null);
  const [sentReminders, setSentReminders] = useState([]);

  const analyzeAndExecuteMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Analyze follow-up needs using AI
      const analysisPrompt = `Analyse cette consultation médicale et détermine les actions de suivi nécessaires:

PATIENT: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}
ÂGE: ${patient.birthDate ? Math.floor((new Date() - new Date(patient.birthDate)) / 31557600000) : 'N/A'} ans

RÉSUMÉ CONSULTATION:
${aiSummary ? `
Motif: ${aiSummary.motif}
Diagnostic: ${aiSummary.diagnostic}
Traitement: ${aiSummary.traitement}
Examens demandés: ${aiSummary.examens_demandes?.join(', ')}
Plan de suivi: ${aiSummary.plan_suivi}
` : consultation.diagnostic || 'Consultation générale'}

ANTÉCÉDENTS: ${patient.antecedents_medicaux || 'Aucun'}
MÉDICAMENTS ACTUELS: ${patient.medicaments_actuels || 'Aucun'}

Génère un plan de suivi structuré incluant:
1. Nécessité de rendez-vous de suivi (oui/non + délai recommandé)
2. Rappels médicaments/examens nécessaires
3. Tâches pour le médecin
4. Niveau de priorité

Format JSON:`;

      const followUpPlan = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            needs_followup_appointment: {
              type: "boolean"
            },
            followup_timeframe: {
              type: "string",
              enum: ["1_WEEK", "2_WEEKS", "1_MONTH", "3_MONTHS", "6_MONTHS"]
            },
            followup_reason: {
              type: "string"
            },
            medication_reminders: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medication: { type: "string" },
                  reminder_date: { type: "string" },
                  reminder_reason: { type: "string" }
                }
              }
            },
            lab_test_reminders: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  test_name: { type: "string" },
                  due_date: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            physician_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
                  deadline: { type: "string" }
                }
              }
            },
            overall_priority: {
              type: "string",
              enum: ["LOW", "NORMAL", "HIGH", "URGENT"]
            }
          }
        }
      });

      const tasks = [];
      const now = new Date();

      // 1. Schedule follow-up appointment if needed
      if (followUpPlan.needs_followup_appointment) {
        const timeframeMap = {
          '1_WEEK': addWeeks(now, 1),
          '2_WEEKS': addWeeks(now, 2),
          '1_MONTH': addMonths(now, 1),
          '3_MONTHS': addMonths(now, 3),
          '6_MONTHS': addMonths(now, 6)
        };
        
        const suggestedDate = timeframeMap[followUpPlan.followup_timeframe] || addWeeks(now, 2);
        
        // Create task to schedule appointment
        const appointmentTask = await base44.entities.FollowUpTask.create({
          patient_id: patient.id,
          consultation_id: consultation.id,
          task_type: 'SCHEDULE_APPOINTMENT',
          priority: followUpPlan.overall_priority,
          title: `Planifier RDV de suivi - ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`,
          description: followUpPlan.followup_reason || 'Contrôle post-consultation',
          due_date: format(suggestedDate, 'yyyy-MM-dd'),
          assigned_to: currentUser.email,
          auto_generated: true,
          ai_suggestion: {
            recommended_action: `Rendez-vous de suivi dans ${followUpPlan.followup_timeframe.replace('_', ' ').toLowerCase()}`,
            rationale: followUpPlan.followup_reason,
            timeframe: followUpPlan.followup_timeframe
          }
        });
        
        tasks.push(appointmentTask);
      }

      // 2. Create medication renewal reminders
      for (const medReminder of (followUpPlan.medication_reminders || [])) {
        const reminder = await base44.entities.PatientReminder.create({
          patient_id: patient.id,
          reminder_type: 'MEDICATION_RENEWAL',
          title: `Renouvellement: ${medReminder.medication}`,
          description: medReminder.reminder_reason,
          due_date: medReminder.reminder_date,
          status: 'PENDING',
          notification_channels: ['EMAIL', 'SMS'],
          created_by: currentUser.email
        });

        tasks.push(reminder);
      }

      // 3. Create lab test reminders
      for (const labReminder of (followUpPlan.lab_test_reminders || [])) {
        const reminder = await base44.entities.PatientReminder.create({
          patient_id: patient.id,
          reminder_type: 'LAB_RESULTS_REVIEW',
          title: `Examen à effectuer: ${labReminder.test_name}`,
          description: labReminder.reason,
          due_date: labReminder.due_date,
          status: 'PENDING',
          notification_channels: ['EMAIL'],
          created_by: currentUser.email
        });

        tasks.push(reminder);
      }

      // 4. Generate physician tasks
      for (const physicianTask of (followUpPlan.physician_tasks || [])) {
        const task = await base44.entities.FollowUpTask.create({
          patient_id: patient.id,
          consultation_id: consultation.id,
          task_type: 'CUSTOM',
          priority: physicianTask.priority,
          title: physicianTask.task,
          description: `Tâche générée automatiquement suite à consultation du ${format(new Date(consultation.date_consultation), 'dd/MM/yyyy', { locale: fr })}`,
          due_date: physicianTask.deadline,
          assigned_to: currentUser.email,
          auto_generated: true
        });

        tasks.push(task);
      }

      return { tasks, followUpPlan };
    },
    onSuccess: (data) => {
      setGeneratedTasks(data.tasks);
      setWorkflowStatus('COMPLETED');
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['patient-reminders'] });
      toast.success('Workflow de suivi automatisé terminé', {
        description: `${data.tasks.length} action(s) programmée(s)`
      });
    },
    onError: (error) => {
      console.error('Workflow error:', error);
      setWorkflowStatus('ERROR');
      toast.error('Erreur dans le workflow de suivi');
    }
  });

  const executeWorkflow = () => {
    analyzeAndExecuteMutation.mutate();
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Workflow de Suivi Automatisé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workflowStatus === 'ANALYZING' && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Analyse en cours...</strong>
              <div className="text-xs mt-1">L'IA analyse la consultation pour déterminer les actions de suivi nécessaires</div>
            </AlertDescription>
          </Alert>
        )}

        {workflowStatus === 'COMPLETED' && (
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Workflow terminé!</strong> {generatedTasks.length} action(s) créée(s)
              </AlertDescription>
            </Alert>

            {/* List generated tasks */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Actions programmées:</h4>
              {generatedTasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm">
                  {task.task_type === 'SCHEDULE_APPOINTMENT' && <Calendar className="w-4 h-4 text-blue-600" />}
                  {task.reminder_type === 'MEDICATION_RENEWAL' && <Bell className="w-4 h-4 text-purple-600" />}
                  {task.reminder_type === 'LAB_RESULTS_REVIEW' && <FileText className="w-4 h-4 text-green-600" />}
                  {task.task_type === 'CUSTOM' && <CheckCircle className="w-4 h-4 text-orange-600" />}
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Échéance: {format(new Date(task.due_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                  {task.priority && (
                    <Badge variant="outline" className={
                      task.priority === 'URGENT' ? 'border-red-500 text-red-700' :
                      task.priority === 'HIGH' ? 'border-orange-500 text-orange-700' :
                      'border-blue-500 text-blue-700'
                    }>
                      {task.priority}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {workflowStatus === 'ERROR' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900">
              Une erreur est survenue. Vous pouvez créer les tâches de suivi manuellement.
            </AlertDescription>
          </Alert>
        )}

        {workflowStatus === 'ANALYZING' && (
          <Button onClick={executeWorkflow} className="w-full" disabled={analyzeAndExecuteMutation.isPending}>
            {analyzeAndExecuteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Démarrer l'analyse automatique
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}