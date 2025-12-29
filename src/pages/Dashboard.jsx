import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Calendar,
  CreditCard,
  FileText,
  Search,
  Plus,
  Clock,
  TrendingUp,
  Activity,
  Stethoscope,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useI18n } from '../components/i18n/i18nContext';
import { useEIDReader } from '../components/eid/useEIDReader';
import { format, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { readEID, isReading, eidDetected } = useEIDReader();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100),
  });

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['todayAppointments'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const all = await base44.entities.RendezVous.list('-date', 50);
      return all.filter(rdv => rdv.date === today);
    },
  });

  const { data: recentInvoices = [] } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 10),
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

  // Stats
  const stats = {
    totalPatients: patients.length,
    todayAppointments: todayAppointments.length,
    pendingInvoices: recentInvoices.filter(i => i.statut === 'En attente').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('dashboard.welcome', { name: user?.full_name?.split(' ')[0] || 'Docteur' })}
          </h1>
          <p className="text-slate-600">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleReadEID}
            disabled={isReading}
            variant="outline"
            className="gap-2"
          >
            {isReading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Stethoscope className="w-4 h-4" />
            )}
            {t('actions.readEID')}
          </Button>
          <Button
            onClick={() => navigate(createPageUrl('Patients'))}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau patient
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={t('dashboard.searchPatient')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
            {filteredPatients.length > 0 && searchQuery.length >= 2 && (
              <Card className="absolute z-10 w-full mt-2 shadow-lg">
                <CardContent className="p-2 max-h-64 overflow-y-auto">
                  {filteredPatients.slice(0, 8).map(p => {
                    const name = p.name?.find(n => n.use === 'official');
                    const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(createPageUrl(`Patients?patient=${p.id}`))}
                        className="w-full p-3 text-left hover:bg-slate-100 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{fullName}</p>
                          <p className="text-sm text-slate-500">{p.birthDate}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate(createPageUrl('Patients'))}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Patients</p>
                <p className="text-3xl font-bold">{stats.totalPatients}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-green-300 transition-colors"
          onClick={() => navigate(createPageUrl('Agenda'))}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">RDV aujourd'hui</p>
                <p className="text-3xl font-bold">{stats.todayAppointments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-orange-300 transition-colors"
          onClick={() => navigate(createPageUrl('Facturation'))}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Factures en attente</p>
                <p className="text-3xl font-bold">{stats.pendingInvoices}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Rendez-vous du jour</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(createPageUrl('Agenda'))}
            >
              Voir tout
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucun rendez-vous aujourd'hui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map(rdv => (
                  <div 
                    key={rdv.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => navigate(createPageUrl(`Patients?patient=${rdv.patient_id}`))}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{rdv.heure_debut}</p>
                      <p className="text-sm text-slate-500">{rdv.motif || rdv.type_consultation}</p>
                    </div>
                    <Badge variant="outline">{rdv.statut}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Patients récents</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(createPageUrl('Patients'))}
            >
              Voir tout
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucun patient enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 5).map(p => {
                  const name = p.name?.find(n => n.use === 'official');
                  const fullName = `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim();
                  return (
                    <div 
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                      onClick={() => navigate(createPageUrl(`Patients?patient=${p.id}`))}
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-purple-600">
                          {name?.given?.[0]?.[0]}{name?.family?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{fullName}</p>
                        <p className="text-sm text-slate-500">{p.birthDate}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}