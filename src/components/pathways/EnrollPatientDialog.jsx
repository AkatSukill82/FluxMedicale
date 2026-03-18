import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, User, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';

function getPatientName(p) {
  const n = (p.name || [])[0];
  if (!n) return 'Patient inconnu';
  return `${n.family || ''} ${(n.given || []).join(' ')}`.trim();
}

export default function EnrollPatientDialog({ isOpen, onClose, pathway }) {
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients_enroll'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (!patient || !pathway) return;
      const user = await base44.auth.me();

      const enrolledDate = format(new Date(), 'yyyy-MM-dd');
      const stepStatuses = (pathway.steps || []).map(step => ({
        step_id: step.id,
        status: 'pending',
        due_date: format(addDays(new Date(), step.delay_days || 0), 'yyyy-MM-dd'),
      }));

      const firstStep = pathway.steps?.[0];
      await base44.entities.PatientPathwayEnrollment.create({
        patient_id: selectedPatientId,
        pathway_id: pathway.id,
        pathway_name: pathway.name,
        enrolled_date: enrolledDate,
        status: 'active',
        current_step_index: 0,
        step_statuses: stepStatuses,
        completion_percentage: 0,
        next_action_date: stepStatuses[0]?.due_date || enrolledDate,
        next_action_description: firstStep?.title || '',
        medecin_email: user.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['pathways'] });
      onClose();
      setSelectedPatientId('');
      setSearch('');
    },
  });

  const filtered = search
    ? patients.filter(p => getPatientName(p).toLowerCase().includes(search.toLowerCase()))
    : patients.slice(0, 20);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrire un patient — {pathway?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un patient..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto border rounded-lg divide-y">
            {filtered.map(p => (
              <button
                key={p.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${selectedPatientId === p.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                onClick={() => setSelectedPatientId(p.id)}
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{getPatientName(p)}</p>
                  <p className="text-xs text-muted-foreground">{p.birthDate || ''}</p>
                </div>
                {selectedPatientId === p.id && (
                  <Badge className="ml-auto text-[10px]">Sélectionné</Badge>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun patient trouvé</p>
            )}
          </div>

          {pathway && (
            <div className="bg-muted/50 rounded-md p-3 text-xs">
              <p className="font-medium mb-1">{pathway.steps?.length || 0} étapes seront planifiées :</p>
              <div className="flex flex-wrap gap-1">
                {(pathway.steps || []).slice(0, 5).map(s => (
                  <Badge key={s.id} variant="outline" className="text-[10px]">{s.title}</Badge>
                ))}
                {(pathway.steps || []).length > 5 && (
                  <Badge variant="outline" className="text-[10px]">+{pathway.steps.length - 5} autres</Badge>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => enrollMutation.mutate()}
            disabled={!selectedPatientId || enrollMutation.isPending}
          >
            {enrollMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Inscrire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}