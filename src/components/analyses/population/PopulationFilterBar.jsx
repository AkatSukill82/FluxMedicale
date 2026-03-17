import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, RotateCcw, Zap } from 'lucide-react';

const FILTER_TYPES = [
  { value: 'age', label: 'Tranche d\'âge', group: 'Démographie' },
  { value: 'gender', label: 'Sexe', group: 'Démographie' },
  { value: 'city', label: 'Ville / Code postal', group: 'Démographie' },
  { value: 'status', label: 'Statut patient', group: 'Démographie' },
  { value: 'diagnosis', label: 'Diagnostic / Pathologie', group: 'Clinique' },
  { value: 'medication', label: 'Médicament / Traitement', group: 'Clinique' },
  { value: 'medication_class', label: 'Classe ATC médicament', group: 'Clinique' },
  { value: 'allergy', label: 'Allergie', group: 'Clinique' },
  { value: 'allergy_severity', label: 'Sévérité allergie', group: 'Clinique' },
  { value: 'vaccination', label: 'Vaccination', group: 'Clinique' },
  { value: 'vaccination_overdue', label: 'Rappel vaccin en retard', group: 'Clinique' },
  { value: 'lab', label: 'Résultat labo', group: 'Clinique' },
  { value: 'lab_range', label: 'Valeur labo (plage)', group: 'Clinique' },
  { value: 'vital_signs', label: 'Signes vitaux', group: 'Clinique' },
  { value: 'bmi', label: 'IMC / BMI', group: 'Clinique' },
  { value: 'insurance', label: 'Régime d\'assurance', group: 'Administratif' },
  { value: 'dmg', label: 'Statut DMG', group: 'Administratif' },
  { value: 'sumehr', label: 'SUMEHR publié', group: 'Administratif' },
  { value: 'consultation', label: 'Dernière consultation', group: 'Activité' },
  { value: 'consultation_count', label: 'Nb consultations (période)', group: 'Activité' },
  { value: 'prescription_recurring', label: 'Prescription récurrente', group: 'Activité' },
  { value: 'no_followup', label: 'Sans suivi récent', group: 'Activité' },
];

const PRESETS = [
  { name: 'Diabétiques > 65 ans', icon: '🩺', filters: [
    { type: 'diagnosis', searchTerm: 'diabète', active: true },
    { type: 'age', ageMin: '65', ageMax: '' },
  ]},
  { name: '+65 non vaccinés grippe', icon: '💉', filters: [
    { type: 'age', ageMin: '65', ageMax: '' },
    { type: 'vaccination', searchTerm: 'grippe', vaccinated: false },
  ]},
  { name: 'HTA non contrôlée', icon: '❤️', filters: [
    { type: 'diagnosis', searchTerm: 'hypertension', active: true },
    { type: 'lab_range', searchTerm: 'tension', operator: 'above', threshold: '140' },
  ]},
  { name: 'Patients perdus de vue', icon: '👻', filters: [
    { type: 'consultation', period: '24_plus' },
    { type: 'dmg', statut: 'ACTIF' },
  ]},
  { name: 'Femmes 25-65 ans (dépistage)', icon: '🎀', filters: [
    { type: 'gender', value: 'female' },
    { type: 'age', ageMin: '25', ageMax: '65' },
  ]},
  { name: 'Polypharmacie > 5 médicaments', icon: '💊', filters: [
    { type: 'medication_class', searchTerm: '', minCount: '5' },
  ]},
  { name: 'Allergie sévère', icon: '⚠️', filters: [
    { type: 'allergy_severity', minSeverity: 'SEVERE' },
  ]},
  { name: 'Sans SUMEHR (DMG actif)', icon: '📋', filters: [
    { type: 'dmg', statut: 'ACTIF' },
    { type: 'sumehr', hasSumehr: false },
  ]},
];

