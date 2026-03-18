import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Repeat, Clock, User, Calendar
} from 'lucide-react';
import { STEP_TYPE_CONFIG, CATEGORY_LABELS } from './PathwayTemplates';

export default function PathwayDetailView({ pathway, onBack }) {
  const steps = pathway.steps || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">{pathway.name}</h2>
          <p className="text-sm text-muted-foreground">{pathway.description}</p>
        </div>
        <Badge variant="outline" className="ml-auto">{CATEGORY_LABELS[pathway.category] || pathway.category}</Badge>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Étapes du parcours ({steps.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {steps.map((step, index) => {
                const config = STEP_TYPE_CONFIG[step.type] || {};
                return (
                  <div key={step.id || index} className="relative pl-10">
                    {/* Dot */}
                    <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${config.color?.includes('bg-') ? config.color.split(' ')[0] : 'bg-slate-300'}`} />

                    <div className="bg-card border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${config.color || 'bg-slate-100 text-slate-700'}`}>
                            {config.label || step.type}
                          </Badge>
                          <span className="font-medium text-sm">{step.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          J+{step.delay_days}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {step.recurring && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Repeat className="w-3 h-3" />
                            Tous les {step.recurring_interval_days}j
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {step.responsible === 'medecin' ? 'Médecin' : step.responsible === 'patient' ? 'Patient' : step.responsible === 'secretaire' ? 'Secrétaire' : 'Spécialiste'}
                        </span>
                        {step.nomenclature_code && (
                          <span className="font-mono bg-muted px-1 rounded">{step.nomenclature_code}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}