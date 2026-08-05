import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Projet THIN — remontée épidémiologique agrégée.
 *
 * La version précédente affirmait « Aucune donnée identifiante n'est stockée »
 * tout en conservant l'âge exact, le sexe, le code région, la date précise de
 * consultation et le diagnostic en TEXTE LIBRE recopié du dossier. Cette
 * combinaison est ré-identifiante — dans une zone rurale desservie par un seul
 * cabinet, âge + sexe + jour suffisent — et le champ libre contenait
 * régulièrement des éléments nominatifs. Une donnée seulement pseudonymisée
 * reste soumise au RGPD dans son intégralité.
 *
 * Ce que fait cette version :
 *  - consentement explicite au partage vérifié patient par patient ;
 *  - âge réduit à une tranche, date réduite à la semaine ISO ;
 *  - diagnostic en texte libre supprimé ; seuls des symptômes issus d'un
 *    vocabulaire fermé sont conservés ;
 *  - agrégats publiés sous seuil de k-anonymat.
 */

// Seuil de k-anonymat : un agrégat portant sur moins de K individus n'est pas
// publié. Valeur usuelle pour des données de santé.
const K_ANONYMITY_THRESHOLD = 5;

const AGE_BRACKETS = [
  { max: 4, label: '0-4' },
  { max: 14, label: '5-14' },
  { max: 24, label: '15-24' },
  { max: 44, label: '25-44' },
  { max: 64, label: '45-64' },
  { max: 74, label: '65-74' },
  { max: Infinity, label: '75+' },
];

/** Vocabulaire fermé. Rien d'autre ne sort du cabinet. */
const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  'fièvre': ['fièvre', 'température', 'fébrile', 'hyperthermie'],
  'toux': ['toux', 'toussé'],
  'fatigue': ['fatigue', 'asthénie', 'fatigué', 'épuisé'],
  'céphalées': ['céphalée', 'mal de tête', 'maux de tête', 'migraine'],
  'douleurs abdominales': ['douleur abdominale', 'mal au ventre', 'douleurs abdominales'],
  'nausées': ['nausée', 'nausées', 'envie de vomir'],
  'vomissements': ['vomissement', 'vomi'],
  'diarrhée': ['diarrhée', 'selles liquides'],
  'rhinorrhée': ['rhinorrhée', 'nez qui coule', 'écoulement nasal'],
  'mal de gorge': ['mal de gorge', 'odynophagie', 'gorge'],
  'courbatures': ['courbature', 'myalgie', 'douleurs musculaires'],
  'vertiges': ['vertige', 'étourdissement'],
  'essoufflement': ['essoufflement', 'dyspnée', 'difficultés respiratoires'],
  'douleur thoracique': ['douleur thoracique', 'douleur poitrine'],
  'palpitations': ['palpitation', 'cœur qui bat'],
  'insomnie': ['insomnie', 'trouble du sommeil', 'dort mal'],
  'anxiété': ['anxiété', 'angoisse', 'stress'],
  'éruption cutanée': ['éruption', 'rash', 'boutons'],
  'démangeaisons': ['démangeaison', 'prurit', 'gratte'],
  'douleur articulaire': ['douleur articulaire', 'arthralgie'],
  'lombalgie': ['lombalgie', 'mal de dos', 'douleur lombaire'],
};

function extractSymptoms(motif?: string, anamnese?: string): string[] {
  const text = `${motif || ''} ${anamnese || ''}`.toLowerCase();
  return Object.entries(SYMPTOM_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([symptom]) => symptom);
}

function ageBracket(birthDate?: string): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 130) return null;

  return AGE_BRACKETS.find((b) => age <= b.max)!.label;
}

/** Semaine ISO 8601, ex. 2026-W32. */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Le patient a-t-il consenti au partage de ses données avec un tiers ?
 *
 * `data_processing_consent` couvre le traitement pour les soins ; il ne vaut
 * pas autorisation de transmettre à un projet de recherche. C'est
 * `data_sharing_consent` qui est requis ici, et l'absence vaut refus.
 */
function hasSharingConsent(patient: Record<string, any>): boolean {
  const consent = patient?.gdpr_consent;
  if (!consent) return false;
  if (consent.revoked) return false;
  return consent.has_consented === true && consent.data_sharing_consent === true;
}

