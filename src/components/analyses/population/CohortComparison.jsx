import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, ArrowDown, Minus, GitCompare } from 'lucide-react';

export default function CohortComparison({ cohortStats, totalPopulationStats }) {
  if (!cohortStats || !totalPopulationStats || cohortStats.matched === 0) return null;

  const comparisons = [
    {
      label: 'Hommes',
      cohortPct: cohortStats.matched > 0 ? Math.round((cohortStats.genderBreakdown.male / cohortStats.matched) * 100) : 0,
      popPct: totalPopulationStats.total > 0 ? Math.round((totalPopulationStats.genderBreakdown.male / totalPopulationStats.total) * 100) : 0,
    },
    {
      label: 'Femmes',
      cohortPct: cohortStats.matched > 0 ? Math.round((cohortStats.genderBreakdown.female / cohortStats.matched) * 100) : 0,
      popPct: totalPopulationStats.total > 0 ? Math.round((totalPopulationStats.genderBreakdown.female / totalPopulationStats.total) * 100) : 0,
    },
    ...Object.entries(cohortStats.ageBreakdown).map(([range, count]) => ({
      label: range + ' ans',
      cohortPct: cohortStats.matched > 0 ? Math.round((count / cohortStats.matched) * 100) : 0,
      popPct: totalPopulationStats.total > 0 ? Math.round(((totalPopulationStats.ageBreakdown[range] || 0) / totalPopulationStats.total) * 100) : 0,
    })),
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="w-4 h-4" />
          Cohorte vs population totale
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2.5">
          {comparisons.map((c, i) => {
            const diff = c.cohortPct - c.popPct;
            const DiffIcon = diff > 2 ? ArrowUp : diff < -2 ? ArrowDown : Minus;
            const diffColor = Math.abs(diff) <= 2 ? 'text-muted-foreground' : diff > 0 ? 'text-blue-600' : 'text-amber-600';
            return (
              <div key={i} className="grid grid-cols-12 items-center gap-2 text-xs">
                <span className="col-span-3 font-medium truncate">{c.label}</span>
                <div className="col-span-3 flex items-center gap-1">
                  <Progress value={c.cohortPct} className="h-1.5 flex-1" />
                  <span className="w-8 text-right font-mono text-[11px]">{c.cohortPct}%</span>
                </div>
                <div className="col-span-3 flex items-center gap-1">
                  <Progress value={c.popPct} className="h-1.5 flex-1" />
                  <span className="w-8 text-right font-mono text-muted-foreground text-[11px]">{c.popPct}%</span>
                </div>
                <div className={`col-span-3 flex items-center gap-0.5 ${diffColor}`}>
                  <DiffIcon className="w-3 h-3" />
                  <span className="font-mono text-[11px]">{diff > 0 ? '+' : ''}{diff}pp</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Cohorte ({cohortStats.matched} patients)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />
            Population ({totalPopulationStats.total} patients)
          </span>
          <span>pp = points de pourcentage</span>
        </div>
      </CardContent>
    </Card>
  );
}