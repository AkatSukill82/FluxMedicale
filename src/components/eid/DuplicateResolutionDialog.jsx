
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  UserCheck,
  Merge
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { fr, nl, enUS } from 'date-fns/locale';
import { nissValidator } from './nissValidator';
import { useI18n } from '../i18n/i18nContext';

export default function DuplicateResolutionDialog({ 
  isOpen, 
  duplicates: patients, 
  eidData, 
  niss,
  onSelectPatient, 
  onMerge,
  onCancel 
}) {
  const { t, locale } = useI18n();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const locales = { fr, nl, en: enUS };

  const handleSelect = () => {
    if (selectedPatient) {
      onSelectPatient(selectedPatient);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">{t('eid.duplicates.title')}</DialogTitle>
              <DialogDescription>
                {t('eid.duplicates.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription 
            className="text-orange-900 dark:text-orange-200"
            dangerouslySetInnerHTML={{
              __html: t('eid.duplicates.alert', { count: patients.length, niss: nissValidator.format(niss) })
            }}
          />
        </Alert>

        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {t('eid.duplicates.cardData')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-foreground/80">
              <div>
                <span className="text-primary/90">{t('common.name')}:</span>{' '}
                <span className="font-medium text-foreground">{eidData.firstName} {eidData.lastName}</span>
              </div>
              <div>
                <span className="text-primary/90">{t('eid.duplicates.birthDate')}:</span>{' '}
                <span className="font-medium text-foreground">
                  {eidData.birthDate && new Date(eidData.birthDate) && !isNaN(new Date(eidData.birthDate).getTime())
                    ? format(new Date(eidData.birthDate), 'dd/MM/yyyy', { locale: locales[locale] || fr })
                    : 'Date non disponible'
                  }
                </span>
              </div>
              <div>
                <span className="text-primary/90">{t('patient.niss')}:</span>{' '}
                <code className="font-mono text-xs bg-card px-2 py-1 rounded">
                  {nissValidator.format(niss)}
                </code>
              </div>
              <div>
                <span className="text-primary/90">{t('eid.duplicates.gender')}:</span>{' '}
                <span className="font-medium text-foreground">{eidData.gender === 'male' ? 'M' : 'F'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            {t('eid.duplicates.foundPatients', { count: patients?.length || 0 })}
          </h4>
          
          <div className="space-y-3">
            {(patients || []).map((patient) => {
              const officialName = patient.name?.find(n => n.use === 'official') || {};
              const prenom = (officialName.given || []).join(' ');
              const nom = officialName.family || '';
              const patientBirthDate = patient.birthDate ? new Date(patient.birthDate) : null;
              const isValidBirthDate = patientBirthDate && !isNaN(patientBirthDate.getTime());
              const age = isValidBirthDate 
                ? differenceInYears(new Date(), patientBirthDate)
                : null;
              const patientNiss = patient.identifier?.find(id => 
                id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
              )?.value;

              const isSelected = selectedPatient?.id === patient.id;
              
              const createdDate = patient.created_date ? new Date(patient.created_date) : null;
              const isValidCreatedDate = createdDate && !isNaN(createdDate.getTime());

              return (
                <Card 
                  key={patient.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-2 border-primary bg-primary/10' 
                      : 'hover:border-muted-foreground/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-semibold text-foreground">
                            {prenom} {nom}
                          </h5>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{age ? t('eid.duplicates.age', {age}) : t('eid.duplicates.ageUnknown')}</span>
                            {isValidBirthDate && (
                              <span>
                                {t('eid.duplicates.bornOn', { 
                                  date: format(patientBirthDate, 'dd/MM/yyyy', { locale: locales[locale] || fr })
                                })}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-2 space-y-1">
                            <div>
                              {t('eid.duplicates.id')}: <code className="font-mono bg-card px-1 rounded">{patient.id}</code>
                            </div>
                            <div>
                              {t('patient.niss')}: <code className="font-mono bg-card px-1 rounded">
                                {nissValidator.format(patientNiss || niss)}
                              </code>
                            </div>
                            <div>
                              {t('eid.duplicates.createdOn')}: {
                                isValidCreatedDate
                                  ? format(createdDate, 'dd/MM/yyyy HH:mm', { locale: locales[locale] || fr })
                                  : 'Date non disponible'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Badge className="bg-primary text-primary-foreground">
                          {t('eid.duplicates.selected')}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onMerge}
              className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/30"
            >
              <Merge className="w-4 h-4 mr-2" />
              {t('actions.merge')}
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedPatient}
              className="bg-primary hover:bg-primary/90"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {t('eid.duplicates.openThisPatient')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
