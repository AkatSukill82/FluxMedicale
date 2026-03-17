import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Syringe, Heart, AlertTriangle, Pill, Users } from 'lucide-react';

const ICONS = {
  vaccination_coverage: Syringe,
  diagnosis_prevalence: Heart,
  allergy_tracking: AlertTriangle,
  age_group_metric: Users,
  medication_usage: Pill,
};

const COLORS_MAP = {
  vaccination_coverage: 'bg-blue-600',
  diagnosis_prevalence: 'bg-red-600',
  allergy_tracking: 'bg-amber-600',
  age_group_metric: 'bg-purple-600',
  medication_usage: 'bg-green-600',
};

function filterPatientsByAge(patients, ageMin, ageMax) {
  return patients.filter(p => {
    if (!p.birthDate) return false;
    const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (ageMin && age < parseInt(ageMin)) return false;
    if (ageMax && age > parseInt(ageMax)) return false;
    return true;
  });
}

function filterPatientsByGender(patients, gender) {
  if (!gender || gender === 'all') return patients;
  return patients.filter(p => p.gender === gender);
}

export default function CustomAnalysisCard({ analysis, patients, vaccinations, allergies, medicalHistories, prescriptions }) {
  const Icon = ICONS[analysis.type] || Search;
  const colorClass = COLORS_MAP[analysis.type] || 'bg-slate-600';
  const term = (analysis.searchTerm || '').toLowerCase();

  const result = useMemo(() => {
    let targetPatients = patients || [];
    targetPatients = filterPatientsByAge(targetPatients, analysis.ageMin, analysis.ageMax);
    targetPatients = filterPatientsByGender(targetPatients, analysis.gender);
    const targetIds = new Set(targetPatients.map(p => p.id));
    const total = targetPatients.length;

    if (analysis.type === 'vaccination_coverage') {
      const vaccinated = new Set(
        (vaccinations || [])
          .filter(v => targetIds.has(v.patient_id) && (
            (v.vaccine_type || '').toLowerCase().includes(term) ||
            (v.vaccine_name || '').toLowerCase().includes(term)
          ))
          .map(v => v.patient_id)
      ).size;
      return { value: vaccinated, total, label: 'patients vaccinés' };
    }

    if (analysis.type === 'diagnosis_prevalence') {
      const matched = new Set(
        (medicalHistories || [])
          .filter(h => targetIds.has(h.patient_id) && h.is_active && (
            (h.title || '').toLowerCase().includes(term) ||
            (h.icd10_code || '').toLowerCase().includes(term)
          ))
          .map(h => h.patient_id)
      ).size;
      return { value: matched, total, label: 'patients concernés' };
    }

    if (analysis.type === 'allergy_tracking') {
      const matched = new Set(
        (allergies || [])
          .filter(a => targetIds.has(a.patient_id) && a.status === 'ACTIVE' &&
            (a.allergen || '').toLowerCase().includes(term)
          )
          .map(a => a.patient_id)
      ).size;
      return { value: matched, total, label: 'patients allergiques' };
    }

    if (analysis.type === 'medication_usage') {
      const matched = new Set(
        (prescriptions || [])
          .filter(p => targetIds.has(p.patient_id) &&
            (p.medicaments || []).some(m => (m.nom_produit || '').toLowerCase().includes(term))
          )
          .map(p => p.patient_id)
      ).size;
      return { value: matched, total, label: 'patients sous traitement' };
    }

    if (analysis.type === 'age_group_metric') {
      return { value: total, total: (patients || []).length, label: 'patients dans la tranche' };
    }

    return { value: 0, total, label: '' };
  }, [analysis, patients, vaccinations, allergies, medicalHistories, prescriptions]);

  const pct = result.total > 0 ? Math.round((result.value / result.total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{analysis.name}</p>
            <p className="text-xs text-muted-foreground">
              Recherche : "{analysis.searchTerm}"
              {analysis.ageMin || analysis.ageMax ? ` · ${analysis.ageMin || 0}-${analysis.ageMax || '∞'} ans` : ''}
              {analysis.gender && analysis.gender !== 'all' ? ` · ${analysis.gender === 'male' ? 'H' : 'F'}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold" style={{ color: pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444' }}>
              {pct}%
            </span>
          </div>
        </div>
        <Progress value={pct} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{result.value} {result.label}</span>
          <span>sur {result.total} patients</span>
        </div>
        {analysis.description && <p className="text-xs text-muted-foreground mt-2 italic">{analysis.description}</p>}
      </CardContent>
    </Card>
  );
}