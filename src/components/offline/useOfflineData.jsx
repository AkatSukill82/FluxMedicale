import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOnlineStatus } from '../OfflineIndicator';
import {
  getCachedPatients,
  getCachedPatient,
  getCachedConsultations,
  getCachedPrescriptions,
  getCachedRendezVous,
  getCachedMedicalHistory,
  getCachedVaccinations,
  searchCachedPatients
} from './OfflineService';

/**
 * Hook to fetch patients — uses API when online, IndexedDB cache when offline.
 */
export function useOfflinePatients(sortField = '-created_date', limit = 500) {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['allPatients', isOnline ? 'online' : 'offline'],
    queryFn: async () => {
      if (isOnline) {
        return await base44.entities.Patient.list(sortField, limit);
      }
      return await getCachedPatients();
    },
    initialData: [],
    meta: { isOffline: !isOnline }
  });
}

/**
 * Hook to fetch a single patient by ID — API or cache.
 */
export function useOfflinePatient(patientId) {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['patient', patientId, isOnline ? 'online' : 'offline'],
    queryFn: async () => {
      if (isOnline) {
        const patients = await base44.entities.Patient.list();
        return patients.find(p => p.id === patientId) || null;
      }
      return await getCachedPatient(patientId);
    },
    enabled: !!patientId,
    meta: { isOffline: !isOnline }
  });
}

/**
 * Hook for patient consultations — API or cache.
 */
export function useOfflineConsultations(patientId) {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['consultations', patientId, isOnline ? 'online' : 'offline'],
    queryFn: async () => {
      if (isOnline) {
        return await base44.entities.Consultation.filter({ patient_id: patientId }, '-date_consultation', 100);
      }
      return await getCachedConsultations(patientId);
    },
    enabled: !!patientId,
    initialData: [],
    meta: { isOffline: !isOnline }
  });
}

/**
 * Hook for patient prescriptions — API or cache.
 */
export function useOfflinePrescriptions(patientId) {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['prescriptions', patientId, isOnline ? 'online' : 'offline'],
    queryFn: async () => {
      if (isOnline) {
        return await base44.entities.Prescription.filter({ patient_id: patientId }, '-date_prescription', 100);
      }
      return await getCachedPrescriptions(patientId);
    },
    enabled: !!patientId,
    initialData: [],
    meta: { isOffline: !isOnline }
  });
}

/**
 * Hook for rendez-vous — API or cache.
 */
export function useOfflineRendezVous(date) {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['rdv', date, isOnline ? 'online' : 'offline'],
    queryFn: async () => {
      if (isOnline) {
        if (date) {
          return await base44.entities.RendezVous.filter({ date }, '-heure_debut', 100);
        }
        return await base44.entities.RendezVous.list('-date', 100);
      }
      return await getCachedRendezVous(date);
    },
    initialData: [],
    meta: { isOffline: !isOnline }
  });
}

/**
 * Hook for medical history — API or cache.
 */
export function useOfflineMedicalHistory(patientId) {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['medicalHistory', patientId, isOnline ? 'online' : 'offline'],
    queryFn: async () => {
      if (isOnline) {
        return await base44.entities.MedicalHistory.filter({ patient_id: patientId }, '-created_date', 200);
      }
      return await getCachedMedicalHistory(patientId);
    },
    enabled: !!patientId,
    initialData: [],
    meta: { isOffline: !isOnline }
  });
}