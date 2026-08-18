import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Tabs no longer used in patient record view
import { 
  ArrowLeft, 
  X, 
  CreditCard,
  Pill,
  FileText,
  Globe,
  Shield,
  UserPlus,
  Stethoscope,
  History,
  FolderOpen,
  Lock,
  Receipt,
  ClipboardList,
  FlaskConical,
  Tablets,
  RefreshCw,
  User,
  Network
} from 'lucide-react';
import { differenceInYears } from 'date-fns';
import { useI18n } from '../components/i18n/i18nContext';
import { createPageUrl } from '@/utils';
import { useEIDReader } from '../components/eid/useEIDReader';
import { toast } from 'sonner';
import { usePermissions, PERMISSIONS } from '../components/auth/RBACGuard';
import { useOfflinePatients, useOfflinePatient } from '../components/offline/useOfflineData';
import OfflineBanner from '../components/offline/OfflineBanner';

// Import tabs
import ConsultationTab from '../components/patients/tabs/ConsultationTab';
import FicheAdministrativeTab from '../components/patients/tabs/FicheAdministrativeTab';
import HubsTab from '../components/patients/tabs/HubsTab';
import FacturationTab from '../components/patients/tabs/FacturationTab';
import DocumentsTab from '../components/patients/tabs/DocumentsTab';
import MedicalHistory from '../components/patients/MedicalHistory';
import PatientNotifications from '../components/patients/PatientNotifications';
import SecureDocuments from '../components/patients/SecureDocuments';
import ProtocolesTab from '../components/patients/tabs/ProtocolesTab';
import ChapitreIVTab from '../components/patients/tabs/ChapitreIVTab';

// Import modals
import BillingModal from '../components/facturation/BillingModal';
import PrescriptionModal from '../components/prescriptions/PrescriptionModal';
import QuickBilling from '../components/facturation/QuickBilling';
import QuickPrescription from '../components/prescriptions/QuickPrescription';
import QuickVaccination from '../components/vaccinations/QuickVaccination';
import SumehrEditor from '../components/sumehr/SumehrEditor';
import EIDReaderButton from '../components/patients/EIDReaderButton';
import MedicalDocumentGenerator from '../components/documents/MedicalDocumentGenerator';
import NewPatientDialog from '../components/patients/NewPatientDialog';
import LabResultsManager from '@/components/lab/LabResultsManager';
import MedicamentsPanel from '@/components/medications/MedicamentsPanel';
import FollowUpDashboard from '@/components/followup/FollowUpDashboard';

