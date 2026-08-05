import React from 'react';
import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import RBACGuard from '@/components/auth/RBACGuard';
import { permissionForPage, isKnownPage } from '@/lib/routePermissions';

/**
 * Contrôle d'accès appliqué à chaque route.
 *
 * Refus par défaut : une page absente de ROUTE_PERMISSIONS est bloquée. Ajouter
 * une page dans src/pages/ impose donc de déclarer explicitement qui peut y
 * accéder, plutôt que de l'ouvrir à tous par omission.
 *
 * Ce garde est côté client : il masque l'interface, il ne protège pas les
 * données. C'est la RLS des entités qui fait autorité côté serveur.
 */
export default function RouteGuard({ pageName, children }) {
  const { user } = useAuth();

  if (!isKnownPage(pageName)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6">
          <CardContent className="text-center">
            <Shield className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Accès non défini</h3>
            <p className="text-slate-600 text-sm">
              Aucune règle d&apos;accès n&apos;est déclarée pour «&nbsp;{pageName}&nbsp;».
              Ajoutez-la dans <code>src/lib/routePermissions.js</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const permission = permissionForPage(pageName);

  // null = ouvert à tout utilisateur authentifié. RBACGuard gère lui-même
  // l'absence d'utilisateur.
  if (permission === null) {
    return <RBACGuard user={user}>{children}</RBACGuard>;
  }

  return (
    <RBACGuard user={user} permission={permission}>
      {children}
    </RBACGuard>
  );
}
