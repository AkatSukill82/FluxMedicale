/**
 * Service Recip-e - Gestion des prescriptions électroniques belges
 * 
 * NOTE: Ce service fonctionne en mode simulation.
 * Pour une intégration réelle, configurez les secrets:
 * - RECIP_E_ENDPOINT
 * - RECIP_E_KEYSTORE_BASE64
 * - RECIP_E_KEYSTORE_PASSWORD
 */

// Mode simulation activé par défaut
const SIMULATION_MODE = true;

// Délai simulé pour les appels API (ms)
const SIMULATED_DELAY = 800;

/**
 * Génère un RID (Recip-e ID) simulé
 */
const generateSimulatedRID = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `BEL${timestamp}${random}`;
};

/**
 * Simule un délai réseau
 */
const simulateNetworkDelay = () => 
  new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY + Math.random() * 500));

/**
 * Crée et envoie une prescription à Recip-e
 */
export async function createPrescription(prescriptionData, nihii) {
  if (SIMULATION_MODE) {
    await simulateNetworkDelay();
    
    // Validation basique
    if (!prescriptionData.patient_niss) {
      return {
        success: false,
        error: {
          code: "INVALID_PATIENT",
          message: "Le NISS du patient est requis pour l'envoi à Recip-e",
          details: "Veuillez vérifier les données du patient"
        }
      };
    }

    if (!prescriptionData.medicaments?.length) {
      return {
        success: false,
        error: {
          code: "NO_MEDICATIONS",
          message: "La prescription doit contenir au moins un médicament",
          details: null
        }
      };
    }

    // Simulation succès
    const rid = generateSimulatedRID();
    return {
      success: true,
      data: {
        rid,
        barcode: `01${rid}`,
        status: "CREATED",
        creationDate: new Date().toISOString(),
        expirationDate: prescriptionData.date_validite_fin,
        message: "[SIMULATION] Prescription créée avec succès"
      }
    };
  }

  // Code pour l'intégration réelle (à activer quand les secrets sont configurés)
  // try {
  //   const response = await base44.functions.invoke('recipECreatePrescription', {
  //     prescription: prescriptionData,
  //     nihii
  //   });
  //   return response.data;
  // } catch (error) {
  //   return handleRecipEError(error);
  // }
}

/**
 * Récupère le statut d'une prescription depuis Recip-e
 */
export async function getPrescriptionStatus(rid) {
  if (SIMULATION_MODE) {
    await simulateNetworkDelay();

    if (!rid) {
      return {
        success: false,
        error: {
          code: "INVALID_RID",
          message: "RID de prescription invalide",
          details: null
        }
      };
    }

    // Simulation de différents statuts
    const statuses = ["CREATED", "DELIVERED", "PARTIALLY_DELIVERED", "EXPIRED"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      success: true,
      data: {
        rid,
        status: randomStatus,
        lastUpdate: new Date().toISOString(),
        deliveryInfo: randomStatus.includes("DELIVERED") ? {
          pharmacyName: "Pharmacie Centrale (Simulation)",
          pharmacyNihii: "1-23456-78-901",
          deliveryDate: new Date().toISOString()
        } : null,
        message: `[SIMULATION] Statut: ${randomStatus}`
      }
    };
  }

  // Code pour l'intégration réelle
  // try {
  //   const response = await base44.functions.invoke('recipEGetStatus', { rid });
  //   return response.data;
  // } catch (error) {
  //   return handleRecipEError(error);
  // }
}

/**
 * Annule une prescription dans Recip-e
 */
export async function cancelPrescription(rid, reason = "Annulation médecin") {
  if (SIMULATION_MODE) {
    await simulateNetworkDelay();

    if (!rid) {
      return {
        success: false,
        error: {
          code: "INVALID_RID",
          message: "RID de prescription invalide",
          details: null
        }
      };
    }

    return {
      success: true,
      data: {
        rid,
        status: "REVOKED",
        revokedDate: new Date().toISOString(),
        revokedReason: reason,
        message: "[SIMULATION] Prescription annulée avec succès"
      }
    };
  }
}

/**
 * Recherche de médicaments via la base SAM-V2 / Recip-e
 */
