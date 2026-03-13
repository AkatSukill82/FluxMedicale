/**
 * Dictionnaire des codes d'erreur OA (Organisme Assureur) / Mutualité
 * pour eFact, eAttest et MyCareNet.
 * 
 * Sources: INAMI, MyCareNet, MC, Medispring, retours terrain.
 * 
 * Chaque entrée contient:
 * - label: résumé court de l'erreur
 * - explanation: ce que ça veut dire en langage simple pour le médecin
 * - action: ce que le médecin doit faire concrètement pour corriger
 * - severity: 'blocking' (bloque tout le lot), 'rejection' (rejette cette facture), 'warning' (info, pas de perte)
 * - category: catégorie de l'erreur pour le regroupement
 */

const OA_ERROR_CODES = {
  // ========================
  // ERREURS D'IDENTIFICATION PRESTATAIRE (10xxxx)
  // ========================
  '101420': {
    label: 'N° INAMI inconnu',
    explanation: 'La mutualité ne reconnaît pas votre numéro INAMI dans ses fichiers. Cela arrive souvent pour les jeunes médecins récemment inscrits ou si le numéro est mal encodé dans votre logiciel.',
    action: 'Vérifiez votre numéro INAMI dans vos paramètres de profil. Si vous êtes un nouveau médecin, contactez la mutualité pour vous faire enregistrer.',
    severity: 'blocking',
    category: 'identification'
  },
  '102311': {
    label: 'Mois facturé incohérent',
    explanation: 'Votre envoi contient des factures de mois différents non consécutifs (ex: janvier et avril dans le même lot). La mutualité n\'accepte que des envois groupés par mois.',
    action: 'Envoyez vos factures mois par mois. Si le lot mélange des mois, faites 2 envois séparés (un par mois).',
    severity: 'blocking',
    category: 'technique'
  },
  '103602': {
    label: 'IBAN invalide',
    explanation: 'Le numéro de compte bancaire (IBAN) dans la facture contient une erreur dans les chiffres de contrôle. Le remboursement ne peut pas être effectué.',
    action: 'Corrigez votre numéro IBAN dans vos paramètres de profil, puis renvoyez la facture.',
    severity: 'blocking',
    category: 'identification'
  },
  '103605': {
    label: 'Compte bancaire invalide',
    explanation: 'Le numéro de compte bancaire dans la facture est erroné.',
    action: 'Vérifiez et corrigez votre numéro de compte bancaire (IBAN) dans vos paramètres, puis renvoyez.',
    severity: 'blocking',
    category: 'identification'
  },
  '103620': {
    label: 'Compte bancaire non déclaré à la mutualité',
    explanation: 'Votre numéro de compte bancaire n\'est pas enregistré auprès de cette mutualité. Ils ne savent pas où virer le remboursement.',
    action: 'Contactez la mutualité pour déclarer votre numéro de compte bancaire sur lequel vous souhaitez recevoir les remboursements.',
    severity: 'blocking',
    category: 'identification'
  },

  // ========================
  // ERREURS PATIENT / ASSURABILITÉ (20xxxx)
  // ========================
  '200110': {
    label: 'Patient inconnu',
    explanation: 'Le numéro NISS (registre national) du patient n\'est pas reconnu par la mutualité. Le patient n\'est peut-être pas affilié à cette mutualité, ou le numéro NISS est mal encodé.',
    action: 'Vérifiez le numéro NISS du patient. Faites une vérification MDA (Member Data) pour vérifier son assurabilité et sa mutualité actuelle.',
    severity: 'rejection',
    category: 'patient'
  },
  '200120': {
    label: 'Patient non en ordre de mutuelle',
    explanation: 'Le patient n\'est pas en ordre de cotisation auprès de sa mutualité à la date de la prestation. Il n\'a pas droit au remboursement.',
    action: 'Informez le patient qu\'il doit régulariser sa situation auprès de sa mutualité. Une fois en ordre, vous pourrez renvoyer la facture.',
    severity: 'rejection',
    category: 'patient'
  },
  '200130': {
    label: 'Patient décédé',
    explanation: 'Le patient est enregistré comme décédé dans les fichiers de la mutualité à la date de la prestation facturée.',
    action: 'Vérifiez la date de la prestation par rapport à la date de décès. Si la prestation a eu lieu avant le décès, contactez la mutualité.',
    severity: 'rejection',
    category: 'patient'
  },
  '201510': {
    label: 'N° d\'hôpital manquant',
    explanation: 'Le patient était hospitalisé à la date de la prestation, et le numéro INAMI de l\'hôpital n\'est pas mentionné dans la facture. La mutualité ne peut pas traiter la facture sans cette info.',
    action: 'Vérifiez si le patient était hospitalisé (via MDA hospitalisation). Si oui, ajoutez le n° INAMI de l\'hôpital et le code de service, puis renvoyez.',
    severity: 'rejection',
    category: 'patient'
  },
  '202703': {
    label: 'Catégorie patient (CT1-CT2) invalide',
    explanation: 'Le statut d\'assuré du patient (catégorie CT1/CT2) a changé depuis votre dernière vérification. Les données envoyées ne correspondent plus à ce que la mutualité a dans ses fichiers.',
    action: '1. Faites une nouvelle vérification MDA à la date de la prestation\n2. Recréez la facture avec les bonnes catégories CT1/CT2\n3. Renvoyez la facture corrigée',
    severity: 'rejection',
    category: 'patient'
  },
  '202710': {
    label: 'Combinaison CT1-CT2 non autorisée',
    explanation: 'La combinaison des catégories d\'assurabilité du patient (CT1 et CT2) n\'est pas valide. Le patient a probablement changé de statut (ex: BIM, omnio, etc.).',
    action: '1. Faites une vérification MDA à la date exacte de la prestation\n2. Mettez à jour les catégories CT1/CT2 du patient\n3. Recréez et renvoyez la facture',
    severity: 'rejection',
    category: 'patient'
  },
  '203420': {
    label: 'N° d\'envoi précédent inconnu',
    explanation: 'Le numéro de référence de votre envoi précédent n\'est pas reconnu par la mutualité. C\'est souvent un problème technique lié au logiciel.',
    action: 'Renvoyez simplement le lot tel quel, sans modification. Si l\'erreur persiste, contactez le support technique.',
    severity: 'blocking',
    category: 'technique'
  },
  '204710': {
    label: 'Date de facture dans le futur',
    explanation: 'La date de facturation est postérieure à la date du jour. Vous ne pouvez pas facturer dans le futur.',
    action: 'Corrigez la date de la facture pour qu\'elle corresponde à la date réelle de la prestation.',
    severity: 'rejection',
    category: 'technique'
  },

  // ========================
  // ERREURS DE NOMENCLATURE / PRESTATIONS (50xxxx)
  // ========================
  '500130': {
    label: 'Prestation refusée — motif dans un courrier séparé',
    explanation: 'La mutualité a refusé cette prestation mais les détails du refus seront envoyés dans un courrier séparé ou un message dans le fichier de décompte.',
    action: 'Attendez le courrier ou le message du médecin-conseil de la mutualité. Le motif précis y sera expliqué.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '500403': {
    label: 'Code nomenclature non autorisé pour votre spécialité',
    explanation: 'Vous avez facturé un code nomenclature que votre profil de prestataire ne peut pas attester. Par exemple, un code réservé aux spécialistes attesté par un généraliste.',
    action: 'Vérifiez que le code nomenclature correspond à votre qualification. Si vous êtes certain d\'y avoir droit, contactez la mutualité pour clarification.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '500423': {
    label: 'Prestation déjà facturée',
    explanation: 'Cette prestation a déjà été envoyée et payée. C\'est probablement un doublon (envoi accidentel deux fois).',
    action: 'Vérifiez vos factures envoyées. S\'il s\'agit bien d\'un doublon, archivez simplement cette facture. Pas de perte financière.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '500433': {
    label: 'Code DMG non autorisé en eFact',
    explanation: 'Les codes liés au Dossier Médical Global (DMG) ne peuvent pas être facturés via eFact. Il existe un service dédié pour cela.',
    action: 'Utilisez le service eDMG pour les codes DMG, pas eFact. Archivez cette facture.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '500434': {
    label: 'En attente du médecin-conseil',
    explanation: 'La prestation est mise en attente car elle nécessite l\'accord du médecin-conseil de la mutualité. Ce n\'est PAS un refus — c\'est normal pour certaines prestations.',
    action: 'Aucune action nécessaire. Si le médecin-conseil donne son accord, un paiement complémentaire suivra automatiquement. Cette erreur ne compte pas comme rejet.',
    severity: 'warning',
    category: 'nomenclature'
  },
  '500444': {
    label: 'Prestation non cumulable',
    explanation: 'Le code nomenclature que vous avez facturé ne peut pas être cumulé avec un autre code déjà facturé le même jour pour ce patient. Les règles INAMI interdisent cette combinaison.',
    action: 'Vérifiez les règles de cumul pour ce code. Vous devez choisir l\'un des deux codes. Annulez le code en trop et renvoyez avec le bon code.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '501540': {
    label: 'Prestataire non habilité pour cette prestation',
    explanation: 'Votre profil de prestataire n\'est pas autorisé à facturer ce code. Souvent, il existe plusieurs versions d\'un même acte (ambulatoire vs hospitalier, généraliste vs spécialiste).',
    action: 'Vérifiez que vous utilisez le bon code nomenclature pour votre situation (ambulatoire vs hospitalier). Corrigez le code et renvoyez.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '502255': {
    label: 'Nombre maximum d\'unités dépassé',
    explanation: 'Vous avez dépassé le nombre maximum d\'unités autorisées par la réglementation pour cette prestation (par jour, par an, etc.).',
    action: 'Vérifiez le nombre maximum autorisé pour ce code. Réduisez la quantité au maximum autorisé et renvoyez.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '500450': {
    label: 'Fréquence maximale dépassée',
    explanation: 'Le nombre maximum de cette prestation a été atteint pour la période autorisée (ex: maximum 1 consultation par jour, ou maximum X par an).',
    action: 'Vérifiez combien de fois ce code a déjà été facturé pour ce patient dans la période. La prestation en trop sera refusée.',
    severity: 'rejection',
    category: 'nomenclature'
  },
  '500460': {
    label: 'Prestation hors période de validité',
    explanation: 'Le code nomenclature que vous avez utilisé n\'est plus valide à la date de la prestation. Il a peut-être été remplacé par un nouveau code.',
    action: 'Vérifiez la date de validité du code nomenclature. Utilisez le code actualisé qui remplace l\'ancien et renvoyez.',
    severity: 'rejection',
    category: 'nomenclature'
  },

  // ========================
  // ERREURS CHAPITRE IV / ACCORD (50xxxx)
  // ========================
  '500510': {
    label: 'Pas d\'accord Chapitre IV',
    explanation: 'Le médicament facturé nécessite un accord Chapitre IV, mais aucun accord valide n\'a été trouvé pour ce patient à la date de la prestation.',
    action: 'Vérifiez si une demande Chapitre IV a été faite pour ce patient. Si oui, vérifiez sa période de validité. Si non, introduisez une demande via le module Chapitre IV.',
    severity: 'rejection',
    category: 'chapitre4'
  },
  '500520': {
    label: 'Accord Chapitre IV expiré',
    explanation: 'L\'accord Chapitre IV pour ce médicament a expiré. Le patient avait un accord mais celui-ci n\'est plus valide à la date de la prestation.',
    action: 'Faites une demande de prolongation/renouvellement Chapitre IV pour ce patient via le module dédié, puis renvoyez la facture une fois l\'accord obtenu.',
    severity: 'rejection',
    category: 'chapitre4'
  },

  // ========================
  // ERREURS TIERS PAYANT / MONTANT (50xxxx - 60xxxx)
  // ========================
  '500610': {
    label: 'Montant incorrect',
    explanation: 'Le montant facturé ne correspond pas au tarif INAMI en vigueur pour ce code nomenclature à la date de la prestation.',
    action: 'Vérifiez le tarif officiel INAMI pour ce code à la date de la prestation. Corrigez le montant et renvoyez.',
    severity: 'rejection',
    category: 'montant'
  },
  '500620': {
    label: 'Part patient incorrecte',
    explanation: 'Le montant du ticket modérateur (part patient) n\'est pas correct par rapport au statut du patient (BIM, omnio, etc.) ou au tarif conventionné.',
    action: 'Revérifiez l\'assurabilité du patient (MDA). Ajustez la part patient en fonction de son statut BIM/non-BIM et renvoyez.',
    severity: 'rejection',
    category: 'montant'
  },
  '600110': {
    label: 'Supplément non autorisé',
    explanation: 'Vous avez facturé un supplément d\'honoraire qui n\'est pas autorisé. Cela arrive si vous êtes conventionné et facturez un supplément, ou si le patient a un statut BIM.',
    action: 'Vérifiez votre statut de conventionnement et le statut BIM du patient. Les suppléments sont interdits pour les patients BIM. Corrigez et renvoyez.',
    severity: 'rejection',
    category: 'montant'
  },

  // ========================
  // ERREURS DMG (70xxxx)
  // ========================
  '700110': {
    label: 'DMG non ouvert',
    explanation: 'Cette prestation donne droit à un supplément DMG, mais le patient n\'a pas de DMG ouvert chez vous dans les fichiers de la mutualité.',
    action: 'Vérifiez via eDMG si le DMG est bien ouvert chez vous. Si ce n\'est pas le cas, ouvrez-le d\'abord via eDMG. Le supplément sera ajouté automatiquement après.',
    severity: 'warning',
    category: 'dmg'
  },
  '700120': {
    label: 'DMG ouvert chez un autre médecin',
    explanation: 'Le DMG du patient est ouvert chez un autre médecin. Vous ne pouvez pas facturer le supplément DMG.',
    action: 'Si le patient souhaite transférer son DMG chez vous, effectuez la procédure de transfert DMG via eDMG.',
    severity: 'warning',
    category: 'dmg'
  },

  // ========================
  // ERREURS TECHNIQUES / FICHIER
  // ========================
  '175': {
    label: 'Code frais de déplacement incorrect',
    explanation: 'Le code pour les frais de déplacement (109955) nécessite que le nombre de kilomètres aller-retour soit correctement indiqué.',
    action: 'Vérifiez que le nombre d\'unités correspond bien au nombre de kilomètres aller-retour de votre déplacement. Corrigez et renvoyez.',
    severity: 'rejection',
    category: 'technique'
  },
  '300110': {
    label: 'Erreur de format du fichier',
    explanation: 'Le fichier de facturation contient une erreur de format. C\'est un problème technique, pas une erreur médicale.',
    action: 'Ce problème est lié au logiciel. Essayez de regénérer le fichier et de le renvoyer. Si ça persiste, contactez le support technique.',
    severity: 'blocking',
    category: 'technique'
  },
  '300120': {
    label: 'Version du fichier non supportée',
    explanation: 'Le format de fichier utilisé pour l\'envoi n\'est pas (plus) accepté par la mutualité.',
    action: 'Problème technique — contactez le support pour mettre à jour le format d\'envoi.',
    severity: 'blocking',
    category: 'technique'
  },
};