export default function PopulationFilterBar({ filters, onFiltersChange }) {
  const addFilter = (type) => {
    const defaults = {
      age: { type: 'age', ageMin: '', ageMax: '' },
      gender: { type: 'gender', value: 'all' },
      city: { type: 'city', searchTerm: '' },
      status: { type: 'status', value: 'Actif' },
      diagnosis: { type: 'diagnosis', searchTerm: '', active: true },
      medication: { type: 'medication', searchTerm: '' },
      medication_class: { type: 'medication_class', searchTerm: '', minCount: '' },
      allergy: { type: 'allergy', searchTerm: '', active: true },
      allergy_severity: { type: 'allergy_severity', minSeverity: 'SEVERE' },
      vaccination: { type: 'vaccination', searchTerm: '', vaccinated: true },
      vaccination_overdue: { type: 'vaccination_overdue', daysOverdue: '30' },
      lab: { type: 'lab', searchTerm: '', abnormal: false },
      lab_range: { type: 'lab_range', searchTerm: '', operator: 'above', threshold: '' },
      vital_signs: { type: 'vital_signs', metric: 'systolic', operator: 'above', threshold: '' },
      bmi: { type: 'bmi', operator: 'above', threshold: '30' },
      insurance: { type: 'insurance', regime: 'all', status: 'all' },
      dmg: { type: 'dmg', statut: 'ACTIF' },
      sumehr: { type: 'sumehr', hasSumehr: true },
      consultation: { type: 'consultation', period: '12' },
      consultation_count: { type: 'consultation_count', period: '12', operator: 'less', count: '2' },
      prescription_recurring: { type: 'prescription_recurring', isRecurring: true },
      no_followup: { type: 'no_followup', months: '6' },
    };
    onFiltersChange([...filters, { ...defaults[type], id: Date.now() }]);
  };

  const updateFilter = (id, updates) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const applyPreset = (preset) => {
    onFiltersChange(preset.filters.map((f, i) => ({ ...f, id: Date.now() + i })));
  };

  const repeatableTypes = ['diagnosis', 'medication', 'medication_class', 'allergy', 'vaccination', 'lab', 'lab_range', 'vital_signs'];
  const usedTypes = filters.map(f => f.type);
  const availableTypes = FILTER_TYPES.filter(t => !usedTypes.includes(t.value) || repeatableTypes.includes(t.value));
  const groups = [...new Set(availableTypes.map(t => t.group))];

  return (
    <div className="space-y-3">
      {/* Presets */}
      {filters.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Requêtes prédéfinies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => applyPreset(preset)}
              >
                <span>{preset.icon}</span>
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Active filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <FilterChip key={filter.id} filter={filter} onUpdate={updateFilter} onRemove={removeFilter} />
        ))}
        <Select onValueChange={addFilter}>
          <SelectTrigger className="w-auto h-8 text-xs gap-1 border-dashed">
            <Plus className="w-3 h-3" />
            <span>Ajouter un filtre</span>
          </SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <React.Fragment key={group}>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                {availableTypes.filter(t => t.group === group).map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </React.Fragment>
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
  const inputCls = "w-14 h-6 text-xs px-1.5";
  const selectCls = "h-6 text-xs";

  const chipContent = () => {
    switch (filter.type) {
      case 'age':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Âge :</span>
            <Input className={inputCls} type="number" placeholder="min" value={filter.ageMin} onChange={e => onUpdate(id, { ageMin: e.target.value })} />
            <span className="text-xs">–</span>
            <Input className={inputCls} type="number" placeholder="max" value={filter.ageMax} onChange={e => onUpdate(id, { ageMax: e.target.value })} />
            <span className="text-xs">ans</span>
          </div>
        );
      case 'gender':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Sexe :</span>
            <Select value={filter.value} onValueChange={v => onUpdate(id, { value: v })}>
              <SelectTrigger className={`w-24 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'city':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Ville/CP :</span>
            <Input className="w-32 h-6 text-xs px-1.5" placeholder="ex: Bruxelles, 1000..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
          </div>
        );
      case 'status':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Statut :</span>
            <Select value={filter.value} onValueChange={v => onUpdate(id, { value: v })}>
              <SelectTrigger className={`w-24 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Actif">Actif</SelectItem>
                <SelectItem value="Inactif">Inactif</SelectItem>
                <SelectItem value="Décédé">Décédé</SelectItem>
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
              <SelectTrigger className={`w-20 ${selectCls}`}><SelectValue /></SelectTrigger>
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
            <Input className="w-36 h-6 text-xs px-1.5" placeholder="ex: metformine..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
          </div>
        );
      case 'medication_class':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Polypharmacie :</span>
            <span className="text-xs">≥</span>
            <Input className="w-10 h-6 text-xs px-1.5" type="number" value={filter.minCount} onChange={e => onUpdate(id, { minCount: e.target.value })} />
            <span className="text-xs">médicaments</span>
          </div>
        );
      case 'allergy':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Allergie :</span>
            <Input className="w-32 h-6 text-xs px-1.5" placeholder="ex: pénicilline..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
          </div>
        );
      case 'allergy_severity':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Allergie sévérité ≥</span>
            <Select value={filter.minSeverity} onValueChange={v => onUpdate(id, { minSeverity: v })}>
              <SelectTrigger className={`w-32 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MILD">Légère</SelectItem>
                <SelectItem value="MODERATE">Modérée</SelectItem>
                <SelectItem value="SEVERE">Sévère</SelectItem>
                <SelectItem value="LIFE_THREATENING">Vitale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'vaccination':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Vaccin :</span>
            <Input className="w-28 h-6 text-xs px-1.5" placeholder="ex: grippe, COVID..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
            <Select value={filter.vaccinated ? 'yes' : 'no'} onValueChange={v => onUpdate(id, { vaccinated: v === 'yes' })}>
              <SelectTrigger className={`w-28 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Vacciné</SelectItem>
                <SelectItem value="no">Non vacciné</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'vaccination_overdue':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Rappel vaccin en retard ≥</span>
            <Input className="w-12 h-6 text-xs px-1.5" type="number" value={filter.daysOverdue} onChange={e => onUpdate(id, { daysOverdue: e.target.value })} />
            <span className="text-xs">jours</span>
          </div>
        );
      case 'lab':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Labo :</span>
            <Input className="w-28 h-6 text-xs px-1.5" placeholder="ex: HbA1c, eGFR..." value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
            <Select value={filter.abnormal ? 'abnormal' : 'all'} onValueChange={v => onUpdate(id, { abnormal: v === 'abnormal' })}>
              <SelectTrigger className={`w-24 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="abnormal">Anormal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'lab_range':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Labo val. :</span>
            <Input className="w-24 h-6 text-xs px-1.5" placeholder="ex: HbA1c" value={filter.searchTerm} onChange={e => onUpdate(id, { searchTerm: e.target.value })} />
            <Select value={filter.operator} onValueChange={v => onUpdate(id, { operator: v })}>
              <SelectTrigger className={`w-16 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="above">&gt;</SelectItem>
                <SelectItem value="below">&lt;</SelectItem>
                <SelectItem value="between">Entre</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-16 h-6 text-xs px-1.5" type="number" placeholder="val" value={filter.threshold} onChange={e => onUpdate(id, { threshold: e.target.value })} />
            {filter.operator === 'between' && (
              <>
                <span className="text-xs">et</span>
                <Input className="w-16 h-6 text-xs px-1.5" type="number" placeholder="max" value={filter.thresholdMax || ''} onChange={e => onUpdate(id, { thresholdMax: e.target.value })} />
              </>
            )}
          </div>
        );
      case 'vital_signs':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Signe vital :</span>
            <Select value={filter.metric} onValueChange={v => onUpdate(id, { metric: v })}>
              <SelectTrigger className={`w-28 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="systolic">TAS (mmHg)</SelectItem>
                <SelectItem value="diastolic">TAD (mmHg)</SelectItem>
                <SelectItem value="heart_rate">FC (bpm)</SelectItem>
                <SelectItem value="temperature">T° (°C)</SelectItem>
                <SelectItem value="weight">Poids (kg)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.operator} onValueChange={v => onUpdate(id, { operator: v })}>
              <SelectTrigger className={`w-14 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="above">&gt;</SelectItem>
                <SelectItem value="below">&lt;</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-16 h-6 text-xs px-1.5" type="number" value={filter.threshold} onChange={e => onUpdate(id, { threshold: e.target.value })} />
          </div>
        );
      case 'bmi':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">IMC :</span>
            <Select value={filter.operator} onValueChange={v => onUpdate(id, { operator: v })}>
              <SelectTrigger className={`w-14 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="above">&gt;</SelectItem>
                <SelectItem value="below">&lt;</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-14 h-6 text-xs px-1.5" type="number" value={filter.threshold} onChange={e => onUpdate(id, { threshold: e.target.value })} />
          </div>
        );
      case 'insurance':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Assurance :</span>
            <Select value={filter.regime} onValueChange={v => onUpdate(id, { regime: v })}>
              <SelectTrigger className={`w-28 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout régime</SelectItem>
                <SelectItem value="MUTUELLE_BE">Mutuelle BE</SelectItem>
                <SelectItem value="RCAM">RCAM</SelectItem>
                <SelectItem value="SNCB">SNCB</SelectItem>
                <SelectItem value="CAAMI">CAAMI</SelectItem>
                <SelectItem value="OSSOM">OSSOM</SelectItem>
                <SelectItem value="ASSURANCE_PRIVEE">Privée</SelectItem>
                <SelectItem value="AUCUN">Aucun</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.status} onValueChange={v => onUpdate(id, { status: v })}>
              <SelectTrigger className={`w-28 ${selectCls}`}><SelectValue /></SelectTrigger>
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
              <SelectTrigger className={`w-28 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIF">Actif</SelectItem>
                <SelectItem value="EXPIRE">Expiré</SelectItem>
                <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                <SelectItem value="AUCUN">Aucun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'sumehr':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">SUMEHR :</span>
            <Select value={filter.hasSumehr ? 'yes' : 'no'} onValueChange={v => onUpdate(id, { hasSumehr: v === 'yes' })}>
              <SelectTrigger className={`w-28 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Publié</SelectItem>
                <SelectItem value="no">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'consultation':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Dernière consultation :</span>
            <Select value={filter.period} onValueChange={v => onUpdate(id, { period: v })}>
              <SelectTrigger className={`w-36 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">&lt; 1 mois</SelectItem>
                <SelectItem value="3">&lt; 3 mois</SelectItem>
                <SelectItem value="6">&lt; 6 mois</SelectItem>
                <SelectItem value="12">&lt; 12 mois</SelectItem>
                <SelectItem value="24">&lt; 24 mois</SelectItem>
                <SelectItem value="24_plus">&gt; 24 mois ou jamais</SelectItem>
                <SelectItem value="never">Jamais consulté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'consultation_count':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Nb consultations</span>
            <Select value={filter.operator} onValueChange={v => onUpdate(id, { operator: v })}>
              <SelectTrigger className={`w-14 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="less">&lt;</SelectItem>
                <SelectItem value="more">&gt;</SelectItem>
                <SelectItem value="equal">=</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-10 h-6 text-xs px-1.5" type="number" value={filter.count} onChange={e => onUpdate(id, { count: e.target.value })} />
            <span className="text-xs">sur</span>
            <Select value={filter.period} onValueChange={v => onUpdate(id, { period: v })}>
              <SelectTrigger className={`w-20 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 mois</SelectItem>
                <SelectItem value="6">6 mois</SelectItem>
                <SelectItem value="12">12 mois</SelectItem>
                <SelectItem value="24">24 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'prescription_recurring':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Prescription récurrente :</span>
            <Select value={filter.isRecurring ? 'yes' : 'no'} onValueChange={v => onUpdate(id, { isRecurring: v === 'yes' })}>
              <SelectTrigger className={`w-20 ${selectCls}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Oui</SelectItem>
                <SelectItem value="no">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'no_followup':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Sans suivi depuis ≥</span>
            <Input className="w-10 h-6 text-xs px-1.5" type="number" value={filter.months} onChange={e => onUpdate(id, { months: e.target.value })} />
            <span className="text-xs">mois</span>
          </div>
        );
      default:
        return <span className="text-xs">{filter.type}</span>;
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