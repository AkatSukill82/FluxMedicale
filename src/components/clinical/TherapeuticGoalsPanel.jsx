import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  AlertTriangle,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const GOAL_TYPES = {
  hba1c: { label: 'HbA1c', unit: '%', defaultTarget: 7, defaultOperator: '<', icon: '🩸', color: 'red' },
  blood_pressure_systolic: { label: 'TA Systolique', unit: 'mmHg', defaultTarget: 140, defaultOperator: '<', icon: '❤️', color: 'pink' },
  blood_pressure_diastolic: { label: 'TA Diastolique', unit: 'mmHg', defaultTarget: 90, defaultOperator: '<', icon: '❤️', color: 'pink' },
  ldl: { label: 'LDL Cholestérol', unit: 'mg/dL', defaultTarget: 100, defaultOperator: '<', icon: '🔬', color: 'yellow' },
  hdl: { label: 'HDL Cholestérol', unit: 'mg/dL', defaultTarget: 40, defaultOperator: '>', icon: '🔬', color: 'green' },
  weight: { label: 'Poids', unit: 'kg', defaultTarget: 70, defaultOperator: '<', icon: '⚖️', color: 'blue' },
  bmi: { label: 'IMC', unit: 'kg/m²', defaultTarget: 25, defaultOperator: '<', icon: '📊', color: 'purple' },
  glycemia: { label: 'Glycémie à jeun', unit: 'mg/dL', defaultTarget: 126, defaultOperator: '<', icon: '🍬', color: 'orange' },
  custom: { label: 'Personnalisé', unit: '', defaultTarget: 0, defaultOperator: '<', icon: '📋', color: 'slate' }
};

const OPERATORS = {
  '<': 'inférieur à',
  '<=': 'inférieur ou égal à',
  '>': 'supérieur à',
  '>=': 'supérieur ou égal à',
  '=': 'égal à',
  'between': 'entre'
};

