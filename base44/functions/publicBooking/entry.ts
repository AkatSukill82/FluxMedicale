import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Prise de rendez-vous depuis la page publique.
 *
 * Cet endpoint est le seul point d'entrée non authentifié de l'application et
 * il opère en `asServiceRole`, donc hors de toute RLS. Chaque garde ci-dessous
 * est la seule chose qui sépare un visiteur anonyme de la base de production.
 *
 * Configuration requise (variables d'environnement de la fonction) :
 *   PUBLIC_BOOKING_ALLOWED_ORIGINS  origines autorisées, séparées par des virgules
 *   TURNSTILE_SECRET_KEY            clé secrète Cloudflare Turnstile (captcha)
 *   BOOKING_IP_SALT                 sel pour le hachage des adresses IP
 *
 * En l'absence de TURNSTILE_SECRET_KEY la réservation est refusée : un endpoint
 * public sans anti-automatisation permet de saturer l'agenda du cabinet.
 */

const SLOT_MINUTES = 30;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const MAX_DAYS_AHEAD = 90;

// Limites anti-abus
const MAX_BOOKINGS_PER_IP_PER_HOUR = 5;
const MAX_BOOKINGS_PER_CONTACT_PER_DAY = 3;

const TYPES_CONSULTATION = [
  'Consultation',
  'Visite à domicile',
  'Téléconsultation',
  'Vaccination',
  'Certificat',
];

function allowedOrigins(): string[] {
  return (Deno.env.get('PUBLIC_BOOKING_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Pas de wildcard : l'origine n'est renvoyée que si elle est explicitement autorisée. */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(body: unknown, req: Request, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get('BOOKING_IP_SALT') || '';
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

async function verifyCaptcha(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret || !token) return false;

  try {
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (ip !== 'unknown') form.append('remoteip', ip);

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// --- Validation -------------------------------------------------------------

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const RE_PHONE = /^[+0-9][0-9\s./-]{7,19}$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RE_NAME = /^[\p{L}\p{M}\s'’-]{1,60}$/u;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isValidSlotStart(time: string): boolean {
  const mins = toMinutes(time);
  return mins >= DAY_START_HOUR * 60
    && mins < DAY_END_HOUR * 60
    && mins % SLOT_MINUTES === 0;
}

/** Renvoie un message d'erreur, ou null si l'entrée est valide. */
function validateBooking(data: Record<string, string>): string | null {
  const {
    date, heure_debut, type_consultation, motif,
    medecin_assigne, patient_nom, patient_prenom,
    patient_telephone, patient_email,
  } = data;

  if (!RE_DATE.test(date || '')) return 'Date invalide';
  if (!RE_TIME.test(heure_debut || '')) return 'Heure invalide';
  if (!isValidSlotStart(heure_debut)) return 'Créneau hors plage horaire';

  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return 'Date invalide';

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const maxDay = new Date(today);
  maxDay.setUTCDate(maxDay.getUTCDate() + MAX_DAYS_AHEAD);
  if (day < today) return 'Date dans le passé';
  if (day > maxDay) return `Réservation limitée à ${MAX_DAYS_AHEAD} jours`;

  if (!RE_NAME.test(patient_nom || '')) return 'Nom invalide';
  if (!RE_NAME.test(patient_prenom || '')) return 'Prénom invalide';
  if (!RE_PHONE.test(patient_telephone || '')) return 'Téléphone invalide';
  if (!RE_EMAIL.test(patient_email || '')) return 'Email invalide';

  if (type_consultation && !TYPES_CONSULTATION.includes(type_consultation)) {
    return 'Type de consultation invalide';
  }
  if (motif && String(motif).length > 300) return 'Motif trop long (300 caractères)';
  if (medecin_assigne && !RE_EMAIL.test(medecin_assigne)) return 'Médecin invalide';

  return null;
}

/** Deux créneaux se chevauchent-ils ? */
function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function bookedIntervals(appointments: Array<Record<string, string>>) {
  return appointments
    .filter((rdv) => rdv.heure_debut)
    .map((rdv) => {
      const start = toMinutes(rdv.heure_debut);
      const end = rdv.heure_fin ? toMinutes(rdv.heure_fin) : start + SLOT_MINUTES;
      return { start, end };
    });
}

// --- Handler ----------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, req, 405);
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, data } = body || {};

    const ip = clientIp(req);

    switch (action) {
      /**
       * Créneaux libres d'un médecin donné. Le médecin est obligatoire : sans
       * lui, les disponibilités seraient calculées tous praticiens confondus.
       *
       * Il n'existe volontairement pas d'action listant les médecins : la
       * page publique doit être configurée avec le praticien concerné. Exposer
       * l'annuaire des comptes reviendrait à publier les adresses e-mail de
       * connexion du cabinet.
       */
      case 'get_available_slots': {
        const { date, medecin_email } = data || {};

        if (!RE_DATE.test(date || '')) {
          return json({ error: 'Date invalide' }, req, 400);
        }
        if (!medecin_email || !RE_EMAIL.test(medecin_email)) {
          return json({ error: 'Médecin non spécifié' }, req, 400);
        }

        const existing = await base44.asServiceRole.entities.RendezVous.filter({
          date,
          medecin_assigne: medecin_email,
          statut: { $nin: ['Annulé'] },
        });

        const busy = bookedIntervals(existing);
        const slots = [];
        for (
          let mins = DAY_START_HOUR * 60;
          mins < DAY_END_HOUR * 60;
          mins += SLOT_MINUTES
        ) {
          const free = !busy.some((b) => overlaps(mins, mins + SLOT_MINUTES, b.start, b.end));
          if (free) slots.push({ time: toTime(mins), available: true });
        }

        return json({ slots }, req);
      }

      case 'book_appointment': {
        const payload = data || {};

        // 1. Anti-automatisation. Refus si le captcha n'est pas configuré :
        //    un endpoint public sans captcha permet de saturer l'agenda.
        if (!Deno.env.get('TURNSTILE_SECRET_KEY')) {
          return json({
            error: 'La réservation en ligne n\'est pas configurée. '
              + 'Contactez le cabinet par téléphone.',
          }, req, 503);
        }
        if (!await verifyCaptcha(payload.captcha_token, ip)) {
          return json({ error: 'Vérification anti-robot échouée' }, req, 403);
        }

        // 2. Validation stricte des entrées.
        const invalid = validateBooking(payload);
        if (invalid) return json({ error: invalid }, req, 400);

        const {
          date, heure_debut, type_consultation, motif, medecin_assigne,
          patient_nom, patient_prenom, patient_telephone, patient_email,
        } = payload;

        if (!medecin_assigne) {
          return json({ error: 'Médecin non spécifié' }, req, 400);
        }

        // 3. Limitation de débit.
        const ipHash = await hashIp(ip);
        const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
        const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();

        const recentFromIp = await base44.asServiceRole.entities.RendezVous.filter({
          booking_ip_hash: ipHash,
          created_date: { $gte: oneHourAgo },
        });
        if (recentFromIp.length >= MAX_BOOKINGS_PER_IP_PER_HOUR) {
          return json({ error: 'Trop de demandes. Réessayez plus tard.' }, req, 429);
        }

        const recentFromContact = await base44.asServiceRole.entities.RendezVous.filter({
          created_date: { $gte: oneDayAgo },
          $or: [
            { patient_email },
            { patient_telephone },
          ],
        });
        if (recentFromContact.length >= MAX_BOOKINGS_PER_CONTACT_PER_DAY) {
          return json({
            error: 'Limite de rendez-vous atteinte pour aujourd\'hui. '
              + 'Contactez le cabinet.',
          }, req, 429);
        }

        // 4. Disponibilité, par chevauchement réel et non par égalité d'horaire.
        const start = toMinutes(heure_debut);
        const end = start + SLOT_MINUTES;
        const heure_fin = toTime(end);

        const sameDay = await base44.asServiceRole.entities.RendezVous.filter({
          date,
          medecin_assigne,
          statut: { $nin: ['Annulé'] },
        });
        if (bookedIntervals(sameDay).some((b) => overlaps(start, end, b.start, b.end))) {
          return json({ error: 'Ce créneau n\'est plus disponible' }, req, 409);
        }

        const newRdv = await base44.asServiceRole.entities.RendezVous.create({
          date,
          heure_debut,
          heure_fin,
          type_consultation: type_consultation || 'Consultation',
          motif: motif || '',
          medecin_assigne,
          statut: 'Planifié',
          source: 'en_ligne',
          patient_nom,
          patient_prenom,
          patient_telephone,
          patient_email,
          duree_estimee: SLOT_MINUTES,
          booking_ip_hash: ipHash,
        });

        // 5. Détection d'une réservation concurrente sur le même créneau.
        //    La création n'est pas atomique : on relit et on annule le doublon
        //    le plus récent plutôt que de laisser deux patients sur un créneau.
        const afterCreate = await base44.asServiceRole.entities.RendezVous.filter({
          date,
          heure_debut,
          medecin_assigne,
          statut: { $nin: ['Annulé'] },
        });
        if (afterCreate.length > 1) {
          const sorted = [...afterCreate].sort(
            (a, b) => String(a.created_date).localeCompare(String(b.created_date)),
          );
          if (sorted[sorted.length - 1].id === newRdv.id) {
            await base44.asServiceRole.entities.RendezVous.update(newRdv.id, {
              statut: 'Annulé',
              notes_rdv: 'Annulé automatiquement : créneau pris simultanément',
            });
            return json({ error: 'Ce créneau vient d\'être réservé' }, req, 409);
          }
        }

        // 6. Synchronisation agenda externe. Le motif de consultation est une
        //    donnée de santé : il n'est pas transmis à Google, pas plus que les
        //    coordonnées du patient.
        try {
          const accessToken = await base44.asServiceRole.connectors
            .getAccessToken('googlecalendar');
          if (accessToken) {
            const event = {
              summary: `RDV en ligne : ${patient_prenom} ${patient_nom}`,
              description: `Type : ${type_consultation || 'Consultation'}\n`
                + 'Détails dans FluxMed.',
              start: {
                dateTime: new Date(`${date}T${heure_debut}:00`).toISOString(),
                timeZone: 'Europe/Brussels',
              },
              end: {
                dateTime: new Date(`${date}T${heure_fin}:00`).toISOString(),
                timeZone: 'Europe/Brussels',
              },
            };

            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
              },
            );
            const createdEvent = await response.json();
            if (createdEvent.id) {
              await base44.asServiceRole.entities.RendezVous.update(newRdv.id, {
                google_calendar_event_id: createdEvent.id,
              });
            }
          }
        } catch (e) {
          console.log('Google Calendar sync skipped:', e.message);
        }

        // 7. Confirmation minimale : le dossier interne n'est pas renvoyé.
        return json({
          success: true,
          appointment: { date, heure_debut, heure_fin },
          message: 'Votre rendez-vous a été confirmé',
        }, req);
      }

      default:
        return json({ error: 'Action non reconnue' }, req, 400);
    }
  } catch (error) {
    // Aucun détail interne n'est renvoyé à un appelant anonyme.
    console.error('Erreur booking:', error);
    return json({ error: 'Une erreur est survenue' }, req, 500);
  }
});
