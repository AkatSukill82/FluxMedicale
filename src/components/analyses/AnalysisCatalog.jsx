import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Syringe, Heart, AlertTriangle, Users, FileCheck, Shield,
  Pill, Stethoscope, Baby, Activity, Search, Play, Award
} from 'lucide-react';

const ICONS = {
  syringe: Syringe, heart: Heart, alert: AlertTriangle, users: Users,
  filecheck: FileCheck, shield: Shield, pill: Pill, stethoscope: Stethoscope,
  baby: Baby, activity: Activity, search: Search, award: Award,
};

export const ANALYSIS_CATALOG = [
  {
    id: 'couverture_grippe',
    name: 'Couverture vaccinale grippe',
    description: 'Pourcentage de patients vaccinés contre la grippe',
    category: 'Prévention',
    icon: 'syringe',
    color: 'bg-blue-600',
    type: 'vaccination_coverage',
    searchTerm: 'GRIPPE',
  },
  {
    id: 'couverture_covid',
    name: 'Couverture vaccinale COVID-19',
    description: 'Pourcentage de patients vaccinés COVID-19',
    category: 'Prévention',
    icon: 'syringe',
    color: 'bg-indigo-600',
    type: 'vaccination_coverage',
    searchTerm: 'COVID',
  },
  {
    id: 'couverture_tetanos',
    name: 'Couverture vaccinale Tétanos',
    description: 'Pourcentage de patients vaccinés tétanos/dTpa',
    category: 'Prévention',
    icon: 'syringe',
    color: 'bg-cyan-600',
    type: 'vaccination_coverage',
    searchTerm: 'TETANOS',
  },
  {
    id: 'couverture_grippe_65',
    name: 'Grippe > 65 ans',
    description: 'Couverture vaccinale grippe chez les +65 ans',
    category: 'Prévention',
    icon: 'syringe',
    color: 'bg-teal-600',
    type: 'vaccination_coverage',
    searchTerm: 'GRIPPE',
    ageMin: '65',
  },
  {
    id: 'diabete',
    name: 'Prévalence du diabète',
    description: 'Patients avec un diagnostic de diabète actif',
    category: 'Maladies chroniques',
    icon: 'heart',
    color: 'bg-red-600',
    type: 'diagnosis_prevalence',
    searchTerm: 'diabète',
  },
  {
    id: 'hypertension',
    name: 'Prévalence HTA',
    description: 'Patients avec hypertension artérielle active',
    category: 'Maladies chroniques',
    icon: 'heart',
    color: 'bg-rose-600',
    type: 'diagnosis_prevalence',
    searchTerm: 'hypertension',
  },
  {
    id: 'asthme',
    name: 'Prévalence de l\'asthme',
    description: 'Patients avec asthme actif',
    category: 'Maladies chroniques',
    icon: 'heart',
    color: 'bg-orange-600',
    type: 'diagnosis_prevalence',
    searchTerm: 'asthme',
  },
  {
    id: 'depression',
    name: 'Prévalence dépression',
    description: 'Patients avec dépression active',
    category: 'Maladies chroniques',
    icon: 'heart',
    color: 'bg-purple-600',
    type: 'diagnosis_prevalence',
    searchTerm: 'dépression',
  },
  {
    id: 'allergie_penicilline',
    name: 'Allergie pénicilline',
    description: 'Patients allergiques à la pénicilline',
    category: 'Allergies',
    icon: 'alert',
    color: 'bg-amber-600',
    type: 'allergy_tracking',
    searchTerm: 'pénicilline',
  },
  {
    id: 'allergie_arachide',
    name: 'Allergie arachide',
    description: 'Patients allergiques à l\'arachide',
    category: 'Allergies',
    icon: 'alert',
    color: 'bg-yellow-600',
    type: 'allergy_tracking',
    searchTerm: 'arachide',
  },
  {
    id: 'allergie_iode',
    name: 'Allergie iode',
    description: 'Patients allergiques à l\'iode',
    category: 'Allergies',
    icon: 'alert',
    color: 'bg-amber-700',
    type: 'allergy_tracking',
    searchTerm: 'iode',
  },
  {
    id: 'metformine',
    name: 'Patients sous metformine',
    description: 'Patients avec prescription active de metformine',
    category: 'Médicaments',
    icon: 'pill',
    color: 'bg-green-600',
    type: 'medication_usage',
    searchTerm: 'metformine',
  },
  {
    id: 'amlodipine',
    name: 'Patients sous amlodipine',
    description: 'Patients avec prescription active d\'amlodipine',
    category: 'Médicaments',
    icon: 'pill',
    color: 'bg-emerald-600',
    type: 'medication_usage',
    searchTerm: 'amlodipine',
  },
  {
    id: 'statines',
    name: 'Patients sous statines',
    description: 'Patients traités par statines',
    category: 'Médicaments',
    icon: 'pill',
    color: 'bg-lime-700',
    type: 'medication_usage',
    searchTerm: 'statine',
  },
  {
    id: 'pediatrie',
    name: 'Population pédiatrique',
    description: 'Patients de 0 à 17 ans',
    category: 'Démographie',
    icon: 'baby',
    color: 'bg-sky-600',
    type: 'age_group_metric',
    ageMin: '0',
    ageMax: '17',
  },
  {
    id: 'geriatrie',
    name: 'Population gériatrique',
    description: 'Patients de 75 ans et plus',
    category: 'Démographie',
    icon: 'users',
    color: 'bg-slate-600',
    type: 'age_group_metric',
    ageMin: '75',
  },
  {
    id: 'dmg_actifs',
    name: 'Taux de DMG actifs',
    description: 'Pourcentage de patients avec DMG actif',
    category: 'Administration',
    icon: 'filecheck',
    color: 'bg-green-700',
    type: 'dmg_status',
  },
  {
    id: 'assurabilite',
    name: 'Couverture assurance',
    description: 'Patients avec assurance en ordre',
    category: 'Administration',
    icon: 'shield',
    color: 'bg-blue-700',
    type: 'insurance_status',
  },
  // Baromètres INAMI
  {
    id: 'barometre_diabete',
    name: 'Baromètre Diabète (INAMI)',
    description: 'Patients diabétiques : suivi HbA1c, traitement, complications — critère prime INAMI',
    category: 'Baromètres INAMI',
    icon: 'stethoscope',
    color: 'bg-red-700',
    type: 'diagnosis_prevalence',
    searchTerm: 'diabète',
  },
  {
    id: 'barometre_antibiotiques',
    name: 'Baromètre Antibiotiques (INAMI)',
    description: 'Prescriptions d\'antibiotiques : volume, type, pertinence — critère prime INAMI',
    category: 'Baromètres INAMI',
    icon: 'pill',
    color: 'bg-amber-700',
    type: 'medication_usage',
    searchTerm: 'antibio',
  },
  {
    id: 'barometre_renal',
    name: 'Baromètre Insuffisance Rénale (INAMI)',
    description: 'Patients avec insuffisance rénale chronique : suivi eGFR, traitement — critère prime INAMI',
    category: 'Baromètres INAMI',
    icon: 'heart',
    color: 'bg-purple-700',
    type: 'diagnosis_prevalence',
    searchTerm: 'rénal',
  },
  {
    id: 'sumehr_coverage',
    name: 'Couverture SUMEHR (INAMI)',
    description: 'Ratio patients avec SUMEHR publié vs DMG actifs — seuil 60% requis',
    category: 'Baromètres INAMI',
    icon: 'filecheck',
    color: 'bg-teal-700',
    type: 'dmg_status',
  },
  {
    id: 'efact_usage',
    name: 'Taux eFact/eAttest (INAMI)',
    description: 'Pourcentage de factures via eFact ou eAttest — seuil 50% requis',
    category: 'Baromètres INAMI',
    icon: 'shield',
    color: 'bg-blue-800',
    type: 'insurance_status',
  },
];

const categories = [...new Set(ANALYSIS_CATALOG.map(a => a.category))];

export default function AnalysisCatalog({ selectedIds, onToggle, searchFilter }) {
  const filtered = searchFilter
    ? ANALYSIS_CATALOG.filter(a =>
        a.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.category.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : ANALYSIS_CATALOG;

  const filteredCategories = categories.filter(cat =>
    filtered.some(a => a.category === cat)
  );

  return (
    <div className="space-y-6">
      {filteredCategories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.filter(a => a.category === cat).map(analysis => {
              const isSelected = selectedIds.includes(analysis.id);
              const Icon = ICONS[analysis.icon] || Search;
              return (
                <Card
                  key={analysis.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-slate-50'}`}
                  onClick={() => onToggle(analysis.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${analysis.color}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{analysis.name}</p>
                          {isSelected && (
                            <Badge className="text-[10px] px-1.5 py-0">Actif</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{analysis.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Aucune analyse trouvée pour "{searchFilter}"</p>
        </div>
      )}
    </div>
  );
}