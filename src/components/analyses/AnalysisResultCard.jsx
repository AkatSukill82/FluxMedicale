import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Syringe, Heart, AlertTriangle, Users, FileCheck, Shield,
  Pill, Baby, Activity, Search, X
} from 'lucide-react';

const ICONS = {
  syringe: Syringe, heart: Heart, alert: AlertTriangle, users: Users,
  filecheck: FileCheck, shield: Shield, pill: Pill, baby: Baby,
  activity: Activity, search: Search
};

function filterByAge(patients, ageMin, ageMax) {
  return (patients || []).filter(p => {
    if (!p.birthDate) return false;
    const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (ageMin && age < parseInt(ageMin)) return false;
    if (ageMax && age > parseInt(ageMax)) return false;
    return true;
  });
}

function filterByGender(patients, gender) {
  if (!gender || gender === 'all') return patients;
  return patients.filter(p => p.gender === gender);
}

export default function AnalysisResultCard({ analysis, data, onRemove }) {
  const { patients, vaccinations, allergies, medicalHistories, prescriptions, dmgs } = data;
  const Icon = ICONS[analysis.icon] || Activity;
  const term = (analysis.searchTerm || '').toLowerCase();

  const result = useMemo(() => {
    let targetPatients = patients || [];
    targetPatients = filterByAge(targetPatients, analysis.ageMin, analysis.ageMax);
    targetPatients = filterByGender(targetPatients, analysis.gender);
    const targetIds = new Set(targetPatients.map(p => p.id));
    const total = targetPatients.length;

    switch (analysis.type) {
      case 'vaccination_coverage': {
        const matched = new Set(
          (vaccinations || [])
            .filter(v => targetIds.has(v.patient_id) && (
              (v.vaccine_type || '').toLowerCase().includes(term) ||
              (v.vaccine_name || '').toLowerCase().includes(term)
            ))
            .map(v => v.patient_id)
        ).size;
        return { value: matched, total, label: 'patients vaccinés', detail: `${(vaccinations || []).filter(v => (v.vaccine_type || '').toLowerCase().includes(term) || (v.vaccine_name || '').toLowerCase().includes(term)).length} doses administrées` };
      }
      case 'diagnosis_prevalence': {
        const matched = new Set(
          (medicalHistories || [])
            .filter(h => targetIds.has(h.patient_id) && h.is_active && (
              (h.title || '').toLowerCase().includes(term) ||
              (h.icd10_code || '').toLowerCase().includes(term)
            ))
            .map(h => h.patient_id)
        ).size;
        return { value: matched, total, label: 'patients diagnostiqués' };
      }
      case 'allergy_tracking': {
        const activeAllergies = (allergies || []).filter(a => targetIds.has(a.patient_id) && a.status === 'ACTIVE' && (a.allergen || '').toLowerCase().includes(term));
        const matched = new Set(activeAllergies.map(a => a.patient_id)).size;
        const severeCount = activeAllergies.filter(a => a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING').length;
        return { value: matched, total, label: 'patients allergiques', detail: severeCount > 0 ? `⚠️ ${severeCount} cas sévères/vitaux` : null };
      }
      case 'medication_usage': {
        const matched = new Set(
          (prescriptions || [])
            .filter(p => targetIds.has(p.patient_id) &&
              (p.medicaments || []).some(m => (m.nom_produit || '').toLowerCase().includes(term))
            )
            .map(p => p.patient_id)
        ).size;
        return { value: matched, total, label: 'patients sous traitement' };
      }
      case 'age_group_metric': {
        return { value: total, total: (patients || []).length, label: 'patients dans la tranche' };
      }
      case 'dmg_status': {
        const actifs = (dmgs || []).filter(d => d.statut === 'ACTIF').length;
        return { value: actifs, total: total, label: 'DMG actifs' };
      }
      case 'insurance_status': {
        const enOrdre = targetPatients.filter(p => p.insurance_status === 'EN_ORDRE' || p.insurance_status === 'ACTIF').length;
        return { value: enOrdre, total, label: 'patients en ordre' };
      }
      default:
        return { value: 0, total, label: '' };
    }
  }, [analysis, patients, vaccinations, allergies, medicalHistories, prescriptions, dmgs]);

  const pct = result.total > 0 ? Math.round((result.value / result.total) * 100) : 0;
  const pctColor = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';

  return (
    <Card className="relative group">
      {onRemove && (
        <Button
          variant="ghost" size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onRemove(analysis.id); }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${analysis.color || 'bg-slate-600'}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{analysis.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {analysis.description || `Recherche : "${analysis.searchTerm}"`}
              {(analysis.ageMin || analysis.ageMax) && ` · ${analysis.ageMin || 0}–${analysis.ageMax || '∞'} ans`}
              {analysis.gender && analysis.gender !== 'all' && ` · ${analysis.gender === 'male' ? '♂' : '♀'}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-3xl font-bold" style={{ color: pctColor }}>{pct}%</span>
          </div>
        </div>
        <Progress value={pct} className="h-2.5 mb-3" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{result.value} {result.label}</span>
          <span>sur {result.total} patients</span>
        </div>
        {result.detail && (
          <p className="text-xs text-muted-foreground mt-2">{result.detail}</p>
        )}
      </CardContent>
    </Card>
  );
}