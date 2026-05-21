import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp } from 'lucide-react';

export default function EpiAlerts({ trends }) {
  const alerts = trends.filter(t => t.change > 30 && t.count >= 3);

  if (alerts.length === 0) return null;

  return (
    <Alert className="bg-red-50 border-red-200">
      <AlertTriangle className="w-4 h-4 text-red-600" />
      <AlertDescription>
        <p className="font-medium text-red-800 mb-1">Alertes épidémiologiques</p>
        <ul className="space-y-1">
          {alerts.map(a => (
            <li key={a.name} className="text-sm flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-red-600" />
              <span><strong>{a.name}</strong>: hausse de {a.change}% ({a.count} cas vs {a.previousCount} précédemment)</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}