import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, RotateCcw } from 'lucide-react';

const FILTER_TYPES = [
  { value: 'age', label: 'Tranche d\'âge' },
  { value: 'gender', label: 'Sexe' },
  { value: 'diagnosis', label: 'Diagnostic / Pathologie' },
  { value: 'medication', label: 'Médicament / Traitement' },
  { value: 'allergy', label: 'Allergie' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'lab', label: 'Résultat labo' },
  { value: 'insurance', label: 'Régime d\'assurance' },
  { value: 'dmg', label: 'Statut DMG' },
  { value: 'consultation', label: 'Dernière consultation' },
];

export default function PopulationFilterBar({ filters, onFiltersChange }) {

  const addFilter = (type) => {
    const defaults = {
      age: { type: 'age', ageMin: '', ageMax: '' },
      gender: { type: 'gender', value: 'all' },
      diagnosis: { type: 'diagnosis', searchTerm: '', active: true },
      medication: { type: 'medication', searchTerm: '' },
      allergy: { type: 'allergy', searchTerm: '', active: true },
      vaccination: { type: 'vaccination', searchTerm: '', vaccinated: true },
      lab: { type: 'lab', searchTerm: '', abnormal: false },
      insurance: { type: 'insurance', regime: 'all', status: 'all' },
      dmg: { type: 'dmg', statut: 'ACTIF' },
      consultation: { type: 'consultation', period: '12' },
    };
    onFiltersChange([...filters, { ...defaults[type], id: Date.now() }]);
  };

  const updateFilter = (id, updates) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const usedTypes = filters.map(f => f.type);
  const availableTypes = FILTER_TYPES.filter(t => !usedTypes.includes(t.value) || ['diagnosis', 'medication', 'allergy', 'vaccination', 'lab'].includes(t.value));

  return (
    <div className="space-y-3">
      {/* Active filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <FilterChip key={filter.id} filter={filter} onUpdate={updateFilter} onRemove={removeFilter} />
        ))}
        {/* Add filter dropdown */}
        <Select onValueChange={addFilter}>
          <SelectTrigger className="w-auto h-8 text-xs gap-1 border-dashed">
            <Plus className="w-3 h-3" />
            <span>Ajouter un filtre</span>
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filters.length > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => onFiltersChange([])}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterChip({ filter, onUpdate, onRemove }) {
  const id = filter.id;

  const chipContent = () => {
    switch (filter.type) {
      case 'age':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Âge :</span>
            <Input className="w-14 h-6 text-xs px-1.5" type="number" placeholder="min" value={filter.ageMin} onChange={e => onUpdate(id, { ageMin: e.target.value })} />
            <span className="text-xs">–</span>
            <Input className="w-14 h-6 text-xs px-1.5" type="number" placeholder="max" value={filter.ageMax} onChange={e => onUpdate(id, { ageMax: e.target.value })} />
            <span className="text-xs">ans</span>
          </div>
        );
      case 'gender':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Sexe :</span>
            <Select value={filter.value} onValueChange={v => onUpdate(id, { value: v })}>
              <SelectTrigger className="w-24 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'diagnosis':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Diagnostic :</span>
            <Input className="w-32 h-6 text-xs px-1.5" placeholder="ex: diabète, HTA..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
            <Select value={filter.active ? 'active' : 'all'} onValueChange={v => onUpdate(id, { active: v === 'active' })}>
              <SelectTrigger className="w-20 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="all">Tout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'medication':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Médicament :</span>
            <Input className="w-36 h-6 text-xs px-1.5" placeholder="ex: metformine, Xarelto..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
          </div>
        );
      case 'allergy':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Allergie :</span>
            <Input className="w-32 h-6 text-xs px-1.5" placeholder="ex: pénicilline..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
          </div>
        );
      case 'vaccination':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Vaccin :</span>
            <Input className="w-28 h-6 text-xs px-1.5" placeholder="ex: grippe, COVID..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
            <Select value={filter.vaccinated ? 'yes' : 'no'} onValueChange={v => onUpdate(id, { vaccinated: v === 'yes' })}>
              <SelectTrigger className="w-24 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Vacciné</SelectItem>
                <SelectItem value="no">Non vacciné</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'lab':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Labo :</span>
            <Input className="w-28 h-6 text-xs px-1.5" placeholder="ex: HbA1c, eGFR..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
            <Select value={filter.abnormal ? 'abnormal' : 'all'} onValueChange={v => onUpdate(id, { abnormal: v === 'abnormal' })}>
              <SelectTrigger className="w-24 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="abnormal">Anormal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'insurance':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Assurance :</span>
            <Select value={filter.regime} onValueChange={v => onUpdate(id, { regime: v })}>
              <SelectTrigger className="w-28 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout régime</SelectItem>
                <SelectItem value="MUTUELLE_BE">Mutuelle BE</SelectItem>
                <SelectItem value="RCAM">RCAM</SelectItem>
                <SelectItem value="CAAMI">CAAMI</SelectItem>
                <SelectItem value="AUCUN">Aucun</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.status} onValueChange={v => onUpdate(id, { status: v })}>
              <SelectTrigger className="w-28 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout statut</SelectItem>
                <SelectItem value="EN_ORDRE">En ordre</SelectItem>
                <SelectItem value="PAS_EN_ORDRE">Pas en ordre</SelectItem>
                <SelectItem value="NON_VERIFIE">Non vérifié</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'dmg':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">DMG :</span>
            <Select value={filter.statut} onValueChange={v => onUpdate(id, { statut: v })}>
              <SelectTrigger className="w-28 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIF">Actif</SelectItem>
                <SelectItem value="EXPIRE">Expiré</SelectItem>
                <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                <SelectItem value="AUCUN">Aucun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'consultation':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Dernière consultation :</span>
            <Select value={filter.period} onValueChange={v => onUpdate(id, { period: v })}>
              <SelectTrigger className="w-32 h-6 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">&lt; 3 mois</SelectItem>
                <SelectItem value="6">&lt; 6 mois</SelectItem>
                <SelectItem value="12">&lt; 12 mois</SelectItem>
                <SelectItem value="24">&lt; 24 mois</SelectItem>
                <SelectItem value="never">Jamais consulté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
      {chipContent()}
      <button onClick={() => onRemove(id)} className="ml-1 text-muted-foreground hover:text-destructive">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}