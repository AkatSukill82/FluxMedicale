import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Écriture du journal d'audit, côté serveur.
 *
 * Le journal était auparavant écrit directement par le navigateur, via
 * `AuditLog.create()`. Trois conséquences :
 *  - l'identité, l'horodatage et l'adresse IP étaient fournis par le client,
 *    donc falsifiables (le champ ip_address contenait littéralement la chaîne
 *    'client-side') ;
 *  - la RLS autorisait l'utilisateur à modifier et supprimer ses propres
 *    traces ;
 *  - la journalisation était facultative : appeler l'API entité directement
 *    n'écrivait rien.
 *
 * Ici l'identité vient de la session vérifiée, l'horodatage de l'horloge
 * serveur, et l'IP des en-têtes de la requête. Les champs équivalents envoyés
 * par le client sont ignorés. L'écriture passe par `asServiceRole`, ce qui
 * permet de fermer la RLS en écriture pour tout le monde : plus personne ne
 * peut forger, modifier ou effacer une entrée depuis l'application.
 */

const MAX_ENTRIES_PER_CALL = 50;
const MAX_DETAILS_LENGTH = 4000;
const MAX_ACTION_LENGTH = 100;

function truncate(value: unknown, max: number): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > max ? `${str.slice(0, max)}…[tronqué]` : str;
}

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const entries = Array.isArray(body?.entries) ? body.entries : [body];

    if (entries.length === 0) {
      return Response.json({ written: 0 });
    }
    if (entries.length > MAX_ENTRIES_PER_CALL) {
      return Response.json(
        { error: `Maximum ${MAX_ENTRIES_PER_CALL} entrées par appel` },
        { status: 400 },
      );
    }

    // Contexte établi par le serveur — jamais repris de la charge utile.
    const timestamp = new Date().toISOString();
    const ip = clientIp(req);
    const userAgent = truncate(req.headers.get('user-agent'), 500);

    let written = 0;

    for (const entry of entries) {
      const action = truncate(entry?.action, MAX_ACTION_LENGTH);
      if (!action) continue;

      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action,
        target_entity: truncate(entry?.target_entity, 100),
        target_id: truncate(entry?.target_id, 200),
        details: truncate(entry?.details, MAX_DETAILS_LENGTH),
        timestamp,
      });
      written += 1;

      // Un accès rattaché à un patient alimente en plus le registre RGPD des
      // accès aux données de santé.
      if (entry?.patient_id) {
        await base44.asServiceRole.entities.DataAccessLog.create({
          user_email: user.email,
          patient_id: entry.patient_id,
          action: truncate(entry?.access_action, 50) || action,
          resource_type: truncate(entry?.resource_type, 100)
            || truncate(entry?.target_entity, 100),
          resource_id: truncate(entry?.resource_id, 200)
            || truncate(entry?.target_id, 200)
            || entry.patient_id,
          timestamp,
          justification: truncate(entry?.justification, 1000) || '',
          data_fields_accessed: Array.isArray(entry?.data_fields_accessed)
            ? entry.data_fields_accessed.slice(0, 100)
            : [],
          ip_address: ip,
          user_agent: userAgent,
          session_id: truncate(entry?.session_id, 100),
        });
      }
    }

    return Response.json({ written, timestamp });
  } catch (error) {
    console.error('auditLog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
