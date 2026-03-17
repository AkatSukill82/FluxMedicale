import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import {
  Shield, Syringe, AlertTriangle, Heart, Users, Activity,
  TrendingUp, FileCheck
} from 'lucide-react';
import AnalysisSelector, { PREDEFINED_ANALYSES } from './analyses/AnalysisSelector';
import CustomAnalysisCard from './analyses/CustomAnalysisCard';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

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

  // Persisted selection state
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

  // --- DMG Analysis ---
  const dmgStats = useMemo(() => {
    const actifs = (dmgs || []).filter(d => d.statut === 'ACTIF').length;
    const expires = (dmgs || []).filter(d => d.statut === 'EXPIRE').length;
    const suspendus = (dmgs || []).filter(d => d.statut === 'SUSPENDU').length;
    const aucun = totalPatients - actifs - expires - suspendus;
    return { actifs, expires, suspendus, aucun };
  }, [dmgs, totalPatients]);

  const dmgChartData = [
    { name: 'DMG Actif', value: dmgStats.actifs, fill: '#10b981' },
    { name: 'Expiré', value: dmgStats.expires, fill: '#f59e0b' },
    { name: 'Suspendu', value: dmgStats.suspendus, fill: '#ef4444' },
    { name: 'Sans DMG', value: dmgStats.aucun, fill: '#94a3b8' },
  ].filter(d => d.value > 0);

  // --- Vaccination Analysis ---
  const vaccStats = useMemo(() => {
    const byType = {};
    const vaccinatedPatientIds = new Set();
    (vaccinations || []).forEach(v => {
      const type = v.vaccine_type || 'AUTRE';
      byType[type] = (byType[type] || 0) + 1;
      vaccinatedPatientIds.add(v.patient_id);
    });
    return { byType, vaccinatedCount: vaccinatedPatientIds.size, total: vaccinations?.length || 0 };
  }, [vaccinations]);

  const vaccTypeLabels = {
    'COVID': 'COVID-19', 'GRIPPE': 'Grippe', 'TETANOS': 'Tétanos/dTpa',
    'HEPATITE_B': 'Hépatite B', 'PNEUMOCOQUE': 'Pneumocoque', 'HPV': 'HPV', 'AUTRE': 'Autres'
  };

  const vaccChartData = Object.entries(vaccStats.byType)
    .map(([key, value]) => ({ name: vaccTypeLabels[key] || key, value }))
    .sort((a, b) => b.value - a.value);

  // --- Allergy Analysis ---
  const allergyStats = useMemo(() => {
    const byType = {};
    const bySeverity = {};
    const topAllergens = {};
    const patientsWithAllergy = new Set();
    (allergies || []).filter(a => a.status === 'ACTIVE').forEach(a => {
      const type = a.allergen_type || 'OTHER';
      byType[type] = (byType[type] || 0) + 1;
      const sev = a.severity || 'MILD';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      topAllergens[a.allergen] = (topAllergens[a.allergen] || 0) + 1;
      patientsWithAllergy.add(a.patient_id);
    });
    return { byType, bySeverity, topAllergens, patientsCount: patientsWithAllergy.size };
  }, [allergies]);

  const allergyTypeLabels = { 'MEDICATION': 'Médicaments', 'FOOD': 'Alimentaires', 'ENVIRONMENTAL': 'Environnementales', 'OTHER': 'Autres' };
  const allergySeverityLabels = { 'MILD': 'Légère', 'MODERATE': 'Modérée', 'SEVERE': 'Sévère', 'LIFE_THREATENING': 'Vitale' };
  const allergySeverityColors = { 'MILD': '#10b981', 'MODERATE': '#f59e0b', 'SEVERE': '#f97316', 'LIFE_THREATENING': '#ef4444' };

  const allergyTypeData = Object.entries(allergyStats.byType)
    .map(([key, value]) => ({ name: allergyTypeLabels[key] || key, value }));

  const allergySeverityData = Object.entries(allergyStats.bySeverity)
    .map(([key, value]) => ({ name: allergySeverityLabels[key] || key, value, fill: allergySeverityColors[key] || '#94a3b8' }));

  const topAllergensData = Object.entries(allergyStats.topAllergens)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // --- Medical History Analysis ---
  const historyStats = useMemo(() => {
    const byType = {};
    const chronicConditions = {};
    const patientsWithChronic = new Set();
    (medicalHistories || []).forEach(h => {
      const type = h.type || 'autre';
      byType[type] = (byType[type] || 0) + 1;
      if (h.type === 'maladie_chronique' && h.is_active) {
        chronicConditions[h.title] = (chronicConditions[h.title] || 0) + 1;
        patientsWithChronic.add(h.patient_id);
      }
    });
    return { byType, chronicConditions, chronicPatientsCount: patientsWithChronic.size };
  }, [medicalHistories]);

  const historyTypeLabels = {
    'maladie_chronique': 'Maladies chroniques', 'maladie_passee': 'Maladies passées',
    'allergie': 'Allergies', 'chirurgie': 'Chirurgies', 'antecedent_familial': 'Antécédents familiaux'
  };

  const historyTypeData = Object.entries(historyStats.byType)
    .map(([key, value]) => ({ name: historyTypeLabels[key] || key, value }))
    .sort((a, b) => b.value - a.value);

  const topChronicData = Object.entries(historyStats.chronicConditions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // --- Age Distribution ---
  const ageDistribution = useMemo(() => {
    const buckets = { '0-17': 0, '18-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76+': 0 };
    (patients || []).forEach(p => {
      if (!p.birthDate) return;
      const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) buckets['0-17']++;
      else if (age <= 30) buckets['18-30']++;
      else if (age <= 45) buckets['31-45']++;
      else if (age <= 60) buckets['46-60']++;
      else if (age <= 75) buckets['61-75']++;
      else buckets['76+']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [patients]);

  // --- Gender Distribution ---
  const genderDistribution = useMemo(() => {
    const counts = { male: 0, female: 0, other: 0 };
    (patients || []).forEach(p => {
      if (p.gender === 'male') counts.male++;
      else if (p.gender === 'female') counts.female++;
      else counts.other++;
    });
    return [
      { name: 'Hommes', value: counts.male, fill: '#3b82f6' },
      { name: 'Femmes', value: counts.female, fill: '#ec4899' },
      ...(counts.other > 0 ? [{ name: 'Autre', value: counts.other, fill: '#94a3b8' }] : [])
    ];
  }, [patients]);

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
          <GaugeCard
            title="DMG Actifs"
            value={dmgStats.actifs}
            total={totalPatients}
            icon={FileCheck}
            color="bg-green-600"
            description="Patients avec un Dossier Médical Global actif"
          />
          <GaugeCard
            title="Patients vaccinés"
            value={vaccStats.vaccinatedCount}
            total={totalPatients}
            icon={Syringe}
            color="bg-blue-600"
            description="Au moins 1 vaccination enregistrée"
          />
          <GaugeCard
            title="Patients allergiques"
            value={allergyStats.patientsCount}
            total={totalPatients}
            icon={AlertTriangle}
            color="bg-amber-600"
            description="Au moins 1 allergie active connue"
          />
          <GaugeCard
            title="Maladies chroniques"
            value={historyStats.chronicPatientsCount}
            total={totalPatients}
            icon={Heart}
            color="bg-red-600"
            description="Patients avec ≥ 1 pathologie chronique active"
          />
        </div>
      </div>
      )}

      {/* KPIs rapides */}
      {isVisible('kpis') && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total patients" value={totalPatients} icon={Users} color="bg-slate-700" />
        <StatCard title="Vaccinations" value={vaccStats.total} subtitle="doses administrées" icon={Syringe} color="bg-blue-500" />
        <StatCard title="Allergies actives" value={(allergies || []).filter(a => a.status === 'ACTIVE').length} icon={AlertTriangle} color="bg-amber-500" />
        <StatCard title="Antécédents" value={(medicalHistories || []).length} subtitle="enregistrements" icon={Heart} color="bg-red-500" />
      </div>
      )}

      {/* Démographie */}
      {isVisible('demographie') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par âge</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {ageDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par genre</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={genderDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {genderDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      )}

      {/* DMG */}
      {isVisible('dmg') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              Statut DMG
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dmgChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={dmgChartData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {dmgChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Aucun DMG enregistré — {totalPatients} patients sans DMG
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vaccinations par type - inside dmg grid */}
        {isVisible('vaccinations') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="w-5 h-5 text-blue-600" />
              Vaccinations par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vaccChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={vaccChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={60} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {vaccChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">Aucune vaccination enregistrée</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vaccination coverage barometers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Couverture vaccinale par maladie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vaccChartData.map((vacc, i) => {
              const patientsVaccinatedForType = new Set(
                (vaccinations || []).filter(v => (vaccTypeLabels[v.vaccine_type] || v.vaccine_type) === vacc.name).map(v => v.patient_id)
              ).size;
              const pct = totalPatients > 0 ? Math.round((patientsVaccinatedForType / totalPatients) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{vacc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{patientsVaccinatedForType} patients</span>
                      <Badge variant={pct > 50 ? 'default' : pct > 25 ? 'secondary' : 'destructive'}>
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
            {vaccChartData.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Aucune donnée de vaccination</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Allergies par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allergyTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={allergyTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {allergyTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">Aucune allergie</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sévérité des allergies</CardTitle>
          </CardHeader>
          <CardContent>
            {allergySeverityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={allergySeverityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {allergySeverityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">Aucune donnée</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Allergènes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topAllergensData.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs">
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{a.name}</span>
                  </div>
                  <Badge variant="secondary">{a.value}</Badge>
                </div>
              ))}
              {topAllergensData.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Aucune allergie</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maladies chroniques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Antécédents par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={historyTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={70} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {historyTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">Aucun antécédent</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Pathologies chroniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topChronicData.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
                      style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <Badge>{c.value} patients</Badge>
                </div>
              ))}
              {topChronicData.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Aucune pathologie chronique</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}