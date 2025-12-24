import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter, Calendar, User, Hash } from 'lucide-react';

export default function PatientSearchBar({ patients, onFilteredPatients }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) {
      onFilteredPatients(patients);
      return patients;
    }

    const term = searchTerm.toLowerCase().trim();
    
    const results = patients.filter(patient => {
      const officialName = patient.name?.find(n => n.use === 'official') || {};
      const prenom = (officialName.given || []).join(' ').toLowerCase();
      const nom = (officialName.family || '').toLowerCase();
      const fullName = `${prenom} ${nom}`;
      const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
      const birthDate = patient.birthDate || '';
      const patientId = patient.id || '';

      switch (searchType) {
        case 'nom':
          return nom.includes(term);
        case 'prenom':
          return prenom.includes(term);
        case 'niss':
          return niss.includes(term);
        case 'birthdate':
          return birthDate.includes(term);
        case 'id':
          return patientId.toLowerCase().includes(term);
        case 'all':
        default:
          return (
            fullName.includes(term) ||
            nom.includes(term) ||
            prenom.includes(term) ||
            niss.includes(term) ||
            birthDate.includes(term) ||
            patientId.toLowerCase().includes(term)
          );
      }
    });

    onFilteredPatients(results);
    return results;
  }, [searchTerm, searchType, patients, onFilteredPatients]);

  const clearSearch = () => {
    setSearchTerm('');
    setSearchType('all');
    onFilteredPatients(patients);
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'nom': return 'Rechercher par nom de famille...';
      case 'prenom': return 'Rechercher par prénom...';
      case 'niss': return 'Rechercher par NISS (ex: 85.01.15-...)';
      case 'birthdate': return 'Rechercher par date (ex: 1985-01-15)';
      case 'id': return 'Rechercher par ID patient...';
      default: return 'Rechercher un patient (nom, prénom, NISS, date de naissance, ID)...';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={getPlaceholder()}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-11"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
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
          className="h-11 w-11"
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
          <span className="text-sm text-slate-600 self-center mr-2">Filtrer par:</span>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  Tous les champs
                </div>
              </SelectItem>
              <SelectItem value="nom">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Nom de famille
                </div>
              </SelectItem>
              <SelectItem value="prenom">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Prénom
                </div>
              </SelectItem>
              <SelectItem value="niss">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  NISS
                </div>
              </SelectItem>
              <SelectItem value="birthdate">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Date de naissance
                </div>
              </SelectItem>
              <SelectItem value="id">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  ID Patient
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {searchTerm && (
            <Badge variant="secondary" className="self-center">
              {filteredPatients.length} résultat{filteredPatients.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}