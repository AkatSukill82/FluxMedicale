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
              Pour utiliser la lecture de carte eID, vous devez installer le logiciel eID belge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold mb-2">Comment installer le lecteur eID ?</h4>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Téléchargez le logiciel eID depuis le site officiel</li>
                <li>Installez le logiciel sur votre ordinateur</li>
                <li>Connectez votre lecteur de carte</li>
                <li>Redémarrez votre navigateur</li>
              </ol>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('https://eid.belgium.be/fr/download', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Télécharger eID (site officiel)
              </Button>
              
              <Button
                variant="outline"
                onClick={async () => {
                  await detectMiddleware();
                  if (eidStatus.hasMiddleware || eidStatus.isDetected) {
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