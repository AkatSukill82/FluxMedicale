import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Syringe, 
  Calendar,
  MapPin,
  User,
  ExternalLink,
  Loader2,
  Shield
} from 'lucide-react';
import { useVaccinations } from './useVaccinations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function VaccinationsPanel({ patient }) {
  const { isLoading, vaccinations, loadVaccinations } = useVaccinations();
  const [hasLoaded, setHasLoaded] = useState(false);

  const niss = patient.identifier?.find(
    id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
  )?.value;

  useEffect(() => {
    if (niss && !hasLoaded) {
      loadVaccinations(niss);
      setHasLoaded(true);
    }
  }, [niss, hasLoaded, loadVaccinations]);

  const getSourceBadge = (source) => {
    if (source.includes('Vaccinnet')) {
      return <Badge className="bg-blue-100 text-blue-800">Vaccinnet+ (VL)</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-800">e-vax (FWB)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Vaccinations</h2>
          <p className="text-slate-600 text-sm mt-1">
            Historique vaccinal du patient (sources officielles)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://vaccination-info.be/calendrier', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Calendrier vaccinal
        </Button>
      </div>

      {/* Chargement */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p className="text-slate-600">Chargement des vaccinations...</p>
          </CardContent>
        </Card>
      )}

      {/* Liste des vaccinations */}
      {!isLoading && vaccinations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Syringe className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Aucune vaccination trouvée
            </h3>
            <p className="text-slate-500">
              Aucun vaccin enregistré dans les registres Vaccinnet+ ou e-vax
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && vaccinations.length > 0 && (
        <div className="space-y-3">
          {vaccinations.map((vaccin) => (
            <Card key={vaccin.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Syringe className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{vaccin.vaccin}</h4>
                        <Badge className="bg-green-100 text-green-800">{vaccin.statut}</Badge>
                        {getSourceBadge(vaccin.source)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(vaccin.date), 'dd MMMM yyyy', { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {vaccin.administeredBy}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {vaccin.location}
                        </div>
                        <div>
                          <span className="font-medium">Lot:</span> {vaccin.lot}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Note sources */}
      <Alert className="bg-slate-50 border-slate-200">
        <Shield className="w-4 h-4 text-slate-600" />
        <AlertDescription className="text-slate-700 text-sm">
          <strong>Sources officielles:</strong> Données issues de Vaccinnet+ (Flandre) et e-vax (Wallonie-Bruxelles).
          <br />
          Ces données sont intégrées automatiquement dans la timeline du patient.
        </AlertDescription>
      </Alert>

      {/* Liens utiles */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Liens utiles</h4>
          <div className="flex flex-col gap-2 text-sm">
            <a 
              href="https://www.vaccination-info.be/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Portail d'information vaccination (ECDC)
            </a>
            <a 
              href="https://www.laatjevaccineren.be/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Vaccinnet+ (Agentschap Zorg en Gezondheid)
            </a>
            <a 
              href="https://www.e-vax.be/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              e-vax (Fédération Wallonie-Bruxelles)
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}