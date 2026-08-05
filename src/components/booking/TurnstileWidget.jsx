import React, { useEffect, useRef, useState } from 'react';

/**
 * Widget Cloudflare Turnstile pour la page de réservation publique.
 *
 * La clé publique vient de VITE_TURNSTILE_SITE_KEY ; la vérification du jeton
 * se fait exclusivement côté serveur (fonction publicBooking). Sans clé
 * configurée le composant affiche un message : la réservation en ligne est
 * alors refusée par le backend, ce qui est le comportement voulu — un endpoint
 * public sans anti-automatisation permet de saturer l'agenda du cabinet.
 */
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('Turnstile indisponible'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return undefined;

    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onToken]);

  if (!SITE_KEY) {
    return (
      <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
        La réservation en ligne n&apos;est pas encore configurée sur ce site.
        Merci de contacter le cabinet par téléphone.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
        La vérification anti-robot n&apos;a pas pu être chargée. Vérifiez votre
        connexion, ou contactez le cabinet par téléphone.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
