import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, ChevronDown, ChevronUp, Lightbulb, 
  Wrench, HelpCircle, Info, XCircle, Clock
} from 'lucide-react';
import { getErrorExplanation, parseErrorCodes, SEVERITY_CONFIG, ERROR_CATEGORIES } from './oaErrorCodes';

/**
 * Affiche l'explication claire d'une erreur mutualité pour le médecin.
 * 
 * Props:
 * - errorCode: string - le code d'erreur (ex: "500403")
 * - errorMessage: string - le message brut de la mutualité (optionnel)
 * - compact: boolean - mode compact pour les lignes de tableau
 */
export default function OAErrorExplainer({ errorCode, errorMessage, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);

  // Extraire les codes du message si pas de code explicite
  const codes = errorCode 
    ? [errorCode] 
    : parseErrorCodes(errorMessage);
  
  if (codes.length === 0 && !errorMessage) return null;

  const explanations = codes.map(c => getErrorExplanation(c));

  // Mode compact = juste un badge cliquable
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 text-left"
      >
        {explanations.map((exp, i) => (
          <Badge 
            key={i} 
            className={`${SEVERITY_CONFIG[exp.severity]?.color || 'bg-red-100 text-red-800'} text-[10px] cursor-pointer hover:opacity-80`}
          >
            {exp.code}: {exp.label}
          </Badge>
        ))}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
    );
  }

  const severityIcon = {
    blocking: <XCircle className="w-4 h-4 text-red-500" />,
    rejection: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    warning: <Clock className="w-4 h-4 text-yellow-500" />,
  };

  return (
    <div className="space-y-2">
      {compact && (
        <button onClick={() => setExpanded(false)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
          <ChevronUp className="w-3 h-3" />
          Réduire
        </button>
      )}

      {explanations.map((exp, i) => (
        <div
          key={i}
          className={`rounded-lg border p-3 space-y-2 ${
            exp.severity === 'blocking' ? 'bg-red-50 border-red-200' 
            : exp.severity === 'warning' ? 'bg-yellow-50 border-yellow-200'
            : 'bg-orange-50 border-orange-200'
          }`}
        >
          {/* En-tête */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {severityIcon[exp.severity]}
              <div>
                <span className="font-mono text-xs text-slate-500">Code {exp.code}</span>
                <p className="font-semibold text-sm">{exp.label}</p>
              </div>
            </div>
            <Badge className={SEVERITY_CONFIG[exp.severity]?.color || 'bg-slate-100'}>
              {SEVERITY_CONFIG[exp.severity]?.label || 'Erreur'}
            </Badge>
          </div>

          {/* Explication */}
          <div className="flex items-start gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-slate-700">{exp.explanation}</p>
          </div>

          {/* Action à prendre */}
          <div className="flex items-start gap-2 text-sm bg-white rounded-md p-2 border border-slate-200">
            <Wrench className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 text-xs mb-0.5">Que faire ?</p>
              <p className="text-slate-700 whitespace-pre-line">{exp.action}</p>
            </div>
          </div>

          {!exp.found && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <HelpCircle className="w-3 h-3" />
              Code non référencé — contactez fra.mycarenet.be pour plus d'infos
            </div>
          )}
        </div>
      ))}

      {/* Message brut original (si disponible et différent) */}
      {errorMessage && (
        <details className="text-xs">
          <summary className="text-slate-400 cursor-pointer hover:text-slate-600">
            Voir le message original de la mutualité
          </summary>
          <pre className="mt-1 p-2 bg-slate-100 rounded text-slate-600 whitespace-pre-wrap font-mono text-[11px]">
            {errorMessage}
          </pre>
        </details>
      )}
    </div>
  );
}