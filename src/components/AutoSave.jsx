import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { debounce } from 'lodash';

/**
 * Hook d'auto-sauvegarde pour les formulaires
 * Usage: useAutoSave(formData, saveFunction, { delay: 2000, enabled: true })
 */
export function useAutoSave(data, onSave, options = {}) {
  const {
    delay = 2000, // 2 secondes de délai
    enabled = true,
    onSuccess = () => {},
    onError = (error) => console.error('Auto-save error:', error),
    showToast = false,
    toastMessage = 'Brouillon sauvegardé automatiquement'
  } = options;

  const initialData = useRef(data);
  const isFirstRender = useRef(true);

  const debouncedSave = useRef(
    debounce(async (dataToSave) => {
      try {
        await onSave(dataToSave);
        onSuccess();
        if (showToast) {
          toast.success(toastMessage, { duration: 1500 });
        }
      } catch (error) {
        onError(error);
        if (showToast) {
          toast.error('Échec de la sauvegarde automatique');
        }
      }
    }, delay)
  ).current;

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      initialData.current = data;
      return;
    }

    // Only save if data changed and auto-save is enabled
    if (enabled && JSON.stringify(data) !== JSON.stringify(initialData.current)) {
      debouncedSave(data);
      initialData.current = data;
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [data, enabled, debouncedSave]);

  return {
    cancel: () => debouncedSave.cancel(),
    saveNow: () => debouncedSave.flush()
  };
}

export default useAutoSave;