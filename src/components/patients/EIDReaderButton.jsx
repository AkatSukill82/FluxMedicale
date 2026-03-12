import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  RefreshCw,
  User,
  HelpCircle,
  Keyboard
} from 'lucide-react';
import { useEIDReader } from '../eid/useEIDReader';
import DuplicateResolutionDialog from '../eid/DuplicateResolutionDialog';
import EIDInstallationWizard from '../eid/EIDInstallationWizard';
import ManualNISSEntry from '../eid/ManualNISSEntry';

export default function EIDReaderButton({ 
  onPatientFound, 
  onPatientCreated,
  variant = "default",
  size = "default",
  className = ""
}) {
  const { isReading, error, eidStatus, readEID, detectMiddleware } = useEIDReader();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  const handleReadEID = async () => {
    // Si aucun middleware n'est détecté, montrer le modal d'installation
    if (!eidStatus.hasMiddleware && !eidStatus.hasWebEid && !eidStatus.hasEContract) {
      setShowInstallModal(true);
      return;
    }

    const result = await readEID();
    
    if (result?.status === 'MATCH' && onPatientFound) {
      onPatientFound(result.patient);
    } else if (result?.status === 'CREATED' && onPatientCreated) {
      onPatientCreated(result.patient);
    } else if (result?.status === 'DUPLICATES') {
      setDuplicateData(result);
    } else if (result?.status === 'NO_MIDDLEWARE' || result?.status === 'ERROR') {
      // Si erreur de middleware, proposer saisie manuelle
      setShowInstallModal(true);
    }
  };

  const handleDuplicateResolved = (patient) => {
    setDuplicateData(null);
    if (onPatientFound) {
      onPatientFound(patient);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handleReadEID}
          disabled={isReading}
          variant={variant}
          size={size}
          className={className}
        >
          {isReading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Lecture eID...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Lire eID
            </>
          )}
        </Button>
        <Button
          onClick={() => setShowManualEntry(true)}
          variant="outline"
          size={size}
        >
          <Keyboard className="w-4 h-4 mr-2" />
          NISS
        </Button>
      </div>

      {/* Modal saisie manuelle NISS */}
      <ManualNISSEntry
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onPatientFound={onPatientFound}
        onPatientCreated={onPatientCreated}
      />

      {/* Modal d'installation / fallback */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Lecteur eID non détecté
            </DialogTitle>
            <DialogDescription>
              Pour lire les données de la carte eID depuis le navigateur, installez Web-eID (recommandé) ou utilisez la saisie manuelle du NISS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Saisie manuelle — option prioritaire */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Saisie manuelle du NISS</h4>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Entrez le numéro national du patient pour ouvrir ou créer son dossier sans lecteur de carte.
              </p>
              <Button
                onClick={() => {
                  setShowInstallModal(false);
                  setShowManualEntry(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Saisir le NISS manuellement
              </Button>
            </Card>

            {/* Web-eID - Recommandé */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Web-eID (Recommandé)</h4>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Solution moderne et officielle. Fonctionne avec Chrome, Firefox, Edge et Safari.
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside mb-3 text-green-700">
                <li>Téléchargez et installez Web-eID</li>
                <li>Activez l'extension dans votre navigateur</li>
                <li>Insérez votre carte eID et cliquez sur "Lire eID"</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => window.open('https://web-eid.eu/', '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Installer Web-eID
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://chromewebstore.google.com/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic', '_blank')}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Extension Chrome
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://addons.mozilla.org/firefox/addon/web-eid-webextension/', '_blank')}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Extension Firefox
                </Button>
              </div>
            </Card>

            {/* Alternative: e-Contract.be */}
            <Card className="p-4 bg-slate-50 border-slate-200">
              <h4 className="font-semibold mb-2 text-slate-700">Alternative: e-Contract.be</h4>
              <p className="text-sm text-slate-600 mb-2">
                Si Web-eID ne fonctionne pas, vous pouvez utiliser le middleware e-Contract.be.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://www.e-contract.be/products/eid-browser-middleware', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                e-Contract.be Middleware
              </Button>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const status = await detectMiddleware();
                  if (status.hasMiddleware || status.isDetected) {
                    setShowInstallModal(false);
                  }
                }}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Vérifier à nouveau
              </Button>
              
              <Button
                onClick={() => {
                  setShowInstallModal(false);
                  if (onPatientCreated) {
                    onPatientCreated(null);
                  }
                }}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-2" />
                Créer manuellement
              </Button>
            </div>

            <Button
              variant="link"
              onClick={() => {
                setShowInstallModal(false);
                setShowWizard(true);
              }}
              className="w-full text-blue-600"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Besoin d'aide ? Lancer l'assistant d'installation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assistant d'installation */}
      <EIDInstallationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          setShowWizard(false);
          detectMiddleware();
        }}
      />

      {/* Modal de résolution des doublons */}
      {duplicateData && (
        <DuplicateResolutionDialog
          isOpen={!!duplicateData}
          onClose={() => setDuplicateData(null)}
          patients={duplicateData.patients}
          eidData={duplicateData.eidData}
          niss={duplicateData.niss}
          onResolved={handleDuplicateResolved}
        />
      )}
    </>
  );
}