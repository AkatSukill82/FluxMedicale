import { useState, useEffect, useCallback, useRef } from 'react';

const DRAFT_KEY_PREFIX = 'consultation_draft_';
const AUTOSAVE_DELAY_MS = 2000;

/**
 * Hook to auto-save and recover consultation drafts from localStorage.
 * Key is scoped per patient so drafts don't collide.
 */
export default function useConsultationDraft(patientId) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const timerRef = useRef(null);
  const storageKey = DRAFT_KEY_PREFIX + (patientId || 'unknown');

  // Check for existing draft on mount
  useEffect(() => {
    if (!patientId) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Only offer recovery if draft is less than 24h old
        const age = Date.now() - (parsed._savedAt || 0);
        if (age < 24 * 60 * 60 * 1000) {
          setDraftData(parsed);
          setHasDraft(true);
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [patientId, storageKey]);

  // Save draft (debounced)
  const saveDraft = useCallback((data) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const payload = { ...data, _savedAt: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }, AUTOSAVE_DELAY_MS);
  }, [storageKey]);

  // Clear draft (after successful save or explicit discard)
  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(storageKey);
    setHasDraft(false);
    setDraftData(null);
  }, [storageKey]);

  // Dismiss recovery without clearing — user chose to start fresh
  const dismissDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
    setDraftData(null);
  }, [storageKey]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { hasDraft, draftData, saveDraft, clearDraft, dismissDraft };
}