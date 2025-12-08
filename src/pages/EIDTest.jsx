import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Terminal,
  Zap,
  ExternalLink
} from 'lucide-react';
import { eidDetectionService } from '../components/eid/eidDetectionService';
import { eidAgentService } from '../components/eid/eidAgentService';
import { toast } from 'sonner';

export default function EIDTestPage() {
  const [eidViewerStatus, setEidViewerStatus] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [lastCard, setLastCard] = useState(null);

  useEffect(() => {
    runAllTests();
  }, []);

  const runAllTests = async () => {
    await testEIDViewer();
    await testAgent();
  };

  const testEIDViewer = async () => {
    setIsTesting(true);
    toast.info('Test eID Viewer en cours...');
    
    const status = await eidDetectionService.detectEIDMiddleware();
    setEidViewerStatus(status);
    
    if (status.isDetected) {
      toast.success('✅ eID Viewer détecté');
    } else {
      toast.error('❌ eID Viewer non détecté');
    }
    
    setIsTesting(false);
  };

  const testAgent = async () => {
    setIsTesting(true);
    toast.info('Test Agent eID en cours...');
    
    const status = await eidAgentService.checkStatus();
    setAgentStatus(status);
    
    if (status.isRunning) {
      toast.success('✅ Agent eID actif');
    } else {
      toast.error('❌ Agent eID inactif');
    }
    
    setIsTesting(false);
  };

  const testSimulateInsertion = async () => {
    toast.info('Simulation insertion carte...');
    
    const success = await eidAgentService.simulateInsertion();
    
    if (success) {
      toast.success('✅ Simulation déclenchée');
      // Récupérer la dernière carte après 1s
      setTimeout(async () => {
        const card = await eidAgentService.getLastCard();
        setLastCard(card);
      }, 1000);
    } else {
      toast.error('❌ Simulation échouée - Agent en mode production ?');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tests eID & Agent Local</h1>
        <p className="text-slate-600">
          Page de diagnostic pour vérifier l'installation eID Viewer et l'agent local
        </p>
      </div>

      {/* Boutons actions */}
      <div className="flex gap-3">
        <Button
          onClick={testEIDViewer}
          disabled={isTesting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isTesting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Tester eID Viewer
        </Button>
        
        <Button
          onClick={testAgent}
          disabled={isTesting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isTesting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Activity className="w-4 h-4 mr-2" />
          )}
          Tester Agent eID
        </Button>

        <Button
          onClick={testSimulateInsertion}
          disabled={!agentStatus?.isRunning}
          variant="outline"
        >
          <Zap className="w-4 h-4 mr-2" />
          Simuler insertion
        </Button>

        <Button
          onClick={runAllTests}
          disabled={isTesting}
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tout re-tester
        </Button>
      </div>

      {/* Résultats eID Viewer */}
      {eidViewerStatus && (
        <Card className={eidViewerStatus.isDetected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {eidViewerStatus.isDetected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              eID Viewer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Statut:</span>{' '}
                <Badge className={eidViewerStatus.isDetected ? 'bg-green-600' : 'bg-red-600'}>
                  {eidViewerStatus.isDetected ? 'Détecté' : 'Non détecté'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Middleware:</span>{' '}
                {eidViewerStatus.hasMiddleware ? '✅' : '❌'}
              </div>
              <div>
                <span className="font-medium">Service Smart Card:</span>{' '}
                {eidViewerStatus.hasSmartCardService ? '✅' : '❌'}
              </div>
              <div>
                <span className="font-medium">Plateforme:</span>{' '}
                {eidViewerStatus.platform || 'Inconnue'}
              </div>
            </div>

            {!eidViewerStatus.isDetected && (
              <Alert className="bg-orange-50 border-orange-200 mt-3">
                <AlertDescription className="text-orange-900">
                  <strong>Action requise:</strong> Installez eID Viewer/Middleware depuis{' '}
                  <a 
                    href="https://eid.belgium.be/fr/telechargements" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    eid.belgium.be
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résultats Agent eID */}
      {agentStatus && (
        <Card className={agentStatus.isRunning ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {agentStatus.isRunning ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Agent eID Local
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Statut:</span>{' '}
                <Badge className={agentStatus.isRunning ? 'bg-green-600' : 'bg-red-600'}>
                  {agentStatus.isRunning ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Version:</span>{' '}
                {agentStatus.version || 'N/A'}
              </div>
              <div>
                <span className="font-medium">PC/SC disponible:</span>{' '}
                {agentStatus.pcscAvailable ? '✅' : '❌'}
              </div>
              <div>
                <span className="font-medium">Lecteurs détectés:</span>{' '}
                {agentStatus.readerCount}
              </div>
            </div>

            {agentStatus.isRunning && (
              <div className="text-xs text-green-700 bg-green-100 p-2 rounded">
                ✅ Agent opérationnel - WebSocket: ws://127.0.0.1:27272/events
              </div>
            )}

            {!agentStatus.isRunning && (
              <Alert className="bg-red-50 border-red-200 mt-3">
                <AlertDescription className="text-red-900">
                  <strong>Agent non détecté:</strong> L'agent local eID-listener n'est pas en cours d'exécution.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dernière carte lue */}
      {lastCard && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-600" />
              Dernière carte lue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">NISS:</span> {lastCard.niss}</div>
              <div><span className="font-medium">Horodatage:</span> {new Date(lastCard.time).toLocaleString('fr-BE')}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions installation agent */}
      <Card>
        <CardHeader>
          <CardTitle>Installation de l'agent eID-listener</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-slate-50 border-slate-200">
            <Terminal className="w-4 h-4" />
            <AlertDescription>
              <strong>Agent local requis:</strong> Pour l'auto-ouverture à l'insertion de carte, vous devez installer l'agent eID-listener.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">🪟 Windows</h4>
              <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs">
                # Télécharger eid-listener-setup.exe<br />
                # Installer en tant qu'administrateur<br />
                # Le service démarre automatiquement au démarrage<br />
                sc query "eID Listener Service"
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">🍎 macOS</h4>
              <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs">
                brew install eid-listener<br />
                brew services start eid-listener<br />
                # Ou télécharger le .pkg depuis le site
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">🐧 Linux</h4>
              <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs">
                sudo apt install eid-listener<br />
                sudo systemctl enable eid-listener<br />
                sudo systemctl start eid-listener<br />
                systemctl status eid-listener
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <h4 className="font-semibold text-slate-900 mb-2">Endpoints agent:</h4>
            <ul className="text-sm space-y-1 text-slate-700">
              <li>• <code className="bg-slate-100 px-2 py-1 rounded">GET http://127.0.0.1:27272/status</code> - Vérifier le statut</li>
              <li>• <code className="bg-slate-100 px-2 py-1 rounded">GET http://127.0.0.1:27272/last-card</code> - Dernière carte lue</li>
              <li>• <code className="bg-slate-100 px-2 py-1 rounded">WS ws://127.0.0.1:27272/events</code> - Événements en temps réel</li>
              <li>• <code className="bg-slate-100 px-2 py-1 rounded">POST http://127.0.0.1:27272/simulate</code> - Simuler insertion (mode dev)</li>
            </ul>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Activity className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Sécurité:</strong> L'agent fonctionne uniquement en localhost (127.0.0.1), aucune donnée n'est envoyée vers l'extérieur.
              Toutes les lectures sont auditées dans le journal de l'application.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('https://github.com/yourusername/eid-listener', '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger l'agent
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://github.com/yourusername/eid-listener/blob/main/README.md', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentation complète
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Note CSP */}
      <Alert className="bg-purple-50 border-purple-200">
        <AlertDescription className="text-purple-900 text-sm">
          <strong>Note technique:</strong> L'app autorise <code>http://127.0.0.1:27272</code> dans sa Content Security Policy (connect-src).
          Le WebSocket et les endpoints HTTP sont réservés au localhost uniquement.
        </AlertDescription>
      </Alert>
    </div>
  );
}