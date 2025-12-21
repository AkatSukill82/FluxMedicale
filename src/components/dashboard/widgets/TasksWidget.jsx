import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Circle, Loader2, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TasksWidget() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['follow-up-tasks'],
    queryFn: async () => {
      const all = await base44.entities.FollowUpTask.filter({
        status: 'PENDING'
      }, 'due_date', 50);
      return all.slice(0, 8);
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucune tâche en cours</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const patient = patients.find(p => p.id === task.patient_id);
        const patientName = patient?.name?.[0]
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
          : 'Patient inconnu';

        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

        return (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Circle className={`w-4 h-4 mt-0.5 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{task.description}</p>
              <p className="text-xs text-slate-600 mt-1">{patientName}</p>
              {task.due_date && (
                <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                  {isOverdue ? '⚠️ ' : ''}
                  {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                </p>
              )}
            </div>
            <Badge variant={
              task.priority === 'HIGH' ? 'destructive' :
              task.priority === 'MEDIUM' ? 'default' :
              'outline'
            } className="text-xs">
              {task.priority}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}