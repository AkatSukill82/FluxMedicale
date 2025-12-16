import { base44 } from '@/api/base44Client';
import { 
  Shield, 
  User, 
  FileText, 
  Stethoscope, 
  CreditCard, 
  FolderOpen,
  Clock,
  History
} from 'lucide-react';

// Catégories de tests
export const TEST_CATEGORIES = [
  { id: 'auth', name: 'Authentification', icon: <Shield className="w-5 h-5" /> },
  { id: 'patient', name: 'Dossier Patient', icon: <User className="w-5 h-5" /> },
  { id: 'medical', name: 'Dossier Médical', icon: <Stethoscope className="w-5 h-5" /> },
  { id: 'consultation', name: 'Consultations', icon: <FileText className="w-5 h-5" /> },
  { id: 'billing', name: 'Facturation', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'documents', name: 'Documents', icon: <FolderOpen className="w-5 h-5" /> },
  { id: 'history', name: 'Historique Patient', icon: <History className="w-5 h-5" /> },
  { id: 'traceability', name: 'Traçabilité', icon: <Clock className="w-5 h-5" /> }
];

// Helpers
const generateTestNISS = () => {
  const year = '90';
  const month = '01';
  const day = '01';
  const seq = String(Math.floor(Math.random() * 999)).padStart(3, '0');
  const checksum = String(Math.floor(Math.random() * 99)).padStart(2, '0');
  return `${year}${month}${day}-${seq}.${checksum}`;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Tests individuels
const tests = [
  // ────────────────────────────────
  // 1. AUTHENTIFICATION
  // ────────────────────────────────
  {
    id: 'TEST_01',
    category: 'auth',
    name: 'Connexion utilisateur',
    description: 'Vérifie qu\'un utilisateur peut se connecter',
    critical: false,
    run: async () => {
      const user = await base44.auth.me();
      if (!user || !user.email) {
        throw new Error('Utilisateur non authentifié');
      }
      return { user };
    }
  },
  {
    id: 'TEST_02',
    category: 'auth',
    name: 'Vérification des permissions',
    description: 'Vérifie que l\'utilisateur a les droits nécessaires',
    critical: false,
    run: async () => {
      const user = await base44.auth.me();
      if (!user.role || (user.role !== 'admin' && user.role !== 'user')) {
        throw new Error('Rôle utilisateur invalide');
      }
      return { role: user.role };
    }
  },

  // ────────────────────────────────
  // 2. DOSSIER PATIENT
  // ────────────────────────────────
  {
    id: 'TEST_03',
    category: 'patient',
    name: 'Création patient',
    description: 'Crée un patient de test avec toutes les données',
    critical: false,
    run: async () => {
      const niss = generateTestNISS();
      const patient = await base44.entities.Patient.create({
        resourceType: 'Patient',
        identifier: [{
          system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin',
          value: niss
        }],
        name: [{
          use: 'official',
          family: 'TEST_PATIENT',
          given: ['Automated', 'Test']
        }],
        gender: 'male',
        birthDate: '1990-01-01',
        telecom: [
          { system: 'phone', value: '+32499123456' },
          { system: 'email', value: 'test@example.com' }
        ],
        address: [{
          line: ['Rue de Test 123'],
          city: 'Bruxelles',
          postalCode: '1000',
          country: 'BE'
        }],
        mutuelle: 'Mutuelle Test',
        mutuelle_number: '123456789'
      });

      if (!patient || !patient.id) {
        throw new Error('Patient non créé');
      }

      return { patientId: patient.id };
    }
  },
  {
    id: 'TEST_04',
    category: 'patient',
    name: 'Modification patient',
    description: 'Modifie les données d\'un patient existant',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const updatedPatient = await base44.entities.Patient.update(context.patientId, {
        telecom: [
          { system: 'phone', value: '+32499999999' }
        ]
      });

      const newPhone = updatedPatient.telecom?.find(t => t.system === 'phone')?.value;
      if (newPhone !== '+32499999999') {
        throw new Error('Modification non sauvegardée');
      }

      return { updated: true };
    }
  },

  // ────────────────────────────────
  // 3. DOSSIER MÉDICAL
  // ────────────────────────────────
  {
    id: 'TEST_05',
    category: 'medical',
    name: 'Texte médical illimité',
    description: 'Vérifie qu\'on peut encoder des textes très longs',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const longText = 'A'.repeat(15000); // 15k caractères
      
      const updated = await base44.entities.Patient.update(context.patientId, {
        medical_history: longText
      });

      if (updated.medical_history?.length !== 15000) {
        throw new Error('Texte tronqué ou non sauvegardé');
      }

      return { textLength: updated.medical_history.length };
    }
  },

  // ────────────────────────────────
  // 4. CONSULTATIONS
  // ────────────────────────────────
  {
    id: 'TEST_06',
    category: 'consultation',
    name: 'Création consultation',
    description: 'Crée une consultation avec texte long',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const longText = 'Motif: Test automatisé.\n' + 'Note: '.repeat(1000);

      const consultation = await base44.entities.Consultation.create({
        patient_id: context.patientId,
        date: new Date().toISOString(),
        motif: 'Test automatisé',
        anamnese: longText,
        examen_clinique: 'Examen normal',
        diagnostic: 'Test fonctionnel',
        traitement: 'Aucun'
      });

      if (!consultation || !consultation.id) {
        throw new Error('Consultation non créée');
      }

      if (!consultation.date || !consultation.created_date) {
        throw new Error('Date/heure automatique manquante');
      }

      return { consultationId: consultation.id };
    }
  },
  {
    id: 'TEST_07',
    category: 'consultation',
    name: 'Consultation dans historique',
    description: 'Vérifie que la consultation apparaît dans l\'historique',
    critical: true,
    run: async (context) => {
      if (!context.consultationId) {
        throw new Error('Consultation de test non trouvée');
      }

      await sleep(500); // Attendre l'indexation

      const timelineEvents = await base44.entities.TimelineEvent.filter({
        patient_id: context.patientId,
        event_type: 'CONSULTATION'
      });

      const found = timelineEvents.some(e => e.related_id === context.consultationId);
      if (!found) {
        throw new Error('Consultation absente de l\'historique');
      }

      return { inTimeline: true };
    }
  },

  // ────────────────────────────────
  // 5. FACTURATION
  // ────────────────────────────────
  {
    id: 'TEST_08',
    category: 'billing',
    name: 'Facturation liée',
    description: 'Crée une facture liée à la consultation',
    critical: true,
    run: async (context) => {
      if (!context.patientId || !context.consultationId) {
        throw new Error('Patient ou consultation manquant');
      }

      const user = await base44.auth.me();

      const invoice = await base44.entities.Invoice.create({
        patient_id: context.patientId,
        provider_id: user.email,
        type: 'EATTEST',
        payment_method: 'CARD',
        status: 'NOT_SENT',
        total_amount: 2500, // 25.00 EUR
        patient_contribution: 625, // 6.25 EUR
        insurance_contribution: 1875, // 18.75 EUR
        invoice_date: new Date().toISOString().split('T')[0]
      });

      if (!invoice || !invoice.id) {
        throw new Error('Facture non créée');
      }

      return { invoiceId: invoice.id };
    }
  },
  {
    id: 'TEST_09',
    category: 'billing',
    name: 'Statuts de paiement',
    description: 'Teste les différents statuts de paiement',
    critical: true,
    run: async (context) => {
      if (!context.invoiceId) {
        throw new Error('Facture de test non trouvée');
      }

      // Test statut PAID
      await base44.entities.Invoice.update(context.invoiceId, {
        status: 'PAID',
        paid_at: new Date().toISOString()
      });

      const invoice = await base44.entities.Invoice.filter({ id: context.invoiceId });
      if (invoice[0]?.status !== 'PAID') {
        throw new Error('Statut non mis à jour');
      }

      return { statusUpdated: true };
    }
  },
  {
    id: 'TEST_10',
    category: 'billing',
    name: 'Facturation dans historique',
    description: 'Vérifie que la facture apparaît dans l\'historique',
    critical: true,
    run: async (context) => {
      if (!context.invoiceId) {
        throw new Error('Facture de test non trouvée');
      }

      await sleep(500);

      const timelineEvents = await base44.entities.TimelineEvent.filter({
        patient_id: context.patientId,
        event_type: 'INVOICE'
      });

      const found = timelineEvents.some(e => e.related_id === context.invoiceId);
      if (!found) {
        throw new Error('Facture absente de l\'historique');
      }

      return { inTimeline: true };
    }
  },

  // ────────────────────────────────
  // 6. DOCUMENTS
  // ────────────────────────────────
  {
    id: 'TEST_11',
    category: 'documents',
    name: 'Ajout document',
    description: 'Ajoute un document médical au patient',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const document = await base44.entities.Document.create({
        patient_id: context.patientId,
        title: 'Document Test Automatisé',
        content: 'Contenu du document de test',
        type: 'CERTIFICATE',
        date: new Date().toISOString().split('T')[0]
      });

      if (!document || !document.id) {
        throw new Error('Document non créé');
      }

      return { documentId: document.id };
    }
  },
  {
    id: 'TEST_12',
    category: 'documents',
    name: 'Document dans historique',
    description: 'Vérifie que le document apparaît dans l\'historique',
    critical: false,
    run: async (context) => {
      if (!context.documentId) {
        throw new Error('Document de test non trouvé');
      }

      await sleep(500);

      const timelineEvents = await base44.entities.TimelineEvent.filter({
        patient_id: context.patientId,
        event_type: 'DOCUMENT'
      });

      const found = timelineEvents.some(e => e.related_id === context.documentId);
      if (!found) {
        throw new Error('Document absent de l\'historique');
      }

      return { inTimeline: true };
    }
  },

  // ────────────────────────────────
  // 7. HISTORIQUE PATIENT
  // ────────────────────────────────
  {
    id: 'TEST_13',
    category: 'history',
    name: 'Chronologie correcte',
    description: 'Vérifie l\'ordre chronologique de l\'historique',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const timelineEvents = await base44.entities.TimelineEvent.filter({
        patient_id: context.patientId
      }, '-event_date');

      if (timelineEvents.length < 2) {
        throw new Error('Pas assez d\'événements pour tester la chronologie');
      }

      // Vérifier que le plus récent est en premier
      for (let i = 0; i < timelineEvents.length - 1; i++) {
        const current = new Date(timelineEvents[i].event_date);
        const next = new Date(timelineEvents[i + 1].event_date);
        if (current < next) {
          throw new Error('Ordre chronologique incorrect');
        }
      }

      return { chronologyValid: true };
    }
  },
  {
    id: 'TEST_14',
    category: 'history',
    name: 'Exhaustivité historique',
    description: 'Vérifie que tous les types d\'événements sont présents',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const timelineEvents = await base44.entities.TimelineEvent.filter({
        patient_id: context.patientId
      });

      const eventTypes = [...new Set(timelineEvents.map(e => e.event_type))];
      
      const expectedTypes = ['CONSULTATION', 'INVOICE', 'DOCUMENT'];
      const missingTypes = expectedTypes.filter(t => !eventTypes.includes(t));

      if (missingTypes.length > 0) {
        throw new Error(`Types d'événements manquants: ${missingTypes.join(', ')}`);
      }

      return { allTypesPresent: true };
    }
  },

  // ────────────────────────────────
  // 8. TRAÇABILITÉ
  // ────────────────────────────────
  {
    id: 'TEST_15',
    category: 'traceability',
    name: 'Horodatage et traçabilité',
    description: 'Vérifie que chaque action est tracée avec date et utilisateur',
    critical: false,
    run: async (context) => {
      if (!context.consultationId) {
        throw new Error('Consultation de test non trouvée');
      }

      const consultations = await base44.entities.Consultation.filter({
        id: context.consultationId
      });

      const consultation = consultations[0];
      if (!consultation) {
        throw new Error('Consultation non trouvée');
      }

      if (!consultation.created_date) {
        throw new Error('Date de création manquante');
      }

      if (!consultation.created_by) {
        throw new Error('Utilisateur créateur manquant');
      }

      const createdDate = new Date(consultation.created_date);
      if (isNaN(createdDate.getTime())) {
        throw new Error('Date de création invalide');
      }

      return { 
        traced: true, 
        createdBy: consultation.created_by,
        createdAt: consultation.created_date
      };
    }
  }
];

