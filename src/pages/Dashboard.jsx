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
import { fr, enUS, nl } from 'date-fns/locale';
import DashboardWidgetManager, { useDashboardWidgets } from '../components/dashboard/DashboardWidgetManager';
import { AVAILABLE_WIDGETS } from '../components/dashboard/widgetConfig';
import { useOfflinePatients, useOfflineRendezVous } from '../components/offline/useOfflineData';
import OfflineBanner from '../components/offline/OfflineBanner';

export default function Dashboard() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <OfflineBanner />
      
      {/* Greeting */}
      <div className="py-4">
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          <GreetingIcon className="w-3.5 h-3.5" />
          {format(new Date(), "EEEE d MMMM", { locale: dateLocale })}
        </p>
        <h1 className="text-2xl font-medium">
          {greeting}, <span>{user?.full_name?.split(' ')[0] || 'Dr.'}</span>
        </h1>
      </div>

      {/* Search */}
      <div className="relative">
        <form onSubmit={handleSearch}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border"
          />
        </form>
        {filteredPatients.length > 0 && searchQuery.length >= 2 && (
          <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto divide-y">
              {filteredPatients.slice(0, 6).map(p => {
                const name = p.name?.find(n => n.use === 'official');
                const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(createPageUrl(`Patients?patient=${p.id}`))}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {name?.given?.[0]?.[0]}{name?.family?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{fullName}</p>
                        <p className="text-xs text-muted-foreground">{p.birthDate}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleReadEID}
          disabled={isReading}
          className="flex flex-col items-center gap-1.5 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          {isReading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-[11px] font-medium text-center">{t('dashboard.readEid')}</span>
        </button>

        <button
          onClick={() => navigate(createPageUrl('Patients'))}
          className="flex flex-col items-center gap-1.5 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-center">{t('dashboard.newPatient')}</span>
        </button>

        <button
          onClick={() => navigate(createPageUrl('Agenda'))}
          className="flex flex-col items-center gap-1.5 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-center">{t('dashboard.agenda')}</span>
        </button>

        <button
          onClick={() => navigate(createPageUrl('Prescriptions'))}
          className="flex flex-col items-center gap-1.5 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-center">{t('dashboard.prescriptions')}</span>
        </button>
      </div>

      {/* Messagerie */}
      <button 
        className="w-full flex items-center gap-3 p-3.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
        onClick={() => navigate(createPageUrl('Inbox'))}
      >
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{t('dashboard.secureMessaging')}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.exchangeColleagues')}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Widgets */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-medium">{t('dashboard.myWidgets')}</h2>
        <DashboardWidgetManager 
          config={config}
          toggleWidget={toggleWidget}
          reorderWidgets={reorderWidgets}
          resetToDefault={resetToDefault}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleWidgets.map(widget => (
          <div key={widget.id}>
            {widget.component}
          </div>
        ))}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="border rounded-lg bg-card p-8 text-center">
          <Settings2 className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">{t('dashboard.noActiveWidget')}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">{t('dashboard.customizeDashboard')}</p>
          <DashboardWidgetManager 
            config={config}
            toggleWidget={toggleWidget}
            reorderWidgets={reorderWidgets}
            resetToDefault={resetToDefault}
          />
        </div>
      )}
    </div>
  );
}