// Catégories pour affichage
export const ERROR_CATEGORIES = {
  identification: { label: 'Identification prestataire', icon: 'UserX', color: 'text-red-600' },
  patient: { label: 'Patient / Assurabilité', icon: 'Users', color: 'text-orange-600' },
  nomenclature: { label: 'Code nomenclature / Prestation', icon: 'FileText', color: 'text-blue-600' },
  chapitre4: { label: 'Chapitre IV / Accord', icon: 'Shield', color: 'text-purple-600' },
  montant: { label: 'Montant / Tarification', icon: 'DollarSign', color: 'text-green-600' },
  dmg: { label: 'DMG (Dossier Médical Global)', icon: 'FolderOpen', color: 'text-teal-600' },
  technique: { label: 'Technique / Format', icon: 'Settings', color: 'text-slate-600' },
};

export const SEVERITY_CONFIG = {
  blocking: { label: 'Bloquant', color: 'bg-red-100 text-red-800', description: 'Bloque tout le lot de facturation' },
  rejection: { label: 'Rejet', color: 'bg-orange-100 text-orange-800', description: 'Cette facture est refusée' },
  warning: { label: 'Info', color: 'bg-yellow-100 text-yellow-800', description: 'Information, pas de perte' },
};

/**
 * Recherche l'explication d'un code erreur OA.
 * Retourne le dictionnaire complet si trouvé, sinon un objet générique.
 */
