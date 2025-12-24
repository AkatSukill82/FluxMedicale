import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Pill, Plus, AlertCircle, ArrowRight, Filter, X, Sparkles, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Synonymes et alternatives DCI courantes
const DCI_SYNONYMS = {
  'paracetamol': ['acetaminophen', 'doliprane', 'dafalgan', 'efferalgan'],
  'ibuprofen': ['ibuprofene', 'advil', 'nurofen', 'brufen'],
  'amoxicillin': ['amoxicilline', 'clamoxyl', 'flemoxin'],
  'omeprazole': ['mopral', 'losec'],
  'metformin': ['metformine', 'glucophage', 'stagid'],
  'atorvastatin': ['atorvastatine', 'tahor', 'lipitor'],
  'amlodipine': ['amlor', 'norvasc'],
  'losartan': ['cozaar'],
  'simvastatin': ['simvastatine', 'zocor'],
  'pantoprazole': ['inipomp', 'eupantol'],
  'escitalopram': ['seroplex', 'lexapro'],
  'sertraline': ['zoloft'],
  'salbutamol': ['ventoline', 'albuterol'],
  'prednisolone': ['solupred'],
  'azithromycin': ['azithromycine', 'zithromax'],
  'ciprofloxacin': ['ciprofloxacine', 'ciflox'],
  'furosemide': ['lasilix'],
  'bisoprolol': ['cardensiel', 'detensiel'],
  'ramipril': ['triatec'],
  'levothyroxine': ['levothyrox', 'euthyrox', 'l-thyroxine'],
};

// Récupérer tous les synonymes pour un terme
const getSynonyms = (term) => {
  const normalizedTerm = term.toLowerCase().trim();
  const synonyms = [normalizedTerm];
  
  for (const [key, values] of Object.entries(DCI_SYNONYMS)) {
    if (key.includes(normalizedTerm) || values.some(v => v.includes(normalizedTerm))) {
      synonyms.push(key, ...values);
    }
  }
  
  return [...new Set(synonyms)];
};

