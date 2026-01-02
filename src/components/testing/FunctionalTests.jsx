import { base44 } from '@/api/base44Client';
import { 
  Shield, 
  User, 
  FileText, 
  Stethoscope, 
  CreditCard, 
  FolderOpen,
  Clock,
  History,
  Calendar,
  Pill,
  Database,
  Link2,
  Syringe,
  Bell,
  MessageSquare
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
  { id: 'traceability', name: 'Traçabilité', icon: <Clock className="w-5 h-5" /> },
  { id: 'agenda', name: 'Agenda & RDV', icon: <Calendar className="w-5 h-5" /> },
  { id: 'prescriptions', name: 'Prescriptions', icon: <Pill className="w-5 h-5" /> },
  { id: 'hub', name: 'HUB Santé', icon: <Database className="w-5 h-5" /> },
  { id: 'vaccinations', name: 'Vaccinations', icon: <Syringe className="w-5 h-5" /> },
  { id: 'reminders', name: 'Rappels', icon: <Bell className="w-5 h-5" /> },
  { id: 'messaging', name: 'Messagerie', icon: <MessageSquare className="w-5 h-5" /> }
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
  },

  // ────────────────────────────────
  // 9. AGENDA & RENDEZ-VOUS
  // ────────────────────────────────
  {
    id: 'TEST_16',
    category: 'agenda',
    name: 'Création rendez-vous',
    description: 'Crée un rendez-vous pour le patient',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const rdv = await base44.entities.RendezVous.create({
        patient_id: context.patientId,
        date: tomorrow.toISOString().split('T')[0],
        heure_debut: '10:00',
        heure_fin: '10:30',
        type_consultation: 'Consultation',
        motif: 'Test automatisé',
        statut: 'Planifié',
        medecin_assigne: user.email,
        duree_estimee: 30
      });

      if (!rdv || !rdv.id) {
        throw new Error('Rendez-vous non créé');
      }

      return { rdvId: rdv.id };
    }
  },
  {
    id: 'TEST_17',
    category: 'agenda',
    name: 'Modification statut RDV',
    description: 'Teste les changements de statut du RDV',
    critical: false,
    run: async (context) => {
      if (!context.rdvId) {
        throw new Error('RDV de test non trouvé');
      }

      // Test passage à Confirmé
      await base44.entities.RendezVous.update(context.rdvId, {
        statut: 'Confirmé'
      });

      const rdvList = await base44.entities.RendezVous.filter({ id: context.rdvId });
      if (rdvList[0]?.statut !== 'Confirmé') {
        throw new Error('Statut non mis à jour');
      }

      return { statusUpdated: true };
    }
  },
  {
    id: 'TEST_18',
    category: 'agenda',
    name: 'Annulation RDV',
    description: 'Teste l\'annulation d\'un rendez-vous',
    critical: false,
    run: async (context) => {
      if (!context.rdvId) {
        throw new Error('RDV de test non trouvé');
      }

      await base44.entities.RendezVous.update(context.rdvId, {
        statut: 'Annulé'
      });

      const rdvList = await base44.entities.RendezVous.filter({ id: context.rdvId });
      if (rdvList[0]?.statut !== 'Annulé') {
        throw new Error('Annulation non enregistrée');
      }

      return { cancelled: true };
    }
  },

  // ────────────────────────────────
  // 10. PRESCRIPTIONS
  // ────────────────────────────────
  {
    id: 'TEST_19',
    category: 'prescriptions',
    name: 'Création prescription',
    description: 'Crée une prescription médicamenteuse',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();

      const prescription = await base44.entities.Prescription.create({
        patient_id: context.patientId,
        medecin_email: user.email,
        date_prescription: new Date().toISOString(),
        medicaments: [
          {
            nom_produit: 'Paracétamol 1g',
            posologie: '3x/jour',
            duree_traitement: '5 jours',
            quantite: 2
          },
          {
            nom_produit: 'Ibuprofène 400mg',
            posologie: '2x/jour aux repas',
            duree_traitement: '3 jours',
            quantite: 1
          }
        ],
        statut_recip_e: 'Brouillon',
        tracking_status: 'ACTIVE'
      });

      if (!prescription || !prescription.id) {
        throw new Error('Prescription non créée');
      }

      return { prescriptionId: prescription.id };
    }
  },
  {
    id: 'TEST_20',
    category: 'prescriptions',
    name: 'Prescription multi-médicaments',
    description: 'Vérifie que tous les médicaments sont sauvegardés',
    critical: true,
    run: async (context) => {
      if (!context.prescriptionId) {
        throw new Error('Prescription de test non trouvée');
      }

      const prescriptions = await base44.entities.Prescription.filter({
        id: context.prescriptionId
      });

      const prescription = prescriptions[0];
      if (!prescription?.medicaments || prescription.medicaments.length !== 2) {
        throw new Error('Médicaments non sauvegardés correctement');
      }

      return { medicamentsCount: prescription.medicaments.length };
    }
  },
  {
    id: 'TEST_21',
    category: 'prescriptions',
    name: 'Statut prescription',
    description: 'Teste le changement de statut de la prescription',
    critical: false,
    run: async (context) => {
      if (!context.prescriptionId) {
        throw new Error('Prescription de test non trouvée');
      }

      await base44.entities.Prescription.update(context.prescriptionId, {
        statut_recip_e: 'Envoyé',
        recip_e_rid: 'TEST-RID-' + Date.now()
      });

      const prescriptions = await base44.entities.Prescription.filter({
        id: context.prescriptionId
      });

      if (prescriptions[0]?.statut_recip_e !== 'Envoyé') {
        throw new Error('Statut non mis à jour');
      }

      return { statusUpdated: true };
    }
  },

  // ────────────────────────────────
  // 11. HUB SANTÉ
  // ────────────────────────────────
  {
    id: 'TEST_22',
    category: 'hub',
    name: 'Création lien thérapeutique',
    description: 'Teste la création du lien thérapeutique patient-médecin',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);

      await base44.entities.Patient.update(context.patientId, {
        therapeutic_link: {
          active: true,
          medecin_email: user.email,
          medecin_nihii: 'TEST-NIHII-123',
          created_at: new Date().toISOString(),
          expires_at: expiryDate.toISOString(),
          method: 'manual'
        }
      });

      const patients = await base44.entities.Patient.filter({ id: context.patientId });
      const patient = patients[0];

      if (!patient?.therapeutic_link?.active) {
        throw new Error('Lien thérapeutique non créé');
      }

      return { linkCreated: true };
    }
  },
  {
    id: 'TEST_23',
    category: 'hub',
    name: 'Validité lien thérapeutique',
    description: 'Vérifie la validité de 3 ans du lien',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const patients = await base44.entities.Patient.filter({ id: context.patientId });
      const patient = patients[0];
      const link = patient?.therapeutic_link;

      if (!link?.expires_at) {
        throw new Error('Date d\'expiration manquante');
      }

      const expiryDate = new Date(link.expires_at);
      const now = new Date();
      const diffYears = (expiryDate - now) / (1000 * 60 * 60 * 24 * 365);

      if (diffYears < 2.9 || diffYears > 3.1) {
        throw new Error('Durée de validité incorrecte (doit être ~3 ans)');
      }

      return { validityYears: Math.round(diffYears * 10) / 10 };
    }
  },
  {
    id: 'TEST_24',
    category: 'hub',
    name: 'Création consentement HUB',
    description: 'Teste la création du consentement patient',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);

      await base44.entities.Patient.update(context.patientId, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: '1.0',
          data_processing_consent: true,
          data_sharing_consent: true,
          hub_access_consent: true,
          expires_at: expiryDate.toISOString(),
          recorded_by: user.email,
          method: 'manual',
          revoked: false
        }
      });

      const patients = await base44.entities.Patient.filter({ id: context.patientId });
      const patient = patients[0];

      if (!patient?.gdpr_consent?.has_consented) {
        throw new Error('Consentement non enregistré');
      }

      return { consentCreated: true };
    }
  },
  {
    id: 'TEST_25',
    category: 'hub',
    name: 'Accès HUB conditionnel',
    description: 'Vérifie que l\'accès HUB nécessite lien ET consentement',
    critical: true,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const patients = await base44.entities.Patient.filter({ id: context.patientId });
      const patient = patients[0];

      const hasValidLink = patient?.therapeutic_link?.active && 
        new Date(patient.therapeutic_link.expires_at) > new Date();
      
      const hasValidConsent = patient?.gdpr_consent?.has_consented && 
        !patient.gdpr_consent.revoked &&
        new Date(patient.gdpr_consent.expires_at) > new Date();

      const canAccessHub = hasValidLink && hasValidConsent;

      if (!canAccessHub) {
        throw new Error('Accès HUB devrait être autorisé (lien + consentement valides)');
      }

      return { hubAccessible: true };
    }
  },

  // ────────────────────────────────
  // 12. VACCINATIONS
  // ────────────────────────────────
  {
    id: 'TEST_26',
    category: 'vaccinations',
    name: 'Création vaccination',
    description: 'Enregistre une vaccination',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();

      const vaccination = await base44.entities.Vaccination.create({
        patient_id: context.patientId,
        vaccine_name: 'Vaccin Test Grippe',
        vaccine_type: 'GRIPPE',
        vaccination_date: new Date().toISOString().split('T')[0],
        lot_number: 'LOT-TEST-123',
        site: 'Bras gauche',
        dose_number: 1,
        administered_by: user.email,
        notes: 'Vaccination test automatisé'
      });

      if (!vaccination || !vaccination.id) {
        throw new Error('Vaccination non créée');
      }

      return { vaccinationId: vaccination.id };
    }
  },
  {
    id: 'TEST_27',
    category: 'vaccinations',
    name: 'Rappel vaccination',
    description: 'Teste la création d\'un rappel de vaccination',
    critical: false,
    run: async (context) => {
      if (!context.vaccinationId) {
        throw new Error('Vaccination de test non trouvée');
      }

      const nextDoseDate = new Date();
      nextDoseDate.setMonth(nextDoseDate.getMonth() + 6);

      await base44.entities.Vaccination.update(context.vaccinationId, {
        next_dose_date: nextDoseDate.toISOString().split('T')[0]
      });

      const vaccinations = await base44.entities.Vaccination.filter({
        id: context.vaccinationId
      });

      if (!vaccinations[0]?.next_dose_date) {
        throw new Error('Date de rappel non enregistrée');
      }

      return { reminderSet: true };
    }
  },

  // ────────────────────────────────
  // 13. RAPPELS
  // ────────────────────────────────
  {
    id: 'TEST_28',
    category: 'reminders',
    name: 'Création rappel patient',
    description: 'Crée un rappel pour le patient',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 7);

      const reminder = await base44.entities.PatientReminder.create({
        patient_id: context.patientId,
        patient_name: 'Test Patient',
        type: 'suivi',
        canal: 'email',
        titre: 'Rappel de test',
        message: 'Ceci est un rappel automatisé de test',
        date_rappel: reminderDate.toISOString(),
        statut: 'planifie',
        medecin_email: user.email
      });

      if (!reminder || !reminder.id) {
        throw new Error('Rappel non créé');
      }

      return { reminderId: reminder.id };
    }
  },
  {
    id: 'TEST_29',
    category: 'reminders',
    name: 'Rappel prescription',
    description: 'Crée un rappel de renouvellement de prescription',
    critical: false,
    run: async (context) => {
      if (!context.patientId || !context.prescriptionId) {
        throw new Error('Patient ou prescription non trouvé');
      }

      const user = await base44.auth.me();
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 14);

      const reminder = await base44.entities.PrescriptionReminder.create({
        patient_id: context.patientId,
        prescription_id: context.prescriptionId,
        type: 'renewal',
        medication_name: 'Paracétamol 1g',
        reminder_date: reminderDate.toISOString().split('T')[0],
        status: 'active',
        medecin_email: user.email
      });

      if (!reminder || !reminder.id) {
        throw new Error('Rappel prescription non créé');
      }

      return { prescriptionReminderId: reminder.id };
    }
  },

  // ────────────────────────────────
  // 14. MESSAGERIE INTERNE
  // ────────────────────────────────
  {
    id: 'TEST_30',
    category: 'messaging',
    name: 'Création fil de discussion',
    description: 'Crée un fil de discussion lié au patient',
    critical: false,
    run: async (context) => {
      if (!context.patientId) {
        throw new Error('Patient de test non trouvé');
      }

      const user = await base44.auth.me();

      const thread = await base44.entities.MessageThread.create({
        title: 'Discussion test patient',
        type: 'patient',
        participants: [user.email],
        patient_id: context.patientId,
        patient_name: 'Test Patient',
        last_message_at: new Date().toISOString(),
        is_archived: false,
        is_urgent: false
      });

      if (!thread || !thread.id) {
        throw new Error('Fil de discussion non créé');
      }

      return { threadId: thread.id };
    }
  },
  {
    id: 'TEST_31',
    category: 'messaging',
    name: 'Envoi message',
    description: 'Envoie un message dans le fil',
    critical: false,
    run: async (context) => {
      if (!context.threadId) {
        throw new Error('Fil de discussion non trouvé');
      }

      const user = await base44.auth.me();

      const message = await base44.entities.InternalMessage.create({
        thread_id: context.threadId,
        sender_email: user.email,
        sender_name: user.full_name || 'Test User',
        content: 'Message de test automatisé',
        read_by: [user.email]
      });

      if (!message || !message.id) {
        throw new Error('Message non créé');
      }

      return { messageId: message.id };
    }
  },

  // ────────────────────────────────
  // 15. AUDIT LOG
  // ────────────────────────────────
  {
    id: 'TEST_32',
    category: 'traceability',
    name: 'Audit log création',
    description: 'Vérifie l\'enregistrement des actions dans l\'audit log',
    critical: false,
    run: async (context) => {
      const user = await base44.auth.me();

      const auditEntry = await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'TEST_ACTION',
        target_entity: 'Patient',
        target_id: context.patientId || 'test',
        details: 'Test automatisé de l\'audit log',
        timestamp: new Date().toISOString()
      });

      if (!auditEntry || !auditEntry.id) {
        throw new Error('Entrée audit non créée');
      }

      return { auditId: auditEntry.id };
    }
  },
  {
    id: 'TEST_33',
    category: 'traceability',
    name: 'Audit log recherche',
    description: 'Recherche les entrées d\'audit',
    critical: false,
    run: async (context) => {
      const user = await base44.auth.me();

      const auditLogs = await base44.entities.AuditLog.filter({
        user_email: user.email,
        action: 'TEST_ACTION'
      }, '-timestamp', 10);

      if (auditLogs.length === 0) {
        throw new Error('Aucune entrée d\'audit trouvée');
      }

      return { auditEntriesFound: auditLogs.length };
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