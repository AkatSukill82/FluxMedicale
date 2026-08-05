import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Déconnexion automatique après inactivité.
 *
 * Un poste de secrétariat ou de salle de consultation laissé ouvert donne accès
 * à l'ensemble des dossiers. La déconnexion passe par AuthContext.logout(), qui
 * efface aussi les données de santé mises en cache localement.
 *
 * L'horodatage de dernière activité est partagé entre onglets via localStorage :
 * travailler dans un onglet n'expire pas les autres, et un onglet oublié ne
 * déconnecte pas une session réellement active.
 */
const IDLE_MINUTES = 15;
const WARNING_SECONDS = 60;
const ACTIVITY_KEY = 'fluxmed_last_activity';
const CHECK_INTERVAL_MS = 5000;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'focus'];

export default function IdleTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(null);
  const loggingOutRef = useRef(false);

  const markActivity = useCallback(() => {
    try {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      // Stockage indisponible (mode privé) : le compte à rebours retombe sur
      // la valeur en mémoire, l'expiration reste fonctionnelle dans l'onglet.
    }
  }, []);

  const readLastActivity = useCallback(() => {
    try {
      const raw = Number(localStorage.getItem(ACTIVITY_KEY));
      return Number.isFinite(raw) && raw > 0 ? raw : Date.now();
    } catch {
      return Date.now();
    }
  }, []);

  const stayConnected = useCallback(() => {
    markActivity();
    setSecondsLeft(null);
  }, [markActivity]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    markActivity();

    // Pendant l'avertissement, l'activité ordinaire ne doit pas prolonger la
    // session en silence : c'est un clic explicite qui la prolonge.
    const onActivity = () => {
      if (secondsLeft === null) markActivity();
    };
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }));

    const timer = setInterval(() => {
      const idleMs = Date.now() - readLastActivity();
      const remainingMs = IDLE_MINUTES * 60_000 - idleMs;

      if (remainingMs <= 0) {
        if (loggingOutRef.current) return;
        loggingOutRef.current = true;
        clearInterval(timer);
        logout();
      } else if (remainingMs <= WARNING_SECONDS * 1000) {
        setSecondsLeft(Math.ceil(remainingMs / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [isAuthenticated, secondsLeft, markActivity, readLastActivity, logout]);

  if (!isAuthenticated || secondsLeft === null) return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <DialogTitle>Session sur le point d&apos;expirer</DialogTitle>
              <DialogDescription>
                Vous allez être déconnecté pour inactivité.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-4 text-3xl font-mono text-orange-700">
          <Clock className="w-6 h-6" />
          {secondsLeft}s
        </div>

        <p className="text-sm text-slate-600">
          Les brouillons de consultation non enregistrés seront effacés de ce poste.
        </p>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => logout()}>
            Se déconnecter
          </Button>
          <Button className="flex-1" onClick={stayConnected}>
            Rester connecté
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
