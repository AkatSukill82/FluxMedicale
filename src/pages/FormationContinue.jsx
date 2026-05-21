import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Plus, Award, Target, Clock, Loader2 } from 'lucide-react';
import FormationCreditsList from '@/components/formation/FormationCreditsList';
import FormationDialog from '@/components/formation/FormationDialog';

const INAMI_TARGET_CP = 20;
const INAMI_TARGET_EA = 3;
const ACCREDITATION_PERIOD_YEARS = 3;

export default function FormationContinue() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingFormation, setEditingFormation] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: formations = [], isLoading } = useQuery({
    queryKey: ['formations'],
    queryFn: () => base44.entities.FormationCredit.list('-date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FormationCredit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['formations'] }),
  });

  const yearFormations = useMemo(() => {
    return formations.filter(f => {
      const year = new Date(f.date).getFullYear().toString();
      return year === selectedYear && f.status === 'completee';
    });
  }, [formations, selectedYear]);

  const totalCP = useMemo(() => yearFormations.reduce((s, f) => s + (f.credits_cp || 0), 0), [yearFormations]);
  const totalEA = useMemo(() => yearFormations.reduce((s, f) => s + (f.credits_ea || 0), 0), [yearFormations]);
  const totalHours = useMemo(() => yearFormations.reduce((s, f) => s + (f.duration_hours || 0), 0), [yearFormations]);

  const filteredFormations = useMemo(() => {
    return formations.filter(f => new Date(f.date).getFullYear().toString() === selectedYear);
  }, [formations, selectedYear]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1].map(String);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7" />
            Formation Continue
          </h1>
          <p className="text-muted-foreground">Suivi des crédits d'accréditation INAMI</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditingFormation(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Crédits CP</span>
              </div>
              <Badge variant={totalCP >= INAMI_TARGET_CP ? 'default' : 'secondary'}>
                {totalCP}/{INAMI_TARGET_CP}
              </Badge>
            </div>
            <Progress value={Math.min((totalCP / INAMI_TARGET_CP) * 100, 100)} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalCP >= INAMI_TARGET_CP ? '✓ Objectif atteint !' : `${INAMI_TARGET_CP - totalCP} CP restants pour ${selectedYear}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Crédits EA</span>
              </div>
              <Badge variant={totalEA >= INAMI_TARGET_EA ? 'default' : 'secondary'}>
                {totalEA}/{INAMI_TARGET_EA}
              </Badge>
            </div>
            <Progress value={Math.min((totalEA / INAMI_TARGET_EA) * 100, 100)} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalEA >= INAMI_TARGET_EA ? '✓ Objectif atteint !' : `${INAMI_TARGET_EA - totalEA} EA restants pour ${selectedYear}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="font-semibold">Heures de formation</span>
              </div>
              <Badge variant="outline">{totalHours}h</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {yearFormations.length} formation(s) complétée(s) en {selectedYear}
            </p>
            <p className="text-sm text-muted-foreground">
              {filteredFormations.filter(f => f.status === 'planifiee').length} planifiée(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formations list */}
      <FormationCreditsList
        formations={filteredFormations}
        onEdit={(f) => { setEditingFormation(f); setShowDialog(true); }}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <FormationDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditingFormation(null); }}
        formation={editingFormation}
        userEmail={user?.email}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['formations'] })}
      />
    </div>
  );
}