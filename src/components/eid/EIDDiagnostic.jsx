/**
 * Composant de diagnostic eID — aide le médecin à identifier pourquoi
 * le lecteur de carte ne fonctionne pas.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { webEidService } from './webEidService';
import { eidAgentService } from './eidAgentService';

const Step = ({ label, status, detail }) => {
  const icon =
    status === 'ok'      ? <CheckCircle className="w-4 h-4 text-green-600" /> :
    status === 'error'   ? <XCircle     className="w-4 h-4 text-red-600"   /> :
    status === 'loading' ? <Loader2     className="w-4 h-4 animate-spin"   /> :
                           <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;

  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  );
};

export default function EIDDiagnostic({ onClose }) {
  const [steps, setSteps] = useState({
    extension: 'idle',
    agent27272: 'idle',
    agent35963: 'idle',
    certificate: 'idle',
  });
  const [details, setDetails] = useState({});
  const [running, setRunning] = useState(false);

  const update = (key, status, detail) => {
    setSteps(s => ({ ...s, [key]: status }));
    if (detail) setDetails(d => ({ ...d, [key]: detail }));
  };

  const run = async () => {
    setRunning(true);
    setSteps({ extension: 'loading', agent27272: 'idle', agent35963: 'idle', certificate: 'idle' });
    setDetails({});

    // 1. Extension Web-eID
    const extStatus = await webEidService.checkStatus();
    if (extStatus.isAvailable) {
      update('extension', 'ok', `Extension v${extStatus.extensionVersion || '?'} · App v${extStatus.libraryVersion || '?'}`);
    } else {
      update('extension', 'error', extStatus.error || 'Extension non détectée');
    }

    // 2. Agent local port 27272
    update('agent27272', 'loading');
    const agent = await eidAgentService.checkStatus();
    if (agent.isRunning) {
      update('agent27272', 'ok', `${agent.readerCount} lecteur(s) détecté(s)`);
    } else {
      update('agent27272', 'error', 'Agent non accessible sur http://127.0.0.1:27272');
    }

    // 3. e-Contract port 35963
    update('agent35963', 'loading');
    try {
      const r = await fetch('http://127.0.0.1:35963/v1/readers', {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) {
        const d = await r.json();
        update('agent35963', 'ok', `e-Contract actif · ${d.readers?.length ?? 0} lecteur(s)`);
      } else {
        update('agent35963', 'error', `HTTP ${r.status}`);
      }
    } catch {
      update('agent35963', 'error', 'e-Contract non accessible sur port 35963');
    }

    // 4. Lecture certificat (sans PIN)
    if (extStatus.isAvailable) {
      update('certificate', 'loading');
      try {
        const card = await webEidService.readCardData({ lang: 'fr' });
        update('certificate', 'ok', `Carte lue — NISS: ${card.nationalNumber ? '✓' : '?'}, Nom: ${card.lastName || '?'}`);
      } catch (err) {
        update('certificate', 'error', err.message);
      }
    } else {
      update('certificate', 'idle', 'Extension requise pour cette étape');
    }

    setRunning(false);
  };

  const allFailed = !running &&
    steps.extension === 'error' &&
    steps.agent27272 === 'error' &&
    steps.agent35963 === 'error';

  const extensionProblem = steps.extension === 'error';
  const links = webEidService.getInstallationLinks();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Diagnostic lecteur eID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={running} className="w-full">
          {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Diagnostic en cours…</> : 'Lancer le diagnostic'}
        </Button>

        <div className="space-y-0">
          <Step label="Extension Web-eID dans Chrome"  status={steps.extension}  detail={details.extension} />
          <Step label="Agent local eID Viewer (port 27272)" status={steps.agent27272} detail={details.agent27272} />
          <Step label="e-Contract middleware (port 35963)"  status={steps.agent35963} detail={details.agent35963} />
          <Step label="Lecture carte sans PIN" status={steps.certificate} detail={details.certificate} />
        </div>

        {extensionProblem && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 space-y-2">
              <p className="font-semibold">L'extension Web-eID n'est pas détectée sur cette page.</p>
              <p>Causes fréquentes :</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Extension pas installée → <a href={links.chromeExtension} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Installer l'extension Chrome <ExternalLink className="inline w-3 h-3" /></a></li>
                <li>Extension installée mais <strong>désactivée pour ce site</strong> → cliquez l'icône puzzle dans Chrome → Web-eID → "Activer sur ce site"</li>
                <li>Application native pas installée → <a href={links.windows} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Télécharger l'app Windows <ExternalLink className="inline w-3 h-3" /></a></li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {allFailed && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              <p className="font-semibold mb-1">Aucun middleware détecté.</p>
              <p>Solution recommandée (5 min) :</p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Installez l'<a href={links.chromeExtension} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">extension Chrome Web-eID</a></li>
                <li>Installez l'<a href={links.windows} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">application native Web-eID</a></li>
                <li>Relancez Chrome, ouvrez FluxMed, relancez le diagnostic</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {onClose && (
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        )}
      </CardContent>
    </Card>
  );
}
