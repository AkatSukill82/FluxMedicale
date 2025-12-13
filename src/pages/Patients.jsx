import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  X, 
  CreditCard,
  Pill,
  FileText
} from 'lucide-react';
import { differenceInYears } from 'date-fns';
import { useI18n } from '../components/i18n/i18nContext';
import { createPageUrl } from '@/utils';
import { useEIDReader } from '../components/eid/useEIDReader';
import { toast } from 'sonner';
import { usePermissions, PERMISSIONS } from '../components/auth/RBACGuard';

// Import tabs and components
import PatientOverview from '../components/patients/PatientOverview';
import PatientSummaryCard from '../components/patients/PatientSummaryCard';
import ConsultationTab from '../components/patients/tabs/ConsultationTab';
import FicheAdministrativeTab from '../components/patients/tabs/FicheAdministrativeTab';
import HubsTab from '../components/patients/tabs/HubsTab';
import FacturationTab from '../components/patients/tabs/FacturationTab';
import DocumentsTab from '../components/patients/tabs/DocumentsTab';
import MedicalHistory from '../components/patients/MedicalHistory';
import PatientNotifications from '../components/patients/PatientNotifications';
import SecureDocuments from '../components/patients/SecureDocuments';
import ClinicalNotesPanel from '../components/patients/ClinicalNotesPanel';
import AllergiesManager from '../components/patients/AllergiesManager';
import VaccinationsPanel from '../components/patients/VaccinationsPanel';

// Import modals
import BillingModal from '../components/facturation/BillingModal';
import PrescriptionModal from '../components/prescriptions/PrescriptionModal';
import QuickBilling from '../components/facturation/QuickBilling';
import QuickPrescription from '../components/prescriptions/QuickPrescription';
import QuickVaccination from '../components/vaccinations/QuickVaccination';

