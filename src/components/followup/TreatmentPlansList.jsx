import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target,
  Calendar,
  ChevronRight,
  Search,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import TreatmentPlanDetail from './TreatmentPlanDetail';

const STATUS_CONFIG = {
  actif: { label: 'Actif', color: 'bg-green-100 text-green-800', icon: Target },
  en_pause: { label: 'En pause', color: 'bg-yellow-100 text-yellow-800', icon: PauseCircle },
  termine: { label: 'Terminé', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  abandonne: { label: 'Abandonné', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const PRIORITY_CONFIG = {
  haute: { label: 'Haute', color: 'bg-red-100 text-red-800' },
  moyenne: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-800' },
  basse: { label: 'Basse', color: 'bg-slate-100 text-slate-800' }
};

export default function TreatmentPlansList({ plans = [], isLoading, patientId }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const filteredPlans = plans.filter(plan => {
    const matchSearch = plan.title?.toLowerCase().includes(search.toLowerCase()) ||
                       plan.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
                       plan.condition?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || plan.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  if (selectedPlan) {
    return (
      <TreatmentPlanDetail 
        plan={selectedPlan} 
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plan..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="actif">Actifs</SelectItem>
            <SelectItem value="en_pause">En pause</SelectItem>
            <SelectItem value="termine">Terminés</SelectItem>
            <SelectItem value="abandonne">Abandonnés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun plan de traitement</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPlans.map(plan => {
            const statusConfig = STATUS_CONFIG[plan.status];
            const StatusIcon = statusConfig?.icon || Target;
            const daysRemaining = plan.target_end_date 
              ? differenceInDays(new Date(plan.target_end_date), new Date())
              : null;

            return (
              <Card 
                key={plan.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{plan.title}</h3>
                        <Badge className={statusConfig?.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig?.label}
                        </Badge>
                        {plan.priority && (
                          <Badge className={PRIORITY_CONFIG[plan.priority]?.color}>
                            {PRIORITY_CONFIG[plan.priority]?.label}
                          </Badge>
                        )}
                      </div>
                      
                      {!patientId && (
                        <p className="text-sm text-blue-600 mb-1">{plan.patient_name}</p>
                      )}
                      
                      {plan.condition && (
                        <p className="text-sm text-muted-foreground mb-2">{plan.condition}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Début: {format(new Date(plan.start_date), 'dd/MM/yyyy')}
                        </span>
                        {plan.target_end_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysRemaining > 0 ? `${daysRemaining}j restants` : 'Échéance dépassée'}
                          </span>
                        )}
                        <span>
                          {plan.objectives?.length || 0} objectif(s) • {plan.steps?.length || 0} étape(s)
                        </span>
                      </div>

                      {/* Barre de progression */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progression</span>
                          <span className="font-medium">{plan.overall_progress || 0}%</span>
                        </div>
                        <Progress value={plan.overall_progress || 0} className="h-2" />
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}