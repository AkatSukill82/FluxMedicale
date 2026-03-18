import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Search, Route, Users, BookOpen, Loader2, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';

import PathwayCard from '../components/pathways/PathwayCard';
import PathwayDetailView from '../components/pathways/PathwayDetailView';
import EnrollPatientDialog from '../components/pathways/EnrollPatientDialog';
import EnrollmentsList from '../components/pathways/EnrollmentsList';
import { PATHWAY_TEMPLATES, CATEGORY_LABELS } from '../components/pathways/PathwayTemplates';

export default function ParcoursPatient() {
  const [tab, setTab] = useState('pathways');
  const [search, setSearch] = useState('');
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollPathway, setEnrollPathway] = useState(null);
  const queryClient = useQueryClient();

  const { data: pathways = [], isLoading: loadingPathways } = useQuery({
    queryKey: ['pathways'],
    queryFn: () => base44.entities.CarePathway.list('-created_date', 200),
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.PatientPathwayEnrollment.list('-created_date', 500),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients_pathways'],
    queryFn: () => base44.entities.Patient.list('-created_date', 2000),
  });

  // Seed templates if none exist
  const seedMutation = useMutation({
    mutationFn: async () => {
      const toCreate = PATHWAY_TEMPLATES.filter(t => !pathways.some(p => p.name === t.name));
      if (toCreate.length > 0) {
        await base44.entities.CarePathway.bulkCreate(toCreate);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pathways'] }),
  });

  // Count enrollments per pathway
  const enrollmentCounts = useMemo(() => {
    const counts = {};
    enrollments.forEach(e => { counts[e.pathway_id] = (counts[e.pathway_id] || 0) + 1; });
    return counts;
  }, [enrollments]);

  // Filtered pathways
  const filteredPathways = useMemo(() => {
    if (!search) return pathways;
    const term = search.toLowerCase();
    return pathways.filter(p => p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term));
  }, [pathways, search]);

  // Stats
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = activeEnrollments.reduce((acc, e) => {
    return acc + (e.step_statuses || []).filter(s => s.status === 'pending' && s.due_date && s.due_date < today).length;
  }, 0);

  const handleView = (pathway) => setSelectedPathway(pathway);
  const handleEnroll = (pathway) => {
    setEnrollPathway(pathway);
    setShowEnrollDialog(true);
  };

  if (selectedPathway) {
    return (
      <div className="space-y-6">
        <PathwayDetailView pathway={selectedPathway} onBack={() => setSelectedPathway(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Route className="w-8 h-8" />
            Parcours Patient
          </h1>
          <p className="text-muted-foreground">
            Workflows de suivi automatisés — ne manquez plus aucune étape du parcours de soins
          </p>
        </div>
        <div className="flex gap-2">
          {pathways.length === 0 && (
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BookOpen className="w-4 h-4 mr-1" />}
              Charger les modèles
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Route className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{pathways.length}</p>
            <p className="text-xs text-muted-foreground">Parcours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">{activeEnrollments.length}</p>
            <p className="text-xs text-muted-foreground">Patients inscrits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{enrollments.filter(e => e.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground">Terminés</p>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? 'border-red-200 bg-red-50/30' : ''}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${overdueCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : ''}`}>{overdueCount}</p>
            <p className="text-xs text-muted-foreground">Étapes en retard</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pathways" className="gap-1.5">
              <Route className="w-3.5 h-3.5" />
              Parcours ({pathways.length})
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Inscriptions ({activeEnrollments.length})
              {overdueCount > 0 && <Badge className="bg-red-500 text-white text-[9px] ml-1">{overdueCount}</Badge>}
            </TabsTrigger>
          </TabsList>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="pathways" className="mt-4">
          {loadingPathways ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filteredPathways.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucun parcours configuré</p>
                <p className="text-sm mt-1">Cliquez "Charger les modèles" pour démarrer avec les parcours prédéfinis belges</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPathways.map(p => (
                <PathwayCard
                  key={p.id}
                  pathway={p}
                  enrollmentCount={enrollmentCounts[p.id] || 0}
                  onView={handleView}
                  onActivate={handleEnroll}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          {loadingEnrollments ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <EnrollmentsList enrollments={activeEnrollments} patients={patients} />
          )}
        </TabsContent>
      </Tabs>

      {/* Enroll dialog */}
      <EnrollPatientDialog
        isOpen={showEnrollDialog}
        onClose={() => { setShowEnrollDialog(false); setEnrollPathway(null); }}
        pathway={enrollPathway}
      />
    </div>
  );
}