import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield, Syringe, AlertTriangle, Heart, Users, Activity, FileCheck
} from 'lucide-react';
import AnalysisSelector, { PREDEFINED_ANALYSES } from './analyses/AnalysisSelector';
import CustomAnalysisCard from './analyses/CustomAnalysisCard';
import DemographySection from './analyses/DemographySection';
import InsuranceSection from './analyses/InsuranceSection';
import VaccinationsSection from './analyses/VaccinationsSection';
import AllergiesSection from './analyses/AllergiesSection';
import ChronicDiseasesSection from './analyses/ChronicDiseasesSection';
import DMGSection from './analyses/DMGSection';

const STORAGE_KEY = 'analyses_medicales_config';

function GaugeCard({ title, value, total, icon: Icon, color, description }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-sm text-muted-foreground">/ {total}</span>
            </div>
          </div>
          <span className="text-2xl font-bold" style={{ color: pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444' }}>
            {pct}%
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalysesMedicales({ patients, vaccinations, allergies, medicalHistories, dmgs, prescriptions }) {
  const totalPatients = patients?.length || 0;

  const [selectedAnalyses, setSelectedAnalyses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.selected || PREDEFINED_ANALYSES.filter(a => a.default).map(a => a.id);
    }
    return PREDEFINED_ANALYSES.filter(a => a.default).map(a => a.id);
  });

  const [customAnalyses, setCustomAnalyses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.custom || [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected: selectedAnalyses, custom: customAnalyses }));
  }, [selectedAnalyses, customAnalyses]);

  const isVisible = (id) => selectedAnalyses.includes(id);
  const visibleCustom = customAnalyses.filter(a => selectedAnalyses.includes(a.id));

  // Quick stats
  const dmgActifs = (dmgs || []).filter(d => d.statut === 'ACTIF').length;
  const vaccinatedCount = new Set((vaccinations || []).map(v => v.patient_id)).size;
  const allergyPatientsCount = new Set((allergies || []).filter(a => a.status === 'ACTIVE').map(a => a.patient_id)).size;
  const chronicPatientsCount = new Set((medicalHistories || []).filter(h => h.type === 'maladie_chronique' && h.is_active).map(h => h.patient_id)).size;

  return (
    <div className="space-y-6">
      {/* Sélecteur d'analyses */}
      <AnalysisSelector
        selectedAnalyses={selectedAnalyses}
        onSelectionChange={setSelectedAnalyses}
        customAnalyses={customAnalyses}
        onCustomAnalysesChange={setCustomAnalyses}
      />

      {/* Analyses personnalisées */}
      {visibleCustom.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Analyses personnalisées
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCustom.map(analysis => (
              <CustomAnalysisCard
                key={analysis.id}
                analysis={analysis}
                patients={patients}
                vaccinations={vaccinations}
                allergies={allergies}
                medicalHistories={medicalHistories}
                prescriptions={prescriptions}
              />
            ))}
          </div>
        </div>
      )}

      {/* Baromètres principaux */}
      {isVisible('barometres') && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Baromètres de la patientèle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GaugeCard title="DMG Actifs" value={dmgActifs} total={totalPatients} icon={FileCheck} color="bg-green-600" description="Patients avec un DMG actif" />
            <GaugeCard title="Patients vaccinés" value={vaccinatedCount} total={totalPatients} icon={Syringe} color="bg-blue-600" description="Au moins 1 vaccination" />
            <GaugeCard title="Patients allergiques" value={allergyPatientsCount} total={totalPatients} icon={AlertTriangle} color="bg-amber-600" description="Au moins 1 allergie active" />
            <GaugeCard title="Maladies chroniques" value={chronicPatientsCount} total={totalPatients} icon={Heart} color="bg-red-600" description="≥ 1 pathologie chronique active" />
          </div>
        </div>
      )}

      {/* KPIs rapides */}
      {isVisible('kpis') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total patients" value={totalPatients} icon={Users} color="bg-slate-700" />
          <StatCard title="Vaccinations" value={vaccinations?.length || 0} subtitle="doses administrées" icon={Syringe} color="bg-blue-500" />
          <StatCard title="Allergies actives" value={(allergies || []).filter(a => a.status === 'ACTIVE').length} icon={AlertTriangle} color="bg-amber-500" />
          <StatCard title="Antécédents" value={(medicalHistories || []).length} subtitle="enregistrements" icon={Heart} color="bg-red-500" />
        </div>
      )}

      {/* Démographie */}
      {isVisible('demographie') && (
        <DemographySection patients={patients} />
      )}

      {/* Assurance */}
      {isVisible('assurance') && (
        <InsuranceSection patients={patients} />
      )}

      {/* DMG */}
      {isVisible('dmg') && (
        <DMGSection dmgs={dmgs} totalPatients={totalPatients} />
      )}

      {/* Vaccinations + couverture */}
      {(isVisible('vaccinations') || isVisible('couverture_vaccinale')) && (
        <VaccinationsSection
          vaccinations={vaccinations}
          patients={patients}
          showCoverage={isVisible('couverture_vaccinale')}
        />
      )}

      {/* Allergies */}
      {isVisible('allergies') && (
        <AllergiesSection allergies={allergies} />
      )}

      {/* Maladies chroniques */}
      {isVisible('maladies_chroniques') && (
        <ChronicDiseasesSection medicalHistories={medicalHistories} />
      )}
    </div>
  );
}