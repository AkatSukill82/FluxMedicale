import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  User,
  Calendar,
  FileText,
  CreditCard,
  Settings,
  Upload,
  Inbox,
  Users,
  Shield,
  Activity,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useI18n } from './i18n/i18nContext';
import { Badge } from '@/components/ui/badge';

export default function CommandPalette() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100),
    enabled: open // Only load when palette is open
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.RendezVous.list('-date', 50),
    enabled: open
  });

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const pages = [
    { icon: TrendingUp, label: t('nav.dashboard'), value: 'Dashboard', keywords: ['home', 'accueil', 'dashboard'] },
    { icon: Users, label: t('nav.patients'), value: 'Patients', keywords: ['patients', 'dossiers'] },
    { icon: Calendar, label: t('nav.agenda'), value: 'Agenda', keywords: ['agenda', 'rendez-vous', 'calendar'] },
    { icon: FileText, label: t('nav.templates'), value: 'Templates', keywords: ['templates', 'modèles', 'documents'] },
    { icon: Inbox, label: t('nav.inbox'), value: 'Inbox', keywords: ['inbox', 'messages', 'ehealth'] },
    { icon: Upload, label: t('nav.import'), value: 'Import', keywords: ['import', 'pmf', 'smf'] },
    { icon: CreditCard, label: t('nav.billing'), value: 'Facturation', keywords: ['facturation', 'billing', 'mycarenet'] },
    { icon: Settings, label: t('nav.profile'), value: 'ProfilMedecin', keywords: ['profil', 'settings', 'paramètres'] },
    { icon: Shield, label: t('nav.security'), value: 'Securite', keywords: ['sécurité', 'mfa', '2fa'] },
    { icon: Activity, label: t('nav.health'), value: 'Health', keywords: ['santé', 'health', 'tests'] },
  ];

  const actions = [
    { 
      icon: User, 
      label: 'Nouveau patient', 
      action: () => navigate(createPageUrl('Patients')),
      keywords: ['nouveau', 'patient', 'créer']
    },
    { 
      icon: Calendar, 
      label: 'Nouveau rendez-vous', 
      action: () => navigate(createPageUrl('Agenda')),
      keywords: ['nouveau', 'rdv', 'rendez-vous']
    },
    { 
      icon: FileText, 
      label: 'Nouveau document', 
      action: () => navigate(createPageUrl('Templates')),
      keywords: ['document', 'certificat', 'attestation']
    },
    { 
      icon: Zap, 
      label: 'Lire carte eID', 
      action: () => {
        // Trigger eID read
        window.dispatchEvent(new CustomEvent('trigger-eid-read'));
      },
      keywords: ['eid', 'carte', 'lecture']
    },
  ];

  const filteredPatients = useMemo(() => {
    if (!search || search.length < 2) return [];
    const term = search.toLowerCase();
    return patients.filter(p => {
      const officialName = p.name?.find(n => n.use === 'official') || {};
      const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.toLowerCase();
      const niss = p.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
      return fullName.includes(term) || niss.includes(term);
    }).slice(0, 5);
  }, [search, patients]);

  const filteredAppointments = useMemo(() => {
    if (!search || search.length < 2) return [];
    const term = search.toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(a => {
      const patient = patients.find(p => p.id === a.patient_id);
      const officialName = patient?.name?.find(n => n.use === 'official') || {};
      const patientName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.toLowerCase();
      return a.date >= today && (patientName.includes(term) || a.motif?.toLowerCase().includes(term));
    }).slice(0, 5);
  }, [search, appointments, patients]);

  const getPatientName = useCallback((patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const officialName = patient.name?.find(n => n.use === 'official') || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  }, [patients]);

  const handleSelect = useCallback((callback) => {
    setOpen(false);
    setSearch('');
    callback();
  }, []);

  return (
    <>
      {/* Global search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Recherche rapide</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Rechercher patients, actions, pages..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

          {/* Pages */}
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem
                key={page.value}
                value={page.keywords.join(' ')}
                onSelect={() => handleSelect(() => navigate(createPageUrl(page.value)))}
              >
                <page.icon className="mr-2 h-4 w-4" />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions */}
          <CommandGroup heading="Actions rapides">
            {actions.map((action, index) => (
              <CommandItem
                key={index}
                value={action.keywords.join(' ')}
                onSelect={() => handleSelect(action.action)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {/* Patients (only show when searching) */}
          {filteredPatients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Patients">
                {filteredPatients.map((patient) => {
                  const officialName = patient.name?.find(n => n.use === 'official') || {};
                  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`;
                  const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
                  
                  return (
                    <CommandItem
                      key={patient.id}
                      value={`patient ${fullName} ${niss}`}
                      onSelect={() => handleSelect(() => navigate(createPageUrl(`Patients?patient=${patient.id}`)))}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{fullName}</div>
                        <div className="text-xs text-muted-foreground">NISS: {niss}</div>
                      </div>
                      <Badge variant="outline">{patient.birthDate}</Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Appointments (only show when searching) */}
          {filteredAppointments.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Rendez-vous à venir">
                {filteredAppointments.map((appointment) => (
                  <CommandItem
                    key={appointment.id}
                    value={`rdv ${getPatientName(appointment.patient_id)} ${appointment.motif}`}
                    onSelect={() => handleSelect(() => navigate(createPageUrl('Agenda')))}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{getPatientName(appointment.patient_id)}</div>
                      <div className="text-xs text-muted-foreground">
                        {appointment.date} à {appointment.heure_debut} • {appointment.motif}
                      </div>
                    </div>
                    <Badge variant="outline">{appointment.type_consultation}</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}