// Service de gestion du mode hors-ligne avec IndexedDB
const DB_NAME = 'medical_app_offline_db';
const DB_VERSION = 2;

// Stores dans IndexedDB
const STORES = {
  PATIENTS: 'patients',
  CONSULTATIONS: 'consultations',
  PRESCRIPTIONS: 'prescriptions',
  RENDEZVOUS: 'rendezvous',
  MEDICAL_HISTORY: 'medical_history',
  VACCINATIONS: 'vaccinations',
  DRUGS: 'drugs',
  NOMENCLATURE: 'nomenclature',
  PENDING_ACTIONS: 'pending_actions',
  CACHE_META: 'cache_meta'
};

let db = null;

// Initialisation de la base de données IndexedDB
export async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store pour les patients
      if (!database.objectStoreNames.contains(STORES.PATIENTS)) {
        const patientStore = database.createObjectStore(STORES.PATIENTS, { keyPath: 'id' });
        patientStore.createIndex('niss', 'niss', { unique: false });
        patientStore.createIndex('name', 'searchName', { unique: false });
      }

      // Store pour les consultations
      if (!database.objectStoreNames.contains(STORES.CONSULTATIONS)) {
        const consultStore = database.createObjectStore(STORES.CONSULTATIONS, { keyPath: 'id' });
        consultStore.createIndex('patient_id', 'patient_id', { unique: false });
        consultStore.createIndex('date', 'date_consultation', { unique: false });
      }

      // Store pour les prescriptions
      if (!database.objectStoreNames.contains(STORES.PRESCRIPTIONS)) {
        const prescStore = database.createObjectStore(STORES.PRESCRIPTIONS, { keyPath: 'id' });
        prescStore.createIndex('patient_id', 'patient_id', { unique: false });
      }

      // Store pour les actions en attente de sync
      if (!database.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const pendingStore = database.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingStore.createIndex('type', 'type', { unique: false });
      }

      // Store pour les métadonnées du cache
      if (!database.objectStoreNames.contains(STORES.CACHE_META)) {
        database.createObjectStore(STORES.CACHE_META, { keyPath: 'key' });
      }

      // Store pour les rendez-vous
      if (!database.objectStoreNames.contains(STORES.RENDEZVOUS)) {
        const rdvStore = database.createObjectStore(STORES.RENDEZVOUS, { keyPath: 'id' });
        rdvStore.createIndex('patient_id', 'patient_id', { unique: false });
        rdvStore.createIndex('date', 'date', { unique: false });
      }

      // Store pour les antécédents médicaux
      if (!database.objectStoreNames.contains(STORES.MEDICAL_HISTORY)) {
        const histStore = database.createObjectStore(STORES.MEDICAL_HISTORY, { keyPath: 'id' });
        histStore.createIndex('patient_id', 'patient_id', { unique: false });
      }

      // Store pour les vaccinations
      if (!database.objectStoreNames.contains(STORES.VACCINATIONS)) {
        const vaccStore = database.createObjectStore(STORES.VACCINATIONS, { keyPath: 'id' });
        vaccStore.createIndex('patient_id', 'patient_id', { unique: false });
      }

      // Store pour les médicaments (référentiel)
      if (!database.objectStoreNames.contains(STORES.DRUGS)) {
        const drugStore = database.createObjectStore(STORES.DRUGS, { keyPath: 'id' });
        drugStore.createIndex('name', 'name', { unique: false });
        drugStore.createIndex('cnk', 'cnk', { unique: false });
      }

      // Store pour la nomenclature (référentiel)
      if (!database.objectStoreNames.contains(STORES.NOMENCLATURE)) {
        const nomenStore = database.createObjectStore(STORES.NOMENCLATURE, { keyPath: 'id' });
        nomenStore.createIndex('code', 'code', { unique: false });
      }
    };
  });
}

// Obtenir la connexion DB
async function getDB() {
  if (!db) {
    await initOfflineDB();
  }
  return db;
}

// ========== PATIENTS ==========

export async function cachePatients(patients) {
  const database = await getDB();
  const tx = database.transaction(STORES.PATIENTS, 'readwrite');
  const store = tx.objectStore(STORES.PATIENTS);

  for (const patient of patients) {
    const name = patient.name?.find(n => n.use === 'official') || {};
    const searchName = `${(name.given || []).join(' ')} ${name.family || ''}`.toLowerCase();
    const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
    
    await store.put({
      ...patient,
      searchName,
      niss,
      cachedAt: new Date().toISOString()
    });
  }

  // Mettre à jour les métadonnées
  const metaTx = database.transaction(STORES.CACHE_META, 'readwrite');
  await metaTx.objectStore(STORES.CACHE_META).put({
    key: 'patients_last_sync',
    value: new Date().toISOString(),
    count: patients.length
  });

  return true;
}

