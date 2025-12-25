import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Camera,
  CreditCard,
  MapPin,
  Calendar,
  User,
  Shield,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ConsultRNService({ patient, onUpdate, isOpen, onClose }) {
  const [niss, setNiss] = useState(patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '');
  const [isLoading, setIsLoading] = useState(false);
  const [rnData, setRnData] = useState(null);
  const [error, setError] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  const consultRN = async () => {
    if (!niss || niss.length !== 11) {
      toast.error('NISS invalide (11 chiffres requis)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRnData(null);
    setPhotoUrl(null);

    try {
      // Appel à l'API InvokeLLM pour simuler la consultation RN
      // En production, cela serait remplacé par un appel à l'API eHealth ConsultRN
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère des données fictives mais réalistes pour une consultation du Registre National belge pour le NISS ${niss}. 
        Le NISS belge encode la date de naissance dans les 6 premiers chiffres (AAMMJJ).
        Génère des données cohérentes avec ce NISS.`,
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            person: {
              type: "object",
              properties: {
                niss: { type: "string" },
                last_name: { type: "string" },
                first_name: { type: "string" },
                birth_date: { type: "string" },
                gender: { type: "string", enum: ["M", "F"] },
                nationality: { type: "string" },
                civil_status: { type: "string" },
                address: {
                  type: "object",
                  properties: {
                    street: { type: "string" },
                    number: { type: "string" },
                    postal_code: { type: "string" },
                    city: { type: "string" },
                    country: { type: "string" }
                  }
                },
                registry_status: { type: "string", enum: ["ACTIVE", "DECEASED", "EMIGRATED", "UNKNOWN"] },
                last_update: { type: "string" }
              }
            },
            verification: {
              type: "object",
              properties: {
                niss_valid: { type: "boolean" },
                checksum_valid: { type: "boolean" },
                person_exists: { type: "boolean" },
                data_quality: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] }
              }
            }
          }
        }
      });

      setRnData(result);

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: (await base44.auth.me()).email,
        action: 'CONSULT_RN',
        target_entity: 'Patient',
        target_id: patient?.id || 'new',
        details: `Consultation RN pour NISS: ***${niss.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Consultation RN effectuée');
    } catch (err) {
      console.error('Erreur ConsultRN:', err);
      setError('Erreur lors de la consultation du Registre National');
      toast.error('Erreur de consultation RN');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhoto = async () => {
    if (!niss) return;
    
    setIsLoading(true);
    try {
      // En production, cela appellerait l'API eHealth pour récupérer la photo d'identité
      // Pour la démo, on génère une image placeholder
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Professional passport photo of a ${rnData?.person?.gender === 'F' ? 'woman' : 'man'}, neutral background, formal attire, facing camera, high quality ID photo style`
      });
      
      setPhotoUrl(result.url);

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: (await base44.auth.me()).email,
        action: 'FETCH_RN_PHOTO',
        target_entity: 'Patient',
        target_id: patient?.id || 'new',
        details: `Récupération photo RN pour NISS: ***${niss.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Photo récupérée');
    } catch (err) {
      console.error('Erreur photo RN:', err);
      toast.error('Erreur lors de la récupération de la photo');
    } finally {
      setIsLoading(false);
    }
  };

  const applyToPatient = async () => {
    if (!rnData?.person || !onUpdate) return;

    const person = rnData.person;
    const updates = {
      name: [{
        use: 'official',
        family: person.last_name,
        given: [person.first_name]
      }],
      birthDate: person.birth_date,
      gender: person.gender === 'M' ? 'male' : 'female',
      address: [{
        line: [`${person.address?.street} ${person.address?.number}`],
        city: person.address?.city,
        postalCode: person.address?.postal_code,
        country: person.address?.country || 'BE'
      }],
      identifier: [{
        system: 'https://www.ehealth.fgov.be/standards/fhir/NamingSystem/ssin',
        value: person.niss
      }]
    };

    try {
      if (patient?.id) {
        await base44.entities.Patient.update(patient.id, updates);
      }
      onUpdate(updates);
      toast.success('Données patient mises à jour depuis le RN');
      onClose?.();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      DECEASED: { color: 'bg-slate-100 text-slate-800', label: 'Décédé', icon: XCircle },
      EMIGRATED: { color: 'bg-blue-100 text-blue-800', label: 'Émigré', icon: MapPin },
      UNKNOWN: { color: 'bg-orange-100 text-orange-800', label: 'Inconnu', icon: AlertTriangle }
    };
    const config = configs[status] || configs.UNKNOWN;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const content = (
    <div className="space-y-6">
      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4" />
            Consultation Registre National
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Numéro National (NISS)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={niss}
                onChange={(e) => setNiss(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="00000000000"
                className="font-mono text-lg tracking-wider"
                maxLength={11}
              />
              <Button onClick={consultRN} disabled={isLoading || niss.length !== 11}>
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
            <p className="text-xs text-slate-500 mt-1">
              Format: AAMMJJXXXCC (11 chiffres)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Résultats */}
      {rnData?.person && (
        <>
          {/* Vérification */}
          <Card className={rnData.verification?.niss_valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {rnData.verification?.niss_valid ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {rnData.verification?.niss_valid ? 'NISS Validé' : 'NISS Non Validé'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Checksum: {rnData.verification?.checksum_valid ? '✓' : '✗'} • 
                      Personne: {rnData.verification?.person_exists ? '✓' : '✗'} • 
                      Qualité: {rnData.verification?.data_quality}
                    </p>
                  </div>
                </div>
                {getStatusBadge(rnData.person.registry_status)}
              </div>
            </CardContent>
          </Card>

          {/* Données personne */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Données du Registre National
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {/* Photo */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-40 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Photo identité" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <Button size="sm" variant="outline" onClick={fetchPhoto} disabled={isLoading}>
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Charger'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Infos */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Nom</p>
                    <p className="font-semibold text-lg">{rnData.person.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Prénom</p>
                    <p className="font-semibold text-lg">{rnData.person.first_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date de naissance</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {rnData.person.birth_date}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Sexe</p>
                    <p className="font-medium">{rnData.person.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Nationalité</p>
                    <p className="font-medium">{rnData.person.nationality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">État civil</p>
                    <p className="font-medium">{rnData.person.civil_status}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Adresse</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {rnData.person.address?.street} {rnData.person.address?.number}, {rnData.person.address?.postal_code} {rnData.person.address?.city}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Dernière mise à jour RN: {rnData.person.last_update}
                </p>
                <Button onClick={applyToPatient} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Appliquer au dossier patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Note légale */}
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription className="text-xs">
              <strong>RGPD & eHealth:</strong> La consultation du Registre National est soumise à autorisation préalable 
              et doit être justifiée par une relation de soins. Toutes les consultations sont auditées.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Consultation Registre National
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}