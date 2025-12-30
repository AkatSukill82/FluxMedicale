import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateFluxMedDocumentation() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  const addPageIfNeeded = (neededSpace = 40) => {
    if (y + neededSpace > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const addTitle = (text, size = 16) => {
    addPageIfNeeded(20);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(text, 15, y);
    y += size * 0.6;
    doc.setTextColor(0, 0, 0);
  };

  const addSubtitle = (text) => {
    addPageIfNeeded(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(text, 15, y);
    y += 7;
    doc.setTextColor(0, 0, 0);
  };

  const addParagraph = (text) => {
    addPageIfNeeded(15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 3;
  };

  const addBulletList = (items) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
      addPageIfNeeded(8);
      doc.text(`• ${item}`, 20, y);
      y += 6;
    });
    y += 2;
  };

  const addTable = (headers, data) => {
    addPageIfNeeded(40);
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 10;
  };

  // ========== PAGE DE COUVERTURE ==========
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FluxMed', pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Dossier Médical Informatisé', pageWidth / 2, 55, { align: 'center' });
  doc.text('Documentation Complète', pageWidth / 2, 65, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  y = 100;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Solution conforme aux exigences d\'homologation eHealth Belgique', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Version: 1.0`, 15, y);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-BE')}`, 15, y + 7);
  
  // ========== TABLE DES MATIÈRES ==========
  doc.addPage();
  y = 20;
  addTitle('Table des Matières', 18);
  y += 10;

  const toc = [
    '1. Présentation Générale',
    '2. Gestion des Patients',
    '3. Agenda et Rendez-vous',
    '4. Consultations et Notes Cliniques',
    '5. Prescriptions Électroniques (Recip-e)',
    '6. Facturation et MyCareNet',
    '7. Modules eHealth Obligatoires',
    '8. Sécurité et Conformité RGPD',
    '9. Fonctionnalités Avancées',
    '10. Guide Utilisateur'
  ];
  
  doc.setFontSize(11);
  toc.forEach((item, index) => {
    doc.text(item, 20, y);
    y += 8;
  });

  // ========== 1. PRÉSENTATION GÉNÉRALE ==========
  doc.addPage();
  y = 20;
  addTitle('1. Présentation Générale', 18);
  y += 5;

  addParagraph('FluxMed est un Dossier Médical Informatisé (DMI) complet conçu pour les médecins généralistes et spécialistes en Belgique. Il intègre tous les services eHealth requis pour l\'homologation et offre une interface moderne et intuitive.');

  addSubtitle('Objectifs du logiciel');
  addBulletList([
    'Gestion complète des dossiers patients (FHIR compliant)',
    'Intégration native avec les services eHealth belges',
    'Prescription électronique via Recip-e',
    'Facturation électronique via MyCareNet',
    'Conformité RGPD et sécurité des données',
    'Interface multilingue (FR/NL/EN)'
  ]);

  addSubtitle('Architecture technique');
  addBulletList([
    'Application web moderne (React, TypeScript)',
    'Backend sécurisé avec authentification forte',
    'Base de données chiffrée',
    'API RESTful pour intégrations',
    'Hébergement conforme HDS (Hébergeur de Données de Santé)'
  ]);

  // ========== 2. GESTION DES PATIENTS ==========
  doc.addPage();
  y = 20;
  addTitle('2. Gestion des Patients', 18);
  y += 5;

  addSubtitle('2.1 Création de patient');
  addParagraph('Les patients peuvent être créés manuellement ou automatiquement via la lecture de la carte eID belge. Le système détecte automatiquement les doublons potentiels basés sur le NISS.');

  addSubtitle('2.2 Données FHIR');
  addParagraph('Le modèle de données patient est conforme au standard FHIR (Fast Healthcare Interoperability Resources) avec les extensions belges (be-fhir):');
  addBulletList([
    'Identifiants: NISS, numéro mutuelle',
    'Nom officiel et nom d\'usage',
    'Coordonnées (téléphone, email, adresse)',
    'Date de naissance et genre',
    'Informations d\'assurance (mutuelle)',
    'Antécédents médicaux',
    'Allergies et intolérances',
    'Médicaments actuels',
    'Consentement RGPD'
  ]);

  addSubtitle('2.3 Lecture carte eID');
  addParagraph('FluxMed supporte la lecture automatique des cartes d\'identité électroniques belges via le middleware eID officiel. Fonctionnalités:');
  addBulletList([
    'Détection automatique du lecteur de carte',
    'Extraction des données d\'identité (nom, prénom, NISS, adresse, photo)',
    'Création automatique ou ouverture du dossier existant',
    'Gestion des doublons avec interface de fusion',
    'Option d\'auto-ouverture à l\'insertion de la carte'
  ]);

  // ========== 3. AGENDA ==========
  doc.addPage();
  y = 20;
  addTitle('3. Agenda et Rendez-vous', 18);
  y += 5;

  addSubtitle('3.1 Gestion des rendez-vous');
  addBulletList([
    'Vue journalière, hebdomadaire et mensuelle',
    'Création rapide de rendez-vous avec recherche patient',
    'Types de consultation: standard, urgence, téléconsultation, vaccination',
    'Statuts: Planifié, Confirmé, En cours, Terminé, Annulé',
    'Drag & drop pour reprogrammation',
    'Durée configurable par type de consultation'
  ]);

  addSubtitle('3.2 Gestion des disponibilités');
  addBulletList([
    'Définition des plages horaires par jour',
    'Créneaux récurrents (hebdomadaires)',
    'Gestion des indisponibilités (congés, formations)',
    'Multi-cabinets avec couleurs distinctes'
  ]);

  addSubtitle('3.3 Rappels automatiques');
  addParagraph('Système de rappels configurables pour les patients (SMS, email) avec délais personnalisables (24h, 48h, 1 semaine avant le RDV).');

  // ========== 4. CONSULTATIONS ==========
  doc.addPage();
  y = 20;
  addTitle('4. Consultations et Notes Cliniques', 18);
  y += 5;

  addSubtitle('4.1 Workflow de consultation');
  addParagraph('Le flux de consultation suit le modèle SOAP (Subjectif, Objectif, Analyse, Plan):');
  addBulletList([
    'Motif de consultation',
    'Anamnèse (histoire de la maladie)',
    'Examen clinique',
    'Diagnostic (codes ICD-10)',
    'Plan de traitement',
    'Prescriptions associées',
    'Documents et pièces jointes'
  ]);

  addSubtitle('4.2 Modèles de consultation');
  addParagraph('Bibliothèque de modèles prédéfinis et personnalisables pour accélérer la documentation:');
  addBulletList([
    'Consultation générale',
    'Suivi diabète',
    'Suivi hypertension',
    'Bilan annuel',
    'Certificat médical',
    'Modèles personnalisés'
  ]);

  addSubtitle('4.3 Mesures et courbes de croissance');
  addBulletList([
    'Poids, taille, IMC',
    'Tension artérielle, fréquence cardiaque',
    'Température',
    'Périmètre crânien (pédiatrie)',
    'Courbes OMS pour le suivi pédiatrique'
  ]);

  // ========== 5. PRESCRIPTIONS ==========
  doc.addPage();
  y = 20;
  addTitle('5. Prescriptions Électroniques (Recip-e)', 18);
  y += 5;

  addSubtitle('5.1 Intégration Recip-e v4');
  addParagraph('FluxMed est entièrement intégré avec le système Recip-e pour la prescription électronique de médicaments en Belgique.');

  addTable(
    ['Fonctionnalité', 'Description', 'Statut'],
    [
      ['Création prescription', 'Sélection médicaments via SAM v2', '✅ Implémenté'],
      ['Signature électronique', 'Signature avec certificat eHealth', '✅ Simulé'],
      ['Envoi Recip-e', 'Transmission au serveur central', '✅ Simulé'],
      ['Code RID/barcode', 'Génération code pour pharmacie', '✅ Implémenté'],
      ['Suivi statut', 'Vérification délivrance', '✅ Simulé'],
      ['Annulation', 'Révocation prescription active', '✅ Simulé'],
      ['Historique', 'Consultation prescriptions passées', '✅ Implémenté'],
      ['Renouvellement', 'Gestion traitements chroniques', '✅ Implémenté']
    ]
  );

  addSubtitle('5.2 Base de données médicaments (SAM v2)');
  addParagraph('Recherche de médicaments dans la base SAM v2 officielle avec:');
  addBulletList([
    'Recherche par nom commercial ou DCI',
    'Filtrage par forme galénique',
    'Informations de remboursement',
    'Posologies standards',
    'Interactions médicamenteuses (alertes)',
    'Alternatives génériques'
  ]);

  // ========== 6. FACTURATION ==========
  doc.addPage();
  y = 20;
  addTitle('6. Facturation et MyCareNet', 18);
  y += 5;

  addSubtitle('6.1 Services MyCareNet intégrés');
  addTable(
    ['Service', 'Description', 'Statut'],
    [
      ['Assurabilité (MemberData)', 'Vérification droits patient en temps réel', '✅ Simulé'],
      ['eAttest', 'Attestation de soins électronique', '✅ Simulé'],
      ['eFact', 'Facturation tiers-payant', '✅ Simulé'],
      ['DMG', 'Gestion Dossier Médical Global', '✅ Implémenté'],
      ['Chapitre IV', 'Demandes médicaments spéciaux', '✅ Implémenté'],
      ['Tarification', 'Codes nomenclature INAMI', '✅ Implémenté']
    ]
  );

  addSubtitle('6.2 Workflow de facturation');
  addBulletList([
    'Sélection des actes via recherche nomenclature',
    'Calcul automatique des honoraires et remboursements',
    'Vérification assurabilité avant facturation',
    'Génération attestation papier ou électronique',
    'Suivi des paiements et relances',
    'Export comptable (CSV, format comptable)'
  ]);

  addSubtitle('6.3 Fonctionnalités avancées');
  addBulletList([
    'Facturation groupée (batch)',
    'Factures récurrentes',
    'Système de rappels automatiques',
    'Tableau de bord financier',
    'Statistiques par période/acte'
  ]);

  // ========== 7. MODULES eHEALTH ==========
  doc.addPage();
  y = 20;
  addTitle('7. Modules eHealth Obligatoires', 18);
  y += 5;

  addParagraph('FluxMed intègre tous les modules requis pour l\'homologation eHealth en Belgique:');

  addTable(
    ['Module', 'Description', 'Statut'],
    [
      ['SAM v2', 'Base de données médicaments belge', '✅ Implémenté'],
      ['Recip-e v4', 'Prescription électronique', '✅ Implémenté (simulé)'],
      ['MyCareNet', 'Facturation et assurabilité', '✅ Implémenté (simulé)'],
      ['Mult-eMediatt', 'Certificats d\'incapacité Medex', '✅ Implémenté (simulé)'],
      ['Consult RN', 'Consultation Registre National', '✅ Implémenté (simulé)'],
      ['eHealthConsent', 'Gestion consentements patient', '✅ Implémenté (simulé)'],
      ['Liens Thérapeutiques', 'Relations patient-médecin', '✅ Implémenté'],
      ['Coffres-forts (Hubs)', 'RSW, Vitalink, CoZo', '✅ Implémenté (simulé)'],
      ['eHealthBox', 'Messagerie sécurisée', '✅ Implémenté (simulé)']
    ]
  );

  addSubtitle('7.1 Coffres-forts régionaux');
  addParagraph('Accès aux données patient via les trois hubs régionaux belges:');
  addBulletList([
    'RSW (Réseau Santé Wallon) - Wallonie',
    'Vitalink - Flandre',
    'CoZo/Abrumet - Bruxelles',
    'Consultation SumEHR (résumé médical)',
    'Schéma de médication',
    'Données de vaccination (Vaccinnet+)'
  ]);

  addSubtitle('7.2 eHealthBox');
  addParagraph('Boîte aux lettres électronique sécurisée pour l\'échange de documents médicaux:');
  addBulletList([
    'Réception de rapports de spécialistes',
    'Résultats de laboratoire',
    'Lettres de sortie hospitalières',
    'Envoi de courriers médicaux',
    'Pièces jointes sécurisées'
  ]);

  addSubtitle('7.3 Annexe 82 / eForms');
  addParagraph('Formulaires électroniques pour demandes d\'imagerie médicale lourde (CT, IRM, PET, Scintigraphie) avec génération PDF conforme INAMI et export XML eForms.');

  // ========== 8. SÉCURITÉ ==========
  doc.addPage();
  y = 20;
  addTitle('8. Sécurité et Conformité RGPD', 18);
  y += 5;

  addSubtitle('8.1 Authentification');
  addBulletList([
    'Connexion sécurisée (email/mot de passe)',
    'Support itsme® (en développement)',
    'Authentification à deux facteurs (TOTP)',
    'Gestion des sessions',
    'Déconnexion automatique après inactivité'
  ]);

  addSubtitle('8.2 Gestion des accès (RBAC)');
  addParagraph('Système de contrôle d\'accès basé sur les rôles:');
  addTable(
    ['Rôle', 'Droits'],
    [
      ['Médecin (admin)', 'Accès complet: patients, consultations, prescriptions, facturation, paramètres'],
      ['Secrétaire (user)', 'Agenda, données administratives patients, facturation (selon délégation)'],
      ['Délégation eHealth', 'Accès HUB via délégation du médecin']
    ]
  );

  addSubtitle('8.3 Conformité RGPD');
  addBulletList([
    'Consentement patient explicite et daté',
    'Droit d\'accès aux données',
    'Droit de rectification',
    'Droit à l\'effacement (avec contraintes légales)',
    'Portabilité des données (export)',
    'Registre des traitements',
    'Journalisation des accès (audit trail)'
  ]);

  addSubtitle('8.4 Audit et traçabilité');
  addParagraph('Toutes les actions sensibles sont enregistrées dans un journal d\'audit immuable:');
  addBulletList([
    'Connexions/déconnexions',
    'Accès aux dossiers patients',
    'Modifications de données',
    'Prescriptions créées/envoyées',
    'Facturations',
    'Accès aux données eHealth (HUB, Recip-e, MyCareNet)'
  ]);

  // ========== 9. FONCTIONNALITÉS AVANCÉES ==========
  doc.addPage();
  y = 20;
  addTitle('9. Fonctionnalités Avancées', 18);
  y += 5;

  addSubtitle('9.1 Assistant Médical IA');
  addParagraph('Agent conversationnel intelligent pour assistance au médecin:');
  addBulletList([
    'Aide à la rédaction de notes cliniques',
    'Suggestions de diagnostic différentiel',
    'Rappels de protocoles de soins',
    'Recherche d\'informations médicales'
  ]);

  addSubtitle('9.2 Téléconsultation');
  addBulletList([
    'Visioconférence intégrée',
    'Partage d\'écran et documents',
    'Chat sécurisé',
    'Enregistrement des sessions (avec consentement)'
  ]);

  addSubtitle('9.3 Messagerie interne');
  addParagraph('Système de messagerie sécurisée entre professionnels du cabinet:');
  addBulletList([
    'Discussions directes ou en groupe',
    'Discussions liées à un patient',
    'Mentions (@utilisateur)',
    'Pièces jointes',
    'Notifications temps réel'
  ]);

  addSubtitle('9.4 Statistiques et rapports');
  addBulletList([
    'Tableau de bord analytique',
    'Statistiques d\'activité (consultations, prescriptions)',
    'Rapports financiers',
    'Actes les plus fréquents',
    'Export des données'
  ]);

  addSubtitle('9.5 Import/Export');
  addBulletList([
    'Import fichiers PMF/SMF/KMEHR',
    'Matching et fusion de patients',
    'Export données patient (portabilité)',
    'Export comptable'
  ]);

  // ========== 10. GUIDE UTILISATEUR ==========
  doc.addPage();
  y = 20;
  addTitle('10. Guide Utilisateur Rapide', 18);
  y += 5;

  addSubtitle('10.1 Raccourcis clavier');
  addTable(
    ['Raccourci', 'Action'],
    [
      ['Ctrl+K', 'Palette de commandes'],
      ['Alt+E', 'Lire carte eID'],
      ['Alt+F', 'Nouvelle facturation'],
      ['Alt+P', 'Nouvelle prescription'],
      ['Alt+V', 'Nouvelle vaccination']
    ]
  );

  addSubtitle('10.2 Navigation principale');
  addBulletList([
    'Dashboard: Vue d\'ensemble, RDV du jour, patients récents',
    'Patients: Liste et dossiers patients',
    'Agenda: Gestion des rendez-vous',
    'Facturation: Factures et suivi financier',
    'Inbox: Messages eHealthBox',
    'Modules eHealth: Accès aux services eHealth',
    'Profil: Paramètres médecin et cabinet'
  ]);

  addSubtitle('10.3 Support');
  addParagraph('Pour toute question ou assistance:');
  addBulletList([
    'Documentation en ligne: aide intégrée à l\'application',
    'Support technique: via le menu Aide',
    'Formation: sessions disponibles sur demande'
  ]);

  // ========== PIED DE PAGE FINAL ==========
  doc.addPage();
  y = pageHeight / 2 - 30;
  
  doc.setFillColor(30, 64, 175);
  doc.rect(0, y - 20, pageWidth, 80, 'F');
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FluxMed', pageWidth / 2, y, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Dossier Médical Informatisé', pageWidth / 2, y + 15, { align: 'center' });
  doc.text('Conforme eHealth Belgique', pageWidth / 2, y + 27, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Document généré le ${new Date().toLocaleString('fr-BE')}`, pageWidth / 2, y + 60, { align: 'center' });

  // Numérotation des pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i - 1} / ${totalPages - 1}`, pageWidth - 25, pageHeight - 10);
    doc.text('FluxMed - Documentation', 15, pageHeight - 10);
  }

  return doc;
}

export function downloadFluxMedDocumentation() {
  const doc = generateFluxMedDocumentation();
  doc.save('FluxMed_Documentation_Complete.pdf');
}