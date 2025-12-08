import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  CreditCard,
  Users,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Download,
  Activity,
  Zap,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr, nl, enUS } from "date-fns/locale";
import { useEIDReader } from "../components/eid/useEIDReader";
import EIDInstallationModal from "../components/eid/EIDInstallationModal";
import DuplicateResolutionDialog from "../components/eid/DuplicateResolutionDialog";
import { toast } from "sonner";
import { useAutoOpenEID } from '../components/eid/useAutoOpenEID';
import { useI18n } from '../components/i18n/i18nContext';
import QuickActions from '../components/dashboard/QuickActions';
import NewPatientDialog from '../components/patients/NewPatientDialog';


export default function Dashboard() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showEIDModal, setShowEIDModal] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list("-created_date", 200)
  });



  const { isReading, error: eidError, eidStatus, readEID, detectMiddleware } = useEIDReader();
  const { isEnabled: autoOpenEnabled, agentStatus, toggleAutoOpen, checkAgentStatus } = useAutoOpenEID();

  const locales = { fr, nl, en: enUS };

  useEffect(() => {
    checkAgentStatus();
    const agentInterval = setInterval(checkAgentStatus, 15000);
    return () => clearInterval(agentInterval);
  }, [checkAgentStatus]);
  
  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return patients.filter(patient => {
      const officialName = patient.name?.find(n => n.use === 'official') || {};
      const prenom = (officialName.given || []).join(' ').toLowerCase();
      const nom = (officialName.family || '').toLowerCase();
      const niss = patient.identifier?.find(id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin')?.value || '';
      const birthDate = patient.birthDate || '';
      return (
        prenom.includes(term) ||
        nom.includes(term) ||
        niss.includes(term) ||
        birthDate.includes(term) ||
        patient.id.toString().includes(term)
      );
    }).slice(0, 10);
  }, [searchTerm, patients]);

  const handlePatientSelect = (patient) => {
    setSearchTerm("");
    navigate(createPageUrl(`Patients?patient=${patient.id}`));
  };

  const handleEIDRead = async () => {
    // Re-check status just before reading for max reliability
    const status = await detectMiddleware();
    if (!status.isDetected) {
      setShowEIDModal(true);
      return;
    }

    const result = await readEID();
    if (!result) return;

    if (result.status === 'MATCH' || result.status === 'CREATED') {
      toast.success(
        result.status === 'CREATED'
          ? t('toast.patientCreatedSuccess')
          : t('toast.patientFound')
      );
      navigate(createPageUrl(`Patients?patient=${result.patient.id}`));
    } else if (result.status === 'DUPLICATES') {
      setDuplicateDialog({
        patients: result.patients,
        eidData: result.eidData,
        niss: result.niss
      });
    } else if (result.status === 'ERROR') {
      toast.error(result.error || t('toast.eidReadError'));
    }
  };

  const handleRetestEID = async () => {
    const status = await detectMiddleware(true); // force re-test
    if (status.isDetected) {
        toast.success(t('toast.eidViewerDetected'));
    } else {
        toast.error(t('toast.eidViewerNotDetected'));
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {t('dashboard.welcome', { name: user?.full_name || '...' })}
          </h1>
          <p className="text-slate-600 mt-1">
            {format(new Date(), 'eeee d MMMM yyyy', { locale: locales[locale] || fr })}
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder={t('dashboard.searchPatient')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-base py-6 pl-12 pr-4 rounded-xl shadow-sm"
        />
        {searchResults.length > 0 && (
          <Card className="absolute z-10 w-full mt-2 shadow-xl rounded-xl">
            <CardContent className="p-2 max-h-80 overflow-y-auto">
              {searchResults.map(p => {
                const officialName = p.name?.find(n => n.use === 'official') || {};
                const birthDate = p.birthDate ? new Date(p.birthDate) : null;
                const isValidDate = birthDate && !isNaN(birthDate.getTime());
                
                return (
                  <div
                    key={p.id}
                    onClick={() => handlePatientSelect(p)}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {`${(officialName.given || []).join(' ')} ${officialName.family || ''}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.identifier?.find(id => id.system.includes('ssin'))?.value || t('patient.nissNotAvailable')} • {
                          isValidDate 
                            ? format(birthDate, 'dd/MM/yyyy', { locale: locales[locale] || fr })
                            : t('patient.dateNotAvailable')
                        }
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm hover:shadow-lg transition-shadow border-0 bg-card">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
            <h3 className="text-lg font-semibold text-card-foreground mb-3">{t('eid.title')}</h3>
            <Button
              onClick={handleEIDRead}
              disabled={isReading}
              className="w-full py-6 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isReading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('status.reading')}
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  {t('actions.readEID')}
                </>
              )}
            </Button>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
              {eidStatus.isDetected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3"/> {t('dashboard.eidViewerDetected')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="w-3 h-3"/> {t('dashboard.eidViewerNotDetected')}
                </span>
              )}
              <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleRetestEID}>{t('actions.retest')}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-lg transition-shadow border-0 bg-card">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full space-y-3">
            <h3 className="text-lg font-semibold text-card-foreground">{t('patient.title')}</h3>
            <Button 
              onClick={() => setShowNewPatient(true)}
              className="w-full py-5 text-base bg-primary hover:bg-primary/90"
            >
              <Users className="w-5 h-5 mr-2" />
              Créer un patient
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('Patients'))} 
              variant="outline" 
              className="w-full py-5 text-base"
            >
              <Users className="w-5 h-5 mr-2" />
              {t('patient.viewAll')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('patient.totalPatients', { count: patients.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      <NewPatientDialog isOpen={showNewPatient} onClose={() => setShowNewPatient(false)} />
      <EIDInstallationModal isOpen={showEIDModal} onClose={() => setShowEIDModal(false)} onRetest={handleRetestEID} platform={eidStatus.platform} />
      {duplicateDialog && (
        <DuplicateResolutionDialog
          isOpen={true}
          onCancel={() => setDuplicateDialog(null)}
          patients={duplicateDialog.patients}
          eidData={duplicateDialog.eidData}
          niss={duplicateDialog.niss}
          onSelectPatient={(patient) => {
            setDuplicateDialog(null);
            navigate(createPageUrl(`Patients?patient=${patient.id}`));
          }}
          onMerge={() => {
            toast.info(t("toast.mergeFeatureComingSoon"));
          }}
        />
      )}
    </div>
  );
}