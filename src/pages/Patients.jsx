import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  CreditCard,
  Pill,
  Syringe,
  Search,
  Phone,
  Mail,
  AlertTriangle,
  FileText,
  History,
  FolderOpen,
  Lock,
  Euro,
  User,
  ChevronRight
} from 'lucide-react';
import { differenceInYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '../components/i18n/i18nContext';
import { createPageUrl } from '@/utils';
import { useEIDReader } from '../components/eid/useEIDReader';
import { toast } from 'sonner';
import { usePermissions, PERMISSIONS } from '../components/auth/RBACGuard';

// Import tabs
import ConsultationTab from '../components/patients/tabs/ConsultationTab';
import FicheAdministrativeTab from '../components/patients/tabs/FicheAdministrativeTab';
import FacturationTab from '../components/patients/tabs/FacturationTab';
import DocumentsTab from '../components/patients/tabs/DocumentsTab';
import MedicalHistory from '../components/patients/MedicalHistory';
import SecureDocuments from '../components/patients/SecureDocuments';

// Import modals
import BillingModal from '../components/facturation/BillingModal';
import QuickBilling from '../components/facturation/QuickBilling';
import QuickPrescription from '../components/prescriptions/QuickPrescription';
import QuickVaccination from '../components/vaccinations/QuickVaccination';

const TABS = [
  { id: 'consultation', label: 'Consultation', icon: FileText, permission: 'VIEW_MEDICAL_DATA' },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'secure-files', label: 'Sécurisé', icon: Lock, permission: 'VIEW_MEDICAL_DATA' },
  { id: 'billing', label: 'Facturation', icon: Euro },
  { id: 'admin', label: 'Administratif', icon: User },
];

export default function Patients() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  
  const urlParams = new URLSearchParams(location.search);
  const patientId = urlParams.get('patient');
  
  const [currentUser, setCurrentUser] = useState(null);
  const permissions = usePermissions(currentUser);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);
  
  const [activeTab, setActiveTab] = useState('consultation');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showQuickBilling, setShowQuickBilling] = useState(false);
  const [showQuickPrescription, setShowQuickPrescription] = useState(false);
  const [showQuickVaccination, setShowQuickVaccination] = useState(false);
  
  const { readEID } = useEIDReader();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.list();
      return patients.find(p => p.id === patientId);
    },
    enabled: !!patientId
  });

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && patientId) {
        switch(e.key.toLowerCase()) {
          case 'f': e.preventDefault(); setShowQuickBilling(true); break;
          case 'p': e.preventDefault(); setShowQuickPrescription(true); break;
          case 'v': e.preventDefault(); setShowQuickVaccination(true); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patientId]);

  const handleClose = () => navigate(createPageUrl('Dashboard'));

  // Liste des patients
  const { data: allPatients = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
    enabled: !patientId
  });

  const filteredPatients = allPatients.filter(p => {
    if (!searchQuery) return true;
    const name = p.name?.find(n => n.use === 'official');
    const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Vue liste patients
  if (!patientId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Patients</h1>
          <Badge variant="secondary">{allPatients.length}</Badge>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        
        {isLoadingList ? (
          <div className="flex justify-center py-12 text-muted-foreground">Chargement...</div>
        ) : (
          <div className="space-y-2">
            {filteredPatients.map(p => {
              const name = p.name?.find(n => n.use === 'official') || {};
              const fullName = `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
              const age = p.birthDate ? differenceInYears(new Date(), new Date(p.birthDate)) : null;
              
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(createPageUrl(`Patients?patient=${p.id}`))}
                  className="w-full p-4 bg-white rounded-xl border hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-4 text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {name.given?.[0]?.[0]}{name.family?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{fullName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {age && `${age} ans`}
                      {p.gender && ` • ${p.gender === 'male' ? 'Homme' : 'Femme'}`}
                    </p>
                  </div>
                  {p.allergies && (
                    <Badge variant="destructive" className="flex-shrink-0">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Allergies
                    </Badge>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Chargement patient
  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;
  }

  if (!patient) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Patient non trouvé</div>;
  }

  const name = patient.name?.find(n => n.use === 'official') || {};
  const fullName = `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const phone = patient.telecom?.find(t => t.system === 'phone')?.value;
  const email = patient.telecom?.find(t => t.system === 'email')?.value;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header compact */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {name.given?.[0]?.[0]}{name.family?.[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {age && <span>{age} ans</span>}
                  {patient.gender && <span>• {patient.gender === 'male' ? 'M' : 'F'}</span>}
                  {phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Alerte allergies */}
            {patient.allergies && (
              <Badge variant="destructive" className="ml-4 animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {patient.allergies}
              </Badge>
            )}
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-2">
            {permissions.hasPermission(PERMISSIONS.CREATE_INVOICES) && (
              <Button onClick={() => setShowQuickBilling(true)} size="sm" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Facturer
              </Button>
            )}
            {permissions.hasPermission(PERMISSIONS.CREATE_PRESCRIPTIONS) && (
              <>
                <Button onClick={() => setShowQuickPrescription(true)} size="sm" variant="outline" className="gap-2">
                  <Pill className="w-4 h-4" />
                  Prescrire
                </Button>
                <Button onClick={() => setShowQuickVaccination(true)} size="sm" variant="outline" className="gap-2">
                  <Syringe className="w-4 h-4" />
                  Vacciner
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b px-6">
        <div className="flex gap-1">
          {TABS.map(tab => {
            if (tab.permission && !permissions.hasPermission(PERMISSIONS[tab.permission])) return null;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'consultation' && permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
            <ConsultationTab patient={patient} />
          )}
          {activeTab === 'history' && (
            <MedicalHistory patient={patient} />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab patient={patient} />
          )}
          {activeTab === 'secure-files' && permissions.hasPermission(PERMISSIONS.VIEW_MEDICAL_DATA) && (
            <SecureDocuments patient={patient} />
          )}
          {activeTab === 'billing' && (
            <FacturationTab patient={patient} onNewBilling={() => setShowBillingModal(true)} />
          )}
          {activeTab === 'admin' && (
            <FicheAdministrativeTab patient={patient} />
          )}
        </div>
      </main>

      {/* Modals */}
      {showBillingModal && (
        <BillingModal patient={patient} isOpen={showBillingModal} onClose={() => setShowBillingModal(false)} />
      )}
      {showQuickBilling && (
        <QuickBilling patient={patient} isOpen={showQuickBilling} onClose={() => setShowQuickBilling(false)} />
      )}
      {showQuickPrescription && (
        <QuickPrescription patient={patient} isOpen={showQuickPrescription} onClose={() => setShowQuickPrescription(false)} />
      )}
      {showQuickVaccination && (
        <QuickVaccination patient={patient} isOpen={showQuickVaccination} onClose={() => setShowQuickVaccination(false)} />
      )}
    </div>
  );
}