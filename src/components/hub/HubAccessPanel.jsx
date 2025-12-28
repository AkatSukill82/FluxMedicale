import React, { useState } from 'react';
import { useHubAccess } from './useHubAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Pill, 
  Syringe,
  FileWarning,
  User,
  Loader2,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HubAccessPanel({ patient }) {
  const { 
    user, 
    activeDelegation, 
    loading, 
    hubLoading,
    canAccessHub, 
    getDelegatingDoctor,
    accessHubForPatient 
  } = useHubAccess();

  const [hubData, setHubData] = useState(null);

  const handleAccessHub = async () => {
    const data = await accessHubForPatient(patient);
    if (data) {
      setHubData(data);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
          <p className="text-sm text-muted-foreground mt-2">Vérification des droits...</p>
        </CardContent>
      </Card>
    );
  }

  const delegatingDoctor = getDelegatingDoctor();
  const hasAccess = canAccessHub();
  const isSecretary = user?.role === 'user';

  return (
    <div className="space-y-4">
      {/* Statut d'accès */}
      {isSecretary && (
        <Alert className={hasAccess ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
          {hasAccess ? (
            <>
              <Shield className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Délégation eHealth active</AlertTitle>
              <AlertDescription className="text-green-700">
                Vous accédez au HUB via le certificat de <strong>Dr. {delegatingDoctor?.nom}</strong> 
                {delegatingDoctor?.nihii && <span className="text-xs ml-1">(NIHII: {delegatingDoctor.nihii})</span>}
              </AlertDescription>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Accès HUB non disponible</AlertTitle>
              <AlertDescription className="text-amber-700">
                Vous devez être liée à un médecin avec délégation eHealth activée pour consulter le HUB.
                Contactez votre médecin pour activer cette fonctionnalité.
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* Bouton d'accès */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            HUB Santé Belge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hubData ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Consultez le dossier de santé partagé du patient (SUMEHR, vaccinations, médicaments...)
              </p>
              <Button 
                onClick={handleAccessHub}
                disabled={!hasAccess || hubLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {hubLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion au HUB...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Consulter le HUB
                  </>
                )}
              </Button>
              {!hasAccess && isSecretary && (
                <p className="text-xs text-red-500 mt-2">
                  Délégation eHealth requise
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header avec infos */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Données récupérées</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(hubData.timestamp), "dd/MM/yyyy HH:mm", { locale: fr })}
                </div>
              </div>

              {hubData.via_delegation && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <User className="w-3 h-3 mr-1" />
                  Via délégation Dr. {delegatingDoctor?.nom}
                </Badge>
              )}

              {/* Allergies */}
              {hubData.sumehr?.allergies?.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Allergies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {hubData.sumehr.allergies.map((allergy, i) => (
                      <Badge key={i} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Problèmes actifs */}
              {hubData.sumehr?.activeProblems?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <FileWarning className="w-4 h-4" />
                    Problèmes actifs
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {hubData.sumehr.activeProblems.map((problem, i) => (
                      <li key={i}>{problem}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Médicaments */}
              {hubData.sumehr?.medications?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <Pill className="w-4 h-4" />
                    Médicaments actifs
                  </h4>
                  <div className="space-y-2">
                    {hubData.sumehr.medications.map((med, i) => (
                      <div key={i} className="bg-gray-50 rounded p-2">
                        <p className="font-medium text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.posology}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vaccinations */}
              {hubData.sumehr?.vaccinations?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <Syringe className="w-4 h-4" />
                    Dernières vaccinations
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {hubData.sumehr.vaccinations.map((vax, i) => (
                      <div key={i} className="bg-blue-50 rounded p-2">
                        <p className="font-medium text-sm text-blue-800">{vax.name}</p>
                        <p className="text-xs text-blue-600">{vax.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rafraîchir */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAccessHub}
                disabled={hubLoading}
                className="w-full mt-4"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${hubLoading ? 'animate-spin' : ''}`} />
                Rafraîchir les données
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}