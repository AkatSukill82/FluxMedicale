import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Définition des rôles
export const ROLES = {
  ADMIN: 'admin',      // Médecin chef / Administrateur — accès complet
  EDITOR: 'editor',    // Médecin / Collaborateur — accès clinique + édition
  VIEWER: 'user'       // Secrétaire / Observateur — lecture seule + agenda
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Éditeur',
  [ROLES.VIEWER]: 'Lecteur'
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Accès complet : gestion utilisateurs, configuration, données cliniques et facturation',
  [ROLES.EDITOR]: 'Accès clinique : consultation, prescription, facturation, sans gestion utilisateurs/système',
  [ROLES.VIEWER]: 'Lecture seule : consultation dossiers, agenda, pas de modification clinique'
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  [ROLES.EDITOR]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  [ROLES.VIEWER]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
};

// Permissions granulaires
export const PERMISSIONS = {
  // Administration
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT: 'view_audit',
  EXPORT_DATA: 'export_data',
  MANAGE_SETTINGS: 'manage_settings',

  // Patients
  VIEW_PATIENTS: 'view_patients',
  CREATE_PATIENTS: 'create_patients',
  EDIT_PATIENTS: 'edit_patients',

  // Agenda
  VIEW_CALENDAR: 'view_calendar',
  CREATE_APPOINTMENTS: 'create_appointments',
  EDIT_APPOINTMENTS: 'edit_appointments',
  CANCEL_APPOINTMENTS: 'cancel_appointments',

  // Données cliniques
  VIEW_MEDICAL_DATA: 'view_medical_data',
  EDIT_MEDICAL_DATA: 'edit_medical_data',
  CREATE_CONSULTATIONS: 'create_consultations',
  EDIT_CONSULTATIONS: 'edit_consultations',
  VIEW_PRESCRIPTIONS: 'view_prescriptions',
  CREATE_PRESCRIPTIONS: 'create_prescriptions',

  // Facturation
  VIEW_INVOICES: 'view_invoices',
  CREATE_INVOICES: 'create_invoices',
  EDIT_INVOICES: 'edit_invoices',
  DELETE_INVOICES: 'delete_invoices',
  SEND_INVOICES: 'send_invoices'
};

// Matrice de permissions par rôle
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // Tout

  [ROLES.EDITOR]: [
    // Patients
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.EDIT_PATIENTS,
    // Agenda
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.CREATE_APPOINTMENTS,
    PERMISSIONS.EDIT_APPOINTMENTS,
    PERMISSIONS.CANCEL_APPOINTMENTS,
    // Clinique
    PERMISSIONS.VIEW_MEDICAL_DATA,
    PERMISSIONS.EDIT_MEDICAL_DATA,
    PERMISSIONS.CREATE_CONSULTATIONS,
    PERMISSIONS.EDIT_CONSULTATIONS,
    PERMISSIONS.VIEW_PRESCRIPTIONS,
    PERMISSIONS.CREATE_PRESCRIPTIONS,
    // Facturation
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.CREATE_INVOICES,
    PERMISSIONS.EDIT_INVOICES,
    PERMISSIONS.SEND_INVOICES,
    // Export
    PERMISSIONS.EXPORT_DATA,
  ],

  [ROLES.VIEWER]: [
    // Lecture seule patients
    PERMISSIONS.VIEW_PATIENTS,
    // Agenda lecture + gestion
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.CREATE_APPOINTMENTS,
    PERMISSIONS.EDIT_APPOINTMENTS,
    PERMISSIONS.CANCEL_APPOINTMENTS,
    // Lecture données médicales (sans édition)
    PERMISSIONS.VIEW_MEDICAL_DATA,
    PERMISSIONS.VIEW_PRESCRIPTIONS,
    // Facturation lecture
    PERMISSIONS.VIEW_INVOICES,
  ]
};

// Hook principal
export const usePermissions = (user) => {
  const hasPermission = (permission) => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes(permission);
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some(p => hasPermission(p));
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const hasMinRole = (minRole) => {
    if (!user) return false;
    const hierarchy = [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN];
    return hierarchy.indexOf(user.role) >= hierarchy.indexOf(minRole);
  };

  const isAdmin = () => hasRole(ROLES.ADMIN);
  const isEditor = () => hasRole(ROLES.EDITOR);
  const isViewer = () => hasRole(ROLES.VIEWER);
  const isMedecin = () => hasMinRole(ROLES.EDITOR); // editor + admin
  const isSecretaire = () => hasRole(ROLES.VIEWER);

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasMinRole,
    isAdmin,
    isEditor,
    isViewer,
    isMedecin,
    isSecretaire,
    userRole: user?.role,
    roleLabel: ROLE_LABELS[user?.role] || 'Inconnu',
    permissions: ROLE_PERMISSIONS[user?.role] || []
  };
};

// Composant de garde
export default function RBACGuard({ 
  children, 
  user, 
  permission, 
  permissions: requiredPermissions,
  role, 
  minRole,
  fallback 
}) {
  const { hasPermission, hasAnyPermission, hasRole, hasMinRole } = usePermissions(user);

  const hasAccess = () => {
    if (permission && !hasPermission(permission)) return false;
    if (requiredPermissions && !hasAnyPermission(requiredPermissions)) return false;
    if (role && !hasRole(role)) return false;
    if (minRole && !hasMinRole(minRole)) return false;
    return true;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6">
          <CardContent className="text-center">
            <Shield className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600">Authentification requise</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess()) {
    if (fallback) return fallback;

    const colors = ROLE_COLORS[user.role] || ROLE_COLORS[ROLES.VIEWER];
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 border-red-200 bg-red-50">
          <CardContent className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Accès restreint</h3>
            <p className="text-red-700 mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette section.
            </p>
            <div className="text-sm text-red-600 bg-red-100 p-3 rounded">
              <p><strong>Votre rôle :</strong> {ROLE_LABELS[user.role] || user.role}</p>
              {permission && <p><strong>Permission requise :</strong> {permission}</p>}
              {minRole && <p><strong>Rôle minimum requis :</strong> {ROLE_LABELS[minRole]}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}