export default function MedicationSearch({ onSelect, selectedMedications = [], showPrice = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterForm, setFilterForm] = useState('all');
  const [filterRoute, setFilterRoute] = useState('all');
  const [recentSearches, setRecentSearches] = useState([]);

  // Charger les recherches récentes
  useEffect(() => {
    const saved = localStorage.getItem('recent_drug_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  const { data: drugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 2000)
  });

  // Extraire les formes et voies uniques
  const { uniqueForms, uniqueRoutes } = useMemo(() => {
    const forms = new Set();
    const routes = new Set();
    drugs.forEach(drug => {
      if (drug.form) forms.add(drug.form);
      if (drug.route) routes.add(drug.route);
    });
    return {
      uniqueForms: Array.from(forms).sort(),
      uniqueRoutes: Array.from(routes).sort()
    };
  }, [drugs]);

  // Suggestions automatiques basées sur les médicaments fréquents
  const suggestions = useMemo(() => {
    if (searchTerm.length > 0) return [];
    return drugs
      .slice(0, 6)
      .map(d => d.product_name);
  }, [drugs, searchTerm]);

  // Recherche avancée avec synonymes et scoring
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const synonyms = getSynonyms(searchTerm);
    const term = searchTerm.toLowerCase();
    
    const scored = drugs
      .map(drug => {
        let score = 0;
        const productName = drug.product_name?.toLowerCase() || '';
        const substanceName = drug.substance_name?.toLowerCase() || '';
        const atcCode = drug.atc_code?.toLowerCase() || '';
        const cnk = drug.cnk?.toLowerCase() || '';
        
        // Score exact match (highest priority)
        if (productName === term) score += 100;
        if (substanceName === term) score += 90;
        
        // Score starts with (high priority)
        if (productName.startsWith(term)) score += 50;
        if (substanceName.startsWith(term)) score += 45;
        
        // Score contains (medium priority)
        if (productName.includes(term)) score += 30;
        if (substanceName.includes(term)) score += 25;
        if (atcCode.includes(term)) score += 20;
        if (cnk.includes(term)) score += 15;
        
        // Score synonym matches
        for (const synonym of synonyms) {
          if (synonym !== term) {
            if (productName.includes(synonym)) score += 20;
            if (substanceName.includes(synonym)) score += 18;
          }
        }
        
        // Apply filters
        if (filterForm !== 'all' && drug.form !== filterForm) return null;
        if (filterRoute !== 'all' && drug.route !== filterRoute) return null;
        
        return score > 0 ? { ...drug, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
    
    return scored;
  }, [searchTerm, drugs, filterForm, filterRoute]);

  useEffect(() => {
    setShowResults(searchTerm.length >= 2 || (searchTerm.length === 0 && suggestions.length > 0));
  }, [searchTerm, searchResults.length, suggestions.length]);

  const handleSelect = (drug) => {
    onSelect(drug);
    
    // Sauvegarder dans les recherches récentes
    const newRecent = [drug.product_name, ...recentSearches.filter(r => r !== drug.product_name)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recent_drug_searches', JSON.stringify(newRecent));
    
    setSearchTerm('');
    setShowResults(false);
  };

  const isSelected = (drugId) => {
    return selectedMedications.some(m => m.id === drugId || m.drug_id === drugId);
  };

  const clearFilters = () => {
    setFilterForm('all');
    setFilterRoute('all');
  };

  const hasActiveFilters = filterForm !== 'all' || filterRoute !== 'all';

  // Alerte si base vide
  if (drugs.length === 0) {
    return (
      <Card className="p-6 bg-orange-50 border-2 border-orange-300">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900 mb-2">Base de données vide</p>
            <p className="text-sm text-orange-700 mb-3">
              La base de données des médicaments est vide. Vous devez d'abord importer des médicaments de test ou le référentiel SAM/APB complet.
            </p>
            <Button
              onClick={() => window.location.href = createPageUrl('ReferentialImport')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Aller à la page d'import
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barre de recherche avec filtres */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher (nom, DCI, synonyme, ATC, CNK)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            onFocus={() => setShowResults(true)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={hasActiveFilters ? "bg-blue-600 text-white" : ""}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <Card className="p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Filtres avancés</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="w-3 h-3 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Forme galénique</label>
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes les formes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les formes</SelectItem>
                  {uniqueForms.map(form => (
                    <SelectItem key={form} value={form}>{form}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Voie d'administration</label>
              <Select value={filterRoute} onValueChange={setFilterRoute}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes les voies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les voies</SelectItem>
                  {uniqueRoutes.map(route => (
                    <SelectItem key={route} value={route}>{route}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Résultats de recherche */}
      {showResults && (
        <Card className="shadow-xl max-h-[400px] overflow-y-auto border-2 border-blue-100">
          <CardContent className="p-2">
            {/* Suggestions si pas de recherche */}
            {searchTerm.length === 0 && (
              <>
                {recentSearches.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      Recherches récentes
                    </div>
                    <div className="flex flex-wrap gap-2 px-3">
                      {recentSearches.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSearchTerm(term)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Sparkles className="w-3 h-3" />
                    Suggestions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((name, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSearchTerm(name)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Résultats */}
            {searchTerm.length >= 2 && searchResults.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs text-slate-500 border-b">
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                  {hasActiveFilters && <span className="text-blue-600"> (filtré)</span>}
                </div>
                {searchResults.map(drug => {
                  const selected = isSelected(drug.id);
                  return (
                    <button
                      key={drug.id}
                      onClick={() => handleSelect(drug)}
                      disabled={selected}
                      className={`w-full p-3 text-left rounded-lg transition-colors ${
                        selected 
                          ? 'bg-slate-100 opacity-50 cursor-not-allowed' 
                          : 'hover:bg-blue-50 border border-transparent hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Pill className="w-4 h-4 text-blue-600" />
                            <p className="font-semibold text-sm">{drug.product_name}</p>
                            {selected && <Badge variant="outline" className="text-xs">Déjà ajouté</Badge>}
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {drug.substance_name && (
                              <p className="flex items-center gap-1">
                                <span className="text-slate-400">DCI:</span> 
                                <span className="font-medium">{drug.substance_name}</span>
                              </p>
                            )}
                            {drug.strength && drug.unit && (
                              <p>
                                <span className="text-slate-400">Dosage:</span> {drug.strength} {drug.unit}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {drug.form && (
                                <Badge variant="secondary" className="text-xs">
                                  {drug.form}
                                </Badge>
                              )}
                              {drug.route && (
                                <Badge variant="outline" className="text-xs">
                                  {drug.route}
                                </Badge>
                              )}
                              {drug.cnk && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  CNK: {drug.cnk}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {!selected && (
                          <Plus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Pas de résultats */}
            {searchTerm.length >= 2 && searchResults.length === 0 && (
              <div className="p-6 text-center">
                <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-600 mb-2">Aucun médicament trouvé pour "{searchTerm}"</p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                    Essayer sans filtres
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}