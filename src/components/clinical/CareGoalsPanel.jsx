import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target,
  Plus,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CareGoalsPanel({ patientId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'CLINICAL',
    target_value: '',
    target_date: '',
    priority: 'MEDIUM'
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['care-goals', patientId],
    queryFn: () => base44.entities.CareGoal.filter({ patient_id: patientId }, '-created_date'),
    enabled: !!patientId
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingGoal) {
        return base44.entities.CareGoal.update(editingGoal.id, data);
      }
      return base44.entities.CareGoal.create({ ...data, patient_id: patientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-goals', patientId] });
      toast.success('Objectif sauvegardé');
      setShowDialog(false);
      setEditingGoal(null);
      setFormData({ title: '', description: '', category: 'CLINICAL', target_value: '', target_date: '', priority: 'MEDIUM' });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const updateData = { status };
      if (status === 'ACHIEVED') {
        updateData.achieved_at = new Date().toISOString();
      }
      return base44.entities.CareGoal.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-goals', patientId] });
      toast.success('Statut mis à jour');
    }
  });

  const activeGoals = goals.filter(g => g.status !== 'ACHIEVED' && g.status !== 'ABANDONED');
  const achievedGoals = goals.filter(g => g.status === 'ACHIEVED');

  const getCategoryColor = (category) => {
    const colors = {
      CLINICAL: 'bg-blue-100 text-blue-800',
      LIFESTYLE: 'bg-green-100 text-green-800',
      MEDICATION: 'bg-purple-100 text-purple-800',
      MONITORING: 'bg-orange-100 text-orange-800',
      PREVENTION: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || colors.CLINICAL;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.MEDIUM;
  };

  const calculateProgress = (goal) => {
    if (!goal.target_date) return 0;
    const start = parseISO(goal.created_date);
    const target = parseISO(goal.target_date);
    const now = new Date();
    const total = differenceInDays(target, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objectifs de Soins
            </CardTitle>
            <Button size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel objectif
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun objectif défini</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    En cours ({activeGoals.length})
                  </h4>
                  <div className="space-y-3">
                    {activeGoals.map(goal => (
                      <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold">{goal.title}</h5>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={getCategoryColor(goal.category)}>
                                {goal.category}
                              </Badge>
                              <Badge className={getPriorityColor(goal.priority)}>
                                {goal.priority}
                              </Badge>
                              {goal.target_value && (
                                <Badge variant="outline">Cible: {goal.target_value}</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingGoal(goal); setFormData(goal); setShowDialog(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>

                        {goal.target_date && (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>Échéance: {format(parseISO(goal.target_date), 'dd MMM yyyy', { locale: fr })}</span>
                              <span>{Math.round(calculateProgress(goal))}%</span>
                            </div>
                            <Progress value={calculateProgress(goal)} />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: goal.id, status: 'IN_PROGRESS' })}
                            disabled={goal.status === 'IN_PROGRESS'}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            En cours
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: goal.id, status: 'ACHIEVED' })}
                            className="text-green-600"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Atteint
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achieved Goals */}
              {achievedGoals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Atteints ({achievedGoals.length})
                  </h4>
                  <div className="space-y-2">
                    {achievedGoals.map(goal => (
                      <div key={goal.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900">{goal.title}</p>
                            {goal.achieved_at && (
                              <p className="text-xs text-green-700">
                                Atteint le {format(parseISO(goal.achieved_at), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Modifier' : 'Nouvel'} objectif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Réduire tension artérielle"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINICAL">Clinique</SelectItem>
                    <SelectItem value="LIFESTYLE">Style de vie</SelectItem>
                    <SelectItem value="MEDICATION">Médication</SelectItem>
                    <SelectItem value="MONITORING">Surveillance</SelectItem>
                    <SelectItem value="PREVENTION">Prévention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valeur cible</Label>
                <Input
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="Ex: TA < 140/90"
                />
              </div>
              <div>
                <Label>Date cible</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingGoal(null); }}>
              Annuler
            </Button>
            <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.title || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}