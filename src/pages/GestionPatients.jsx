import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  CreditCard,
  Pill,
  Phone,
  Mail,
  AlertTriangle,
  Loader2,
  Syringe
} from 'lucide-react';
import { differenceInYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { usePermissions, PERMISSIONS } from '../components/auth/RBACGuard';

import ConsultationTab from '../components/patients/tabs/ConsultationTab';
import FicheAdministrativeTab from '../components/patients/tabs/FicheAdministrativeTab';
import FacturationTab from '../components/patients/tabs/FacturationTab';
import DocumentsTab from '../components/patients/tabs/DocumentsTab';
import MedicalHistory from '../components/patients/MedicalHistory';

import BillingModal from '../components/facturation/BillingModal';
import QuickBilling from '../components/facturation/QuickBilling';
import QuickPrescription from '../components/prescriptions/QuickPrescription';
import QuickVaccination from '../components/vaccinations/QuickVaccination';

import PatientListView from '../components/patients/PatientListView';

export default function GestionPatients() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const urlParams = new URLSearchParams(location.search);
  const patientId = urlParams.get('patient');
  
  const [currentUser, setCurrentUser] = useState(null);
  const permissions = usePermissions(currentUser);
  const [activeTab, setActiveTab] = useState('consultation');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showQuickBilling, setShowQuickBilling] = useState(false);
  const [showQuickPrescription, setShowQuickPrescription] = useState(false);
  const [showQuickVaccination, setShowQuickVaccination] = useState(false);
  
  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.list();
      return patients.find(p => p.id === patientId);
    },
    enabled: !!patientId
  });

  if (!patientId) {
    return <PatientListView />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Patient non trouvé</p>
        <Button variant="outline" onClick={() => navigate(createPageUrl('GestionPatients'))}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const officialName = patient.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const phone = patient.telecom?.find(t => t.system === 'phone')?.value;
  const email = patient.telecom?.find(t => t.system === 'email')?.value;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(createPageUrl('GestionPatients'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
            <div className="flex items-center gap-3 mt-1 text-slate-500">
              {age && <span>{age} ans</span>}
              {patient.gender && (
                <span>• {patient.gender === 'male' ? 'Homme' : 'Femme'}</span>
              )}
              {patient.birthDate && (
                <span>• Né(e) le {format(new Date(patient.birthDate), 'dd MMMM yyyy', { locale: fr })}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              {phone && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Phone className="w-4 h-4" /> {phone}
                </span>
              )}
              {email && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Mail className="w-4 h-4" /> {email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissions.hasPermission(PERMISSIONS.CREATE_INVOICES) && (
            <Button
              onClick={() => setShowQuickBilling(true)}
              variant="outline"
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Facturer
            </Button>
          )}
          {permissions.hasPermission(PERMISSIONS.CREATE_PRESCRIPTIONS) && (
            <>
              <Button
                onClick={() => setShowQuickPrescription(true)}
                variant="outline"
                className="gap-2"
              >
                <Pill className="w-4 h-4" />
                Prescrire
              </Button>
              <Button
                onClick={() => setShowQuickVaccination(true)}
                variant="outline"
                className="gap-2"
              >
                <Syringe className="w-4 h-4" />
                Vacciner
              </Button>
            </>
          )}
        </div>
      </div>

      {patient.allergies && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Allergies</p>
              <p className="text-sm text-red-700">{patient.allergies}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-xl">
          {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
            <TabsTrigger value="consultation" className="rounded-lg">
              Consultation
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="rounded-lg">
            Historique
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg">
            Documents
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg">
            Facturation
          </TabsTrigger>
          <TabsTrigger value="admin" className="rounded-lg">
            Fiche administrative
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
            <TabsContent value="consultation" className="m-0">
              <ConsultationTab patient={patient} />
            </TabsContent>
          )}
          <TabsContent value="history" className="m-0">
            <MedicalHistory patient={patient} />
          </TabsContent>
          <TabsContent value="documents" className="m-0">
            <DocumentsTab patient={patient} />
          </TabsContent>
          <TabsContent value="billing" className="m-0">
            <FacturationTab patient={patient} onNewBilling={() => setShowBillingModal(true)} />
          </TabsContent>
          <TabsContent value="admin" className="m-0">
            <FicheAdministrativeTab patient={patient} />
          </TabsContent>
        </div>
      </Tabs>

      {showBillingModal && (
        <BillingModal
          patient={patient}
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
        />
      )}

      {showQuickBilling && (
        <QuickBilling
          patient={patient}
          isOpen={showQuickBilling}
          onClose={() => setShowQuickBilling(false)}
        />
      )}

      {showQuickPrescription && (
        <QuickPrescription
          patient={patient}
          isOpen={showQuickPrescription}
          onClose={() => setShowQuickPrescription(false)}
        />
      )}

      {showQuickVaccination && (
        <QuickVaccination
          patient={patient}
          isOpen={showQuickVaccination}
          onClose={() => setShowQuickVaccination(false)}
        />
      )}
    </div>
  );
}