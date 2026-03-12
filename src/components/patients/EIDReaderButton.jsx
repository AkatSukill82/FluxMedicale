import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Loader2, 
  Keyboard
} from 'lucide-react';
import { useEIDReader } from '../eid/useEIDReader';
import DuplicateResolutionDialog from '../eid/DuplicateResolutionDialog';
import ManualNISSLookup from '../eid/ManualNISSLookup';

export default function EIDReaderButton({ 
  onPatientFound, 
  onPatientCreated,
  variant = "default",
  size = "default",
  className = ""
}) {
  const { isReading, readEID } = useEIDReader();
  const [duplicateData, setDuplicateData] = useState(null);
  const [showManualLookup, setShowManualLookup] = useState(false);

  const handleReadEID = async () => {
    // Always attempt to read - don't block on middleware detection
    const result = await readEID();
    
    if (!result) return;

    if (result.status === 'MATCH' && onPatientFound) {
      onPatientFound(result.patient);
    } else if (result.status === 'CREATED' && onPatientCreated) {
      onPatientCreated(result.patient);
    } else if (result.status === 'DUPLICATES') {
      setDuplicateData(result);
    } else if (result.status === 'NO_MIDDLEWARE' || result.status === 'ERROR') {
      // Fallback: open manual NISS lookup
      setShowManualLookup(true);
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
              Lire carte eID
            </>
          )}
        </Button>
        <Button
          onClick={() => setShowManualLookup(true)}
          variant="outline"
          size={size}
        >
          <Keyboard className="w-4 h-4 mr-2" />
          NISS
        </Button>
      </div>

      {/* Manual NISS lookup dialog */}
      <ManualNISSLookup
        isOpen={showManualLookup}
        onClose={() => setShowManualLookup(false)}
        onPatientFound={(patient) => {
          if (onPatientFound) onPatientFound(patient);
        }}
        onPatientCreated={(patient) => {
          if (onPatientCreated) onPatientCreated(patient);
        }}
      />

      {/* Duplicate resolution dialog */}
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