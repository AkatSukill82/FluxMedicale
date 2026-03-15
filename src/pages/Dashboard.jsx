import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
  CreditCard,
  Sun,
  Sunrise,
  Moon,
  Settings2,
  MessageSquare
} from 'lucide-react';
import { useI18n } from '../components/i18n/i18nContext';
import { useEIDReader } from '../components/eid/useEIDReader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DashboardWidgetManager, { useDashboardWidgets } from '../components/dashboard/DashboardWidgetManager';
import { AVAILABLE_WIDGETS } from '../components/dashboard/widgetConfig';
import { useOfflinePatients, useOfflineRendezVous } from '../components/offline/useOfflineData';
import OfflineBanner from '../components/offline/OfflineBanner';

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { readEID, isReading } = useEIDReader();
  const { config, visibleWidgets, toggleWidget, reorderWidgets, resetToDefault } = useDashboardWidgets();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const u = await base44.auth.me();
        localStorage.setItem('fluxmed_cached_user', JSON.stringify(u));
        return u;
      } catch {
        const cached = JSON.parse(localStorage.getItem('fluxmed_cached_user') || 'null');
        return cached;
      }
    },
  });

  const { data: patients = [] } = useOfflinePatients('-created_date', 50);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAppointments = [], isLoading: loadingRdv } = useOfflineRendezVous(today);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Patients?search=${encodeURIComponent(searchQuery)}`));
    }
  };

  const handleReadEID = async () => {
    const result = await readEID();
    if (result?.patient?.id) {
      navigate(createPageUrl(`Patients?patient=${result.patient.id}`));
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!searchQuery || searchQuery.length < 2) return false;
    const name = p.name?.find(n => n.use === 'official');
    const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.toLowerCase();
    const niss = p.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
    return fullName.includes(searchQuery.toLowerCase()) || niss.includes(searchQuery);
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient';
    const name = patient.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim() || 'Patient';
  };

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 18 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening');
  const GreetingIcon = hour < 12 ? Sunrise : hour < 18 ? Sun : Moon;

  // Filter today's appointments (cache may return all dates)
  const filteredTodayAppointments = todayAppointments.filter(rdv => rdv.date === today && rdv.statut !== 'Annulé');

  // Next appointment
  const now = new Date();
  const nextAppointment = filteredTodayAppointments.find(rdv => {
    const [h, m] = (rdv.heure_debut || '00:00').split(':');
    const rdvTime = new Date();
    rdvTime.setHours(parseInt(h), parseInt(m), 0);
    return rdvTime >= now;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <OfflineBanner />
      {/* Greeting - Simple & Calm */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 text-slate-400 mb-2">
          <GreetingIcon className="w-5 h-5" />
          <span className="text-sm">{format(new Date(), "EEEE d MMMM", { locale: fr })}</span>
        </div>
        <h1 className="text-3xl font-light text-slate-800">
          {greeting}, <span className="font-medium">{user?.full_name?.split(' ')[0] || 'Docteur'}</span>
        </h1>
      </div>

      {/* Search - Central & Prominent */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={t('dashboard.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg border-0 shadow-none focus-visible:ring-0 bg-slate-50 rounded-xl"
            />
            {filteredPatients.length > 0 && searchQuery.length >= 2 && (
              <Card className="absolute z-10 w-full mt-2 shadow-xl border-0">
                <CardContent className="p-2 max-h-72 overflow-y-auto">
                  {filteredPatients.slice(0, 6).map(p => {
                    const name = p.name?.find(n => n.use === 'official');
                    const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(createPageUrl(`Patients?patient=${p.id}`))}
                        className="w-full p-4 text-left hover:bg-blue-50 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-blue-600 text-sm">
                              {name?.given?.[0]?.[0]}{name?.family?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{fullName}</p>
                            <p className="text-sm text-slate-500">{p.birthDate}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions - Clean Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="outline"
          onClick={handleReadEID}
          disabled={isReading}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200"
        >
          {isReading ? (
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          ) : (
            <CreditCard className="w-6 h-6 text-blue-600" />
          )}
          <span className="text-xs font-medium">{t('dashboard.readEid')}</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Patients'))}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200"
        >
          <Plus className="w-6 h-6 text-green-600" />
          <span className="text-xs font-medium">{t('dashboard.newPatient')}</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Agenda'))}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200"
        >
          <Calendar className="w-6 h-6 text-purple-600" />
          <span className="text-xs font-medium">{t('dashboard.agenda')}</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Prescriptions'))}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-200"
        >
          <Clock className="w-6 h-6 text-orange-600" />
          <span className="text-xs font-medium">{t('dashboard.prescriptions')}</span>
        </Button>
      </div>

      {/* Accès rapide Messagerie */}
      <Card 
        className="shadow-sm cursor-pointer hover:shadow-md transition-shadow border-blue-100 bg-blue-50/30"
        onClick={() => navigate(createPageUrl('Inbox'))}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">{t('dashboard.secureMessaging')}</p>
            <p className="text-sm text-slate-500">{t('dashboard.exchangeColleagues')}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </CardContent>
      </Card>

      {/* Configurable Widgets Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">{t('dashboard.myWidgets')}</h2>
        <DashboardWidgetManager 
          config={config}
          toggleWidget={toggleWidget}
          reorderWidgets={reorderWidgets}
          resetToDefault={resetToDefault}
        />
      </div>

      {/* Dynamic Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleWidgets.map(widget => (
          <div key={widget.id}>
            {widget.component}
          </div>
        ))}
      </div>

      {visibleWidgets.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center">
            <Settings2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">{t('dashboard.noActiveWidget')}</p>
            <p className="text-sm text-slate-400 mb-4">{t('dashboard.customizeDashboard')}</p>
            <DashboardWidgetManager 
              config={config}
              toggleWidget={toggleWidget}
              reorderWidgets={reorderWidgets}
              resetToDefault={resetToDefault}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}