export default function Patients() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  
  const urlParams = new URLSearchParams(location.search);
  const patientId = urlParams.get('patient');
  
  const [currentUser, setCurrentUser] = React.useState(null);
  const permissions = usePermissions(currentUser);
  
  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showQuickBilling, setShowQuickBilling] = useState(false);
  const [showQuickPrescription, setShowQuickPrescription] = useState(false);
  const [showQuickVaccination, setShowQuickVaccination] = useState(false);
  
  const { readEID, isReading } = useEIDReader();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.list();
      return patients.find(p => p.id === patientId);
    },
    enabled: !!patientId
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        switch(e.key.toLowerCase()) {
          case 'e':
            e.preventDefault();
            handleReadEID();
            break;
          case 'f':
            e.preventDefault();
            setShowQuickBilling(true);
            break;
          case 'p':
            e.preventDefault();
            setShowQuickPrescription(true);
            break;
          case 'v':
            e.preventDefault();
            setShowQuickVaccination(true);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patientId]);

  const handleReadEID = async () => {
    const result = await readEID();
    if (result && result.status === 'MATCH') {
      navigate(createPageUrl(`Patients?patient=${result.patient.id}`));
    } else if (result && result.status === 'CREATED') {
      navigate(createPageUrl(`Patients?patient=${result.patient.id}`));
    } else if (result && result.status === 'ERROR') {
      toast.error(t('errors.eidRead'));
    }
  };

  const handleClose = () => {
    navigate(createPageUrl('Dashboard'));
  };

  const { data: allPatients = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
    enabled: !patientId
  });

  if (!patientId) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tous les patients</h2>
          <Badge variant="outline">{allPatients.length} patients</Badge>
        </div>
        
        {isLoadingList ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPatients.map(p => {
              const officialName = p.name?.find(n => n.use === 'official') || {};
              const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
              const birthDate = p.birthDate ? new Date(p.birthDate) : null;
              const age = birthDate && !isNaN(birthDate.getTime()) ? differenceInYears(new Date(), birthDate) : null;
              const niss = p.identifier?.find(id => id.system.includes('ssin'))?.value || '';
              
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(createPageUrl(`Patients?patient=${p.id}`))}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-700 font-semibold">
                        {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{fullName}</h3>
                      <div className="text-sm text-slate-600 mt-1">
                        {age && <span>{age} ans</span>}
                        {age && niss && <span> • </span>}
                        {niss && <span className="font-mono text-xs">***-{niss.slice(-4)}</span>}
                      </div>
                      {p.allergies && (
                        <Badge variant="destructive" className="mt-2 text-xs">⚠️ Allergies</Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Patient non trouvé</p>
      </div>
    );
  }

  // Fetch stats and data for overview
  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations_count', patientId],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions_count', patientId],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices_count', patientId],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  const { data: allergies = [] } = useQuery({
    queryKey: ['allergies_count', patientId],
    queryFn: () => base44.entities.Allergy.filter({ patient_id: patientId, status: 'ACTIVE' }),
    enabled: !!patientId
  });

  const stats = {
    consultations: consultations.length,
    prescriptions: prescriptions.length,
    invoices: invoices.length
  };

  return (
    <div className="h-full bg-slate-50 overflow-hidden flex flex-col">
      {/* Header fixe */}
      <div className="bg-white border-b p-4">
        <Button variant="ghost" onClick={handleClose} className="gap-2 mb-3">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Button>
        
        <PatientSummaryCard patient={patient} allergies={allergies} stats={stats} />
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar actions rapides */}
        <aside className="w-64 bg-white border-r p-4 space-y-3 overflow-y-auto">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Actions rapides</h3>
          
          {permissions.hasPermission(PERMISSIONS.CREATE_INVOICES) && (
            <Button
              onClick={() => setShowQuickBilling(true)}
              className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <CreditCard className="w-4 h-4" />
              Facturer (Alt+F)
            </Button>
          )}
          
          {permissions.hasPermission(PERMISSIONS.CREATE_PRESCRIPTIONS) && (
            <>
              <Button
                onClick={() => setShowQuickPrescription(true)}
                className="w-full justify-start gap-2"
                size="sm"
                variant="outline"
              >
                <Pill className="w-4 h-4" />
                Prescrire (Alt+P)
              </Button>
              <Button
                onClick={() => setShowQuickVaccination(true)}
                className="w-full justify-start gap-2"
                size="sm"
                variant="outline"
              >
                💉 Vacciner (Alt+V)
              </Button>
            </>
          )}

          <div className="pt-4 border-t">
            <PatientNotifications patient={patient} />
          </div>
        </aside>

        {/* Zone principale */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barre de navigation tabs */}
          <div className="bg-white border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6">
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="overview" className="gap-2">
                    📊 Vue d'ensemble
                  </TabsTrigger>
                  {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                    <TabsTrigger value="consultation" className="gap-2">
                      📝 Consultation
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="history" className="gap-2">
                    📋 Historique complet
                  </TabsTrigger>
                  {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                    <TabsTrigger value="clinical-notes" className="gap-2">
                      📝 Notes
                    </TabsTrigger>
                  )}
                  {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                    <TabsTrigger value="vaccinations" className="gap-2">
                      💉 Vaccins
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="documents" className="gap-2">
                    📁 Documents
                  </TabsTrigger>
                  {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                    <TabsTrigger value="secure-files" className="gap-2">
                      🔒 Fichiers
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="billing" className="gap-2">
                    💰 Facturation
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="gap-2">
                    👤 Admin
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="p-6">
                <TabsContent value="overview" className="m-0">
                  <PatientOverview patient={patient} />
                </TabsContent>
                {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                  <TabsContent value="consultation" className="m-0">
                    <ConsultationTab patient={patient} />
                  </TabsContent>
                )}
                <TabsContent value="history" className="m-0">
                  <MedicalHistory patient={patient} />
                </TabsContent>
                {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                  <TabsContent value="clinical-notes" className="m-0">
                    <ClinicalNotesPanel patient={patient} />
                  </TabsContent>
                )}
                {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                  <TabsContent value="vaccinations" className="m-0">
                    <VaccinationsPanel patient={patient} />
                  </TabsContent>
                )}
                <TabsContent value="documents" className="m-0">
                  <DocumentsTab patient={patient} />
                </TabsContent>
                {permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
                  <TabsContent value="secure-files" className="m-0">
                    <SecureDocuments patient={patient} />
                  </TabsContent>
                )}
                <TabsContent value="billing" className="m-0">
                  <FacturationTab patient={patient} onNewBilling={() => setShowBillingModal(true)} />
                </TabsContent>
                <TabsContent value="admin" className="m-0">
                  <FicheAdministrativeTab patient={patient} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBillingModal && (
        <BillingModal
          patient={patient}
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
        />
      )}

      {showPrescriptionModal && (
        <PrescriptionModal
          patient={patient}
          isOpen={showPrescriptionModal}
          onClose={() => setShowPrescriptionModal(false)}
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