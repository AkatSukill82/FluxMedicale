/**
 * Registre de l'état réel des intégrations externes.
 *
 * Une grande partie des connecteurs belges est simulée : l'interface annonce
 * « envoyé », « transmis » ou « vérifié » alors que rien n'a quitté le poste.
 * Sur une prescription électronique ou un certificat Medex, cette différence
 * compte — un médecin peut croire qu'une ordonnance est arrivée à la pharmacie.
 *
 * Ce fichier est la source de vérité. Toute surface qui déclenche un échange
 * avec un service externe doit afficher <IntegrationStatusBanner service="…" />.
 *
 * Faire passer une intégration en LIVE se fait ICI, une fois le connecteur
 * réellement câblé — jamais en retirant la bannière côté écran.
 */

export const STATUS = {
  /** Aucun échange réel. Les réponses sont fabriquées localement. */
  SIMULATED: 'SIMULATED',
  /** Appel réel, mais avec repli sur des données internes en cas d'échec. */
  PARTIAL: 'PARTIAL',
  /** Connecteur réel, sans données fabriquées. */
  LIVE: 'LIVE',
};

/**
 * @property {string} label      Nom affiché
 * @property {string} status     Voir STATUS
 * @property {string} impact     Ce que l'utilisateur pourrait croire à tort
 * @property {string} remaining  Ce qu'il reste à faire pour passer en LIVE
 */
export const INTEGRATIONS = {
  recipE: {
    label: 'RecipE — prescription électronique',
    status: STATUS.SIMULATED,
    impact: "L'ordonnance n'est pas transmise au serveur RecipE. Elle n'est "
      + 'récupérable par aucune pharmacie ; seul le papier fait foi.',
    remaining: 'Webservice wsPrescriberService via backend, avec certificat eHealth.',
  },
  ehealthBox: {
    label: 'eHealthBox — messagerie sécurisée',
    status: STATUS.SIMULATED,
    impact: "Les documents marqués « envoyés » n'ont pas quitté l'application.",
    remaining: 'API eHealthBox (publication + consultation), certificat eHealth.',
  },
  medex: {
    label: 'Medex / eMediAtt — certificats d\'incapacité',
    status: STATUS.SIMULATED,
    impact: "Le certificat n'est pas transmis au Medex ; le statut affiché est fabriqué.",
    remaining: 'Envoi via eHealthBox puis interrogation du statut Medex.',
  },
  myCareNet: {
    label: 'MyCareNet — facturation et assurabilité',
    status: STATUS.SIMULATED,
    impact: "Les lots de facturation ne partent pas vers les mutuelles. "
      + "L'assurabilité affichée n'est pas vérifiée auprès de l'OA.",
    remaining: 'Connecteur SOAP MyCareNet (eAttest, eFact, ConsultInsurability).',
  },
  chapterIV: {
    label: 'MyCareNet — Chapitre IV',
    status: STATUS.SIMULATED,
    impact: "La demande d'autorisation n'atteint pas le médecin-conseil ; "
      + 'la référence affichée est générée localement.',
    remaining: 'MyCareNet AskAgreement / ConsultAgreement.',
  },
  consultRN: {
    label: 'ConsultRN — registre national',
    status: STATUS.SIMULATED,
    impact: "L'identité affichée ne provient pas du Registre national.",
    remaining: 'Service ConsultRN eHealth, certificat requis.',
  },
  idSupport: {
    label: 'IdSupport — vérification d\'identité',
    status: STATUS.SIMULATED,
    impact: "La correspondance NISS / identité n'est pas vérifiée officiellement.",
    remaining: 'Service IdSupport eHealth.',
  },
  hub: {
    label: 'Hub / Metahub — partage régional',
    status: STATUS.SIMULATED,
    impact: "Aucun document externe n'est réellement récupéré ni publié.",
    remaining: 'Connexion au hub régional avec certificat eHealth.',
  },
  smp: {
    label: 'SMP — dossier pharmaceutique partagé',
    status: STATUS.SIMULATED,
    impact: 'Le schéma de médication affiché est local, pas partagé.',
    remaining: 'Appel HUB avec certificat eHealth.',
  },
  vidis: {
    label: 'VIDIS — schéma de médication',
    status: STATUS.SIMULATED,
    impact: "Les données ne proviennent pas de VIDIS et n'y sont pas écrites.",
    remaining: 'API VIDIS (lecture et écriture).',
  },
  mediPrima: {
    label: 'MediPrima — aide médicale CPAS',
    status: STATUS.SIMULATED,
    impact: "La prise en charge CPAS n'est pas vérifiée.",
    remaining: 'Connecteur MediPrima.',
  },
  dmg: {
    label: 'DMG — dossier médical global',
    status: STATUS.SIMULATED,
    impact: "L'ouverture ou le transfert de DMG n'est pas déclaré à la mutuelle.",
    remaining: 'MyCareNet, flux DMG.',
  },
  vaccinnet: {
    label: 'Vaccinnet',
    status: STATUS.SIMULATED,
    impact: "Les vaccins ne sont pas déclarés au registre régional.",
    remaining: 'API Vaccinnet+ régionale.',
  },
  ehealthConsent: {
    label: 'Consentement eHealth / liens thérapeutiques',
    status: STATUS.SIMULATED,
    impact: 'Le consentement affiché ne reflète pas le registre eHealth.',
    remaining: 'Service Consent eHealth.',
  },
  itsme: {
    label: 'itsme® — authentification et signature',
    status: STATUS.SIMULATED,
    impact: "Aucune authentification ni signature légale n'a lieu.",
    remaining: 'OIDC itsme, contrat partenaire.',
  },
  sam: {
    label: 'SAM — référentiel des médicaments',
    status: STATUS.PARTIAL,
    impact: "En cas d'indisponibilité, un jeu de données interne prend le relais. "
      + "Ses codes CNK ne sont pas opposables et l'écran le signale.",
    remaining: 'Confirmer le point de terminaison SAM v2 et retirer le repli.',
  },
  googleCalendar: {
    label: 'Google Calendar',
    status: STATUS.LIVE,
    impact: '',
    remaining: '',
  },
};

export function getIntegration(key) {
  return INTEGRATIONS[key] || null;
}

export function isSimulated(key) {
  return INTEGRATIONS[key]?.status === STATUS.SIMULATED;
}

/** Vue d'ensemble, pour la page Health. */
export function integrationSummary() {
  const entries = Object.entries(INTEGRATIONS);
  const count = (status) => entries.filter(([, v]) => v.status === status).length;
  return {
    total: entries.length,
    simulated: count(STATUS.SIMULATED),
    partial: count(STATUS.PARTIAL),
    live: count(STATUS.LIVE),
    entries: entries.map(([key, value]) => ({ key, ...value })),
  };
}