/** Supprime les modalités observées sur moins de K individus. */
function suppressSmallCells(counts: Record<string, number>) {
  const published: Record<string, number> = {};
  let suppressed = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count >= K_ANONYMITY_THRESHOLD) published[key] = count;
    else suppressed += 1;
  }
  return { published, suppressed };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    if (action === 'collect_daily_data') {
      const today = new Date().toISOString().split('T')[0];

      const consultations = await base44.entities.Consultation.filter({
        date_consultation: { $gte: `${today}T00:00:00`, $lte: `${today}T23:59:59` },
        medecin_email: user.email,
      });

      if (!consultations?.length) {
        return Response.json({ success: true, count: 0, skipped_no_consent: 0 });
      }

      // Ne charge que les patients concernés. L'ancienne version faisait
      // Patient.list() — paginé, donc silencieusement incomplet.
      const patientIds = [...new Set(
        consultations.map((c: any) => c.patient_id).filter(Boolean),
      )];
      const patientMap: Record<string, any> = {};
      for (let i = 0; i < patientIds.length; i += 50) {
        const chunk = patientIds.slice(i, i + 50);
        const found = await base44.entities.Patient.filter({ id: chunk });
        for (const p of found || []) patientMap[p.id] = p;
      }

      const week = isoWeek(new Date());
      const rows: Array<Record<string, unknown>> = [];
      let skippedNoConsent = 0;
      let skippedNoSignal = 0;

      for (const consultation of consultations) {
        const patient = patientMap[consultation.patient_id];
        if (!patient) continue;

        if (!hasSharingConsent(patient)) {
          skippedNoConsent += 1;
          continue;
        }

        const bracket = ageBracket(patient.birthDate);
        const symptoms = extractSymptoms(consultation.motif, consultation.anamnese);

        if (!bracket || symptoms.length === 0) {
          skippedNoSignal += 1;
          continue;
        }

        let sex = 'autre';
        if (patient.gender === 'male') sex = 'M';
        else if (patient.gender === 'female') sex = 'F';

        rows.push({
          age_bracket: bracket,
          sex,
          symptoms,
          consultation_week: week,
          region_code: user.region_code || null,
        });
      }

      for (const row of rows) {
        await base44.asServiceRole.entities.AnonymousEpiData.create(row);
      }

      return Response.json({
        success: true,
        count: rows.length,
        skipped_no_consent: skippedNoConsent,
        skipped_no_signal: skippedNoSignal,
        message: `${rows.length} entrée(s) agrégée(s). `
          + `${skippedNoConsent} patient(s) sans consentement au partage exclu(s).`,
      });
    }

    if (action === 'get_stats') {
      const allData = await base44.entities.AnonymousEpiData.list('-consultation_week', 1000);

      // Un effectif total trop faible rend tout agrégat ré-identifiant.
      if ((allData?.length || 0) < K_ANONYMITY_THRESHOLD) {
        return Response.json({
          total_entries: allData?.length || 0,
          suppressed: true,
          message: 'Effectif insuffisant pour publier des agrégats '
            + `(seuil de k-anonymat : ${K_ANONYMITY_THRESHOLD}).`,
        });
      }

      const symptomCounts: Record<string, number> = {};
      const ageCounts: Record<string, number> = {};
      const sexCounts: Record<string, number> = {};

      for (const entry of allData) {
        for (const s of entry.symptoms || []) {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        }
        if (entry.age_bracket) {
          ageCounts[entry.age_bracket] = (ageCounts[entry.age_bracket] || 0) + 1;
        }
        if (entry.sex) sexCounts[entry.sex] = (sexCounts[entry.sex] || 0) + 1;
      }

      const symptoms = suppressSmallCells(symptomCounts);
      const ages = suppressSmallCells(ageCounts);
      const sexes = suppressSmallCells(sexCounts);

      return Response.json({
        total_entries: allData.length,
        k_anonymity_threshold: K_ANONYMITY_THRESHOLD,
        symptom_counts: symptoms.published,
        age_distribution: ages.published,
        sex_distribution: sexes.published,
        suppressed_cells: symptoms.suppressed + ages.suppressed + sexes.suppressed,
      });
    }

    return Response.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('THIN Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
