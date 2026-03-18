import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Plus, Play, LayoutGrid, List, Loader2, RefreshCw, Trash2, X, Award, Users, BarChart3
} from 'lucide-react';

import AnalysisCatalog, { ANALYSIS_CATALOG } from '../components/analyses/AnalysisCatalog';
import AnalysisResultCard from '../components/analyses/AnalysisResultCard';
import CreateAnalysisDialog from '../components/analyses/CreateAnalysisDialog';
import INAMIPrimeTracker from '../components/analyses/INAMIPrimeTracker';
import PopulationHealthManager from '../components/analyses/population/PopulationHealthManager';
import BenchmarkDashboard from '../components/benchmarking/BenchmarkDashboard';

const STORAGE_KEY = 'fluxmed_analyses_v2';

export default function Analyses() {
  // Persisted state
  const [selectedIds, setSelectedIds] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved).selectedIds || [];
    return [];
  });
  const [customAnalyses, setCustomAnalyses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved).custom || [];
    return [];
  });

  const [view, setView] = useState('population'); // 'population' | 'benchmark' | 'prime' | 'catalog' | 'results'
  const [searchFilter, setSearchFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedIds, custom: customAnalyses }));
  }, [selectedIds, customAnalyses]);

  // Data fetch
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analysesData'],
    queryFn: async () => {
      const [patients, vaccinations, allergies, medicalHistories, prescriptions, dmgs, invoices, sumehrs, chapterIVRequests, medexCertificates, labResults, consultations, vitalSigns] = await Promise.all([
        base44.entities.Patient.list('-created_date', 2000).catch(() => []),
        base44.entities.Vaccination.list('-vaccination_date', 5000).catch(() => []),
        base44.entities.Allergy.list('-created_date', 5000).catch(() => []),
        base44.entities.MedicalHistory.list('-created_date', 5000).catch(() => []),
        base44.entities.Prescription.list('-date_prescription', 2000).catch(() => []),
        base44.entities.DMG.list('-created_date', 5000).catch(() => []),
        base44.entities.Invoice.list('-invoice_date', 5000).catch(() => []),
        base44.entities.Sumehr.list('-created_date', 5000).catch(() => []),
        base44.entities.ChapterIVRequest.list('-created_date', 5000).catch(() => []),
        base44.entities.MedexCertificate.list('-created_date', 5000).catch(() => []),
        base44.entities.LabResult.list('-result_date', 5000).catch(() => []),
        base44.entities.Consultation.list('-date_consultation', 5000).catch(() => []),
        base44.entities.VitalSigns.list('-created_date', 5000).catch(() => []),
      ]);
      return { patients, vaccinations, allergies, medicalHistories, prescriptions, dmgs, invoices, sumehrs, chapterIVRequests, medexCertificates, labResults, consultations, vitalSigns };
    }
  });

  const toggleAnalysis = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateCustom = (analysis) => {
    setCustomAnalyses(prev => [...prev, analysis]);
    setSelectedIds(prev => [...prev, analysis.id]);
  };

  const removeAnalysis = (id) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
    setCustomAnalyses(prev => prev.filter(a => a.id !== id));
  };

  // Build the active analyses list
  const activeAnalyses = selectedIds.map(id => {
    const predefined = ANALYSIS_CATALOG.find(a => a.id === id);
    if (predefined) return predefined;
    const custom = customAnalyses.find(a => a.id === id);
    if (custom) return { ...custom, icon: 'search', color: 'bg-violet-600' };
    return null;
  }).filter(Boolean);

  const hasResults = activeAnalyses.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analyses</h1>
          <p className="text-muted-foreground">
            Sélectionnez des analyses prédéfinies ou créez les vôtres
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle analyse
          </Button>
        </div>
      </div>

      {/* View toggle + search */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'population' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            onClick={() => setView('population')}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Population
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'benchmark' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            onClick={() => setView('benchmark')}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            Benchmarking
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'prime' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            onClick={() => setView('prime')}
          >
            <Award className="w-4 h-4 inline mr-1.5" />
            Prime INAMI
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'catalog' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            onClick={() => setView('catalog')}
          >
            <LayoutGrid className="w-4 h-4 inline mr-1.5" />
            Catalogue
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'results' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            onClick={() => setView('results')}
          >
            <List className="w-4 h-4 inline mr-1.5" />
            Résultats
            {hasResults && (
              <Badge variant="secondary" className="ml-2 text-xs">{activeAnalyses.length}</Badge>
            )}
          </button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une analyse..."
            className="pl-9"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />
        </div>
        {hasResults && view === 'catalog' && (
          <Button variant="default" size="sm" onClick={() => setView('results')}>
            <Play className="w-4 h-4 mr-1" />
            Voir {activeAnalyses.length} résultat{activeAnalyses.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Custom analyses badges */}
      {customAnalyses.length > 0 && view === 'catalog' && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vos analyses personnalisées</p>
          <div className="flex flex-wrap gap-2">
            {customAnalyses.map(a => (
              <Badge
                key={a.id}
                variant={selectedIds.includes(a.id) ? 'default' : 'outline'}
                className="cursor-pointer gap-1 pr-1"
                onClick={() => toggleAnalysis(a.id)}
              >
                {a.name}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeAnalysis(a.id); }}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Population Health Management view */}
      {view === 'population' && (
        <PopulationHealthManager data={data || {}} isLoading={isLoading} />
      )}

      {/* Benchmarking view */}
      {view === 'benchmark' && (
        <BenchmarkDashboard data={data || {}} isLoading={isLoading} />
      )}

      {/* Prime INAMI view */}
      {view === 'prime' && (
        isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Vérification des critères INAMI...</span>
          </div>
        ) : (
          <INAMIPrimeTracker data={data || {}} />
        )
      )}

      {/* Catalog view */}
      {view === 'catalog' && (
        <AnalysisCatalog
          selectedIds={selectedIds}
          onToggle={toggleAnalysis}
          searchFilter={searchFilter}
        />
      )}

      {/* Results view */}
      {view === 'results' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Analyse de vos données en cours...</span>
            </div>
          ) : !hasResults ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucune analyse sélectionnée</p>
                <p className="text-sm text-muted-foreground mt-1">Allez dans le catalogue pour choisir des analyses</p>
                <Button variant="outline" className="mt-4" onClick={() => setView('catalog')}>
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Ouvrir le catalogue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAnalyses
                .filter(a => !searchFilter || a.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(analysis => (
                  <AnalysisResultCard
                    key={analysis.id}
                    analysis={analysis}
                    data={data}
                    onRemove={removeAnalysis}
                  />
                ))}
            </div>
          )}
        </>
      )}

      {/* Create dialog */}
      <CreateAnalysisDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSave={handleCreateCustom}
      />
    </div>
  );
}