export function getErrorExplanation(code) {
  const cleanCode = String(code || '').trim();
  
  if (OA_ERROR_CODES[cleanCode]) {
    return { ...OA_ERROR_CODES[cleanCode], code: cleanCode, found: true };
  }
  
  // Essayer de matcher par préfixe (les codes de la même famille commencent pareil)
  const prefix3 = cleanCode.substring(0, 3);
  const prefix4 = cleanCode.substring(0, 4);
  
  // Détection par famille de codes
  const familyMap = {
    '10': { category: 'identification', label: 'Erreur d\'identification prestataire' },
    '20': { category: 'patient', label: 'Erreur patient / assurabilité' },
    '30': { category: 'technique', label: 'Erreur technique / format fichier' },
    '50': { category: 'nomenclature', label: 'Erreur nomenclature / prestation' },
    '60': { category: 'montant', label: 'Erreur montant / tarification' },
    '70': { category: 'dmg', label: 'Erreur DMG' },
  };
  
  const family = familyMap[cleanCode.substring(0, 2)];
  
  return {
    code: cleanCode,
    found: false,
    label: family?.label || 'Erreur mutualité',
    explanation: 'Ce code erreur n\'est pas encore dans notre base de données. Consultez le libellé de l\'erreur renvoyé par la mutualité pour comprendre le problème.',
    action: 'Contactez votre mutualité avec ce code erreur pour obtenir une explication détaillée. Vous trouverez les contacts sur fra.mycarenet.be.',
    severity: 'rejection',
    category: family?.category || 'technique',
  };
}

/**
 * Parse un message d'erreur brut de la mutualité pour en extraire les codes.
 * Les messages peuvent contenir un ou plusieurs codes.
 */
export function parseErrorCodes(errorMessage) {
  if (!errorMessage) return [];
  const codeRegex = /\b(\d{3,6})\b/g;
  const matches = [...errorMessage.matchAll(codeRegex)];
  return [...new Set(matches.map(m => m[1]))];
}

export default OA_ERROR_CODES;