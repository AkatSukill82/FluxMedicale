import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  initOfflineDB,
  cachePatients,
  cacheConsultations,
  cachePrescriptions,
  cacheRendezVous,
  cacheMedicalHistory,
  cacheVaccinations,
  cacheDrugs,
  cacheNomenclature,
  getPendingActions,
  markActionSynced,
  markActionFailed,
  clearSyncedActions,
  getOfflineStats,
  getExtendedOfflineStats,
  getCacheMeta,
  setCacheMeta
} from './OfflineService';

export function useSyncManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncDate, setLastSyncDate] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      await initOfflineDB();
      const stats = await getOfflineStats();
      setPendingCount(stats.pendingActionsCount);
      setLastSyncDate(stats.lastSyncDate);
      setIsInitialized(true);
    };
    init();
  }, []);

  // Écouter les changements de connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie', {
        description: 'Synchronisation automatique en cours...',
        action: {
          label: 'Voir',
          onClick: () => {} // Ouvrir le panel de sync
        }
      });
      // Auto-sync au retour en ligne
      syncAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors-ligne activé', {
        description: 'Vos modifications seront synchronisées au retour de la connexion',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Télécharger les données pour le cache
  const downloadForOffline = useCallback(async (options = {}) => {
    if (!isOnline) {
      toast.error('Impossible de télécharger en mode hors-ligne');
      return false;
    }

    setIsSyncing(true);
    const startTime = Date.now();
    let totalItems = 0;

    try {
      // Télécharger les patients
      toast.loading('Téléchargement des patients...', { id: 'download-progress' });
      const patients = await base44.entities.Patient.list('-created_date', options.patientLimit || 200);
      await cachePatients(patients);
      totalItems += patients.length;

      // Télécharger les consultations récentes
      toast.loading('Téléchargement des consultations...', { id: 'download-progress' });
      const consultations = await base44.entities.Consultation.list('-date_consultation', options.consultationLimit || 500);
      await cacheConsultations(consultations);
      totalItems += consultations.length;

      // Télécharger les prescriptions récentes
      toast.loading('Téléchargement des prescriptions...', { id: 'download-progress' });
      const prescriptions = await base44.entities.Prescription.list('-date_prescription', options.prescriptionLimit || 300);
      await cachePrescriptions(prescriptions);
      totalItems += prescriptions.length;

      // Télécharger les rendez-vous des 7 prochains jours
      toast.loading('Téléchargement des rendez-vous...', { id: 'download-progress' });
      try {
        const rdvList = await base44.entities.RendezVous.list('-date', 100);
        await cacheRendezVous(rdvList);
        totalItems += rdvList.length;
      } catch (e) { console.warn('RDV cache error:', e); }

      // Télécharger les antécédents médicaux
      toast.loading('Téléchargement des antécédents...', { id: 'download-progress' });
      try {
        const history = await base44.entities.MedicalHistory.list('-created_date', 500);
        await cacheMedicalHistory(history);
        totalItems += history.length;
      } catch (e) { console.warn('History cache error:', e); }

      // Télécharger les vaccinations
      toast.loading('Téléchargement des vaccinations...', { id: 'download-progress' });
      try {
        const vaccinations = await base44.entities.Vaccination.list('-vaccination_date', 300);
        await cacheVaccinations(vaccinations);
        totalItems += vaccinations.length;
      } catch (e) { console.warn('Vaccinations cache error:', e); }

      // Télécharger le référentiel de nomenclature
      toast.loading('Téléchargement de la nomenclature...', { id: 'download-progress' });
      try {
        const nomenCodes = await base44.entities.NomenclatureAuto.list('code', 1000);
        await cacheNomenclature(nomenCodes);
        totalItems += nomenCodes.length;
      } catch (e) { console.warn('Nomenclature cache error:', e); }

      // Mettre à jour la date de sync
      const now = new Date().toISOString();
      await setCacheMeta('last_full_sync', now);
      setLastSyncDate(now);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      toast.success('Données téléchargées', {
        id: 'download-progress',
        description: `${totalItems} éléments en ${duration}s`
      });

      return true;
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur de téléchargement', {
        id: 'download-progress',
        description: error.message
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Synchroniser les actions en attente
  const syncPendingActions = useCallback(async () => {
    if (!isOnline) {
      toast.error('Synchronisation impossible hors-ligne');
      return { success: 0, failed: 0 };
    }

    const pending = await getPendingActions();
    if (pending.length === 0) {
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: pending.length });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const action = pending[i];
      setSyncProgress({ current: i + 1, total: pending.length });

      try {
        // Strip offline metadata from the payload
        const cleanData = { ...action.data };
        delete cleanData.id;
        delete cleanData.isOffline;
        delete cleanData.offlineCreatedAt;
        delete cleanData.cachedAt;
        delete cleanData.searchName;
        delete cleanData.niss;

        switch (action.type) {
          case 'CREATE_CONSULTATION':
            await base44.entities.Consultation.create(cleanData);
            break;

          case 'UPDATE_CONSULTATION': {
            // Conflict detection: compare updated_date before applying
            const consultId = action.originalId;
            if (consultId) {
              try {
                const serverVersion = await base44.entities.Consultation.filter({ id: consultId });
                const server = serverVersion?.[0];
                if (server && action.data.offlineCreatedAt) {
                  const serverUpdate = new Date(server.updated_date).getTime();
                  const offlineEdit = new Date(action.data.offlineCreatedAt).getTime();
                  if (serverUpdate > offlineEdit) {
                    // Server has a newer version — merge: offline fields override only non-empty values
                    const merged = {};
                    for (const [key, value] of Object.entries(cleanData)) {
                      if (value !== '' && value !== null && value !== undefined) {
                        merged[key] = value;
                      }
                    }
                    await base44.entities.Consultation.update(consultId, merged);
                    console.info(`[Sync] Conflict resolved for consultation ${consultId} — merged offline changes`);
                    break;
                  }
                }
              } catch {
                // If we can't fetch server version, proceed with direct update
              }
              await base44.entities.Consultation.update(consultId, cleanData);
            }
            break;
          }

          case 'CREATE_PRESCRIPTION':
            await base44.entities.Prescription.create(cleanData);
            break;

          case 'UPDATE_PATIENT': {
            // Conflict-aware patient update
            const patientId = action.originalId;
            if (patientId) {
              try {
                const serverPatients = await base44.entities.Patient.filter({ id: patientId });
                const serverPatient = serverPatients?.[0];
                if (serverPatient && action.data.offlineCreatedAt) {
                  const serverUpdate = new Date(serverPatient.updated_date).getTime();
                  const offlineEdit = new Date(action.data.offlineCreatedAt).getTime();
                  if (serverUpdate > offlineEdit) {
                    // Merge: only apply non-empty offline changes
                    const merged = {};
                    for (const [key, value] of Object.entries(cleanData)) {
                      if (value !== '' && value !== null && value !== undefined) {
                        merged[key] = value;
                      }
                    }
                    await base44.entities.Patient.update(patientId, merged);
                    console.info(`[Sync] Conflict resolved for patient ${patientId} — merged offline changes`);
                    break;
                  }
                }
              } catch {
                // Fallthrough to direct update
              }
              await base44.entities.Patient.update(patientId, cleanData);
            }
            break;
          }

          default:
            console.warn('Unknown action type:', action.type);
        }

        await markActionSynced(action.id);
        success++;
      } catch (error) {
        console.error('Sync error for action:', action, error);
        await markActionFailed(action.id, error.message);
        failed++;
      }
    }

    // Nettoyer les actions synchronisées
    await clearSyncedActions();

    // Mettre à jour le compteur
    const newPending = await getPendingActions();
    setPendingCount(newPending.length);

    setIsSyncing(false);
    setSyncProgress({ current: 0, total: 0 });

    return { success, failed };
  }, [isOnline]);

  // Synchronisation complète (upload + download)
  const syncAll = useCallback(async () => {
    if (!isOnline) {
      toast.error('Synchronisation impossible hors-ligne');
      return;
    }

    setIsSyncing(true);

    try {
      // D'abord, envoyer les modifications locales
      toast.loading('Envoi des modifications...', { id: 'sync-all' });
      const { success, failed } = await syncPendingActions();

      if (failed > 0) {
        toast.warning(`${success} éléments synchronisés, ${failed} échecs`, { id: 'sync-all' });
      } else if (success > 0) {
        toast.loading('Téléchargement des mises à jour...', { id: 'sync-all' });
      }

      // Ensuite, télécharger les nouvelles données
      await downloadForOffline();

      toast.success('Synchronisation terminée', { id: 'sync-all' });
    } catch (error) {
      console.error('Sync all error:', error);
      toast.error('Erreur de synchronisation', {
        id: 'sync-all',
        description: error.message
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, syncPendingActions, downloadForOffline]);

  // Rafraîchir les stats
  const refreshStats = useCallback(async () => {
    const stats = await getOfflineStats();
    setPendingCount(stats.pendingActionsCount);
    return stats;
  }, []);

  return {
    isOnline,
    isInitialized,
    isSyncing,
    syncProgress,
    pendingCount,
    lastSyncDate,
    downloadForOffline,
    syncPendingActions,
    syncAll,
    refreshStats
  };
}