export async function getCachedPatients() {
  const database = await getDB();
  const tx = database.transaction(STORES.PATIENTS, 'readonly');
  const store = tx.objectStore(STORES.PATIENTS);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedPatient(id) {
  const database = await getDB();
  const tx = database.transaction(STORES.PATIENTS, 'readonly');
  const store = tx.objectStore(STORES.PATIENTS);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function searchCachedPatients(query) {
  const patients = await getCachedPatients();
  const lowerQuery = query.toLowerCase();
  
  return patients.filter(p => 
    p.searchName?.includes(lowerQuery) || 
    p.niss?.includes(query)
  );
}

// ========== CONSULTATIONS ==========

export async function cacheConsultations(consultations) {
  const database = await getDB();
  const tx = database.transaction(STORES.CONSULTATIONS, 'readwrite');
  const store = tx.objectStore(STORES.CONSULTATIONS);

  for (const consultation of consultations) {
    await store.put({
      ...consultation,
      cachedAt: new Date().toISOString()
    });
  }

  return true;
}

export async function getCachedConsultations(patientId) {
  const database = await getDB();
  const tx = database.transaction(STORES.CONSULTATIONS, 'readonly');
  const store = tx.objectStore(STORES.CONSULTATIONS);
  const index = store.index('patient_id');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(patientId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineConsultation(consultation) {
  const database = await getDB();
  
  // Générer un ID temporaire pour les nouvelles consultations
  const offlineId = consultation.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const consultationData = {
    ...consultation,
    id: offlineId,
    isOffline: true,
    offlineCreatedAt: new Date().toISOString()
  };

  // Sauvegarder dans le cache
  const tx = database.transaction(STORES.CONSULTATIONS, 'readwrite');
  await tx.objectStore(STORES.CONSULTATIONS).put(consultationData);

  // Ajouter à la queue de sync
  await addPendingAction({
    type: consultation.id ? 'UPDATE_CONSULTATION' : 'CREATE_CONSULTATION',
    entity: 'Consultation',
    data: consultationData,
    originalId: consultation.id
  });

  return consultationData;
}

// ========== PRESCRIPTIONS ==========

export async function cachePrescriptions(prescriptions) {
  const database = await getDB();
  const tx = database.transaction(STORES.PRESCRIPTIONS, 'readwrite');
  const store = tx.objectStore(STORES.PRESCRIPTIONS);

  for (const prescription of prescriptions) {
    await store.put({
      ...prescription,
      cachedAt: new Date().toISOString()
    });
  }

  return true;
}

export async function getCachedPrescriptions(patientId) {
  const database = await getDB();
  const tx = database.transaction(STORES.PRESCRIPTIONS, 'readonly');
  const store = tx.objectStore(STORES.PRESCRIPTIONS);
  const index = store.index('patient_id');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(patientId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflinePrescription(prescription) {
  const database = await getDB();
  
  const offlineId = prescription.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const prescriptionData = {
    ...prescription,
    id: offlineId,
    isOffline: true,
    offlineCreatedAt: new Date().toISOString(),
    statut_recip_e: 'Brouillon' // Les prescriptions offline sont toujours en brouillon
  };

  const tx = database.transaction(STORES.PRESCRIPTIONS, 'readwrite');
  await tx.objectStore(STORES.PRESCRIPTIONS).put(prescriptionData);

  await addPendingAction({
    type: 'CREATE_PRESCRIPTION',
    entity: 'Prescription',
    data: prescriptionData
  });

  return prescriptionData;
}

// ========== PENDING ACTIONS (Sync Queue) ==========

export async function addPendingAction(action) {
  const database = await getDB();
  const tx = database.transaction(STORES.PENDING_ACTIONS, 'readwrite');
  const store = tx.objectStore(STORES.PENDING_ACTIONS);

  const actionData = {
    ...action,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0
  };

  return new Promise((resolve, reject) => {
    const request = store.add(actionData);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingActions() {
  const database = await getDB();
  const tx = database.transaction(STORES.PENDING_ACTIONS, 'readonly');
  const store = tx.objectStore(STORES.PENDING_ACTIONS);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(a => a.status === 'pending'));
    request.onerror = () => reject(request.error);
  });
}

export async function markActionSynced(actionId) {
  const database = await getDB();
  const tx = database.transaction(STORES.PENDING_ACTIONS, 'readwrite');
  const store = tx.objectStore(STORES.PENDING_ACTIONS);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(actionId);
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        action.status = 'synced';
        action.syncedAt = new Date().toISOString();
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(false);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function markActionFailed(actionId, error) {
  const database = await getDB();
  const tx = database.transaction(STORES.PENDING_ACTIONS, 'readwrite');
  const store = tx.objectStore(STORES.PENDING_ACTIONS);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(actionId);
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        action.retryCount = (action.retryCount || 0) + 1;
        action.lastError = error;
        action.lastRetryAt = new Date().toISOString();
        if (action.retryCount >= 3) {
          action.status = 'failed';
        }
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve(action);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function clearSyncedActions() {
  const database = await getDB();
  const tx = database.transaction(STORES.PENDING_ACTIONS, 'readwrite');
  const store = tx.objectStore(STORES.PENDING_ACTIONS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const actions = request.result;
      const syncedIds = actions.filter(a => a.status === 'synced').map(a => a.id);
      
      const deleteTx = database.transaction(STORES.PENDING_ACTIONS, 'readwrite');
      const deleteStore = deleteTx.objectStore(STORES.PENDING_ACTIONS);
      
      syncedIds.forEach(id => deleteStore.delete(id));
      resolve(syncedIds.length);
    };
    request.onerror = () => reject(request.error);
  });
}

// ========== CACHE META ==========

export async function getCacheMeta(key) {
  const database = await getDB();
  const tx = database.transaction(STORES.CACHE_META, 'readonly');
  const store = tx.objectStore(STORES.CACHE_META);
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setCacheMeta(key, value) {
  const database = await getDB();
  const tx = database.transaction(STORES.CACHE_META, 'readwrite');
  const store = tx.objectStore(STORES.CACHE_META);
  
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ========== UTILITAIRES ==========

export async function getOfflineStats() {
  const database = await getDB();
  
  const [patients, consultations, prescriptions, pending] = await Promise.all([
    getCachedPatients(),
    new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.CONSULTATIONS, 'readonly');
      const request = tx.objectStore(STORES.CONSULTATIONS).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.PRESCRIPTIONS, 'readonly');
      const request = tx.objectStore(STORES.PRESCRIPTIONS).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    getPendingActions()
  ]);

  const lastSync = await getCacheMeta('patients_last_sync');

  return {
    patientsCount: patients.length,
    consultationsCount: consultations.length,
    prescriptionsCount: prescriptions.length,
    pendingActionsCount: pending.length,
    offlineConsultations: consultations.filter(c => c.isOffline).length,
    offlinePrescriptions: prescriptions.filter(p => p.isOffline).length,
    lastSyncDate: lastSync?.value || null
  };
}

export async function clearAllCache() {
  const database = await getDB();
  
  const stores = [
    STORES.PATIENTS, 
    STORES.CONSULTATIONS, 
    STORES.PRESCRIPTIONS,
    STORES.RENDEZVOUS,
    STORES.MEDICAL_HISTORY,
    STORES.VACCINATIONS
  ];
  
  for (const storeName of stores) {
    try {
      const tx = database.transaction(storeName, 'readwrite');
      await tx.objectStore(storeName).clear();
    } catch (e) {
      console.warn(`Could not clear store ${storeName}:`, e);
    }
  }

  return true;
}

// ========== RENDEZ-VOUS ==========

export async function cacheRendezVous(rdvList) {
  const database = await getDB();
  const tx = database.transaction(STORES.RENDEZVOUS, 'readwrite');
  const store = tx.objectStore(STORES.RENDEZVOUS);

  for (const rdv of rdvList) {
    await store.put({
      ...rdv,
      cachedAt: new Date().toISOString()
    });
  }
  return true;
}

export async function getCachedRendezVous(date) {
  const database = await getDB();
  const tx = database.transaction(STORES.RENDEZVOUS, 'readonly');
  const store = tx.objectStore(STORES.RENDEZVOUS);
  const index = store.index('date');
  
  return new Promise((resolve, reject) => {
    const request = date ? index.getAll(date) : store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedRendezVousForPatient(patientId) {
  const database = await getDB();
  const tx = database.transaction(STORES.RENDEZVOUS, 'readonly');
  const store = tx.objectStore(STORES.RENDEZVOUS);
  const index = store.index('patient_id');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(patientId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== ANTÉCÉDENTS MÉDICAUX ==========

export async function cacheMedicalHistory(historyList) {
  const database = await getDB();
  const tx = database.transaction(STORES.MEDICAL_HISTORY, 'readwrite');
  const store = tx.objectStore(STORES.MEDICAL_HISTORY);

  for (const item of historyList) {
    await store.put({
      ...item,
      cachedAt: new Date().toISOString()
    });
  }
  return true;
}

export async function getCachedMedicalHistory(patientId) {
  const database = await getDB();
  const tx = database.transaction(STORES.MEDICAL_HISTORY, 'readonly');
  const store = tx.objectStore(STORES.MEDICAL_HISTORY);
  const index = store.index('patient_id');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(patientId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== VACCINATIONS ==========

export async function cacheVaccinations(vaccinations) {
  const database = await getDB();
  const tx = database.transaction(STORES.VACCINATIONS, 'readwrite');
  const store = tx.objectStore(STORES.VACCINATIONS);

  for (const vacc of vaccinations) {
    await store.put({
      ...vacc,
      cachedAt: new Date().toISOString()
    });
  }
  return true;
}

export async function getCachedVaccinations(patientId) {
  const database = await getDB();
  const tx = database.transaction(STORES.VACCINATIONS, 'readonly');
  const store = tx.objectStore(STORES.VACCINATIONS);
  const index = store.index('patient_id');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(patientId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== RÉFÉRENTIELS (Médicaments, Nomenclature) ==========

export async function cacheDrugs(drugs) {
  const database = await getDB();
  const tx = database.transaction(STORES.DRUGS, 'readwrite');
  const store = tx.objectStore(STORES.DRUGS);

  for (const drug of drugs) {
    await store.put(drug);
  }
  return true;
}

export async function searchCachedDrugs(query) {
  const database = await getDB();
  const tx = database.transaction(STORES.DRUGS, 'readonly');
  const store = tx.objectStore(STORES.DRUGS);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const lowerQuery = query.toLowerCase();
      const results = request.result.filter(d => 
        d.name?.toLowerCase().includes(lowerQuery) ||
        d.cnk?.includes(query)
      );
      resolve(results.slice(0, 50));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function cacheNomenclature(codes) {
  const database = await getDB();
  const tx = database.transaction(STORES.NOMENCLATURE, 'readwrite');
  const store = tx.objectStore(STORES.NOMENCLATURE);

  for (const code of codes) {
    await store.put(code);
  }
  return true;
}

export async function searchCachedNomenclature(query) {
  const database = await getDB();
  const tx = database.transaction(STORES.NOMENCLATURE, 'readonly');
  const store = tx.objectStore(STORES.NOMENCLATURE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const lowerQuery = query.toLowerCase();
      const results = request.result.filter(n => 
        n.code?.includes(query) ||
        n.description_fr?.toLowerCase().includes(lowerQuery)
      );
      resolve(results.slice(0, 50));
    };
    request.onerror = () => reject(request.error);
  });
}

// ========== STATS ÉTENDUES ==========

export async function getExtendedOfflineStats() {
  const database = await getDB();
  
  const stats = await getOfflineStats();
  
  // Ajouter les stats des nouveaux stores
  const additionalStats = await Promise.all([
    new Promise((resolve) => {
      try {
        const tx = database.transaction(STORES.RENDEZVOUS, 'readonly');
        const request = tx.objectStore(STORES.RENDEZVOUS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch { resolve(0); }
    }),
    new Promise((resolve) => {
      try {
        const tx = database.transaction(STORES.MEDICAL_HISTORY, 'readonly');
        const request = tx.objectStore(STORES.MEDICAL_HISTORY).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch { resolve(0); }
    }),
    new Promise((resolve) => {
      try {
        const tx = database.transaction(STORES.VACCINATIONS, 'readonly');
        const request = tx.objectStore(STORES.VACCINATIONS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch { resolve(0); }
    }),
    new Promise((resolve) => {
      try {
        const tx = database.transaction(STORES.DRUGS, 'readonly');
        const request = tx.objectStore(STORES.DRUGS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch { resolve(0); }
    }),
    new Promise((resolve) => {
      try {
        const tx = database.transaction(STORES.NOMENCLATURE, 'readonly');
        const request = tx.objectStore(STORES.NOMENCLATURE).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch { resolve(0); }
    })
  ]);

  return {
    ...stats,
    rendezVousCount: additionalStats[0],
    medicalHistoryCount: additionalStats[1],
    vaccinationsCount: additionalStats[2],
    drugsCount: additionalStats[3],
    nomenclatureCount: additionalStats[4]
  };
}