import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Search, 
  Loader2, 
  CheckCircle, 
  XCircle,
  MapPin,
  Calendar,
  CreditCard,
  Info,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';

// Validation du numéro NISS belge (numéro national)
function validateNISS(niss) {
  // Supprimer les caractères non numériques
  const cleanNiss = niss.replace(/[^0-9]/g, '');
  
  if (cleanNiss.length !== 11) {
    return { valid: false, error: 'Le NISS doit contenir 11 chiffres' };
  }
  
  // Vérification du modulo 97
  const baseNumber = cleanNiss.substring(0, 9);
  const checkDigits = parseInt(cleanNiss.substring(9, 11), 10);
  
  // Pour les personnes nées après 2000, on ajoute 2 devant
  let mod97 = 97 - (parseInt(baseNumber, 10) % 97);
  
  if (mod97 !== checkDigits) {
    // Essayer avec préfixe 2 (nés après 2000)
    mod97 = 97 - (parseInt('2' + baseNumber, 10) % 97);
    if (mod97 !== checkDigits) {
      return { valid: false, error: 'Numéro de contrôle NISS invalide' };
    }
  }
  
  // Extraire date de naissance
  const year = cleanNiss.substring(0, 2);
  const month = cleanNiss.substring(2, 4);
  const day = cleanNiss.substring(4, 6);
  
  // Déterminer le siècle
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = parseInt(year, 10) > currentYear ? '19' + year : '20' + year;
  
  // Sexe: impair = homme, pair = femme
  const sexNumber = parseInt(cleanNiss.substring(6, 9), 10);
  const gender = sexNumber % 2 === 1 ? 'male' : 'female';
  
  return {
    valid: true,
    cleanNiss,
    birthDate: `${fullYear}-${month}-${day}`,
    gender
  };
}

// Simulation de consultation du Registre National
async function simulateRNConsultation(niss) {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const validation = validateNISS(niss);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }
  
  // Générer des données simulées basées sur le NISS
  const lastDigits = validation.cleanNiss.slice(-4);
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Michel', 'Anne', 'Philippe', 'Catherine'];
  const lastNames = ['Dupont', 'Martin', 'Dubois', 'Durand', 'Lefebvre', 'Moreau', 'Laurent', 'Simon'];
  const cities = ['Bruxelles', 'Anvers', 'Gand', 'Liège', 'Charleroi', 'Namur', 'Bruges', 'Louvain'];
  
  const nameIndex = parseInt(lastDigits, 10) % firstNames.length;
  const cityIndex = parseInt(lastDigits.slice(0, 2), 10) % cities.length;
  
  return {
    success: true,
    data: {
      niss: validation.cleanNiss,
      firstName: validation.gender === 'male' ? firstNames[nameIndex] : firstNames[(nameIndex + 4) % firstNames.length],
      lastName: lastNames[nameIndex],
      birthDate: validation.birthDate,
      gender: validation.gender,
      nationality: 'Belge',
      address: {
        street: `Rue de la ${cities[cityIndex]} ${Math.floor(Math.random() * 200) + 1}`,
        postalCode: `${1000 + cityIndex * 100}`,
        city: cities[cityIndex],
        country: 'Belgique'
      },
      civilStatus: 'Célibataire',
      registrationDate: '2020-01-15',
      photo: null // En production: URL de la photo si autorisée
    },
    source: 'SIMULATION',
    timestamp: new Date().toISOString()
  };
}

