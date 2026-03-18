import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp, TrendingDown, Minus, Info, BarChart3,
  Syringe, Heart, FileCheck, Shield, Pill, Users, Activity
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import BenchmarkIndicatorCard from './BenchmarkIndicatorCard';

// Belgian national averages (source: INAMI/RIZIV, KCE, Sciensano reports 2023-2024)
const NATIONAL_BENCHMARKS = {
  vaccination_grippe_65: { label: 'Vaccination grippe ≥65 ans', national: 58, region_wallonie: 55, region_flandre: 62, region_bruxelles: 48, unit: '%', category: 'prevention', icon: 'syringe' },
  vaccination_covid: { label: 'Vaccination COVID (rappel)', national: 35, region_wallonie: 32, region_flandre: 40, region_bruxelles: 28, unit: '%', category: 'prevention', icon: 'syringe' },
  dmg_rate: { label: 'Taux de DMG actifs', national: 72, region_wallonie: 68, region_flandre: 78, region_bruxelles: 55, unit: '%', category: 'admin', icon: 'filecheck' },
  sumehr_rate: { label: 'Couverture SUMEHR (vs DMG)', national: 45, region_wallonie: 40, region_flandre: 52, region_bruxelles: 35, unit: '%', category: 'admin', icon: 'filecheck' },
  efact_rate: { label: 'Taux eFact/eAttest', national: 65, region_wallonie: 60, region_flandre: 72, region_bruxelles: 50, unit: '%', category: 'admin', icon: 'shield' },
  diabete_prevalence: { label: 'Prévalence diabète', national: 6.5, region_wallonie: 7.2, region_flandre: 5.8, region_bruxelles: 7.5, unit: '%', category: 'chronic', icon: 'heart' },
  hta_prevalence: { label: 'Prévalence HTA', national: 28, region_wallonie: 30, region_flandre: 27, region_bruxelles: 29, unit: '%', category: 'chronic', icon: 'heart' },
  polypharmacie_65: { label: 'Polypharmacie ≥65 ans (≥5 méd.)', national: 42, region_wallonie: 45, region_flandre: 40, region_bruxelles: 44, unit: '%', category: 'medication', icon: 'pill' },
  antibio_prescriptions: { label: 'Antibiotiques / 1000 patients', national: 780, region_wallonie: 850, region_flandre: 700, region_bruxelles: 820, unit: '/1000', category: 'medication', icon: 'pill' },
  consultations_per_patient: { label: 'Consultations/patient/an', national: 4.2, region_wallonie: 4.5, region_flandre: 3.9, region_bruxelles: 4.8, unit: '', category: 'activity', icon: 'activity' },
  insurance_in_order: { label: 'Patients assurance en ordre', national: 88, region_wallonie: 85, region_flandre: 92, region_bruxelles: 80, unit: '%', category: 'admin', icon: 'shield' },
  patient_65plus: { label: 'Part patients ≥65 ans', national: 22, region_wallonie: 23, region_flandre: 24, region_bruxelles: 18, unit: '%', category: 'demography', icon: 'users' },
};

function calculatePracticeMetrics(data) {
  const patients = data?.patients || [];
  const vaccinations = data?.vaccinations || [];
  const dmgs = data?.dmgs || [];
  const sumehrs = data?.sumehrs || [];
  const invoices = data?.invoices || [];
  const medicalHistories = data?.medicalHistories || [];
  const prescriptions = data?.prescriptions || [];
  const consultations = data?.consultations || [];
  const total = patients.length;
  if (!total) return {};

  const getAge = (bd) => bd ? Math.floor((Date.now() - new Date(bd).getTime()) / (365.25*24*60*60*1000)) : null;
  const patients65 = patients.filter(p => getAge(p.birthDate) >= 65);
  const patients65Ids = new Set(patients65.map(p => p.id));

  // Vaccination grippe >65
  const grippeVaccinated65 = new Set(
    vaccinations.filter(v => patients65Ids.has(v.patient_id) && ((v.vaccine_type||'').includes('GRIPPE') || (v.vaccine_name||'').toLowerCase().includes('grippe')))
      .map(v => v.patient_id)
  ).size;
  const vaccination_grippe_65 = patients65.length ? Math.round((grippeVaccinated65 / patients65.length) * 100) : 0;

  // COVID
  const covidVaccinated = new Set(
    vaccinations.filter(v => (v.vaccine_type||'').includes('COVID') || (v.vaccine_name||'').toLowerCase().includes('covid'))
      .map(v => v.patient_id)
  ).size;
  const vaccination_covid = total ? Math.round((covidVaccinated / total) * 100) : 0;

  // DMG
  const dmgActifs = new Set((dmgs || []).filter(d => d.statut === 'ACTIF').map(d => d.patient_id)).size;
  const dmg_rate = total ? Math.round((dmgActifs / total) * 100) : 0;

  // SUMEHR
  const sumehrPatients = new Set((sumehrs || []).filter(s => s.status === 'published' || s.status === 'validated').map(s => s.patient_id)).size;
  const sumehr_rate = dmgActifs ? Math.round((sumehrPatients / dmgActifs) * 100) : 0;

  // eFact
  const totalInvoices = invoices.length;
  const electronicInvoices = invoices.filter(i => i.type === 'EFACT' || i.type === 'EATTEST').length;
  const efact_rate = totalInvoices ? Math.round((electronicInvoices / totalInvoices) * 100) : 0;

  // Diabète
  const diabetePatients = new Set(
    medicalHistories.filter(h => h.is_active && (h.title||'').toLowerCase().includes('diabète'))
      .map(h => h.patient_id)
  ).size;
  const diabete_prevalence = total ? Math.round((diabetePatients / total) * 1000) / 10 : 0;

  // HTA
  const htaPatients = new Set(
    medicalHistories.filter(h => h.is_active && (h.title||'').toLowerCase().includes('hypertension'))
      .map(h => h.patient_id)
  ).size;
  const hta_prevalence = total ? Math.round((htaPatients / total) * 1000) / 10 : 0;

  // Polypharmacie >65
  const rxByPatient65 = {};
  prescriptions.forEach(p => {
    if (patients65Ids.has(p.patient_id)) {
      rxByPatient65[p.patient_id] = (rxByPatient65[p.patient_id] || 0) + (p.medicaments || []).length;
    }
  });
  const polypharmacy65 = Object.values(rxByPatient65).filter(c => c >= 5).length;
  const polypharmacie_65 = patients65.length ? Math.round((polypharmacy65 / patients65.length) * 100) : 0;

  // Antibiotics
  const antibioRx = prescriptions.filter(p =>
    (p.medicaments || []).some(m => (m.nom_produit||'').toLowerCase().match(/amox|augmentin|azithro|ciproflox|cefur|clarithro|doxycycline|metro|nitrofurant|antibio/))
  ).length;
  const antibio_prescriptions = total ? Math.round((antibioRx / total) * 1000) : 0;

  // Consultations per patient
  const thisYear = new Date().getFullYear();
  const thisYearConsults = consultations.filter(c => new Date(c.date_consultation).getFullYear() === thisYear).length;
  const consultations_per_patient = total ? Math.round((thisYearConsults / total) * 10) / 10 : 0;

  // Insurance
  const inOrder = patients.filter(p => p.insurance_status === 'EN_ORDRE' || p.insurance_status === 'ACTIF').length;
  const insurance_in_order = total ? Math.round((inOrder / total) * 100) : 0;

  // 65+
  const patient_65plus = total ? Math.round((patients65.length / total) * 100) : 0;

  return {
    vaccination_grippe_65, vaccination_covid, dmg_rate, sumehr_rate, efact_rate,
    diabete_prevalence, hta_prevalence, polypharmacie_65, antibio_prescriptions,
    consultations_per_patient, insurance_in_order, patient_65plus
  };
}

