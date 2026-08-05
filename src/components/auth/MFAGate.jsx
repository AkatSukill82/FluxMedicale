import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TOTPVerification from '@/components/auth/TOTPVerification';

/**
 * Exige le second facteur avant de laisser accéder à l'application.
 *
 * Sans cette porte, l'enrôlement TOTP existait mais n'était jamais demandé :
 * `TOTPVerification` n'était rendu nulle part. Un facteur qu'on ne présente
 * jamais ne protège rien.
 *
 * LIMITE ASSUMÉE : la session est émise par Base44, qui ne connaît pas ce
 * second facteur. Ce garde est donc côté client, et quelqu'un qui contrôle le
 * navigateur peut le contourner en appelant l'API directement. Il protège
 * l'accès opportuniste — poste laissé ouvert, jeton récupéré — et non un
 * attaquant déterminé. L'application d'un MFA non contournable relève du
 * fournisseur d'identité.
 *
 * Le marqueur de vérification vit en sessionStorage : il disparaît à la
 * fermeture de l'onglet, et n'est pas partagé entre onglets.
 */
const VERIFIED_KEY = 'fluxmed_mfa_verified_at';
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 h

function hasFreshVerification() {
  try {
    const ts = Number(sessionStorage.getItem(VERIFIED_KEY));
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < MAX_AGE_MS;
  } catch {
    return false;
  }
}

export default function MFAGate({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  // 'checking' | 'not_enrolled' | 'required' | 'verified'
  const [state, setState] = useState('checking');

  useEffect(() => {
    if (!isAuthenticated) {
      setState('checking');
      return undefined;
    }

    let cancelled = false;

    const check = async () => {
      if (hasFreshVerification()) {
        if (!cancelled) setState('verified');
        return;
      }
      try {
        const res = await base44.functions.mfa({ action: 'status' });
        const data = res?.data ?? res;
        if (cancelled) return;
        setState(data?.enrolled ? 'required' : 'not_enrolled');
      } catch {
        // Statut MFA indéterminable : on n'enferme pas l'utilisateur dehors,
        // la RLS reste la barrière qui protège réellement les données.
        if (!cancelled) setState('not_enrolled');
      }
    };

    check();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleSuccess = useCallback(() => {
    try {
      sessionStorage.setItem(VERIFIED_KEY, String(Date.now()));
    } catch {
      // Stockage indisponible : la vérification vaudra pour ce rendu seulement.
    }
    setState('verified');
  }, []);

  if (!isAuthenticated || state === 'checking') return children;
  if (state === 'required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md">
          <TOTPVerification
            userEmail={user?.email}
            onSuccess={handleSuccess}
            onCancel={() => logout()}
          />
        </div>
      </div>
    );
  }

  return children;
}
