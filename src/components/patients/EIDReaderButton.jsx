import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CreditCard, Loader2, Keyboard, Stethoscope } from 'lucide-react';
import { useEIDReader } from '../eid/useEIDReader';
import DuplicateResolutionDialog from '../eid/DuplicateResolutionDialog';
import ManualNISSLookup from '../eid/ManualNISSLookup';
import EIDDiagnostic from '../eid/EIDDiagnostic';

export default function EIDReaderButton({
  onPatientFound,
  onPatientCreated,
  variant = 'default',
  size = 'default',
  className = '',
}) {
  const { isReading, readEID } = useEIDReader();
  const [duplicateData, setDuplicateData] = useState(null);
  const [showManualLookup, setShowManualLookup] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const handleReadEID = async () => {
    const result = await readEID();
    if (!result) return;

    if (result.status === 'MATCH' && onPatientFound) {
      setFailCount(0);
      onPatientFound(result.patient);
    } else if (result.status === 'CREATED' && onPatientCreated) {
      setFailCount(0);
      onPatientCreated(result.patient);
    } else if (result.status === 'DUPLICATES') {
      setDuplicateData(result);
    } else if (result.status === 'NO_MIDDLEWARE' || result.status === 'ERROR') {
      setFailCount((n) => n + 1);
      setShowManualLookup(true);
    }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleReadEID} disabled={isReading} variant={variant} size={size} className={className}>
          {isReading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lecture eID…</>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" />Lire carte eID</>
          )}
        </Button>

        <Button onClick={() => setShowManualLookup(true)} variant="outline" size={size}>
          <Keyboard className="w-4 h-4 mr-2" />
          NISS
        </Button>

        {/* Bouton diagnostic — apparaît après un échec ou toujours en outline */}
        <Button
          onClick={() => setShowDiagnostic(true)}
          variant="ghost"
          size={size}
          title="Diagnostic lecteur eID"
          className="text-slate-400 hover:text-slate-700"
        >
          <Stethoscope className="w-4 h-4" />
        </Button>
      </div>

      {/* Diagnostic eID */}
      <Dialog open={showDiagnostic} onOpenChange={setShowDiagnostic}>
        <DialogContent className="max-w-lg p-0">
          <EIDDiagnostic onClose={() => setShowDiagnostic(false)} />
        </DialogContent>
      </Dialog>

      {/* Saisie manuelle NISS */}
      <ManualNISSLookup
        isOpen={showManualLookup}
        onClose={() => setShowManualLookup(false)}
        onPatientFound={(p) => { if (onPatientFound) onPatientFound(p); }}
        onPatientCreated={(p) => { if (onPatientCreated) onPatientCreated(p); }}
      />

      {/* Doublons */}
      {duplicateData && (
        <DuplicateResolutionDialog
          isOpen={!!duplicateData}
          onClose={() => setDuplicateData(null)}
          patients={duplicateData.patients}
          eidData={duplicateData.eidData}
          niss={duplicateData.niss}
          onResolved={(patient) => { setDuplicateData(null); if (onPatientFound) onPatientFound(patient); }}
        />
      )}
    </>
  );
}
