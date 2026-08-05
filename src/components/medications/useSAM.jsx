import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { recordAudit } from '@/lib/auditLog';

/**
 * Accès à SAM (Source Authentique des Médicaments — AFMPS).
 *
 * RÈGLE DE SÉCURITÉ CLINIQUE — ne pas contourner :
 * une vérification qui n'a pas abouti n'est jamais présentée comme un résultat
 * négatif. Toute fonction renvoie un `status` explicite, et l'appelant doit
 * distinguer « aucune interaction trouvée » de « vérification indisponible ».
 * Un écran vert affiché sur une vérification échouée vaut un feu vert donné à
 * une association contre-indiquée.
 *
 * Ce hook ne fabrique jamais de contenu clinique (posologie, contre-indication,
 * interaction). En cas d'échec il renvoie `unavailable`, jamais une valeur par
 * défaut plausible.
 */

export const SAM_STATUS = {
  OK: 'ok',
  UNAVAILABLE: 'unavailable',
};

async function callSAM(payload) {
  const response = await base44.functions.samV2Search(payload);
  if (!response || response.error) {
    throw new Error(response?.error || 'Réponse SAM invalide');
  }
  return response;
}

export const useSAM = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchSAM = useCallback(async (searchTerm) => {
    if (!searchTerm?.trim()) {
      return { status: SAM_STATUS.OK, results: [], source: null };
    }

    setIsLoading(true);
    setError(null);

    try {
      await recordAudit({
        user_email: currentUser?.email,
        action: 'SEARCH_SAM',
        target_entity: 'Medication',
        details: `Recherche médicament: ${searchTerm}`,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      const data = await callSAM({ action: 'search', query: searchTerm });

      return {
        status: SAM_STATUS.OK,
        results: data.results || [],
        // 'sam_v2' = référentiel officiel ; 'fallback' = jeu de données interne
        // de dépannage, dont les codes CNK ne sont pas opposables.
        source: data.source || null,
      };
    } catch {
      setError('Référentiel SAM indisponible');
      return { status: SAM_STATUS.UNAVAILABLE, results: [], source: null };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const getMedicationDetails = useCallback(async (cnk) => {
    if (!cnk) return { status: SAM_STATUS.UNAVAILABLE, medication: null };

    setIsLoading(true);
    setError(null);

    try {
      const data = await callSAM({ action: 'details', cnk });
      return {
        status: SAM_STATUS.OK,
        medication: data.medication || null,
        source: data.source || null,
      };
    } catch {
      setError('Monographie indisponible');
      return { status: SAM_STATUS.UNAVAILABLE, medication: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Vérifie les interactions pour une liste de codes CNK.
   *
   * Renvoie `status: 'unavailable'` dès que la vérification n'a pas pu être
   * menée à son terme — y compris lorsque moins de deux médicaments sont
   * fournis, cas dans lequel aucune conclusion ne peut être tirée.
   */
  const checkInteractions = useCallback(async (cnkList, patientId = null) => {
    const codes = (cnkList || []).filter(Boolean);

    if (codes.length < 2) {
      return {
        status: SAM_STATUS.UNAVAILABLE,
        reason: 'INSUFFICIENT_INPUT',
        interactions: [],
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      await recordAudit({
        user_email: currentUser?.email,
        action: 'CHECK_MEDICATION_INTERACTIONS',
        target_entity: 'Patient',
        target_id: patientId || undefined,
        details: `Vérification interactions: ${codes.join(', ')}`,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      const data = await callSAM({ action: 'interactions', cnk_list: codes });

      if (data.status === 'unavailable') {
        setError('Vérification des interactions indisponible');
        return {
          status: SAM_STATUS.UNAVAILABLE,
          reason: data.reason || 'UPSTREAM_UNAVAILABLE',
          interactions: [],
        };
      }

      return {
        status: SAM_STATUS.OK,
        interactions: data.interactions || [],
        source: data.source || null,
        checked_at: new Date().toISOString(),
      };
    } catch {
      setError('Vérification des interactions indisponible');
      return {
        status: SAM_STATUS.UNAVAILABLE,
        reason: 'REQUEST_FAILED',
        interactions: [],
      };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  return {
    searchSAM,
    getMedicationDetails,
    checkInteractions,
    isLoading,
    error,
  };
};
