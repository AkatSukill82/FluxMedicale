import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, Pill, AlertTriangle, Syringe } from 'lucide-react';

export default function CohortMedicalProfile({ medicalStats, totalPatients }) {
  if (!medicalStats || totalPatients === 0) return null;

  const { topDiagnoses, topMedications, topAllergies, vaccinationCoverage } = medicalStats;
  const hasData = topDiagnoses?.length > 0 || topMedications?.length > 0 || topAllergies?.length > 0;
  if (!hasData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Top diagnostics */}
      {topDiagnoses?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Top diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topDiagnoses.slice(0, 8).map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="truncate font-medium capitalize">{d.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-1 flex-shrink-0">
                      {d.patients} ({Math.round((d.patients / totalPatients) * 100)}%)
                    </Badge>
                  </div>
                  <Progress value={(d.patients / totalPatients) * 100} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top médicaments */}
      {topMedications?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-green-500" />
              Top médicaments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topMedications.slice(0, 8).map((m, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="truncate font-medium capitalize">{m.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-1 flex-shrink-0">
                      {m.patients} pat.
                    </Badge>
                  </div>
                  <Progress value={(m.patients / totalPatients) * 100} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top allergies */}
      {topAllergies?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Top allergènes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topAllergies.slice(0, 8).map((a, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="truncate font-medium capitalize">{a.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-1 flex-shrink-0">{a.count}</Badge>
                  </div>
                  <Progress value={(a.count / totalPatients) * 100} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Couverture vaccinale */}
      {vaccinationCoverage && Object.keys(vaccinationCoverage).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Syringe className="w-4 h-4 text-blue-500" />
              Couverture vaccinale
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              {Object.entries(vaccinationCoverage).map(([name, v]) => {
                const pct = v.total > 0 ? Math.round((v.vaccinated / v.total) * 100) : 0;
                const pctColor = pct > 70 ? 'text-green-600' : pct > 40 ? 'text-amber-600' : 'text-red-600';
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-medium">{name}</span>
                      <span className={`font-bold ${pctColor}`}>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{v.vaccinated}/{v.total} patients</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}