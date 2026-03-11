import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Activity, Users, Pill } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

const AGE_BRACKETS = [
  { label: '0-5', min: 0, max: 5 },
  { label: '6-17', min: 6, max: 17 },
  { label: '18-30', min: 18, max: 30 },
  { label: '31-45', min: 31, max: 45 },
  { label: '46-60', min: 46, max: 60 },
  { label: '61-75', min: 61, max: 75 },
  { label: '76+', min: 76, max: 200 },
];

export default function ClinicalStatistics({ consultations = [], prescriptions = [], patients = [] }) {
  // 1. Motifs de consultation
  const motifData = useMemo(() => {
    const counts = {};
    consultations.forEach(c => {
      const motif = c.motif?.trim();
      if (motif) {
        const key = motif.length > 40 ? motif.substring(0, 40) + '…' : motif;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [consultations]);

  // 2. Répartition par âge des patients consultés
  const ageData = useMemo(() => {
    const patientMap = {};
    patients.forEach(p => { patientMap[p.id] = p; });

    const uniquePatientIds = [...new Set(consultations.map(c => c.patient_id))];
    const ageCounts = AGE_BRACKETS.map(b => ({ name: b.label, value: 0, min: b.min, max: b.max }));

    uniquePatientIds.forEach(pid => {
      const patient = patientMap[pid];
      if (patient?.birthDate) {
        const age = differenceInYears(new Date(), parseISO(patient.birthDate));
        const bracket = ageCounts.find(b => age >= b.min && age <= b.max);
        if (bracket) bracket.value++;
      }
    });

    return ageCounts.map(({ name, value }) => ({ name, value }));
  }, [consultations, patients]);

  // 3. Traitements les plus prescrits
  const treatmentData = useMemo(() => {
    const counts = {};
    prescriptions.forEach(p => {
      p.medicaments?.forEach(m => {
        const name = m.nom_produit?.trim();
        if (name) {
          const key = name.length > 30 ? name.substring(0, 30) + '…' : name;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [prescriptions]);

  const totalMotifs = motifData.reduce((s, d) => s + d.value, 0);
  const totalPatients = ageData.reduce((s, d) => s + d.value, 0);
  const totalTreatments = treatmentData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Motifs distincts</p>
              <p className="text-xl font-bold">{motifData.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patients consultés</p>
              <p className="text-xl font-bold">{totalPatients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
              <Pill className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Traitements prescrits</p>
              <p className="text-xl font-bold">{totalTreatments}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motifs de consultation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Motifs de consultation les plus fréquents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {motifData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, motifData.length * 36)}>
              <BarChart data={motifData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={11} width={220} tick={{ fill: '#475569' }} />
                <Tooltip formatter={(v) => [`${v} consultations`, 'Nombre']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {motifData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Aucun motif de consultation enregistré pour cette période</p>
          )}
        </CardContent>
      </Card>

      {/* Répartition par âge + Traitements side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Âge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Répartition par tranche d'âge
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPatients > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => [`${v} patients`, 'Nombre']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {ageData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Pas de données d'âge disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Traitements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-green-600" />
              Top 10 traitements prescrits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treatmentData.length > 0 ? (
              <div className="space-y-2">
                {treatmentData.map((med, i) => {
                  const pct = totalTreatments > 0 ? (med.value / totalTreatments * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="w-7 h-7 flex items-center justify-center rounded-full text-xs shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length] }}
                      >
                        {i + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium truncate">{med.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">{med.value} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucun traitement prescrit pour cette période</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}