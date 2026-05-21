import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PortalLabResults({ results, isLoading }) {
  const [expanded, setExpanded] = useState(null);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucun résultat de laboratoire</p>
      </div>
    );
  }

  const flagColors = {
    normal: 'text-green-600',
    low: 'text-blue-600',
    high: 'text-orange-600',
    critical_low: 'text-red-600',
    critical_high: 'text-red-600',
    abnormal: 'text-red-600',
  };

  return (
    <div className="space-y-2">
      {results.map(lab => (
        <Card key={lab.id} className={lab.has_critical ? 'border-red-200' : ''}>
          <CardContent className="p-3">
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => setExpanded(expanded === lab.id ? null : lab.id)}
            >
              <div className="flex items-center gap-3">
                <FlaskConical className={`w-4 h-4 ${lab.has_critical ? 'text-red-500' : lab.has_abnormal ? 'text-orange-500' : 'text-cyan-500'}`} />
                <div>
                  <p className="font-medium text-sm">{lab.laboratory_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lab.sample_date ? format(new Date(lab.sample_date), 'dd/MM/yyyy', { locale: fr }) : ''}
                    {' · '}{(lab.results || []).length} paramètre(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lab.has_critical && <Badge className="bg-red-100 text-red-700">Critique</Badge>}
                {lab.has_abnormal && !lab.has_critical && <Badge className="bg-orange-100 text-orange-700">Anormal</Badge>}
                {expanded === lab.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {expanded === lab.id && (
              <div className="mt-3 border-t pt-3 space-y-1">
                {(lab.results || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      {r.flag && r.flag !== 'normal' && <AlertTriangle className={`w-3 h-3 ${flagColors[r.flag] || ''}`} />}
                      <span>{r.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${flagColors[r.flag] || ''}`}>
                        {r.value} {r.unit || ''}
                      </span>
                      {r.reference_range && (
                        <span className="text-xs text-muted-foreground">({r.reference_range})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}