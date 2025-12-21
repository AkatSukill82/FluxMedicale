import React from 'react';
import { Calendar, AlertTriangle, Euro, ClipboardList, Activity } from 'lucide-react';
import TodayAppointmentsWidget from './widgets/TodayAppointmentsWidget';
import PatientAlertsWidget from './widgets/PatientAlertsWidget';
import BillingStatsWidget from './widgets/BillingStatsWidget';
import TasksWidget from './widgets/TasksWidget';
import QuickStatsWidget from './widgets/QuickStatsWidget';

export const AVAILABLE_WIDGETS = [
  {
    id: 'appointments',
    title: 'Rendez-vous du jour',
    description: 'Consultations planifiées aujourd\'hui',
    icon: <Calendar className="w-5 h-5 text-blue-600" />,
    component: <TodayAppointmentsWidget />
  },
  {
    id: 'alerts',
    title: 'Alertes patient',
    description: 'Allergies sévères et vaccinations à venir',
    icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    component: <PatientAlertsWidget />
  },
  {
    id: 'billing',
    title: 'Facturation',
    description: 'Résumé de la facturation du mois',
    icon: <Euro className="w-5 h-5 text-green-600" />,
    component: <BillingStatsWidget />
  },
  {
    id: 'tasks',
    title: 'Tâches à faire',
    description: 'Suivi des tâches et rappels',
    icon: <ClipboardList className="w-5 h-5 text-purple-600" />,
    component: <TasksWidget />
  },
  {
    id: 'stats',
    title: 'Statistiques rapides',
    description: 'Vue d\'ensemble de l\'activité',
    icon: <Activity className="w-5 h-5 text-cyan-600" />,
    component: <QuickStatsWidget />
  }
];

export const DEFAULT_WIDGET_ORDER = ['appointments', 'alerts', 'billing', 'tasks'];