const CATEGORIES = [
  { key: 'prevention', label: 'Prévention', icon: Syringe },
  { key: 'chronic', label: 'Maladies chroniques', icon: Heart },
  { key: 'medication', label: 'Médicaments', icon: Pill },
  { key: 'admin', label: 'Administration', icon: FileCheck },
  { key: 'activity', label: 'Activité', icon: Activity },
  { key: 'demography', label: 'Démographie', icon: Users },
];

export default function BenchmarkDashboard({ data, isLoading }) {
  const [region, setRegion] = useState('national');

  const metrics = useMemo(() => calculatePracticeMetrics(data), [data]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Calcul des indicateurs...</div>;
  }

  const regionKey = region === 'national' ? 'national' : `region_${region}`;

  // Compute score
  const indicators = Object.entries(NATIONAL_BENCHMARKS).map(([key, benchmark]) => {
    const myValue = metrics[key] ?? 0;
    const refValue = benchmark[regionKey] ?? benchmark.national;
    const diff = myValue - refValue;
    const isInverse = key === 'antibio_prescriptions' || key === 'polypharmacie_65';
    const isGood = isInverse ? diff <= 0 : diff >= 0;
    return { key, ...benchmark, myValue, refValue, diff, isGood };
  });

  const goodCount = indicators.filter(i => i.isGood).length;
  const totalCount = indicators.length;
  const score = Math.round((goodCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Benchmarking</h2>
            <p className="text-xs text-muted-foreground">
              Vos indicateurs vs moyennes {region === 'national' ? 'nationales' : `(${region})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['national', 'wallonie', 'flandre', 'bruxelles'].map(r => (
            <Button
              key={r}
              variant={region === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRegion(r)}
              className="text-xs capitalize"
            >
              {r === 'national' ? '🇧🇪 National' : r === 'wallonie' ? 'Wallonie' : r === 'flandre' ? 'Flandre' : 'Bruxelles'}
            </Button>
          ))}
        </div>
      </div>

      {/* Score global */}
      <Card className={score >= 70 ? 'border-green-200 bg-green-50/30' : score >= 40 ? 'border-yellow-200 bg-yellow-50/30' : 'border-red-200 bg-red-50/30'}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Score global de votre pratique</p>
              <p className="text-3xl font-bold mt-1">{score}%</p>
              <p className="text-xs text-muted-foreground mt-1">{goodCount}/{totalCount} indicateurs égaux ou supérieurs à la référence</p>
            </div>
            <div className="text-right">
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800 text-xs">{goodCount} ✓</Badge>
                <Badge className="bg-red-100 text-red-800 text-xs">{totalCount - goodCount} ✗</Badge>
              </div>
            </div>
          </div>
          <Progress value={score} className="h-2.5 mt-3" />
        </CardContent>
      </Card>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Les moyennes nationales et régionales proviennent des rapports INAMI, KCE et Sciensano (2023-2024). Vos données sont analysées localement et ne sont <strong>jamais partagées</strong>. Pour les indicateurs où un chiffre bas est souhaitable (antibiotiques, polypharmacie), la logique est inversée.
        </AlertDescription>
      </Alert>

      {/* By category */}
      {CATEGORIES.map(cat => {
        const catIndicators = indicators.filter(i => i.category === cat.key);
        if (!catIndicators.length) return null;
        const CatIcon = cat.icon;
        return (
          <div key={cat.key}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <CatIcon className="w-4 h-4" />
              {cat.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catIndicators.map(ind => (
                <BenchmarkIndicatorCard key={ind.key} indicator={ind} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}