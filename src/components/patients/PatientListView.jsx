import React, { useState, useMemo, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  User,
  Users,
  ChevronRight,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { differenceInYears, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

export default function PatientListView() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    gender: 'all',
    ageMin: '',
    ageMax: '',
    registrationPeriod: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all patients
  const { data: allPatients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500)
  });

  // Fetch consultations for last consultation info
  const { data: consultations = [] } = useQuery({
    queryKey: ['allConsultations'],
    queryFn: () => base44.entities.Consultation.list('-date_consultation', 1000)
  });

  // Fetch appointments for next RDV
  const { data: appointments = [] } = useQuery({
    queryKey: ['allAppointments'],
    queryFn: () => base44.entities.RendezVous.filter({ statut: 'Planifié' }, 'date', 500)
  });

  // Build maps for quick lookup
  const lastConsultationMap = useMemo(() => {
    const map = {};
    consultations.forEach(c => {
      if (!map[c.patient_id] || new Date(c.date_consultation) > new Date(map[c.patient_id].date_consultation)) {
        map[c.patient_id] = c;
      }
    });
    return map;
  }, [consultations]);

  const nextAppointmentMap = useMemo(() => {
    const map = {};
    const today = new Date();
    appointments.forEach(a => {
      const aptDate = new Date(a.date);
      if (aptDate >= today) {
        if (!map[a.patient_id] || aptDate < new Date(map[a.patient_id].date)) {
          map[a.patient_id] = a;
        }
      }
    });
    return map;
  }, [appointments]);

  // Helper functions
  const getPatientName = (patient) => {
    const name = patient?.name?.find(n => n.use === 'official') || patient?.name?.[0] || {};
    return `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
  };

  const getPatientAge = (patient) => {
    if (!patient?.birthDate) return null;
    const birthDate = new Date(patient.birthDate);
    if (isNaN(birthDate.getTime())) return null;
    return differenceInYears(new Date(), birthDate);
  };

  const getPatientInitials = (patient) => {
    const name = patient?.name?.find(n => n.use === 'official') || patient?.name?.[0] || {};
    const first = (name.given?.[0] || '')[0] || '';
    const last = (name.family || '')[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  // Filter patients
  const filteredPatients = useMemo(() => {
    return allPatients.filter(patient => {
      // Search filter
      if (searchQuery) {
        const name = getPatientName(patient).toLowerCase();
        const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
        const phone = patient.telecom?.find(t => t.system === 'phone')?.value || '';
        const query = searchQuery.toLowerCase();
        
        if (!name.includes(query) && !niss.includes(query) && !phone.includes(query)) {
          return false;
        }
      }

      // Gender filter
      if (filters.gender !== 'all') {
        if (patient.gender !== filters.gender) return false;
      }

      // Age filter
      const age = getPatientAge(patient);
      if (filters.ageMin && age !== null && age < parseInt(filters.ageMin)) return false;
      if (filters.ageMax && age !== null && age > parseInt(filters.ageMax)) return false;

      // Registration period filter
      if (filters.registrationPeriod !== 'all' && patient.created_date) {
        const createdDate = new Date(patient.created_date);
        const now = new Date();
        const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        
        if (filters.registrationPeriod === 'week' && daysDiff > 7) return false;
        if (filters.registrationPeriod === 'month' && daysDiff > 30) return false;
        if (filters.registrationPeriod === 'quarter' && daysDiff > 90) return false;
        if (filters.registrationPeriod === 'year' && daysDiff > 365) return false;
      }

      return true;
    });
  }, [allPatients, searchQuery, filters]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return filteredPatients.slice(0, 5);
  }, [searchQuery, filteredPatients]);

  const activeFiltersCount = [
    filters.gender !== 'all',
    filters.ageMin,
    filters.ageMax,
    filters.registrationPeriod !== 'all'
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      gender: 'all',
      ageMin: '',
      ageMax: '',
      registrationPeriod: 'all'
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-slate-500 mt-1">
            {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''} 
            {filteredPatients.length !== allPatients.length && ` sur ${allPatients.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {allPatients.length} total
          </Badge>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex gap-3">
        {/* Search with Autocomplete */}
        <div className="flex-1 relative" ref={searchInputRef}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, NISS ou téléphone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-12 pr-10 h-12 text-base bg-white border-slate-200 rounded-xl shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              {suggestions.map(patient => {
                const age = getPatientAge(patient);
                return (
                  <button
                    key={patient.id}
                    onClick={() => {
                      navigate(createPageUrl(`Patients?patient=${patient.id}`));
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium text-sm">
                        {getPatientInitials(patient)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{getPatientName(patient)}</p>
                      <p className="text-sm text-slate-500">
                        {age ? `${age} ans` : ''} 
                        {patient.gender && ` • ${patient.gender === 'male' ? 'H' : 'F'}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters Button */}
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={`h-12 gap-2 rounded-xl ${activeFiltersCount > 0 ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="bg-blue-600 text-white ml-1">{activeFiltersCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtres avancés</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Réinitialiser
                  </Button>
                )}
              </div>

              {/* Gender Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Sexe</label>
                <Select value={filters.gender} onValueChange={(v) => setFilters({ ...filters, gender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="male">Homme</SelectItem>
                    <SelectItem value="female">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Tranche d'âge</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.ageMin}
                    onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })}
                    className="w-20"
                  />
                  <span className="self-center text-slate-400">à</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.ageMax}
                    onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })}
                    className="w-20"
                  />
                  <span className="self-center text-slate-500 text-sm">ans</span>
                </div>
              </div>

              {/* Registration Period Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Date d'inscription</label>
                <Select value={filters.registrationPeriod} onValueChange={(v) => setFilters({ ...filters, registrationPeriod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Filtres actifs:</span>
          {filters.gender !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.gender === 'male' ? 'Homme' : 'Femme'}
              <button onClick={() => setFilters({ ...filters, gender: 'all' })}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(filters.ageMin || filters.ageMax) && (
            <Badge variant="secondary" className="gap-1">
              {filters.ageMin || '0'} - {filters.ageMax || '∞'} ans
              <button onClick={() => setFilters({ ...filters, ageMin: '', ageMax: '' })}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.registrationPeriod !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {{
                week: 'Cette semaine',
                month: 'Ce mois',
                quarter: 'Ce trimestre',
                year: 'Cette année'
              }[filters.registrationPeriod]}
              <button onClick={() => setFilters({ ...filters, registrationPeriod: 'all' })}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Patient List */}
      {isLoadingPatients ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">Aucun patient trouvé</p>
            <p className="text-sm text-slate-500 mt-1">Modifiez vos critères de recherche</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPatients.map(patient => {
            const age = getPatientAge(patient);
            const lastConsult = lastConsultationMap[patient.id];
            const nextApt = nextAppointmentMap[patient.id];
            
            return (
              <Card
                key={patient.id}
                className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                onClick={() => navigate(createPageUrl(`Patients?patient=${patient.id}`))}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      patient.gender === 'male' ? 'bg-blue-100' : patient.gender === 'female' ? 'bg-pink-100' : 'bg-slate-100'
                    }`}>
                      <span className={`font-semibold ${
                        patient.gender === 'male' ? 'text-blue-600' : patient.gender === 'female' ? 'text-pink-600' : 'text-slate-600'
                      }`}>
                        {getPatientInitials(patient)}
                      </span>
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {getPatientName(patient)}
                        </h3>
                        {patient.allergies && (
                          <Badge variant="destructive" className="h-5 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Allergies
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        {age !== null && <span>{age} ans</span>}
                        {patient.gender && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {patient.gender === 'male' ? 'Homme' : 'Femme'}
                          </span>
                        )}
                        {patient.birthDate && (
                          <span>Né(e) le {format(new Date(patient.birthDate), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Info: Last Consultation */}
                    <div className="hidden md:block text-right min-w-[140px]">
                      {lastConsult ? (
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Dernière consultation</p>
                          <p className="text-sm font-medium text-slate-700">
                            {format(new Date(lastConsult.date_consultation), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-slate-400">Aucune consultation</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Info: Next Appointment */}
                    <div className="hidden lg:block text-right min-w-[140px]">
                      {nextApt ? (
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Prochain RDV</p>
                          <p className="text-sm font-medium text-green-600">
                            {format(new Date(nextApt.date), 'dd MMM', { locale: fr })} à {nextApt.heure_debut}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-slate-400">Pas de RDV prévu</p>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
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