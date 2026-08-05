import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FlaskConical, CheckCircle2, Wrench } from 'lucide-react';
import { integrationSummary, STATUS } from '@/lib/integrationStatus';

/**
 * Inventaire des connecteurs externes et de leur état réel.
 *
 * Sert de point de décision : ce qui reste en SIMULATED n'a pas de connecteur,
 * et la colonne « Reste à faire » indique ce qu'il manque pour le câbler.
 */

const STATUS_META = {
  [STATUS.SIMULATED]: {
    label: 'Non connecté',
    icon: AlertTriangle,
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    row: 'border-orange-200 bg-orange-50/40',
  },
  [STATUS.PARTIAL]: {
    label: 'Connecté avec repli',
    icon: FlaskConical,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    row: 'border-amber-200 bg-amber-50/40',
  },
  [STATUS.LIVE]: {
    label: 'Connecté',
    icon: CheckCircle2,
    badge: 'bg-green-100 text-green-800 border-green-200',
    row: 'border-green-200 bg-green-50/40',
  },
};

const ORDER = [STATUS.SIMULATED, STATUS.PARTIAL, STATUS.LIVE];

export default function IntegrationInventory() {
  const summary = integrationSummary();
  const sorted = [...summary.entries].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-slate-600" />
            État des intégrations externes
          </CardTitle>
          <CardDescription>
            Source de vérité : <code>src/lib/integrationStatus.js</code>. Un
            connecteur ne passe à « Connecté » qu&apos;une fois réellement câblé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-center">
              <div className="text-2xl font-bold text-orange-800">{summary.simulated}</div>
              <div className="text-xs text-orange-700">Non connectés</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <div className="text-2xl font-bold text-amber-800">{summary.partial}</div>
              <div className="text-xs text-amber-700">Avec repli</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
              <div className="text-2xl font-bold text-green-800">{summary.live}</div>
              <div className="text-xs text-green-700">Connectés</div>
            </div>
          </div>

          {summary.simulated > 0 && (
            <Alert className="border-orange-300 bg-orange-50 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                {summary.simulated} connecteur(s) ne réalisent aucun échange réel.
                Les écrans concernés affichent un avertissement, mais aucun de ces
                flux ne doit être considéré comme transmis.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {sorted.map((item) => {
              const meta = STATUS_META[item.status];
              const Icon = meta.icon;
              return (
                <div key={item.key} className={`p-3 border rounded-lg ${meta.row}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{item.label}</p>
                        {item.impact && (
                          <p className="text-sm text-slate-700 mt-0.5">{item.impact}</p>
                        )}
                        {item.remaining && (
                          <p className="text-xs text-slate-500 mt-1">
                            <strong>Reste à faire :</strong> {item.remaining}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${meta.badge}`}>
                      {meta.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