// Exécution de tous les tests
export async function runAllTests(onProgress) {
  const results = {
    tests: [],
    summary: {
      total: tests.length,
      passed: 0,
      failed: 0,
      duration: 0,
      shouldBlockDeployment: false
    }
  };

  const startTime = Date.now();
  const context = {};

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const testStartTime = Date.now();

    try {
      const result = await test.run(context);
      
      // Sauvegarder le résultat dans le contexte pour les tests suivants
      Object.assign(context, result);

      results.tests.push({
        id: test.id,
        name: test.name,
        description: test.description,
        category: test.category,
        critical: test.critical,
        passed: true,
        duration: Date.now() - testStartTime,
        result
      });

      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        id: test.id,
        name: test.name,
        description: test.description,
        category: test.category,
        critical: test.critical,
        passed: false,
        duration: Date.now() - testStartTime,
        error: error.message
      });

      results.summary.failed++;

      // Vérifier si c'est un test critique
      if (test.critical) {
        results.summary.shouldBlockDeployment = true;
      }
    }

    onProgress(i + 1, tests.length);
  }

  results.summary.duration = Date.now() - startTime;

  // Nettoyage - supprimer le patient de test
  if (context.patientId) {
    try {
      await base44.entities.Patient.delete(context.patientId);
    } catch (error) {
      console.error('Erreur nettoyage:', error);
    }
  }

  return results;
}