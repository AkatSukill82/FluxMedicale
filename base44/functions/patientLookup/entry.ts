import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Recherche d'un patient par NISS, côté serveur.
 *
 * Le client faisait auparavant `Patient.list()` puis filtrait en mémoire. Comme
 * `list()` est paginé, la recherche ne portait que sur la première page : passé
 * quelques centaines de patients, la lecture eID ne retrouvait plus un patient
 * pourtant présent et en créait un doublon. Le défaut est silencieux et
 * s'aggrave à mesure que la patientèle grandit.
 *
 * La requête s'exécute avec l'identité de l'appelant (et non en service role) :
 * la RLS de Patient continue de s'appliquer.
 */

const SSIN_SYSTEM = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';
const PAGE_SIZE = 500;
const MAX_PAGES = 40; // plafond de sécurité : 20 000 patients

/** Ne garde que les chiffres : le NISS circule en 85.01.15-123.45 ou brut. */
function normalizeNiss(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/** Contrôle de validité du NISS belge (modulo 97, avec bascule après 2000). */
function isValidNiss(niss: string): boolean {
  if (!/^\d{11}$/.test(niss)) return false;
  const base = Number(niss.slice(0, 9));
  const check = Number(niss.slice(9, 11));
  return (97 - (base % 97)) === check
    || (97 - ((2_000_000_000 + base) % 97)) === check;
}

function matchesNiss(patient: Record<string, any>, niss: string): boolean {
  return (patient.identifier || []).some(
    (id: Record<string, string>) =>
      id?.system === SSIN_SYSTEM && normalizeNiss(id.value) === niss,
  );
}

/**
 * Vue minimale : la fiche complète n'a pas à transiter pour une recherche.
 * Se limite à ce dont l'appelant a besoin — ouvrir le dossier, ou départager
 * des doublons dans DuplicateResolutionDialog.
 */
function summarize(patient: Record<string, any>) {
  return {
    id: patient.id,
    name: patient.name,
    birthDate: patient.birthDate,
    gender: patient.gender,
    identifier: patient.identifier,
    created_date: patient.created_date,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { action, niss } = await req.json();

    if (action !== 'by_niss') {
      return Response.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    const normalized = normalizeNiss(niss);
    if (!isValidNiss(normalized)) {
      return Response.json({ error: 'NISS invalide' }, { status: 400 });
    }

    // Chemin rapide : filtre indexé sur le champ imbriqué.
    try {
      const direct = await base44.entities.Patient.filter({
        'identifier.value': normalized,
      });
      const confirmed = (direct || []).filter((p) => matchesNiss(p, normalized));
      if (confirmed.length > 0) {
        return Response.json({
          matches: confirmed.map(summarize),
          total: confirmed.length,
          strategy: 'indexed',
        });
      }
    } catch {
      // La notation pointée n'est pas exploitable : on bascule sur le balayage.
    }

    // Repli : balayage paginé côté serveur. Le NISS peut être stocké formaté,
    // auquel cas l'égalité stricte du filtre indexé ne suffit pas.
    const matches: Array<Record<string, any>> = [];
    let scanned = 0;
    let truncated = false;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const batch = await base44.entities.Patient.list(
        'created_date',
        PAGE_SIZE,
        page * PAGE_SIZE,
      );
      if (!batch || batch.length === 0) break;

      scanned += batch.length;
      matches.push(...batch.filter((p) => matchesNiss(p, normalized)));

      if (batch.length < PAGE_SIZE) break;
      if (page === MAX_PAGES - 1) truncated = true;
    }

    return Response.json({
      matches: matches.map(summarize),
      total: matches.length,
      strategy: 'scan',
      scanned,
      // Signale au client que la recherche n'a PAS été exhaustive : ne jamais
      // conclure « patient inexistant » et créer un doublon sur cette base.
      truncated,
    });
  } catch (error) {
    console.error('patientLookup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
