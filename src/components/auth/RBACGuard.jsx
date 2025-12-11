import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Définition des rôles et permissions
export const ROLES = {
  MEDECIN: 'admin',
  SECRETAIRE: 'user'
};

export const PERMISSIONS = {
  // Permissions administratives
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT: 'view_audit',
  EXPORT_DATA: 'export_data',
  
  // Permissions patients
  VIEW_PATIENTS: 'view_patients',
  CREATE_PATIENTS: 'create_patients',
  EDIT_PATIENTS: 'edit_patients',
  
  // Permissions agenda
  VIEW_CALENDAR: 'view_calendar',
  CREATE_APPOINTMENTS: 'create_appointments',
  EDIT_APPOINTMENTS: 'edit_appointments',
  CANCEL_APPOINTMENTS: 'cancel_appointments',
  
  // Permissions cliniques (sensibles)
  VIEW_MEDICAL_DATA: 'view_medical_data',
  EDIT_MEDICAL_DATA: 'edit_medical_data',
  CREATE_CONSULTATIONS: 'create_consultations',
  EDIT_CONSULTATIONS: 'edit_consultations',
  VIEW_PRESCRIPTIONS: 'view_prescriptions',
  CREATE_PRESCRIPTIONS: 'create_prescriptions',
  
  // Permissions facturation
  VIEW_INVOICES: 'view_invoices',
  CREATE_INVOICES: 'create_invoices',
  EDIT_INVOICES: 'edit_invoices',
  DELETE_INVOICES: 'delete_invoices',
  SEND_INVOICES: 'send_invoices'
};

// Matrice des permissions par rôle (principe du moindre privilège)
const ROLE_PERMISSIONS = {
  [ROLES.MEDECIN]: [
    // Toutes les permissions pour les médecins
    ...Object.values(PERMISSIONS)
  ],
  [ROLES.SECRETAIRE]: [
    // Permissions limitées pour les secrétaires
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.EDIT_PATIENTS,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.CREATE_APPOINTMENTS,
    PERMISSIONS.EDIT_APPOINTMENTS,
    PERMISSIONS.CANCEL_APPOINTMENTS,
    // Permissions facturation
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.CREATE_INVOICES,
    PERMISSIONS.EDIT_INVOICES,
    PERMISSIONS.SEND_INVOICES,
    // Pas d'accès aux données cliniques par défaut
  ]
};

// Hook pour vérifier les permissions
export const usePermissions = (user) => {
  const hasPermission = (permission) => {
    if (!user) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const isMedecin = () => hasRole(ROLES.MEDECIN);
  const isSecretaire = () => hasRole(ROLES.SECRETAIRE);

  return {
    hasPermission,
    hasRole,
    isMedecin,
    isSecretaire,
    userRole: user?.role,
    permissions: ROLE_PERMISSIONS[user?.role] || []
  };
};

// Composant de garde RBAC
export default function RBACGuard({ 
  children, 
  user, 
  permission, 
  role, 
  fallback 
}) {
  const { hasPermission, hasRole } = usePermissions(user);

  // Vérification des permissions
  const hasAccess = () => {
    if (permission && !hasPermission(permission)) return false;
    if (role && !hasRole(role)) return false;
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
    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 border-red-200 bg-red-50">
          <CardContent className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Accès restreint
            </h3>
            <p className="text-red-700 mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette section.
            </p>
            <div className="text-sm text-red-600 bg-red-100 p-3 rounded">
              <p><strong>Votre rôle:</strong> {user.role === 'admin' ? 'MÉDECIN' : 'SECRÉTAIRE'}</p>
              {permission && <p><strong>Permission requise:</strong> {permission}</p>}
              {role && <p><strong>Rôle requis:</strong> {role === 'admin' ? 'MÉDECIN' : 'SECRÉTAIRE'}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}

// Composant pour tester les permissions (dev/debug)
export function PermissionsTester({ user }) {
  const { permissions, userRole, isMedecin, isSecretaire } = usePermissions(user);

  if (!user) return null;

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Permissions Utilisateur (Debug)
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Rôle:</strong> {userRole === 'admin' ? 'MÉDECIN' : 'SECRÉTAIRE'}</p>
            <p><strong>Est médecin:</strong> {isMedecin() ? '✅' : '❌'}</p>
            <p><strong>Est secrétaire:</strong> {isSecretaire() ? '✅' : '❌'}</p>
          </div>
          <div>
            <p><strong>Permissions ({permissions.length}):</strong></p>
            <div className="mt-1 max-h-32 overflow-y-auto">
              {permissions.map(perm => (
                <div key={perm} className="text-xs text-slate-600">
                  • {perm}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}