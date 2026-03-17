import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, XCircle, Minus, Monitor, ExternalLink
} from 'lucide-react';

const COMPETITORS = [
  {
    name: 'FluxMed',
    type: 'Votre logiciel',
    highlight: true,
    approved: false, // Not yet on official INAMI list
    features: {
      ch4: 'auto',       // Chapitre IV
      efact: 'auto',     // eFact/eAttest
      sumehr: 'auto',    // SUMEHR upload
      schemas: 'auto',   // Schémas de médication
      cebam: 'manual',   // CEBAM Evidence Linker
      handicap: 'manual',// Formulaire Handicap SPF
      barometres: 'partial', // Baromètres
      mediatt: 'auto',   // Mult-eMediatt
      tracking: 'auto',  // Suivi automatique des critères
      dashboard: 'auto', // Dashboard prime
      population: 'auto', // Analyse de population
    }
  },
  {
    name: 'Medispring',
    type: 'Logiciel agréé INAMI',
    approved: true,
    features: {
      ch4: 'auto',
      efact: 'auto',
      sumehr: 'auto',
      schemas: 'auto',
      cebam: 'link',
      handicap: 'auto',
      barometres: 'auto',
      mediatt: 'auto',
      tracking: 'none',
      dashboard: 'none',
      population: 'partial',
    }
  },
  {
    name: 'CareConnect',
    type: 'Logiciel agréé INAMI',
    approved: true,
    features: {
      ch4: 'auto',
      efact: 'auto',
      sumehr: 'auto',
      schemas: 'auto',
      cebam: 'link',
      handicap: 'auto',
      barometres: 'auto',
      mediatt: 'auto',
      tracking: 'none',
      dashboard: 'none',
      population: 'partial',
    }
  },
  {
    name: 'HealthOne',
    type: 'Logiciel agréé INAMI',
    approved: true,
    features: {
      ch4: 'auto',
      efact: 'auto',
      sumehr: 'auto',
      schemas: 'auto',
      cebam: 'link',
      handicap: 'auto',
      barometres: 'auto',
      mediatt: 'auto',
      tracking: 'none',
      dashboard: 'none',
      population: 'auto',
    }
  },
  {
    name: 'Daktari',
    type: 'Logiciel agréé INAMI',
    approved: true,
    features: {
      ch4: 'auto',
      efact: 'auto',
      sumehr: 'auto',
      schemas: 'auto',
      cebam: 'link',
      handicap: 'auto',
      barometres: 'auto',
      mediatt: 'auto',
      tracking: 'none',
      dashboard: 'none',
      population: 'partial',
    }
  },
  {
    name: 'Prodoc',
    type: 'Logiciel agréé INAMI',
    approved: true,
    features: {
      ch4: 'auto',
      efact: 'auto',
      sumehr: 'auto',
      schemas: 'auto',
      cebam: 'link',
      handicap: 'auto',
      barometres: 'auto',
      mediatt: 'auto',
      tracking: 'none',
      dashboard: 'none',
      population: 'none',
    }
  },
];

const CRITERIA_LABELS = [
  { key: 'ch4', label: 'Chapitre IV MyCareNet', number: '1' },
  { key: 'efact', label: 'eFact / eAttest', number: '2' },
  { key: 'sumehr', label: 'SUMEHR vers Hubs', number: '3' },
  { key: 'schemas', label: 'Schémas de médication', number: '4' },
  { key: 'cebam', label: 'CEBAM Evidence Linker', number: '5' },
  { key: 'handicap', label: 'Formulaire Handicap SPF', number: '6' },
  { key: 'barometres', label: 'Baromètres INAMI', number: '7' },
  { key: 'mediatt', label: 'Mult-eMediatt', number: '8' },
  { key: 'tracking', label: 'Suivi progression prime', number: '★' },
  { key: 'dashboard', label: 'Dashboard prime intégré', number: '★' },
  { key: 'population', label: 'Analyse de population', number: '★' },
];

function StatusIcon({ status }) {
  if (status === 'auto') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === 'partial') return <Badge variant="outline" className="text-[10px] px-1 text-amber-600 border-amber-300">Partiel</Badge>;
  if (status === 'link') return <Badge variant="outline" className="text-[10px] px-1 text-blue-600 border-blue-300">Lien ext.</Badge>;
  if (status === 'manual') return <Badge variant="outline" className="text-[10px] px-1 text-slate-500">Manuel</Badge>;
  return <XCircle className="w-4 h-4 text-slate-300" />;
}

export default function INAMIComparison() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          <CardTitle className="text-base">Comparaison avec les logiciels agréés INAMI</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          8 logiciels sont agréés par la Commission nationale médico-mutualiste pour la prime de pratique intégrée.
          Voici comment FluxMed se compare aux principaux acteurs du marché.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                  Critère
                </th>
                {COMPETITORS.map(c => (
                  <th key={c.name} className={`text-center p-3 font-medium min-w-[100px] ${c.highlight ? 'bg-primary/5' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      <span className={c.highlight ? 'font-bold text-primary' : ''}>{c.name}</span>
                      {c.approved && <Badge className="text-[9px] px-1 bg-green-100 text-green-700 border-green-200" variant="outline">Agréé</Badge>}
                      {c.highlight && <Badge className="text-[9px] px-1">Vous</Badge>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRITERIA_LABELS.map((crit, i) => (
                <tr key={crit.key} className={`border-b ${i >= 8 ? 'bg-amber-50/50' : ''}`}>
                  <td className="p-3 sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 font-mono">{crit.number}</Badge>
                      <span className="text-xs font-medium">{crit.label}</span>
                    </div>
                  </td>
                  {COMPETITORS.map(c => (
                    <td key={c.name} className={`p-3 text-center ${c.highlight ? 'bg-primary/5' : ''}`}>
                      <div className="flex justify-center">
                        <StatusIcon status={c.features[crit.key]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Légende</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Intégré automatiquement</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] px-1 text-amber-600 border-amber-300">Partiel</Badge> Partiellement couvert</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] px-1 text-blue-600 border-blue-300">Lien ext.</Badge> Via lien externe</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] px-1 text-slate-500">Manuel</Badge> Vérification manuelle</span>
            <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-slate-300" /> Non disponible</span>
          </div>
        </div>

        {/* Key insights */}
        <div className="p-4 border-t space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Points clés de la comparaison</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-1">✓ Avantages FluxMed</p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• <strong>Dashboard intégré</strong> de suivi de la prime — aucun concurrent ne l'offre</li>
                <li>• <strong>Progression en temps réel</strong> des 8 critères avec estimation du montant</li>
                <li>• <strong>Analyse de population avancée</strong> avec filtres combinés, export CSV et cohortes sauvegardées</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-1">△ Points d'attention</p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• FluxMed n'est <strong>pas encore agréé</strong> par la Commission INAMI (en cours)</li>
                <li>• CEBAM et Handicap SPF restent en <strong>vérification manuelle</strong> (identique aux concurrents)</li>
                <li>• Les baromètres sont <strong>partiellement couverts</strong> — extraction automatique à finaliser</li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-1">ℹ Note importante — Source des données INAMI</p>
            <p className="text-xs text-blue-700">
              Comme le précise Medispring dans sa documentation : « Toutes les données permettant le calcul de vos primes ne sont pas tirées du logiciel mais des plateformes gouvernementales (Hubs, MyCareNet, ProSanté). »
              Les chiffres affichés ici sont une <strong>estimation basée sur vos données locales</strong>. Le score officiel est calculé par l'INAMI lors de votre demande via ProSanté.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}