export async function searchMedications(query, options = {}) {
  if (SIMULATION_MODE) {
    await simulateNetworkDelay();

    if (!query || query.length < 2) {
      return {
        success: true,
        data: {
          medications: [],
          total: 0
        }
      };
    }

    // Base de données simulée de médicaments courants
    const mockMedications = [
      { cnk: "0001-123", name: "Dafalgan", dci: "Paracétamol", dosage: "500mg", forme: "Comprimé", fabricant: "UPSA" },
      { cnk: "0001-124", name: "Dafalgan", dci: "Paracétamol", dosage: "1g", forme: "Comprimé", fabricant: "UPSA" },
      { cnk: "0001-125", name: "Dafalgan Forte", dci: "Paracétamol", dosage: "1g", forme: "Comprimé effervescent", fabricant: "UPSA" },
      { cnk: "0002-001", name: "Ibuprofen Teva", dci: "Ibuprofène", dosage: "400mg", forme: "Comprimé", fabricant: "Teva" },
      { cnk: "0002-002", name: "Ibuprofen Teva", dci: "Ibuprofène", dosage: "600mg", forme: "Comprimé", fabricant: "Teva" },
      { cnk: "0003-001", name: "Amoxicilline Sandoz", dci: "Amoxicilline", dosage: "500mg", forme: "Gélule", fabricant: "Sandoz" },
      { cnk: "0003-002", name: "Amoxicilline Sandoz", dci: "Amoxicilline", dosage: "1g", forme: "Comprimé dispersible", fabricant: "Sandoz" },
      { cnk: "0004-001", name: "Augmentin", dci: "Amoxicilline/Acide clavulanique", dosage: "875mg/125mg", forme: "Comprimé", fabricant: "GSK" },
      { cnk: "0005-001", name: "Omeprazole Mylan", dci: "Oméprazole", dosage: "20mg", forme: "Gélule gastro-résistante", fabricant: "Mylan" },
      { cnk: "0005-002", name: "Omeprazole Mylan", dci: "Oméprazole", dosage: "40mg", forme: "Gélule gastro-résistante", fabricant: "Mylan" },
      { cnk: "0006-001", name: "Pantoprazole EG", dci: "Pantoprazole", dosage: "20mg", forme: "Comprimé gastro-résistant", fabricant: "EG" },
      { cnk: "0006-002", name: "Pantoprazole EG", dci: "Pantoprazole", dosage: "40mg", forme: "Comprimé gastro-résistant", fabricant: "EG" },
      { cnk: "0007-001", name: "Amlodipine Sandoz", dci: "Amlodipine", dosage: "5mg", forme: "Comprimé", fabricant: "Sandoz" },
      { cnk: "0007-002", name: "Amlodipine Sandoz", dci: "Amlodipine", dosage: "10mg", forme: "Comprimé", fabricant: "Sandoz" },
      { cnk: "0008-001", name: "Metformine Teva", dci: "Metformine", dosage: "500mg", forme: "Comprimé", fabricant: "Teva" },
      { cnk: "0008-002", name: "Metformine Teva", dci: "Metformine", dosage: "850mg", forme: "Comprimé", fabricant: "Teva" },
      { cnk: "0008-003", name: "Metformine Teva", dci: "Metformine", dosage: "1000mg", forme: "Comprimé", fabricant: "Teva" },
      { cnk: "0009-001", name: "Atorvastatine EG", dci: "Atorvastatine", dosage: "10mg", forme: "Comprimé", fabricant: "EG" },
      { cnk: "0009-002", name: "Atorvastatine EG", dci: "Atorvastatine", dosage: "20mg", forme: "Comprimé", fabricant: "EG" },
      { cnk: "0009-003", name: "Atorvastatine EG", dci: "Atorvastatine", dosage: "40mg", forme: "Comprimé", fabricant: "EG" },
      { cnk: "0010-001", name: "Bisoprolol Sandoz", dci: "Bisoprolol", dosage: "2.5mg", forme: "Comprimé", fabricant: "Sandoz" },
      { cnk: "0010-002", name: "Bisoprolol Sandoz", dci: "Bisoprolol", dosage: "5mg", forme: "Comprimé", fabricant: "Sandoz" },
      { cnk: "0010-003", name: "Bisoprolol Sandoz", dci: "Bisoprolol", dosage: "10mg", forme: "Comprimé", fabricant: "Sandoz" },
      { cnk: "0011-001", name: "Losartan Mylan", dci: "Losartan", dosage: "50mg", forme: "Comprimé", fabricant: "Mylan" },
      { cnk: "0011-002", name: "Losartan Mylan", dci: "Losartan", dosage: "100mg", forme: "Comprimé", fabricant: "Mylan" },
      { cnk: "0012-001", name: "Ventolin", dci: "Salbutamol", dosage: "100µg/dose", forme: "Aérosol", fabricant: "GSK" },
      { cnk: "0013-001", name: "Seretide Diskus", dci: "Salmétérol/Fluticasone", dosage: "50/250µg", forme: "Poudre inhalation", fabricant: "GSK" },
      { cnk: "0014-001", name: "Zolpidem Teva", dci: "Zolpidem", dosage: "10mg", forme: "Comprimé", fabricant: "Teva" },
      { cnk: "0015-001", name: "Alprazolam Mylan", dci: "Alprazolam", dosage: "0.25mg", forme: "Comprimé", fabricant: "Mylan" },
      { cnk: "0015-002", name: "Alprazolam Mylan", dci: "Alprazolam", dosage: "0.5mg", forme: "Comprimé", fabricant: "Mylan" },
    ];

    const searchLower = query.toLowerCase();
    const filtered = mockMedications.filter(med => 
      med.name.toLowerCase().includes(searchLower) ||
      med.dci.toLowerCase().includes(searchLower) ||
      med.cnk.includes(query)
    );

    return {
      success: true,
      data: {
        medications: filtered.slice(0, options.limit || 20),
        total: filtered.length,
        source: "SIMULATION"
      }
    };
  }
}

