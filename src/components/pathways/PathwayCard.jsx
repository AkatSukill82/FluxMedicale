import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Play, Pause, Eye, Users, Calendar, ArrowRight, Repeat
} from 'lucide-react';
import { STEP_TYPE_CONFIG, CATEGORY_LABELS } from './PathwayTemplates';

export default function PathwayCard({ pathway, enrollmentCount, onView, onActivate }) {
  const steps = pathway.steps || [];
  const recurringSteps = steps.filter(s => s.recurring).length;
  const category = CATEGORY_LABELS[pathway.category] || pathway.category;

  return (
    <Card className={`transition-all hover:shadow-md ${pathway.is_active === false ? 'opacity-60' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{pathway.name}</h3>
              {pathway.is_template && (
                <Badge variant="secondary" className="text-[9px] px-1.5">Modèle</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{pathway.description}</p>
          </div>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {category}
          </Badge>
        </div>

        {/* Steps summary */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(
            steps.reduce((acc, s) => {
              acc[s.type] = (acc[s.type] || 0) + 1;
              return acc;
            }, {})
          ).map(([type, count]) => {
            const config = STEP_TYPE_CONFIG[type] || {};
            return (
              <Badge key={type} className={`text-[10px] ${config.color || 'bg-slate-100 text-slate-700'}`}>
                {count} {config.label || type}
              </Badge>
            );
          })}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {steps.length} étapes
          </span>
          {recurringSteps > 0 && (
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {recurringSteps} récurrentes
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {enrollmentCount || 0} inscrits
          </span>
        </div>

        {/* Trigger */}
        <div className="bg-muted/50 rounded-md px-3 py-2 text-xs mb-3">
          <span className="text-muted-foreground">Déclencheur : </span>
          <span className="font-medium">{pathway.trigger_condition}</span>
          {pathway.trigger_value && (
            <span className="text-muted-foreground"> → "{pathway.trigger_value}"</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(pathway)}>
            <Eye className="w-3.5 h-3.5 mr-1" />
            Voir
          </Button>
          {onActivate && (
            <Button
              size="sm"
              className="flex-1"
              variant={pathway.is_active === false ? 'outline' : 'default'}
              onClick={() => onActivate(pathway)}
            >
              {pathway.is_active === false ? (
                <><Play className="w-3.5 h-3.5 mr-1" />Activer</>
              ) : (
                <><Users className="w-3.5 h-3.5 mr-1" />Inscrire</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}