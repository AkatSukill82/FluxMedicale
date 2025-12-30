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
      doc.text(`- ${item}`, 20, y);
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
  doc.text('Dossier Medical Informatise', pageWidth / 2, 55, { align: 'center' });
  doc.text('Documentation Complete', pageWidth / 2, 65, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  y = 100;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Solution conforme aux exigences d\'homologation eHealth Belgique', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Version: 1.0', 15, y);
  doc.text('Date: ' + new Date().toLocaleDateString('fr-BE'), 15, y + 7);
  
  // ========== TABLE DES MATIERES ==========
  doc.addPage();
  y = 20;
  addTitle('Table des Matieres', 18);
  y += 10;

  const toc = [
    '1. Presentation Generale',
    '2. Gestion des Patients',
    '3. Agenda et Rendez-vous',
    '4. Consultations et Notes Cliniques',
    '5. Prescriptions Electroniques (Recip-e)',
    '6. Facturation et MyCareNet',
    '7. Modules eHealth Obligatoires',
    '8. Securite et Conformite RGPD',
    '9. Fonctionnalites Avancees',
    '10. Guide Utilisateur'
  ];
  
  doc.setFontSize(11);
  toc.forEach((item) => {
    doc.text(item, 20, y);
    y += 8;
  });

  // ========== 1. PRESENTATION GENERALE ==========
  doc.addPage();
  y = 20;
  addTitle('1. Presentation Generale', 18);
  y += 5;

  addParagraph('FluxMed est un Dossier Medical Informatise (DMI) complet concu pour les medecins generalistes et specialistes en Belgique. Il integre tous les services eHealth requis pour l\'homologation et offre une interface moderne et intuitive.');

  addSubtitle('Objectifs du logiciel');
  addBulletList([
    'Gestion complete des dossiers patients (FHIR compliant)',
    'Integration native avec les services eHealth belges',
    'Prescription electronique via Recip-e',
    'Facturation electronique via MyCareNet',
    'Conformite RGPD et securite des donnees',
    'Interface multilingue (FR/NL/EN)'
  ]);

  addSubtitle('Architecture technique');
  addBulletList([
    'Application web moderne (React, TypeScript)',
    'Backend securise avec authentification forte',
    'Base de donnees chiffree',
    'API RESTful pour integrations',
    'Hebergement conforme HDS'
  ]);

  // ========== 2. GESTION DES PATIENTS ==========
  doc.addPage();
  y = 20;
  addTitle('2. Gestion des Patients', 18);
  y += 5;

  addSubtitle('2.1 Creation de patient');
  addParagraph('Les patients peuvent etre crees manuellement ou automatiquement via la lecture de la carte eID belge. Le systeme detecte automatiquement les doublons potentiels bases sur le NISS.');

  addSubtitle('2.2 Donnees FHIR');
  addParagraph('Le modele de donnees patient est conforme au standard FHIR avec les extensions belges (be-fhir):');
  addBulletList([
    'Identifiants: NISS, numero mutuelle',
    'Nom officiel et nom d\'usage',
    'Coordonnees (telephone, email, adresse)',
    'Date de naissance et genre',
    'Informations d\'assurance (mutuelle)',
    'Antecedents medicaux',
    'Allergies et intolerances',
    'Medicaments actuels',
    'Consentement RGPD'
  ]);

  addSubtitle('2.3 Lecture carte eID');
  addParagraph('FluxMed supporte la lecture automatique des cartes d\'identite electroniques belges via le middleware eID officiel.');
  addBulletList([
    'Detection automatique du lecteur de carte',
    'Extraction des donnees d\'identite (nom, prenom, NISS, adresse, photo)',
    'Creation automatique ou ouverture du dossier existant',
    'Gestion des doublons avec interface de fusion',
    'Option d\'auto-ouverture a l\'insertion de la carte'
  ]);

  // ========== 3. AGENDA ==========
  doc.addPage();
  y = 20;
  addTitle('3. Agenda et Rendez-vous', 18);
  y += 5;

  addSubtitle('3.1 Gestion des rendez-vous');
  addBulletList([
    'Vue journaliere, hebdomadaire et mensuelle',
    'Creation rapide de rendez-vous avec recherche patient',
    'Types de consultation: standard, urgence, teleconsultation, vaccination',
    'Statuts: Planifie, Confirme, En cours, Termine, Annule',
    'Drag & drop pour reprogrammation',
    'Duree configurable par type de consultation'
  ]);

  addSubtitle('3.2 Gestion des disponibilites');
  addBulletList([
    'Definition des plages horaires par jour',
    'Creneaux recurrents (hebdomadaires)',
    'Gestion des indisponibilites (conges, formations)',
    'Multi-cabinets avec couleurs distinctes'
  ]);

  addSubtitle('3.3 Rappels automatiques');
  addParagraph('Systeme de rappels configurables pour les patients (SMS, email) avec delais personnalisables (24h, 48h, 1 semaine avant le RDV).');

  // ========== 4. CONSULTATIONS ==========
  doc.addPage();
  y = 20;
  addTitle('4. Consultations et Notes Cliniques', 18);
  y += 5;

  addSubtitle('4.1 Workflow de consultation');
  addParagraph('Le flux de consultation suit le modele SOAP (Subjectif, Objectif, Analyse, Plan):');
  addBulletList([
    'Motif de consultation',
    'Anamnese (histoire de la maladie)',
    'Examen clinique',
    'Diagnostic (codes ICD-10)',
    'Plan de traitement',
    'Prescriptions associees',
    'Documents et pieces jointes'
  ]);

  addSubtitle('4.2 Modeles de consultation');
  addParagraph('Bibliotheque de modeles predefinis et personnalisables:');
  addBulletList([
    'Consultation generale',
    'Suivi diabete',
    'Suivi hypertension',
    'Bilan annuel',
    'Certificat medical',
    'Modeles personnalises'
  ]);

  addSubtitle('4.3 Mesures et courbes de croissance');
  addBulletList([
    'Poids, taille, IMC',
    'Tension arterielle, frequence cardiaque',
    'Temperature',
    'Perimetre cranien (pediatrie)',
    'Courbes OMS pour le suivi pediatrique'
  ]);

  // ========== 5. PRESCRIPTIONS ==========
  doc.addPage();
  y = 20;
  addTitle('5. Prescriptions Electroniques (Recip-e)', 18);
  y += 5;

  addSubtitle('5.1 Integration Recip-e v4');
  addParagraph('FluxMed est entierement integre avec le systeme Recip-e pour la prescription electronique de medicaments en Belgique.');

  addTable(
    ['Fonctionnalite', 'Description', 'Statut'],
    [
      ['Creation prescription', 'Selection medicaments via SAM v2', 'Implemente'],
      ['Signature electronique', 'Signature avec certificat eHealth', 'Simule'],
      ['Envoi Recip-e', 'Transmission au serveur central', 'Simule'],
      ['Code RID/barcode', 'Generation code pour pharmacie', 'Implemente'],
      ['Suivi statut', 'Verification delivrance', 'Simule'],
      ['Annulation', 'Revocation prescription active', 'Simule'],
      ['Historique', 'Consultation prescriptions passees', 'Implemente'],
      ['Renouvellement', 'Gestion traitements chroniques', 'Implemente']
    ]
  );

  addSubtitle('5.2 Base de donnees medicaments (SAM v2)');
  addParagraph('Recherche de medicaments dans la base SAM v2 officielle avec:');
  addBulletList([
    'Recherche par nom commercial ou DCI',
    'Filtrage par forme galenique',
    'Informations de remboursement',
    'Posologies standards',
    'Interactions medicamenteuses (alertes)',
    'Alternatives generiques'
  ]);

  // ========== 6. FACTURATION ==========
  doc.addPage();
  y = 20;
  addTitle('6. Facturation et MyCareNet', 18);
  y += 5;

  addSubtitle('6.1 Services MyCareNet integres');
  addTable(
    ['Service', 'Description', 'Statut'],
    [
      ['Assurabilite (MemberData)', 'Verification droits patient en temps reel', 'Simule'],
      ['eAttest', 'Attestation de soins electronique', 'Simule'],
      ['eFact', 'Facturation tiers-payant', 'Simule'],
      ['DMG', 'Gestion Dossier Medical Global', 'Implemente'],
      ['Chapitre IV', 'Demandes medicaments speciaux', 'Implemente'],
      ['Tarification', 'Codes nomenclature INAMI', 'Implemente']
    ]
  );

  addSubtitle('6.2 Workflow de facturation');
  addBulletList([
    'Selection des actes via recherche nomenclature',
    'Calcul automatique des honoraires et remboursements',
    'Verification assurabilite avant facturation',
    'Generation attestation papier ou electronique',
    'Suivi des paiements et relances',
    'Export comptable (CSV, format comptable)'
  ]);

  addSubtitle('6.3 Fonctionnalites avancees');
  addBulletList([
    'Facturation groupee (batch)',
    'Factures recurrentes',
    'Systeme de rappels automatiques',
    'Tableau de bord financier',
    'Statistiques par periode/acte'
  ]);

  // ========== 7. MODULES eHEALTH ==========
  doc.addPage();
  y = 20;
  addTitle('7. Modules eHealth Obligatoires', 18);
  y += 5;

  addParagraph('FluxMed integre tous les modules requis pour l\'homologation eHealth en Belgique:');

  addTable(
    ['Module', 'Description', 'Statut'],
    [
      ['SAM v2', 'Base de donnees medicaments belge', 'Implemente'],
      ['Recip-e v4', 'Prescription electronique', 'Implemente (simule)'],
      ['MyCareNet', 'Facturation et assurabilite', 'Implemente (simule)'],
      ['Mult-eMediatt', 'Certificats d\'incapacite Medex', 'Implemente (simule)'],
      ['Consult RN', 'Consultation Registre National', 'Implemente (simule)'],
      ['eHealthConsent', 'Gestion consentements patient', 'Implemente (simule)'],
      ['Liens Therapeutiques', 'Relations patient-medecin', 'Implemente'],
      ['Coffres-forts (Hubs)', 'RSW, Vitalink, CoZo', 'Implemente (simule)'],
      ['eHealthBox', 'Messagerie securisee', 'Implemente (simule)']
    ]
  );

  addSubtitle('7.1 Coffres-forts regionaux');
  addParagraph('Acces aux donnees patient via les trois hubs regionaux belges:');
  addBulletList([
    'RSW (Reseau Sante Wallon) - Wallonie',
    'Vitalink - Flandre',
    'CoZo/Abrumet - Bruxelles',
    'Consultation SumEHR (resume medical)',
    'Schema de medication',
    'Donnees de vaccination (Vaccinnet+)'
  ]);

  addSubtitle('7.2 eHealthBox');
  addParagraph('Boite aux lettres electronique securisee pour l\'echange de documents medicaux:');
  addBulletList([
    'Reception de rapports de specialistes',
    'Resultats de laboratoire',
    'Lettres de sortie hospitalieres',
    'Envoi de courriers medicaux',
    'Pieces jointes securisees'
  ]);

  addSubtitle('7.3 Annexe 82 / eForms');
  addParagraph('Formulaires electroniques pour demandes d\'imagerie medicale lourde (CT, IRM, PET, Scintigraphie) avec generation PDF conforme INAMI et export XML eForms.');

  // ========== 8. SECURITE ==========
  doc.addPage();
  y = 20;
  addTitle('8. Securite et Conformite RGPD', 18);
  y += 5;

  addSubtitle('8.1 Authentification');
  addBulletList([
    'Connexion securisee (email/mot de passe)',
    'Support itsme (en developpement)',
    'Authentification a deux facteurs (TOTP)',
    'Gestion des sessions',
    'Deconnexion automatique apres inactivite'
  ]);

  addSubtitle('8.2 Gestion des acces (RBAC)');
  addParagraph('Systeme de controle d\'acces base sur les roles:');
  addTable(
    ['Role', 'Droits'],
    [
      ['Medecin (admin)', 'Acces complet: patients, consultations, prescriptions, facturation, parametres'],
      ['Secretaire (user)', 'Agenda, donnees administratives patients, facturation (selon delegation)'],
      ['Delegation eHealth', 'Acces HUB via delegation du medecin']
    ]
  );

  addSubtitle('8.3 Conformite RGPD');
  addBulletList([
    'Consentement patient explicite et date',
    'Droit d\'acces aux donnees',
    'Droit de rectification',
    'Droit a l\'effacement (avec contraintes legales)',
    'Portabilite des donnees (export)',
    'Registre des traitements',
    'Journalisation des acces (audit trail)'
  ]);

  addSubtitle('8.4 Audit et tracabilite');
  addParagraph('Toutes les actions sensibles sont enregistrees dans un journal d\'audit immuable:');
  addBulletList([
    'Connexions/deconnexions',
    'Acces aux dossiers patients',
    'Modifications de donnees',
    'Prescriptions creees/envoyees',
    'Facturations',
    'Acces aux donnees eHealth (HUB, Recip-e, MyCareNet)'
  ]);

  // ========== 9. FONCTIONNALITES AVANCEES ==========
  doc.addPage();
  y = 20;
  addTitle('9. Fonctionnalites Avancees', 18);
  y += 5;

  addSubtitle('9.1 Assistant Medical IA');
  addParagraph('Agent conversationnel intelligent pour assistance au medecin:');
  addBulletList([
    'Aide a la redaction de notes cliniques',
    'Suggestions de diagnostic differentiel',
    'Rappels de protocoles de soins',
    'Recherche d\'informations medicales'
  ]);

  addSubtitle('9.2 Teleconsultation');
  addBulletList([
    'Visioconference integree',
    'Partage d\'ecran et documents',
    'Chat securise',
    'Enregistrement des sessions (avec consentement)'
  ]);

  addSubtitle('9.3 Messagerie interne');
  addParagraph('Systeme de messagerie securisee entre professionnels du cabinet:');
  addBulletList([
    'Discussions directes ou en groupe',
    'Discussions liees a un patient',
    'Mentions (@utilisateur)',
    'Pieces jointes',
    'Notifications temps reel'
  ]);

  addSubtitle('9.4 Statistiques et rapports');
  addBulletList([
    'Tableau de bord analytique',
    'Statistiques d\'activite (consultations, prescriptions)',
    'Rapports financiers',
    'Actes les plus frequents',
    'Export des donnees'
  ]);

  addSubtitle('9.5 Import/Export');
  addBulletList([
    'Import fichiers PMF/SMF/KMEHR',
    'Matching et fusion de patients',
    'Export donnees patient (portabilite)',
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
    'Dashboard: Vue d\'ensemble, RDV du jour, patients recents',
    'Patients: Liste et dossiers patients',
    'Agenda: Gestion des rendez-vous',
    'Facturation: Factures et suivi financier',
    'Inbox: Messages eHealthBox',
    'Modules eHealth: Acces aux services eHealth',
    'Profil: Parametres medecin et cabinet'
  ]);

  addSubtitle('10.3 Support');
  addParagraph('Pour toute question ou assistance:');
  addBulletList([
    'Documentation en ligne: aide integree a l\'application',
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
  doc.text('Dossier Medical Informatise', pageWidth / 2, y + 15, { align: 'center' });
  doc.text('Conforme eHealth Belgique', pageWidth / 2, y + 27, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Document genere le ' + new Date().toLocaleString('fr-BE'), pageWidth / 2, y + 60, { align: 'center' });

  // Numerotation des pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Page ' + (i - 1) + ' / ' + (totalPages - 1), pageWidth - 25, pageHeight - 10);
    doc.text('FluxMed - Documentation', 15, pageHeight - 10);
  }

  return doc;
}

export function downloadFluxMedDocumentation() {
  const doc = generateFluxMedDocumentation();
  doc.save('FluxMed_Documentation_Complete.pdf');
}