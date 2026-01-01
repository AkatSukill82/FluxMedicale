import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  User,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { nissValidator } from '../eid/nissValidator';

// Simulation de données du Registre National
const simulateRNData = (niss) => {
  const normalized = nissValidator.normalize(niss);
  if (!normalized || normalized.length !== 11) return null;

  // Extraire infos du NISS
  const yearPart = normalized.substring(0, 2);
  const monthPart = normalized.substring(2, 4);
  const dayPart = normalized.substring(4, 6);
  const seqPart = parseInt(normalized.substring(6, 9));
  
  // Déterminer le siècle
  const checksum = parseInt(normalized.substring(9, 11));
  const fullNiss = parseInt(normalized.substring(0, 9));
  const is2000 = (97 - (parseInt('2' + normalized.substring(0, 9)) % 97)) === checksum;
  
  const century = is2000 ? '20' : '19';
  const birthYear = century + yearPart;
  const birthDate = `${birthYear}-${monthPart}-${dayPart}`;
  
  // Genre basé sur le numéro de séquence
  const gender = seqPart % 2 === 1 ? 'M' : 'F';

  // Données simulées
  return {
    niss: normalized,
    nom: 'DUPONT',
    prenom: gender === 'M' ? 'Jean' : 'Marie',
    date_naissance: birthDate,
    lieu_naissance: 'Bruxelles',
    sexe: gender,
    nationalite: 'Belge',
    adresse: {
      rue: 'Rue de la Loi',
      numero: '16',
      code_postal: '1000',
      commune: 'Bruxelles'
    },
    etat_civil: 'Célibataire',
    statut: 'actif',
    date_consultation: new Date().toISOString(),
    source: 'Registre National (simulation)'
  };
};

export default function ConsultRNPanel({ patient, onUpdatePatient }) {
  const [searchNiss, setSearchNiss] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [rnData, setRnData] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Récupérer le NISS du patient s'il existe
  const patientNiss = patient?.identifier?.find(
    id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
  )?.value;

  const handleSearch = async () => {
    const nissToSearch = searchNiss || patientNiss;
    if (!nissToSearch) {
      toast.error('Veuillez entrer un NISS');
      return;
    }

    const validation = nissValidator.validate(nissToSearch);
    if (!validation.isValid) {
      toast.error(validation.error || 'NISS invalide');
      return;
    }

    setIsSearching(true);

    // Simulation d'appel au Registre National
    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = simulateRNData(nissToSearch);
    if (data) {
      setRnData(data);
      setShowModal(true);

      // Log audit
      if (currentUser) {
        await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: 'CONSULT_RN',
          target_entity: 'Patient',
          target_id: patient?.id || 'new',
          details: `Consultation Registre National - NISS: ${nissValidator.format(nissToSearch, true)}`,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
    } else {
      toast.error('Aucune donnée trouvée pour ce NISS');
    }

    setIsSearching(false);
  };

  const handleImportData = async () => {
    if (!rnData || !onUpdatePatient) return;

    const updatedData = {
      name: [{
        use: 'official',
        family: rnData.nom,
        given: [rnData.prenom]
      }],
      birthDate: rnData.date_naissance,
      gender: rnData.sexe === 'M' ? 'male' : 'female',
      address: [{
        line: [`${rnData.adresse.rue} ${rnData.adresse.numero}`],
        city: rnData.adresse.commune,
        postalCode: rnData.adresse.code_postal,
        country: 'BE'
      }],
      identifier: [{
        system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin',
        value: rnData.niss
      }]
    };

    onUpdatePatient(updatedData);
    setShowModal(false);
    toast.success('Données importées depuis le Registre National');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-blue-600" />
            Consultation Registre National
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Shield className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              Service eHealth ConsultRN - Vérification d'identité via le Registre National belge.
              <br />
              <span className="text-xs text-blue-700">Mode simulation actif</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Numéro NISS / INSZ</Label>
            <div className="flex gap-2">
              <Input
                value={searchNiss || patientNiss || ''}
                onChange={(e) => setSearchNiss(e.target.value)}
                placeholder="XX.XX.XX-XXX.XX ou 11 chiffres"
                className="font-mono"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {patientNiss && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                NISS enregistré: <code className="font-mono">{nissValidator.format(patientNiss)}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal résultats RN */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Données du Registre National
            </DialogTitle>
          </DialogHeader>

          {rnData && (
            <div className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  Données simulées - En production, ces données proviendraient du service ConsultRN eHealth.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Nom</p>
                  <p className="font-semibold">{rnData.nom}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Prénom</p>
                  <p className="font-semibold">{rnData.prenom}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Date de naissance</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(rnData.date_naissance), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Sexe</p>
                  <p className="font-semibold">{rnData.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg col-span-2">
                  <p className="text-xs text-muted-foreground">NISS</p>
                  <p className="font-mono font-semibold">{nissValidator.format(rnData.niss)}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Adresse
                </p>
                <p className="font-semibold">
                  {rnData.adresse.rue} {rnData.adresse.numero}
                </p>
                <p className="text-sm text-muted-foreground">
                  {rnData.adresse.code_postal} {rnData.adresse.commune}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Statut: {rnData.statut}
                </Badge>
                <Badge variant="outline">{rnData.nationalite}</Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Consulté le {format(new Date(rnData.date_consultation), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Fermer
            </Button>
            {onUpdatePatient && (
              <Button onClick={handleImportData}>
                <Download className="w-4 h-4 mr-2" />
                Importer les données
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}