export default function ConsultRNService({ onPatientFound, initialNiss = '' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [niss, setNiss] = useState(initialNiss);
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Formater le NISS pour l'affichage
  const formatNissInput = (value) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    if (clean.length <= 6) return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4)}`;
    if (clean.length <= 9) return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4, 6)}-${clean.slice(6)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4, 6)}-${clean.slice(6, 9)}.${clean.slice(9, 11)}`;
  };

  const handleNissChange = (e) => {
    const formatted = formatNissInput(e.target.value);
    setNiss(formatted);
    setValidationError(null);
    
    // Validation en temps réel si 11 chiffres
    const clean = formatted.replace(/[^0-9]/g, '');
    if (clean.length === 11) {
      const validation = validateNISS(clean);
      if (!validation.valid) {
        setValidationError(validation.error);
      }
    }
  };

  const searchPatient = async () => {
    const cleanNiss = niss.replace(/[^0-9]/g, '');
    
    if (!cleanNiss) {
      toast.error('Veuillez entrer un numéro NISS');
      return;
    }
    
    if (cleanNiss.length !== 11) {
      toast.error('Le NISS doit contenir 11 chiffres');
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      const currentUser = await base44.auth.me();
      
      // Consultation simulée du Registre National
      const rnResult = await simulateRNConsultation(cleanNiss);
      
      if (!rnResult.success) {
        setValidationError(rnResult.error);
        toast.error(rnResult.error);
        return;
      }
      
      setResult(rnResult);
      
      // Audit de la consultation
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'CONSULT_RN',
        target_entity: 'Patient',
        target_id: cleanNiss,
        details: `Consultation Registre National - NISS: ${cleanNiss.slice(0, 6)}***${cleanNiss.slice(-2)}`,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Consultation effectuée avec succès');
      
    } catch (error) {
      console.error('Erreur consultation RN:', error);
      toast.error('Erreur lors de la consultation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseData = () => {
    if (result?.data && onPatientFound) {
      onPatientFound(result.data);
      toast.success('Données importées dans le formulaire patient');
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Consultation Registre National
          </div>
          <Badge variant="outline" className="text-xs">
            <Info className="w-3 h-3 mr-1" />
            Mode simulation
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Consultez les données d'identité officielles via le Registre National belge.
            L'accès réel nécessite un certificat eHealth et les autorisations appropriées.
          </AlertDescription>
        </Alert>

        {/* Recherche NISS */}
        <div className="space-y-2">
          <Label htmlFor="niss">Numéro NISS (Numéro National)</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="niss"
                value={niss}
                onChange={handleNissChange}
                placeholder="XX.XX.XX-XXX.XX"
                className={`font-mono text-lg ${validationError ? 'border-red-500' : ''}`}
                maxLength={15}
              />
              {niss && !validationError && niss.replace(/[^0-9]/g, '').length === 11 && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
            <Button 
              onClick={searchPatient} 
              disabled={isLoading || validationError}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Consulter
                </>
              )}
            </Button>
          </div>
          {validationError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {validationError}
            </p>
          )}
        </div>

        {/* Résultat de la consultation */}
        {result?.success && result.data && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Données trouvées
              </h4>
              <Badge variant="outline" className="text-xs">
                {result.source === 'SIMULATION' ? 'Simulation' : 'Registre National'}
              </Badge>
            </div>
            
            {/* Identité */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Nom</Label>
                <p className="font-medium">{result.data.lastName}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Prénom</Label>
                <p className="font-medium">{result.data.firstName}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Date de naissance
                </Label>
                <p className="font-medium">
                  {format(new Date(result.data.birthDate), 'dd/MM/yyyy', { locale: fr })}
                </p>
                <p className="text-sm text-slate-500">
                  {calculateAge(result.data.birthDate)} ans
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Sexe</Label>
                <p className="font-medium">
                  {result.data.gender === 'male' ? 'Masculin' : 'Féminin'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Nationalité</Label>
                <p className="font-medium">{result.data.nationality}</p>
              </div>
            </div>
            
            {/* Adresse */}
            {result.data.address && (
              <div>
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Adresse
                </Label>
                <p className="font-medium">{result.data.address.street}</p>
                <p className="text-sm text-slate-600">
                  {result.data.address.postalCode} {result.data.address.city}, {result.data.address.country}
                </p>
              </div>
            )}
            
            {/* NISS */}
            <div>
              <Label className="text-xs text-slate-500 flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                NISS
              </Label>
              <p className="font-mono font-medium">{formatNissInput(result.data.niss)}</p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                onClick={handleUseData}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Utiliser ces données
              </Button>
              <Button 
                variant="outline"
                onClick={() => setResult(null)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
            </div>
          </div>
        )}

        {/* Liens utiles */}
        <div className="pt-4 border-t">
          <p className="text-xs text-slate-500 mb-2">Ressources officielles:</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <a href="https://www.ehealth.fgov.be/ehealthplatform/fr/service-consultrn" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                eHealth ConsultRN
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <a href="https://www.ibz.rrn.fgov.be" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                Registre National
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}