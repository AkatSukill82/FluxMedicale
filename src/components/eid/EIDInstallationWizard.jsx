import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Monitor,
  Apple,
  Chrome,
  Smartphone,
  Download,
  Settings,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe,
  Shield
} from 'lucide-react';
import { eidDetectionService } from './eidDetectionService';
import { webEidService } from './webEidService';

const STEPS = [
  { id: 'detect', label: 'Détection', icon: Settings },
  { id: 'prerequisites', label: 'Prérequis', icon: Download },
  { id: 'install', label: 'Installation', icon: Shield },
  { id: 'extension', label: 'Extension', icon: Globe },
  { id: 'test', label: 'Test', icon: CreditCard }
];

export default function EIDInstallationWizard({ isOpen, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [platform, setPlatform] = useState(null);
  const [browser, setBrowser] = useState(null);
  const [detection, setDetection] = useState({
    checking: false,
    eidOfficial: null,
    webEid: null,
    eContract: null
  });
  const [installMethod, setInstallMethod] = useState('web-eid'); // 'web-eid' ou 'e-contract'

  useEffect(() => {
    if (isOpen) {
      detectEnvironment();
    }
  }, [isOpen]);

  const detectEnvironment = async () => {
    const detectedPlatform = eidDetectionService.detectPlatform();
    const detectedBrowser = eidDetectionService.detectBrowser();
    setPlatform(detectedPlatform);
    setBrowser(detectedBrowser);
    
    // Vérifier ce qui est déjà installé
    await checkInstallation();
  };

  const checkInstallation = async () => {
    setDetection(prev => ({ ...prev, checking: true }));
    
    const status = await eidDetectionService.detectEIDMiddleware();
    
    setDetection({
      checking: false,
      eidOfficial: null, // On ne peut pas vraiment détecter ça
      webEid: status.hasWebEid,
      eContract: status.hasEContract
    });

    // Si tout est OK, aller directement au test
    if (status.hasWebEid || status.hasEContract) {
      setCurrentStep(4); // Step test
    }
  };

  const getPlatformInfo = () => {
    const info = {
      windows: { name: 'Windows', icon: Monitor, color: 'blue' },
      macos: { name: 'macOS', icon: Apple, color: 'slate' },
      linux: { name: 'Linux', icon: Monitor, color: 'orange' },
      unknown: { name: 'Système inconnu', icon: Monitor, color: 'gray' }
    };
    return info[platform] || info.unknown;
  };

  const getBrowserInfo = () => {
    const info = {
      chrome: { name: 'Chrome', icon: Chrome, color: 'green' },
      firefox: { name: 'Firefox', icon: Globe, color: 'orange' },
      edge: { name: 'Edge', icon: Globe, color: 'blue' },
      safari: { name: 'Safari', icon: Globe, color: 'blue' },
      unknown: { name: 'Navigateur', icon: Globe, color: 'gray' }
    };
    return info[browser] || info.unknown;
  };

  const getDownloadLinks = () => {
    const links = eidDetectionService.getInstallationLinks();
    return links;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${isCompleted ? 'bg-green-500 text-white' : 
                  isActive ? 'bg-blue-500 text-white' : 
                  'bg-slate-100 text-slate-400'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderDetectionStep = () => {
    const platformInfo = getPlatformInfo();
    const browserInfo = getBrowserInfo();
    const PlatformIcon = platformInfo.icon;
    const BrowserIcon = browserInfo.icon;

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Détection de votre environnement</h3>
          <p className="text-sm text-slate-600">Nous analysons votre système pour vous guider au mieux.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <PlatformIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="font-medium">{platformInfo.name}</p>
            <Badge variant="outline" className="mt-1">{platform}</Badge>
          </Card>
          <Card className="p-4 text-center">
            <BrowserIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="font-medium">{browserInfo.name}</p>
            <Badge variant="outline" className="mt-1">{browser}</Badge>
          </Card>
        </div>

        <Card className="p-4">
          <h4 className="font-medium mb-3">État actuel :</h4>
          <div className="space-y-2">
            <StatusItem 
              label="Web-eID" 
              status={detection.checking ? 'checking' : detection.webEid ? 'ok' : 'missing'}
              description={detection.webEid ? 'Installé et fonctionnel' : 'Non détecté'}
            />
            <StatusItem 
              label="e-Contract.be (alternatif)" 
              status={detection.checking ? 'checking' : detection.eContract ? 'ok' : 'missing'}
              description={detection.eContract ? 'Installé et fonctionnel' : 'Non détecté'}
            />
          </div>
        </Card>

        {(detection.webEid || detection.eContract) ? (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Votre système est prêt !</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Vous pouvez utiliser la lecture de carte eID.
            </p>
          </Card>
        ) : (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Installation requise</span>
            </div>
            <p className="text-sm text-amber-600 mt-1">
              Suivez les étapes suivantes pour configurer la lecture eID.
            </p>
          </Card>
        )}

        <Button 
          onClick={() => checkInstallation()} 
          variant="outline" 
          className="w-full"
          disabled={detection.checking}
        >
          {detection.checking ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Vérifier à nouveau
        </Button>
      </div>
    );
  };

  const renderPrerequisitesStep = () => {
    const links = getDownloadLinks();
    
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Prérequis : logiciel eID officiel</h3>
          <p className="text-sm text-slate-600">
            Le logiciel eID officiel belge doit être installé sur votre ordinateur.
          </p>
        </div>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium mb-2 text-blue-800">Téléchargement pour {getPlatformInfo().name}</h4>
          <p className="text-sm text-blue-700 mb-3">
            Ce logiciel permet à votre ordinateur de communiquer avec le lecteur de carte.
          </p>
          
          <Button
            onClick={() => {
              const url = platform === 'windows' ? links.official.windows :
                         platform === 'macos' ? links.official.macos :
                         links.official.viewer;
              window.open(url, '_blank');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger eID Viewer pour {getPlatformInfo().name}
          </Button>
          
          <Button
            variant="link"
            onClick={() => window.open(links.official.viewer, '_blank')}
            className="w-full mt-2 text-blue-600"
          >
            Voir toutes les versions
          </Button>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Après l'installation :</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside text-slate-600">
            <li>Redémarrez votre ordinateur si demandé</li>
            <li>Connectez votre lecteur de carte USB</li>
            <li>Insérez votre carte eID dans le lecteur</li>
            <li>Ouvrez eID Viewer pour vérifier que la carte est lue</li>
          </ol>
        </Card>

        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
          <input 
            type="checkbox" 
            id="prereq-done" 
            className="rounded"
            onChange={(e) => {
              if (e.target.checked) {
                // Permettre de continuer
              }
            }}
          />
          <label htmlFor="prereq-done" className="text-sm">
            J'ai installé eID Viewer et ma carte est lue correctement
          </label>
        </div>
      </div>
    );
  };

  const renderInstallStep = () => {
    const links = getDownloadLinks();
    
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Installation du middleware web</h3>
          <p className="text-sm text-slate-600">
            Choisissez et installez le middleware pour accéder à la carte depuis le navigateur.
          </p>
        </div>

        {/* Choix du middleware */}
        <div className="grid gap-3">
          <Card 
            className={`p-4 cursor-pointer transition-all ${
              installMethod === 'web-eid' 
                ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                : 'hover:border-slate-300'
            }`}
            onClick={() => setInstallMethod('web-eid')}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                installMethod === 'web-eid' ? 'border-green-500 bg-green-500' : 'border-slate-300'
              }`}>
                {installMethod === 'web-eid' && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-green-800">Web-eID</h4>
                  <Badge className="bg-green-100 text-green-700">Recommandé</Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Solution moderne et officielle. Supportée par les gouvernements européens.
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className={`p-4 cursor-pointer transition-all ${
              installMethod === 'e-contract' 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'hover:border-slate-300'
            }`}
            onClick={() => setInstallMethod('e-contract')}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                installMethod === 'e-contract' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {installMethod === 'e-contract' && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">e-Contract.be</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Alternative si Web-eID ne fonctionne pas.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Instructions spécifiques */}
        {installMethod === 'web-eid' ? (
          <Card className="p-4 bg-green-50 border-green-200">
            <h4 className="font-medium mb-3 text-green-800">
              Installation Web-eID pour {getPlatformInfo().name}
            </h4>
            <ol className="text-sm space-y-2 list-decimal list-inside text-green-700 mb-4">
              {platform === 'windows' && (
                <>
                  <li>Téléchargez le fichier .exe ci-dessous</li>
                  <li>Exécutez l'installateur et suivez les instructions</li>
                  <li>L'extension navigateur sera installée automatiquement</li>
                </>
              )}
              {platform === 'macos' && (
                <>
                  <li>Téléchargez le fichier .dmg ci-dessous</li>
                  <li>Ouvrez le fichier et glissez l'application dans Applications</li>
                  <li>Pour Safari, installez depuis l'App Store</li>
                </>
              )}
              {platform === 'linux' && (
                <>
                  <li>Ouvrez un terminal</li>
                  <li>Exécutez la commande d'installation (voir site web)</li>
                  <li>Installez l'extension navigateur manuellement</li>
                </>
              )}
            </ol>
            <Button
              onClick={() => {
                const url = platform === 'windows' ? links.webEid.windows :
                           platform === 'macos' ? links.webEid.macos :
                           links.webEid.main;
                window.open(url, '_blank');
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger Web-eID
            </Button>
          </Card>
        ) : (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium mb-3 text-blue-800">
              Installation e-Contract.be
            </h4>
            <ol className="text-sm space-y-2 list-decimal list-inside text-blue-700 mb-4">
              <li>Téléchargez le middleware depuis le site</li>
              <li>Installez Java si nécessaire (pour le fichier .jar)</li>
              <li>Lancez le middleware - une icône apparaît dans la barre des tâches</li>
            </ol>
            <Button
              onClick={() => window.open(links.eContract.main, '_blank')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger e-Contract.be
            </Button>
          </Card>
        )}
      </div>
    );
  };

  const renderExtensionStep = () => {
    const links = getDownloadLinks();
    const browserInfo = getBrowserInfo();
    
    if (installMethod !== 'web-eid') {
      // e-Contract n'a pas besoin d'extension
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">Extension navigateur</h3>
            <p className="text-sm text-slate-600">
              e-Contract.be ne nécessite pas d'extension navigateur.
            </p>
          </div>
          <Card className="p-4 bg-green-50 border-green-200 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p className="font-medium text-green-700">
              Vous pouvez passer à l'étape suivante
            </p>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Extension navigateur Web-eID</h3>
          <p className="text-sm text-slate-600">
            Activez l'extension Web-eID dans {browserInfo.name}.
          </p>
        </div>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <h4 className="font-medium mb-2 text-amber-800">Important</h4>
          <p className="text-sm text-amber-700">
            L'extension est souvent installée automatiquement avec Web-eID. 
            Vérifiez qu'elle est activée dans votre navigateur.
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3">Pour {browserInfo.name} :</h4>
          
          {browser === 'chrome' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                1. Cliquez sur le bouton ci-dessous pour ouvrir le Chrome Web Store
              </p>
              <Button
                onClick={() => window.open(links.webEid.chromeExtension, '_blank')}
                className="w-full"
              >
                <Chrome className="w-4 h-4 mr-2" />
                Installer extension Chrome
              </Button>
              <p className="text-sm text-slate-600">
                2. Cliquez sur "Ajouter à Chrome"
              </p>
              <p className="text-sm text-slate-600">
                3. Confirmez l'installation dans la popup
              </p>
            </div>
          )}

          {browser === 'firefox' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                1. Cliquez sur le bouton ci-dessous pour ouvrir Firefox Add-ons
              </p>
              <Button
                onClick={() => window.open(links.webEid.firefoxExtension, '_blank')}
                className="w-full"
              >
                <Globe className="w-4 h-4 mr-2" />
                Installer extension Firefox
              </Button>
              <p className="text-sm text-slate-600">
                2. Cliquez sur "Ajouter à Firefox"
              </p>
            </div>
          )}

          {browser === 'edge' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Edge peut utiliser les extensions Chrome :
              </p>
              <Button
                onClick={() => window.open(links.webEid.chromeExtension, '_blank')}
                className="w-full"
              >
                <Globe className="w-4 h-4 mr-2" />
                Installer depuis Chrome Web Store
              </Button>
            </div>
          )}

          {browser === 'safari' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Pour Safari, installez depuis l'App Store :
              </p>
              <Button
                onClick={() => window.open(links.webEid.macosSafari, '_blank')}
                className="w-full"
              >
                <Apple className="w-4 h-4 mr-2" />
                Ouvrir l'App Store
              </Button>
            </div>
          )}
        </Card>

        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
          <input 
            type="checkbox" 
            id="ext-done" 
            className="rounded"
          />
          <label htmlFor="ext-done" className="text-sm">
            L'extension est installée et activée
          </label>
        </div>
      </div>
    );
  };

  const renderTestStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Test de la configuration</h3>
        <p className="text-sm text-slate-600">
          Vérifions que tout fonctionne correctement.
        </p>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Checklist avant le test :</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm">Lecteur de carte connecté</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm">Carte eID insérée</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm">{installMethod === 'web-eid' ? 'Web-eID' : 'e-Contract'} installé</span>
          </div>
          {installMethod === 'web-eid' && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm">Extension navigateur activée</span>
            </div>
          )}
        </div>
      </Card>

      <Button
        onClick={async () => {
          const status = await checkInstallation();
          if (detection.webEid || detection.eContract) {
            onSuccess?.();
            onClose();
          }
        }}
        className="w-full bg-green-600 hover:bg-green-700"
        disabled={detection.checking}
      >
        {detection.checking ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        Tester la lecture eID
      </Button>

      {(detection.webEid || detection.eContract) && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Configuration réussie !</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Vous pouvez maintenant utiliser la lecture de carte eID.
          </p>
        </Card>
      )}

      {!detection.checking && !detection.webEid && !detection.eContract && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Middleware non détecté</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Vérifiez que {installMethod === 'web-eid' ? 'Web-eID' : 'e-Contract'} est bien lancé.
          </p>
        </Card>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderDetectionStep();
      case 1: return renderPrerequisitesStep();
      case 2: return renderInstallStep();
      case 3: return renderExtensionStep();
      case 4: return renderTestStep();
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Assistant d'installation eID
          </DialogTitle>
          <DialogDescription>
            Configuration de la lecture de carte d'identité électronique belge
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}
        
        <div className="min-h-[300px]">
          {renderCurrentStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onClose}
              variant="outline"
            >
              Fermer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Composant pour afficher le statut d'un élément
function StatusItem({ label, status, description }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div>
        {status === 'checking' && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
        {status === 'ok' && <CheckCircle className="w-5 h-5 text-green-500" />}
        {status === 'missing' && <Circle className="w-5 h-5 text-slate-300" />}
      </div>
    </div>
  );
}