import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, UserPlus, ArrowRight } from 'lucide-react';
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

export default function ManualNISSLookup({ isOpen, onClose, onPatientFound, onPatientCreated }) {
  const [niss, setNiss] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // null | 'not_found' | patient object
  const [nissError, setNissError] = useState('');

  const reset = () => {
    setNiss('');
    setFirstName('');
    setLastName('');
    setIsSearching(false);
    setSearchResult(null);
    setNissError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSearch = async () => {
    const normalized = nissValidator.normalize(niss);
    const validation = nissValidator.validate(normalized);
    
    if (!validation.isValid) {
      setNissError(validation.error);
      return;
    }
    setNissError('');
    setIsSearching(true);

    const allPatients = await base44.entities.Patient.list('-created_date', 1000);
    const match = allPatients.find(p =>
      p.identifier?.some(id =>
        id.system === SSIN_SYSTEM &&
        nissValidator.normalize(id.value) === normalized
      )
    );

    if (match) {
      setSearchResult(match);
      setIsSearching(false);
    } else {
      setSearchResult('not_found');
      // Pre-fill from NISS
      const parsed = parseNISS(normalized);
      if (parsed.birthDate) {
        // Keep existing entries if user already typed something
      }
      setIsSearching(false);
    }
  };

  const handleOpenPatient = () => {
    if (searchResult && searchResult !== 'not_found') {
      onPatientFound(searchResult);
      handleClose();
    }
  };

  const handleCreatePatient = async () => {
    const normalized = nissValidator.normalize(niss);
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez saisir le nom et le prénom du patient.');
      return;
    }

    setIsSearching(true);
    const parsed = parseNISS(normalized);
    
    const newPatient = await base44.entities.Patient.create({
      identifier: [{ system: SSIN_SYSTEM, value: normalized }],
      name: [{ use: 'official', family: lastName.trim(), given: [firstName.trim()] }],
      gender: parsed.gender || 'unknown',
      birthDate: parsed.birthDate || null,
      statut: 'Actif'
    });

    const currentUser = await base44.auth.me();
    await base44.entities.AuditLog.create({
      user_email: currentUser.email,
      action: 'MANUAL_PATIENT_CREATED',
      target_entity: 'Patient',
      target_id: newPatient.id,
      details: `Patient créé manuellement: ${firstName} ${lastName} (NISS: ${nissValidator.format(normalized, true)})`,
      timestamp: new Date().toISOString()
    }).catch(console.error);

    toast.success(`Patient ${firstName} ${lastName} créé avec succès`);
    setIsSearching(false);
    onPatientCreated(newPatient);
    handleClose();
  };

  const normalizedNiss = nissValidator.normalize(niss);
  const parsed = normalizedNiss.length === 11 ? parseNISS(normalizedNiss) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recherche patient par NISS</DialogTitle>
          <DialogDescription>
            Saisissez le numéro national du patient pour ouvrir ou créer son dossier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* NISS Input */}
          <div>
            <Label htmlFor="niss">Numéro national (NISS)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="niss"
                placeholder="Ex: 85.07.15-123.45"
                value={niss}
                onChange={(e) => {
                  setNiss(e.target.value);
                  setSearchResult(null);
                  setNissError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono"
                autoFocus
              />
              <Button onClick={handleSearch} disabled={isSearching || !niss.trim()}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {nissError && <p className="text-sm text-red-600 mt-1">{nissError}</p>}
            {parsed && !nissError && normalizedNiss.length === 11 && (
              <p className="text-xs text-muted-foreground mt-1">
                Né(e) le {parsed.birthDate} • {parsed.gender === 'male' ? 'Masculin' : 'Féminin'}
              </p>
            )}
          </div>

          {/* Result: Patient found */}
          {searchResult && searchResult !== 'not_found' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-1">✅ Patient trouvé</p>
              <p className="text-green-700">
                {(searchResult.name?.[0]?.given || []).join(' ')} {searchResult.name?.[0]?.family}
              </p>
              {searchResult.birthDate && (
                <p className="text-xs text-green-600 mt-0.5">Né(e) le {searchResult.birthDate}</p>
              )}
              <Button onClick={handleOpenPatient} className="w-full mt-3 gap-2">
                <ArrowRight className="w-4 h-4" />
                Ouvrir le dossier
              </Button>
            </div>
          )}

          {/* Result: Not found - create */}
          {searchResult === 'not_found' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-amber-800">
                Aucun patient trouvé avec ce NISS
              </p>
              <p className="text-xs text-amber-700">
                Complétez les informations pour créer un nouveau dossier :
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-xs">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreatePatient}
                disabled={isSearching || !firstName.trim() || !lastName.trim()}
                className="w-full gap-2"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Créer le patient
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}