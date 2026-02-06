import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ExternalLink,
  RefreshCw,
  User
} from 'lucide-react';
import { useEIDReader } from '../eid/useEIDReader';
import { createPageUrl } from '@/utils';
import DuplicateResolutionDialog from '../eid/DuplicateResolutionDialog';

export default function EIDReaderButton({ 
  onPatientFound, 
  onPatientCreated,
  variant = "default",
  size = "default",
  className = ""
}) {
  const { isReading, error, eidStatus, readEID, detectMiddleware } = useEIDReader();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  const handleReadEID = async () => {
    // Si le middleware n'est pas détecté, montrer le modal d'installation
    if (!eidStatus.hasMiddleware && !eidStatus.isDetected) {
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
            Lire carte eID
          </>
        )}
      </Button>

      {/* Modal d'installation */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Lecteur eID non détecté
            </DialogTitle>
            <DialogDescription>
              Pour lire les données de la carte eID depuis le navigateur, installez Web-eID (recommandé).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Web-eID - Recommandé */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Web-eID (Recommandé)</h4>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Solution moderne et officielle, supportée par le gouvernement belge. Fonctionne avec Chrome, Firefox, Edge et Safari.
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside mb-3 text-green-700">
                <li>Téléchargez et installez Web-eID</li>
                <li>Activez l'extension dans votre navigateur</li>
                <li>Insérez votre carte eID et cliquez sur "Lire"</li>
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

            {/* Prérequis */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-800">Prérequis</h4>
              <p className="text-sm text-blue-700 mb-2">
                Le logiciel eID officiel doit être installé sur votre ordinateur.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://eid.belgium.be/fr/telechargements', '_blank')}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Télécharger eID Viewer
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
          </div>
        </DialogContent>
      </Dialog>

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