/**
 * Vérifie la connexion à Recip-e
 */
export async function checkConnection() {
  if (SIMULATION_MODE) {
    await simulateNetworkDelay();
    return {
      success: true,
      data: {
        connected: true,
        mode: "SIMULATION",
        message: "Mode simulation actif. Configurez les certificats eHealth pour une connexion réelle.",
        serverTime: new Date().toISOString()
      }
    };
  }
}

/**
 * Récupère l'historique des prescriptions d'un patient depuis Recip-e
 */
export async function getPatientPrescriptionHistory(patientNiss, options = {}) {
  if (SIMULATION_MODE) {
    await simulateNetworkDelay();

    if (!patientNiss) {
      return {
        success: false,
        error: {
          code: "INVALID_NISS",
          message: "NISS du patient requis",
          details: null
        }
      };
    }

    // Historique simulé vide (les vraies données viendraient de Recip-e)
    return {
      success: true,
      data: {
        prescriptions: [],
        total: 0,
        message: "[SIMULATION] Historique Recip-e non disponible en mode simulation"
      }
    };
  }
}

/**
 * Traduit les codes d'erreur Recip-e en messages utilisateur
 */
export function getErrorMessage(errorCode) {
  const errorMessages = {
    // Erreurs patient
    "INVALID_PATIENT": "Données patient invalides ou incomplètes",
    "INVALID_NISS": "Numéro NISS invalide ou non reconnu",
    "PATIENT_NOT_FOUND": "Patient non trouvé dans le registre national",
    
    // Erreurs prescription
    "INVALID_RID": "Identifiant de prescription invalide",
    "PRESCRIPTION_NOT_FOUND": "Prescription non trouvée dans Recip-e",
    "PRESCRIPTION_ALREADY_DELIVERED": "Cette prescription a déjà été délivrée",
    "PRESCRIPTION_EXPIRED": "Cette prescription est expirée",
    "PRESCRIPTION_REVOKED": "Cette prescription a été annulée",
    "NO_MEDICATIONS": "Aucun médicament dans la prescription",
    
    // Erreurs médicament
    "INVALID_CNK": "Code CNK du médicament invalide",
    "MEDICATION_NOT_FOUND": "Médicament non trouvé dans la base SAM",
    "MEDICATION_UNAVAILABLE": "Médicament temporairement indisponible",
    
    // Erreurs prescripteur
    "INVALID_NIHII": "Numéro INAMI du prescripteur invalide",
    "PRESCRIBER_NOT_AUTHORIZED": "Prescripteur non autorisé pour ce type de prescription",
    "CERTIFICATE_EXPIRED": "Certificat eHealth expiré",
    "CERTIFICATE_INVALID": "Certificat eHealth invalide",
    
    // Erreurs réseau
    "NETWORK_ERROR": "Erreur de connexion au serveur Recip-e",
    "TIMEOUT": "Délai de réponse dépassé",
    "SERVICE_UNAVAILABLE": "Service Recip-e temporairement indisponible",
    
    // Erreur générique
    "UNKNOWN": "Erreur inconnue. Veuillez réessayer."
  };

  return errorMessages[errorCode] || errorMessages["UNKNOWN"];
}

/**
 * Vérifie si le mode simulation est actif
 */
export function isSimulationMode() {
  return SIMULATION_MODE;
}