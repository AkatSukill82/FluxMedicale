import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';
import { nissValidator } from './nissValidator';
import { toast } from 'sonner';

const SSIN_SYSTEM = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';

function parseNISS(niss) {
  if (!niss || niss.length !== 11) return {};
  const year = parseInt(niss.substring(0, 2));
  const month = parseInt(niss.substring(2, 4));
  const day = parseInt(niss.substring(4, 6));
  const seq = parseInt(niss.substring(6, 9));
  const currentYear = new Date().getFullYear() % 100;
  const century = year > currentYear ? 1900 : 2000;
  return {
    birthDate: `${century + year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    gender: seq % 2 === 1 ? 'male' : 'female'
  };
}

export default function ManualNISSEntry({ isOpen, onClose, onPatientFound, onPatientCreated }) {
  const [niss, setNiss] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // null, 'found', 'not_found'
  const [foundPatient, setFoundPatient] = useState(null);
  const [nissError, setNissError] = useState('');

  const handleNISSChange = (value) => {
    // Auto-format: allow digits, dots, dashes
    const raw = value.replace(/[^0-9.-]/g, '');
    setNiss(raw);
    setNissError('');
    setSearchResult(null);
    setFoundPatient(null);
  };

  const handleSearch = async () => {
    const normalized = nissValidator.normalize(niss);
    const validation = nissValidator.validate(normalized);

    if (!validation.isValid) {
      setNissError(validation.error);
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    const allPatients = await base44.entities.Patient.list();
    const matchingPatients = allPatients.filter(p =>
      p.identifier?.some(id =>
        id.system === SSIN_SYSTEM &&
        nissValidator.normalize(id.value) === normalized
      )
    );

    if (matchingPatients.length >= 1) {
      setSearchResult('found');
      setFoundPatient(matchingPatients[0]);
    } else {
      setSearchResult('not_found');
      // Pre-fill from NISS
      const parsed = parseNISS(normalized);
      if (parsed.birthDate) {
        // Keep empty for user to fill
      }
    }

    setIsSearching(false);
  };

  const handleOpenPatient = () => {
    if (foundPatient && onPatientFound) {
      onPatientFound(foundPatient);
      toast.success('Patient trouvé et ouvert');
      handleReset();
      onClose();
    }
  };

  const handleCreatePatient = async () => {
    const normalized = nissValidator.normalize(niss);

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez renseigner le nom et le prénom');
      return;
    }

    setIsSearching(true);
    const parsed = parseNISS(normalized);

    const newPatient = await base44.entities.Patient.create({
      identifier: [{ system: SSIN_SYSTEM, value: normalized }],
      name: [{ use: 'official', family: lastName.trim(), given: [firstName.trim()] }],
      gender: parsed.gender || 'unknown',
      birthDate: parsed.birthDate || '',
      statut: 'Actif'
    });

    const currentUser = await base44.auth.me();
    await base44.entities.AuditLog.create({
      user_email: currentUser.email,
      action: 'MANUAL_PATIENT_CREATED',
      target_entity: 'Patient',
      target_id: newPatient.id,
      details: `Patient créé manuellement via NISS: ${firstName} ${lastName}`,
      timestamp: new Date().toISOString()
    }).catch(console.error);

    toast.success('Nouveau patient créé');
    if (onPatientCreated) onPatientCreated(newPatient);
    handleReset();
    onClose();

    setIsSearching(false);
  };

  const handleReset = () => {
    setNiss('');
    setFirstName('');
    setLastName('');
    setSearchResult(null);
    setFoundPatient(null);
    setNissError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && niss.length >= 11) {
      handleSearch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Recherche par NISS
          </DialogTitle>
          <DialogDescription>
            Saisissez le numéro national du patient pour ouvrir ou créer son dossier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* NISS Input */}
          <div>
            <Label className="text-sm font-medium">Numéro national (NISS)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="YY.MM.DD-XXX.XX"
                value={niss}
                onChange={(e) => handleNISSChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="font-mono text-lg"
                autoFocus
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || niss.replace(/[^0-9]/g, '').length < 11}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {nissError && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {nissError}
              </p>
            )}
          </div>

          {/* Result: Patient found */}
          {searchResult === 'found' && foundPatient && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Patient trouvé</span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-green-900">
                  {(foundPatient.name?.[0]?.given || []).join(' ')} {foundPatient.name?.[0]?.family || ''}
                </p>
                {foundPatient.birthDate && (
                  <p className="text-green-700">Né(e) le {new Date(foundPatient.birthDate).toLocaleDateString('fr-BE')}</p>
                )}
                <Badge variant="outline" className="mt-1 font-mono text-xs">
                  {nissValidator.format(nissValidator.normalize(niss))}
                </Badge>
              </div>
              <Button onClick={handleOpenPatient} className="w-full bg-green-600 hover:bg-green-700">
                Ouvrir le dossier
              </Button>
            </div>
          )}

          {/* Result: Not found — Create */}
          {searchResult === 'not_found' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-800">Patient non trouvé</span>
              </div>
              <p className="text-sm text-amber-700">
                Aucun patient avec ce NISS. Complétez les informations pour créer un nouveau dossier.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Prénom</Label>
                  <Input
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Nom</Label>
                  <Input
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              {(() => {
                const parsed = parseNISS(nissValidator.normalize(niss));
                return parsed.birthDate ? (
                  <p className="text-xs text-amber-600">
                    📅 Né(e) le {new Date(parsed.birthDate).toLocaleDateString('fr-BE')} • {parsed.gender === 'male' ? '♂ Masculin' : '♀ Féminin'}
                    <span className="text-amber-500 ml-1">(déduit du NISS)</span>
                  </p>
                ) : null;
              })()}
              <Button
                onClick={handleCreatePatient}
                disabled={isSearching || !firstName.trim() || !lastName.trim()}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Créer le patient
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}