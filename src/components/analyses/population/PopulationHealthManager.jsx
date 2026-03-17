import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users, Save, Download, Info, Loader2, Filter
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

import PopulationFilterBar from './PopulationFilterBar';
import PopulationStats from './PopulationStats';
import PopulationPatientList from './PopulationPatientList';
import SavedCohorts from './SavedCohorts';
import usePopulationFilter from './usePopulationFilter';

const COHORTS_KEY = 'fluxmed_population_cohorts';

export default function PopulationHealthManager({ data, isLoading }) {
  const [filters, setFilters] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [cohortName, setCohortName] = useState('');
  const [savedCohorts, setSavedCohorts] = useState(() => {
    const saved = localStorage.getItem(COHORTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(COHORTS_KEY, JSON.stringify(savedCohorts));
  }, [savedCohorts]);

  const { results, stats } = usePopulationFilter(filters, data);

  const handleSave = () => {
    if (!cohortName.trim()) return;
    const newCohort = {
      id: Date.now(),
      name: cohortName.trim(),
      filters: filters.map(({ id, ...rest }) => rest),
      savedAt: new Date().toISOString(),
    };
    setSavedCohorts(prev => [newCohort, ...prev]);
    setCohortName('');
    setShowSaveDialog(false);
  };

  const handleLoadCohort = (cohort) => {
    setFilters(cohort.filters.map((f, i) => ({ ...f, id: Date.now() + i })));
  };

  const handleDeleteCohort = (id) => {
    setSavedCohorts(prev => prev.filter(c => c.id !== id));
  };

  const handleExportCSV = () => {
    if (!results.length) return;
    const getPatientName = (p) => {
      const n = (p.name || [])[0];
      if (!n) return '';
      return `${n.family || ''} ${(n.given || []).join(' ')}`.trim();
    };
    const getAge = (bd) => {
      if (!bd) return '';
      return Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    };

    const headers = ['Nom', 'NISS', 'Âge', 'Sexe', 'Assurance', 'Statut assurance'];
    const rows = results.map(p => [
      getPatientName(p),
      ((p.identifier || [])[0]?.value) || '',
      getAge(p.birthDate),
      p.gender || '',
      p.insurance_regime || '',
      p.insurance_status || '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohorte_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Chargement des données de population...</span>
      </div>
    );
  }

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
              Combinez des filtres pour extraire des cohortes de patients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filters.length > 0 && results.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Sauvegarder
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
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
              <Badge variant="secondary" className="text-xs">{filters.length} filtre{filters.length > 1 ? 's' : ''} actif{filters.length > 1 ? 's' : ''}</Badge>
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
            Ajoutez des filtres pour extraire une cohorte de patients. Vous pouvez combiner plusieurs critères : âge, diagnostic, traitement, résultats labo, vaccination, allergie, assurance, DMG et dernière consultation.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {filters.length > 0 && (
        <>
          <PopulationStats stats={stats} />
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