import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, User, ArrowRight, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '../i18n/i18nContext';

export default function PatientsList({ patients, isLoading, onSelectPatient }) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold">Aucun patient trouvé</h3>
        <p className="text-muted-foreground mt-2">Créez un nouveau patient ou affinez votre recherche.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {patients.map(patient => {
          const officialName = patient.name?.find(n => n.use === 'official') || {};
          const prenom = (officialName.given || []).join(' ');
          const nom = officialName.family || '';
          const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value;

          return (
            <Card
              key={patient.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
              onClick={() => onSelectPatient(patient.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{prenom} {nom}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {niss && <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> {niss}</div>}
                      {patient.birthDate && <span>{t('patient.bornOn')} {format(new Date(patient.birthDate), 'dd/MM/yyyy')}</span>}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}