const STATUS_CONFIG = {
  achieved: { label: 'Atteint', color: 'bg-green-100 text-green-800', icon: Check },
  on_track: { label: 'En bonne voie', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
  at_risk: { label: 'À surveiller', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  off_track: { label: 'Hors cible', color: 'bg-red-100 text-red-800', icon: TrendingDown },
  pending: { label: 'En attente', color: 'bg-slate-100 text-slate-800', icon: Clock }
};

const evaluateGoalStatus = (goal) => {
  if (!goal.current_value) return 'pending';
  
  const { target_value, target_operator, target_value_max, current_value } = goal;
  
  let isAchieved = false;
  let distance = 0;
  
  switch (target_operator) {
    case '<':
      isAchieved = current_value < target_value;
      distance = ((target_value - current_value) / target_value) * 100;
      break;
    case '<=':
      isAchieved = current_value <= target_value;
      distance = ((target_value - current_value) / target_value) * 100;
      break;
    case '>':
      isAchieved = current_value > target_value;
      distance = ((current_value - target_value) / target_value) * 100;
      break;
    case '>=':
      isAchieved = current_value >= target_value;
      distance = ((current_value - target_value) / target_value) * 100;
      break;
    case '=':
      isAchieved = current_value === target_value;
      distance = current_value === target_value ? 100 : 0;
      break;
    case 'between':
      isAchieved = current_value >= target_value && current_value <= target_value_max;
      if (isAchieved) distance = 100;
      else if (current_value < target_value) distance = (current_value / target_value) * 100;
      else distance = (target_value_max / current_value) * 100;
      break;
  }
  
  if (isAchieved) return 'achieved';
  if (distance > 80 || distance < -80) return 'on_track';
  if (distance > 50 || distance < -50) return 'at_risk';
  return 'off_track';
};

export default function TherapeuticGoalsPanel({ patient }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['therapeuticGoals', patient.id],
    queryFn: () => base44.entities.TherapeuticGoal.filter({ patient_id: patient.id }, '-created_date', 50)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TherapeuticGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapeuticGoals'] });
      toast.success('Objectif créé');
      setShowAddModal(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TherapeuticGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapeuticGoals'] });
      toast.success('Objectif mis à jour');
      setEditingGoal(null);
      setShowUpdateModal(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TherapeuticGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapeuticGoals'] });
      toast.success('Objectif supprimé');
    }
  });

  const handleUpdateValue = (goal, newValue) => {
    const status = evaluateGoalStatus({ ...goal, current_value: newValue });
    updateMutation.mutate({
      id: goal.id,
      data: {
        current_value: newValue,
        last_measured_date: format(new Date(), 'yyyy-MM-dd'),
        status
      }
    });
  };

  // Statistiques
  const achievedCount = goals.filter(g => evaluateGoalStatus(g) === 'achieved').length;
  const totalCount = goals.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-blue-600" />
            Objectifs thérapeutiques
            {totalCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {achievedCount}/{totalCount} atteints
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun objectif défini</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddModal(true)}>
              Définir un premier objectif
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => {
              const typeConfig = GOAL_TYPES[goal.goal_type] || GOAL_TYPES.custom;
              const status = evaluateGoalStatus(goal);
              const statusConfig = STATUS_CONFIG[status];
              const StatusIcon = statusConfig.icon;
              
              // Calcul progression
              let progress = 0;
              if (goal.current_value && goal.target_value) {
                if (goal.target_operator === '>' || goal.target_operator === '>=') {
                  progress = Math.min(100, (goal.current_value / goal.target_value) * 100);
                } else {
                  progress = Math.min(100, Math.max(0, 100 - ((goal.current_value - goal.target_value) / goal.target_value * 100)));
                }
              }

              return (
                <div
                  key={goal.id}
                  className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{typeConfig.icon}</span>
                      <div>
                        <p className="font-medium text-sm">
                          {goal.title || typeConfig.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cible: {OPERATORS[goal.target_operator]} {goal.target_value}
                          {goal.target_operator === 'between' && ` et ${goal.target_value_max}`}
                          {' '}{goal.unit || typeConfig.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1">
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="text-right">
                      {goal.current_value ? (
                        <span className="font-bold text-lg">
                          {goal.current_value} <span className="text-xs text-muted-foreground">{goal.unit || typeConfig.unit}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non mesuré</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {goal.last_measured_date 
                        ? `Dernière mesure: ${format(new Date(goal.last_measured_date), 'dd MMM yyyy', { locale: fr })}`
                        : 'Aucune mesure'
                      }
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 px-2"
                        onClick={() => setShowUpdateModal(goal)}
                      >
                        <Activity className="w-3 h-3 mr-1" />
                        Mesure
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => setEditingGoal(goal)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-red-600 hover:bg-red-100"
                        onClick={() => deleteMutation.mutate(goal.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal ajout/édition */}
      <GoalFormModal
        isOpen={showAddModal || !!editingGoal}
        onClose={() => { setShowAddModal(false); setEditingGoal(null); }}
        goal={editingGoal}
        patientId={patient.id}
        onSave={(data) => {
          if (editingGoal) {
            updateMutation.mutate({ id: editingGoal.id, data });
          } else {
            createMutation.mutate({ ...data, patient_id: patient.id });
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Modal mise à jour valeur */}
      {showUpdateModal && (
        <UpdateValueModal
          goal={showUpdateModal}
          isOpen={!!showUpdateModal}
          onClose={() => setShowUpdateModal(null)}
          onSave={(value) => handleUpdateValue(showUpdateModal, value)}
          isLoading={updateMutation.isPending}
        />
      )}
    </Card>
  );
}

function GoalFormModal({ isOpen, onClose, goal, patientId, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    goal_type: 'hba1c',
    target_value: 7,
    target_operator: '<',
    target_value_max: null,
    unit: '%',
    title: '',
    description: '',
    priority: 'medium'
  });

  React.useEffect(() => {
    if (goal) {
      setFormData({
        goal_type: goal.goal_type || 'hba1c',
        target_value: goal.target_value || 7,
        target_operator: goal.target_operator || '<',
        target_value_max: goal.target_value_max || null,
        unit: goal.unit || '%',
        title: goal.title || '',
        description: goal.description || '',
        priority: goal.priority || 'medium'
      });
    } else {
      const typeConfig = GOAL_TYPES.hba1c;
      setFormData({
        goal_type: 'hba1c',
        target_value: typeConfig.defaultTarget,
        target_operator: typeConfig.defaultOperator,
        target_value_max: null,
        unit: typeConfig.unit,
        title: '',
        description: '',
        priority: 'medium'
      });
    }
  }, [goal, isOpen]);

  const handleTypeChange = (type) => {
    const config = GOAL_TYPES[type];
    setFormData(prev => ({
      ...prev,
      goal_type: type,
      target_value: config.defaultTarget,
      target_operator: config.defaultOperator,
      unit: config.unit,
      title: type === 'custom' ? prev.title : ''
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            {goal ? 'Modifier l\'objectif' : 'Nouvel objectif'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type d'objectif</Label>
            <Select value={formData.goal_type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {config.icon} {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.goal_type === 'custom' && (
            <div className="space-y-2">
              <Label>Titre personnalisé *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Tour de taille"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Opérateur</Label>
              <Select 
                value={formData.target_operator} 
                onValueChange={(val) => setFormData({ ...formData, target_operator: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATORS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{key} ({label})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valeur cible *</Label>
              <Input
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
              />
            </div>
            {formData.target_operator === 'between' && (
              <div className="space-y-2">
                <Label>Valeur max</Label>
                <Input
                  type="number"
                  value={formData.target_value_max || ''}
                  onChange={(e) => setFormData({ ...formData, target_value_max: parseFloat(e.target.value) })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Unité</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(val) => setFormData({ ...formData, priority: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(formData)} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {goal ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateValueModal({ goal, isOpen, onClose, onSave, isLoading }) {
  const [value, setValue] = useState(goal.current_value || '');
  const typeConfig = GOAL_TYPES[goal.goal_type] || GOAL_TYPES.custom;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Nouvelle mesure
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>{goal.title || typeConfig.label}</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Valeur mesurée"
              className="text-lg"
              autoFocus
            />
            <span className="text-muted-foreground">{goal.unit || typeConfig.unit}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cible: {OPERATORS[goal.target_operator]} {goal.target_value} {goal.unit || typeConfig.unit}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(parseFloat(value))} disabled={!value || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}