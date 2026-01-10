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
  Moon
} from 'lucide-react';
import { useI18n } from '../components/i18n/i18nContext';
import { useEIDReader } from '../components/eid/useEIDReader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { readEID, isReading } = useEIDReader();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 50),
  });

  const { data: todayAppointments = [], isLoading: loadingRdv } = useQuery({
    queryKey: ['todayAppointments'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const all = await base44.entities.RendezVous.list('heure_debut', 50);
      return all.filter(rdv => rdv.date === today && rdv.statut !== 'Annulé');
    },
  });

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
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 18 ? Sun : Moon;

  // Next appointment
  const now = new Date();
  const nextAppointment = todayAppointments.find(rdv => {
    const [h, m] = (rdv.heure_debut || '00:00').split(':');
    const rdvTime = new Date();
    rdvTime.setHours(parseInt(h), parseInt(m), 0);
    return rdvTime >= now;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              placeholder="Rechercher un patient (nom ou NISS)..."
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
          <span className="text-xs font-medium">Lire eID</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Patients'))}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200"
        >
          <Plus className="w-6 h-6 text-green-600" />
          <span className="text-xs font-medium">Nouveau patient</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Agenda'))}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200"
        >
          <Calendar className="w-6 h-6 text-purple-600" />
          <span className="text-xs font-medium">Agenda</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Prescriptions'))}
          className="h-auto py-4 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-200"
        >
          <Clock className="w-6 h-6 text-orange-600" />
          <span className="text-xs font-medium">Prescriptions</span>
        </Button>
      </div>

      {/* Today's Appointments - Clean List */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold">Aujourd'hui</h2>
                <p className="text-sm text-slate-500">
                  {todayAppointments.length} rendez-vous
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(createPageUrl('Agenda'))}
              className="text-blue-600"
            >
              Voir tout
            </Button>
          </div>

          {loadingRdv ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">Journée libre</p>
              <p className="text-sm text-slate-400">Aucun rendez-vous prévu</p>
            </div>
          ) : (
            <div className="divide-y">
              {todayAppointments.slice(0, 6).map((rdv, index) => {
                const isNext = nextAppointment?.id === rdv.id;
                return (
                  <button
                    key={rdv.id}
                    onClick={() => navigate(createPageUrl(`Patients?patient=${rdv.patient_id}`))}
                    className={`w-full p-4 text-left hover:bg-slate-50 flex items-center gap-4 transition-colors ${
                      isNext ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`w-12 text-center ${isNext ? 'text-blue-600' : 'text-slate-600'}`}>
                      <p className="text-lg font-semibold">{rdv.heure_debut}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getPatientName(rdv.patient_id)}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {rdv.motif || rdv.type_consultation}
                      </p>
                    </div>
                    {isNext && (
                      <Badge className="bg-blue-600 flex-shrink-0">Prochain</Badge>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}