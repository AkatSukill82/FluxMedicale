import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users, Save, Download, Info, Loader2, Filter, Printer, GitCompare, Activity, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

import PopulationFilterBar from './PopulationFilterBar';
import PopulationStats from './PopulationStats';
import PopulationPatientList from './PopulationPatientList';
import SavedCohorts from './SavedCohorts';
import CohortMedicalProfile from './CohortMedicalProfile';
import CohortActions from './CohortActions';
import CohortComparison from './CohortComparison';
import usePopulationFilter from './usePopulationFilter';

const COHORTS_KEY = 'fluxmed_population_cohorts';

export default function PopulationHealthManager({ data, isLoading }) {
  const [filters, setFilters] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [cohortName, setCohortName] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [showMedProfile, setShowMedProfile] = useState(true);
  const [savedCohorts, setSavedCohorts] = useState(() => {
    const saved = localStorage.getItem(COHORTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(COHORTS_KEY, JSON.stringify(savedCohorts));
  }, [savedCohorts]);

  const { results, stats, medicalStats } = usePopulationFilter(filters, data);

  // Baseline stats (whole population, no filters)
  const baselineStats = useMemo(() => {
    const patients = data?.patients || [];
    if (!patients.length) return null;
    const s = { total: patients.length, matched: patients.length, percentage: 100, genderBreakdown: { male: 0, female: 0, other: 0 }, ageBreakdown: { '0-17': 0, '18-44': 0, '45-64': 0, '65-74': 0, '75+': 0 } };
    patients.forEach(p => {
      if (p.gender === 'male') s.genderBreakdown.male++;
      else if (p.gender === 'female') s.genderBreakdown.female++;
      else s.genderBreakdown.other++;
      if (!p.birthDate) return;
      const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age <= 17) s.ageBreakdown['0-17']++;
      else if (age <= 44) s.ageBreakdown['18-44']++;
      else if (age <= 64) s.ageBreakdown['45-64']++;
      else if (age <= 74) s.ageBreakdown['65-74']++;
      else s.ageBreakdown['75+']++;
    });
    return s;
  }, [data?.patients]);

  const handleSave = () => {
    if (!cohortName.trim()) return;
    setSavedCohorts(prev => [{
      id: Date.now(),
      name: cohortName.trim(),
      filters: filters.map(({ id, ...rest }) => rest),
      savedAt: new Date().toISOString(),
      resultCount: results.length,
    }, ...prev]);
    setCohortName('');
    setShowSaveDialog(false);
  };

  const handleLoadCohort = (cohort) => {
    setFilters(cohort.filters.map((f, i) => ({ ...f, id: Date.now() + i })));
  };

  const handleDeleteCohort = (id) => {
    setSavedCohorts(prev => prev.filter(c => c.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Chargement des données de population...</span>
      </div>
    );
  }

  const hasResults = filters.length > 0 && results.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Analyse de Population</h2>
            <p className="text-xs text-muted-foreground">
              {(data?.patients || []).length} patients · {filters.length} filtres · {results.length} résultats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasResults && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
                <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                {showComparison ? 'Masquer' : 'Comparer'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Sauvegarder
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Saved cohorts */}
      <SavedCohorts cohorts={savedCohorts} onLoad={handleLoadCohort} onDelete={handleDeleteCohort} />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres de la cohorte
            {filters.length > 0 && (
              <Badge variant="secondary" className="text-xs">{filters.length} filtre{filters.length > 1 ? 's' : ''}</Badge>
            )}
            {hasResults && (
              <Badge className="text-xs bg-blue-600">{results.length} patients</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PopulationFilterBar filters={filters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>

      {/* Info when no filters */}
      {filters.length === 0 && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Utilisez les <strong>requêtes prédéfinies</strong> ci-dessus pour démarrer rapidement, ou ajoutez des filtres manuellement. Combinez jusqu'à 22 types de critères : démographie, diagnostics, traitements, résultats labo, vaccinations, allergies, signes vitaux, IMC, assurance, DMG, SUMEHR, consultations, et bien plus.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {filters.length > 0 && (
        <>
          {/* Demographics */}
          <PopulationStats stats={stats} medicalStats={medicalStats} />

          {/* Comparison with total population */}
          {showComparison && baselineStats && (
            <CohortComparison cohortStats={stats} totalPopulationStats={baselineStats} />
          )}

          {/* Medical profile of the cohort */}
          {results.length > 0 && (
            <div>
              <button
                className="flex items-center gap-2 text-sm font-semibold mb-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowMedProfile(!showMedProfile)}
              >
                {showMedProfile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <Activity className="w-4 h-4" />
                Profil médical de la cohorte
              </button>
              {showMedProfile && (
                <CohortMedicalProfile medicalStats={medicalStats} totalPatients={results.length} />
              )}
            </div>
          )}

          {/* Bulk actions */}
          {results.length > 0 && (
            <CohortActions patients={results} filters={filters} />
          )}

          {/* Patient list */}
          <PopulationPatientList patients={results} />
        </>
      )}

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sauvegarder la cohorte</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nom de la cohorte (ex: Diabétiques >65 ans sous metformine)"
              value={cohortName}
              onChange={e => setCohortName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {f.type}{f.searchTerm ? `: ${f.searchTerm}` : ''}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{results.length} patients dans cette cohorte</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!cohortName.trim()}>
              <Save className="w-4 h-4 mr-1.5" />
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}