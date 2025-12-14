import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
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
import PatientRecordView from '../components/patients/PatientRecordView';
import SimplifiedConsultation from '../components/patients/SimplifiedConsultation';
import PatientTimeline from '../components/patients/PatientTimeline';
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
  
  const [activeTab, setActiveTab] = useState('record');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showQuickBilling, setShowQuickBilling] = useState(false);
  const [showQuickPrescription, setShowQuickPrescription] = useState(false);
  const [showQuickVaccination, setShowQuickVaccination] = useState(false);
  const [showNewConsultation, setShowNewConsultation] = useState(false);
  
  const { readEID, isReading } = useEIDReader();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.list();
      return patients.find(p => p.id === patientId);
    },
    enabled: !!patientId
  });

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
    const stats = { consultations: 0, prescriptions: 0, invoices: 0 };
    const allergies = [];

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
        {/* Zone principale - Dossier patient (70%) */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="record">📋 Dossier</TabsTrigger>
              <TabsTrigger value="consultations">📝 Consultations</TabsTrigger>
              <TabsTrigger value="documents">📁 Documents</TabsTrigger>
              <TabsTrigger value="billing">💰 Facturation</TabsTrigger>
            </TabsList>

            <TabsContent value="record" className="space-y-6 mt-0">
              <PatientRecordView patient={patient} allergies={allergies} />
              
              {/* Bouton nouvelle consultation */}
              {!showNewConsultation ? (
                <div className="flex justify-center py-8">
                  <Button 
                    onClick={() => setShowNewConsultation(true)}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 px-8"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Créer une nouvelle consultation
                  </Button>
                </div>
              ) : (
                <SimplifiedConsultation
                  patient={patient}
                  onClose={() => setShowNewConsultation(false)}
                  onSaved={() => setShowNewConsultation(false)}
                />
              )}
            </TabsContent>

            <TabsContent value="consultations" className="space-y-4 mt-0">
              <ConsultationTab patient={patient} />
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-0">
              <DocumentsTab patient={patient} />
              <div className="pt-6">
                <h3 className="font-semibold mb-4">Fichiers sécurisés</h3>
                <SecureDocuments patient={patient} />
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 mt-0">
              <FacturationTab patient={patient} onNewBilling={() => setShowBillingModal(true)} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Colonne historique à droite (30%) */}
        <aside className="w-[400px] bg-white border-l overflow-y-auto p-6">
          <PatientTimeline patient={patient} />
        </aside>
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