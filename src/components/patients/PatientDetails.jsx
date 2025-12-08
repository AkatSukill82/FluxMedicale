
import React, { useState, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  ArrowLeft,
  User,
  Cake,
  FileText,
  CreditCard,
  Pencil,
  AlertTriangle,
  Shield,
  Network,
  Loader2
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { useI18n } from '../i18n/i18nContext';

const ConsultationTab = lazy(() => import('./tabs/ConsultationTab'));
const DocumentsTab = lazy(() => import('./tabs/DocumentsTab'));
const FicheAdministrativeTab = lazy(() => import('./tabs/FicheAdministrativeTab'));
const HubsTab = lazy(() => import('./tabs/HubsTab'));
const FacturationTab = lazy(() => import('./tabs/FacturationTab'));

export default function PatientDetails({ patient, currentUser, onBack, onEdit, refreshData }) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState('consultation');
  
  const queryClient = useQueryClient();

  const { data: consultations, isLoading: isLoadingConsultations } = useQuery({
    queryKey: ['consultations', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation'),
    enabled: !!patient,
  });

  const { data: hubsData, isLoading: isLoadingHubs } = useQuery({
      queryKey: ['hubs', patient.id],
      queryFn: async () => {
          // Placeholder for fetching hub data
          return { consent: true, therapeuticLink: true };
      },
      enabled: !!patient,
  });

  if (!patient) return null;

  const officialName = patient.name?.find(n => n.use === 'official') || {};
  const prenom = (officialName.given || []).join(' ');
  const nom = officialName.family || '';
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value;
  
  const hasConsent = hubsData?.consent;
  const hasTherapeuticLink = hubsData?.therapeuticLink;

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="flex-shrink-0 bg-card p-4 border-b rounded-t-xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {patient.statut === 'Inactif' && <Badge variant="destructive">Inactif</Badge>}
            {patient.statut === 'Décédé' && <Badge variant="destructive">Décédé</Badge>}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-2" />
              Modifier
            </Button>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-2xl font-semibold text-primary">
            {prenom?.[0]}{nom?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{prenom} {nom}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1.5"><User className="w-4 h-4" />{patient.gender === 'male' ? 'Homme' : 'Femme'}</div>
              <div className="flex items-center gap-1.5"><Cake className="w-4 h-4" />{age ? `${age} ans (${format(new Date(patient.birthDate), 'dd/MM/yyyy')})` : 'Date de naissance inconnue'}</div>
              {niss && <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" />{niss}</div>}
            </div>
          </div>
        </div>
        {patient.allergies && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <p className="font-semibold">Allergies: {patient.allergies}</p>
          </Alert>
        )}
      </div>

      <div className="flex-grow flex flex-col bg-card rounded-b-xl border border-t-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-grow flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-shrink-0 px-6">
            <TabsTrigger value="consultation" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3">
              <FileText className="w-4 h-4 mr-2" /> {t('patient.consultations')}
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3">
              <FileText className="w-4 h-4 mr-2" /> {t('patient.documents')}
            </TabsTrigger>
            <TabsTrigger value="fiche_administrative" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3">
              <User className="w-4 h-4 mr-2" /> {t('patient.administrativeFile')}
            </TabsTrigger>
            <TabsTrigger value="hubs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3">
              <Network className="w-4 h-4 mr-2" /> {t('patient.hubs')}
            </TabsTrigger>
            <TabsTrigger value="facturation" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3">
              <CreditCard className="w-4 h-4 mr-2" /> {t('patient.billing')}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-y-auto p-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
                <TabsContent value="consultation" className="mt-0">
                  <ConsultationTab 
                    patient={patient}
                    consultations={consultations || []}
                    isLoading={isLoadingConsultations}
                    currentUser={currentUser}
                    refreshConsultations={() => queryClient.invalidateQueries(['consultations', patient.id])}
                  />
                </TabsContent>
                <TabsContent value="documents" className="mt-0">
                  <DocumentsTab patient={patient} currentUser={currentUser} />
                </TabsContent>
                <TabsContent value="fiche_administrative" className="mt-0">
                  <FicheAdministrativeTab patient={patient} />
                </TabsContent>
                <TabsContent value="hubs" className="mt-0">
                  <HubsTab 
                    patient={patient}
                    currentUser={currentUser}
                    hasConsent={hasConsent}
                    hasTherapeuticLink={hasTherapeuticLink}
                    isLoading={isLoadingHubs}
                  />
                </TabsContent>
                <TabsContent value="facturation" className="mt-0">
                  <FacturationTab patient={patient} currentUser={currentUser} />
                </TabsContent>
            </Suspense>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