export default function Patients() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  
  const urlParams = new URLSearchParams(location.search);
  const patientId = urlParams.get('patient');
  
  const [currentUser, setCurrentUser] = React.useState(null);
  const permissions = usePermissions(currentUser);
  
  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {
      // Offline: use cached user info if available
      try {
        const cachedUser = JSON.parse(localStorage.getItem('fluxmed_cached_user') || 'null');
        if (cachedUser) setCurrentUser(cachedUser);
      } catch {}
    });
  }, []);
  
  const [activeTab, setActiveTab] = useState('consultation');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showQuickBilling, setShowQuickBilling] = useState(false);
  const [showQuickPrescription, setShowQuickPrescription] = useState(false);
  const [showQuickVaccination, setShowQuickVaccination] = useState(false);
  const [showSumehrEditor, setShowSumehrEditor] = useState(false);
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  
  const { readEID, isReading } = useEIDReader();

  const { data: patient, isLoading } = useOfflinePatient(patientId);

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
    if (result && (result.status === 'MATCH' || result.status === 'CREATED')) {
      navigate(createPageUrl(`Patients?patient=${result.patient.id}`));
    }
    // NO_MIDDLEWARE and ERROR are handled gracefully by useEIDReader with toasts
  };

  const handleClose = () => {
    navigate(createPageUrl('Dashboard'));
  };

  // Chargement paginé : 100 patients max pour ne pas bloquer l'interface
  const { data: allPatientsRaw = [], isLoading: isLoadingList } = useOfflinePatients('-created_date', 100);

  const allPatients = React.useMemo(() => {
    return [...allPatientsRaw].sort((a, b) => {
      const nameA = a.name?.find(n => n.use === 'official') || a.name?.[0] || {};
      const nameB = b.name?.find(n => n.use === 'official') || b.name?.[0] || {};
      const familyA = (nameA.family || '').toLowerCase();
      const familyB = (nameB.family || '').toLowerCase();
      if (familyA !== familyB) return familyA.localeCompare(familyB, 'fr');
      const givenA = (nameA.given?.[0] || '').toLowerCase();
      const givenB = (nameB.given?.[0] || '').toLowerCase();
      return givenA.localeCompare(givenB, 'fr');
    });
  }, [allPatientsRaw]);

  if (!patientId) {
    return (
      <div className="p-6 space-y-5">
        <OfflineBanner />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">{t('patient.allPatients')}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{allPatients.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <EIDReaderButton
              onPatientFound={(p) => navigate(createPageUrl(`Patients?patient=${p.id}`))}
              onPatientCreated={(p) => {
                if (p) navigate(createPageUrl(`Patients?patient=${p.id}`));
              }}
              variant="outline"
            />
            <Button onClick={() => setShowNewPatientDialog(true)} size="sm" className="gap-2">
              <UserPlus className="w-3.5 h-3.5" />
              {t('patient.newPatient')}
            </Button>
          </div>
        </div>
        
        {isLoadingList ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
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
                  className="w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {age && <span>{age} ans</span>}
                      {age && niss && <span> · </span>}
                      {niss && <span className="font-mono">***{niss.slice(-4)}</span>}
                    </p>
                  </div>
                  {p.allergies && (
                    <span className="text-xs text-destructive font-medium">⚠️</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <NewPatientDialog
          isOpen={showNewPatientDialog}
          onClose={() => setShowNewPatientDialog(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('patient.loading')}</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('patient.notFound')}</p>
      </div>
    );
  }

  const officialName = patient.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const niss = patient.identifier?.find(id => id.system.includes('ssin'))?.value || '';
  const maskedNISS = niss ? `***-**-***-${niss.slice(-2)}` : '';

  const navItems = [
    permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && { key: 'consultation', label: t('patient.consultation'), icon: Stethoscope },
    { key: 'history', label: t('patient.history'), icon: History },
    { key: 'documents', label: t('patient.documents'), icon: FolderOpen },
    permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && { key: 'secure-files', label: t('patient.secureFiles'), icon: Lock },
    { key: 'billing', label: t('patient.billing'), icon: Receipt },
    { key: 'protocoles', label: t('patient.protocols'), icon: ClipboardList },
    { key: 'chapter4', label: t('patient.chapter4'), icon: Shield },
    { key: 'hubs', label: t('patient.hubs'), icon: Network },
    permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && { key: 'labo', label: 'Laboratoire', icon: FlaskConical },
    permissions.hasPermission(PERMISSIONS.VIEW_PRESCRIPTIONS) && { key: 'medicaments', label: 'Médicaments', icon: Tablets },
    permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && { key: 'suivi', label: 'Suivi', icon: RefreshCw },
    { key: 'admin', label: t('patient.admin'), icon: User },
  ].filter(Boolean);

  const renderContent = () => {
    switch (activeTab) {
      case 'consultation': return <ConsultationTab patient={patient} />;
      case 'history': return <MedicalHistory patient={patient} />;
      case 'documents': return <DocumentsTab patient={patient} />;
      case 'secure-files': return <SecureDocuments patient={patient} />;
      case 'billing': return <FacturationTab patient={patient} onNewBilling={() => setShowBillingModal(true)} />;
      case 'protocoles': return <ProtocolesTab patient={patient} />;
      case 'chapter4': return <ChapitreIVTab patient={patient} />;
      case 'hubs': return <HubsTab patient={patient} onOpenSumehr={() => setShowSumehrEditor(true)} />;
      case 'labo': return <LabResultsManager patientId={patient.id} />;
      case 'medicaments': return <MedicamentsPanel />;
      case 'suivi': return <FollowUpDashboard patient={patient} />;
      case 'admin': return <FicheAdministrativeTab patient={patient} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar gauche - Navigation dossier */}
      <aside className="w-56 bg-card border-r flex flex-col overflow-hidden flex-shrink-0">
        {/* Patient header */}
        <div className="p-4 border-b">
          <button onClick={handleClose} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {age && <span>{age} ans</span>}
                {age && <span> · </span>}
                {patient.gender === 'male' ? 'M' : 'F'}
              </p>
            </div>
          </div>

          {patient.allergies && (
            <div className="mt-3 px-2.5 py-1.5 bg-destructive/8 border border-destructive/15 rounded text-xs text-destructive">
              ⚠️ {patient.allergies}
            </div>
          )}
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors text-left mb-0.5 ${
                  isActive 
                    ? 'bg-foreground text-background font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick actions */}
        <div className="p-2 border-t space-y-1">
          {permissions.hasPermission(PERMISSIONS.CREATE_INVOICES) && (
            <Button onClick={() => setShowQuickBilling(true)} variant="ghost" className="w-full justify-start gap-2 h-8 text-xs" size="sm">
              <CreditCard className="w-3.5 h-3.5" />
              {t('actions.bill')}
            </Button>
          )}
          {permissions.hasPermission(PERMISSIONS.CREATE_PRESCRIPTIONS) && (
            <Button onClick={() => setShowQuickPrescription(true)} variant="ghost" className="w-full justify-start gap-2 h-8 text-xs" size="sm">
              <Pill className="w-3.5 h-3.5" />
              {t('actions.prescribe')}
            </Button>
          )}
          <Button onClick={() => setShowDocumentGenerator(true)} variant="ghost" className="w-full justify-start gap-2 h-8 text-xs" size="sm">
            <FileText className="w-3.5 h-3.5" />
            Document
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
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

      {showSumehrEditor && (
        <SumehrEditor
          patient={patient}
          onClose={() => setShowSumehrEditor(false)}
        />
      )}

      {showDocumentGenerator && (
        <MedicalDocumentGenerator
          isOpen={showDocumentGenerator}
          onClose={() => setShowDocumentGenerator(false)}
          patient={patient}
        />
      )}

      <NewPatientDialog
        isOpen={showNewPatientDialog}
        onClose={() => setShowNewPatientDialog(false)}
      />
    </div>
  );
}