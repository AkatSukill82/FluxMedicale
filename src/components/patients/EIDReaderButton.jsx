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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Lecteur eID non détecté
            </DialogTitle>
            <DialogDescription>
              Pour lire les données de la carte eID depuis le navigateur, un middleware spécifique est nécessaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-4 bg-amber-50 border-amber-200">
              <h4 className="font-semibold mb-2 text-amber-800">⚠️ Important</h4>
              <p className="text-sm text-amber-700 mb-2">
                Le logiciel eID officiel (eid.belgium.be) ne suffit pas. Pour lire les données de la carte depuis un navigateur, vous devez installer le <strong>eID Web Browser Middleware</strong> de e-Contract.be.
              </p>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold mb-2">Installation en 4 étapes :</h4>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Installez d'abord le logiciel eID officiel (si pas encore fait)</li>
                <li>Téléchargez le "eID Web Browser Middleware" (lien ci-dessous)</li>
                <li>Lancez le fichier .jar (nécessite Java) ou .exe</li>
                <li>L'icône eID apparaît dans la barre des tâches</li>
              </ol>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => window.open('https://www.e-contract.be/products/eid-browser-middleware', '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Télécharger eID Web Browser Middleware
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.open('https://eid.belgium.be/fr/telechargements', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                eID officiel (si pas installé)
              </Button>
              
              <Button
                variant="outline"
                onClick={async () => {
                  const status = await detectMiddleware();
                  if (status.hasMiddleware || status.isDetected) {
                    setShowInstallModal(false);
                  }
                }}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Vérifier à nouveau
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-slate-600 mb-2">Ou créez le patient manuellement :</p>
              <Button
                onClick={() => {
                  setShowInstallModal(false);
                  // Déclencher la création manuelle
                  if (onPatientCreated) {
                    onPatientCreated(null); // null indique création manuelle
                  }
                }}
                className="w-full"
              >
                <User className="w-4 h-4 mr-2" />
                Créer patient manuellement
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