import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Clock, AlertTriangle, Pause, User, Calendar, ChevronRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

function getPatientName(patient) {
  const n = (patient?.name || [])[0];
  if (!n) return 'Patient inconnu';
  return `${n.family || ''} ${(n.given || []).join(' ')}`.trim();
}

const STATUS_CONFIG = {
  active: { label: 'Actif', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  paused: { label: 'Pause', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
  completed: { label: 'Terminé', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  abandoned: { label: 'Abandonné', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export default function EnrollmentsList({ enrollments, patients }) {
  const queryClient = useQueryClient();
  const patientMap = useMemo(() => {
    const map = {};
    (patients || []).forEach(p => { map[p.id] = p; });
    return map;
  }, [patients]);

  const completeStepMutation = useMutation({
    mutationFn: async ({ enrollment, stepIndex }) => {
      const statuses = [...(enrollment.step_statuses || [])];
      statuses[stepIndex] = { ...statuses[stepIndex], status: 'completed', completed_date: format(new Date(), 'yyyy-MM-dd') };
      const completedCount = statuses.filter(s => s.status === 'completed').length;
      const pct = Math.round((completedCount / statuses.length) * 100);
      const nextPending = statuses.findIndex((s, i) => i > stepIndex && s.status === 'pending');

      await base44.entities.PatientPathwayEnrollment.update(enrollment.id, {
        step_statuses: statuses,
        completion_percentage: pct,
        current_step_index: nextPending >= 0 ? nextPending : statuses.length,
        next_action_date: nextPending >= 0 ? statuses[nextPending].due_date : null,
        next_action_description: nextPending >= 0 ? `Étape ${nextPending + 1}` : 'Parcours terminé',
        status: pct >= 100 ? 'completed' : enrollment.status,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });

  if (!enrollments?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucun patient inscrit à un parcours</p>
          <p className="text-xs">Sélectionnez un parcours et cliquez "Inscrire" pour commencer</p>
        </CardContent>
      </Card>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-3">
      {enrollments.map(enrollment => {
        const patient = patientMap[enrollment.patient_id];
        const statusConf = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.active;
        const StatusIcon = statusConf.icon;
        const stepStatuses = enrollment.step_statuses || [];
        const overdueSteps = stepStatuses.filter(s => s.status === 'pending' && s.due_date && s.due_date < today);

        return (
          <Card key={enrollment.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/Patients?id=${enrollment.patient_id}`} className="font-medium text-sm hover:underline">
                        {getPatientName(patient)}
                      </Link>
                      <Badge className={`text-[9px] ${statusConf.color}`}>
                        {statusConf.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{enrollment.pathway_name}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-lg font-bold">{enrollment.completion_percentage || 0}%</span>
                </div>
              </div>

              <Progress value={enrollment.completion_percentage || 0} className="h-2 mb-3" />

              {/* Step pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {stepStatuses.map((s, i) => {
                  const isOverdue = s.status === 'pending' && s.due_date && s.due_date < today;
                  return (
                    <button
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        s.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                        isOverdue ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' :
                        s.status === 'pending' ? 'bg-white text-muted-foreground border-border hover:bg-primary hover:text-primary-foreground' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      onClick={() => {
                        if (s.status === 'pending') {
                          completeStepMutation.mutate({ enrollment, stepIndex: i });
                        }
                      }}
                      title={s.status === 'pending' ? 'Cliquer pour marquer comme fait' : s.status}
                    >
                      {s.status === 'completed' ? '✓' : isOverdue ? '!' : i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Next action */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {overdueSteps.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 text-[10px]">
                      <AlertTriangle className="w-3 h-3 mr-0.5" />
                      {overdueSteps.length} en retard
                    </Badge>
                  )}
                  {enrollment.next_action_date && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Prochaine action : {enrollment.next_action_date}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}