import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Projet THIN - Collecte anonyme de données épidémiologiques
 * Collecte uniquement : âge, sexe, symptômes
 * Aucune donnée identifiante n'est stockée
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    if (action === 'collect_daily_data') {
      // Récupérer les consultations du jour
      const today = new Date().toISOString().split('T')[0];
      const consultations = await base44.entities.Consultation.filter({
        date_consultation: { $gte: `${today}T00:00:00`, $lte: `${today}T23:59:59` },
        medecin_email: user.email
      });

      // Récupérer les patients pour les données démographiques
      const patientIds = [...new Set(consultations.map(c => c.patient_id))];
      const patients = await base44.entities.Patient.list();
      const patientMap = {};
      patients.forEach(p => { patientMap[p.id] = p; });

      // Extraire les données anonymes
      const anonymousData = [];

      for (const consultation of consultations) {
        const patient = patientMap[consultation.patient_id];
        if (!patient) continue;

        // Calculer l'âge à partir de la date de naissance
        let age = null;
        if (patient.birthDate) {
          const birthDate = new Date(patient.birthDate);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        // Extraire le sexe
        let sex = 'autre';
        if (patient.gender === 'male') sex = 'M';
        else if (patient.gender === 'female') sex = 'F';

        // Extraire les symptômes du motif et de l'anamnèse
        const symptoms = extractSymptoms(consultation.motif, consultation.anamnese);

        // Créer l'entrée anonyme - AUCUNE donnée identifiante
        if (age !== null && symptoms.length > 0) {
          anonymousData.push({
            age,
            sex,
            symptoms,
            diagnosis: consultation.diagnostic || null,
            consultation_date: today,
            region_code: user.region_code || null
          });
        }
      }

      // Sauvegarder les données anonymes
      let savedCount = 0;
      for (const data of anonymousData) {
        await base44.asServiceRole.entities.AnonymousEpiData.create(data);
        savedCount++;
      }

      return Response.json({ 
        success: true, 
        message: `${savedCount} entrées anonymes collectées`,
        count: savedCount
      });
    }

    if (action === 'get_stats') {
      // Récupérer les statistiques agrégées
      const allData = await base44.entities.AnonymousEpiData.list('-consultation_date', 1000);
      
      // Agrégation par symptôme
      const symptomCounts = {};
      const ageBrackets = { '0-18': 0, '19-40': 0, '41-60': 0, '61+': 0 };
      const sexCounts = { M: 0, F: 0, autre: 0 };

      allData.forEach(entry => {
        // Compter les symptômes
        entry.symptoms?.forEach(s => {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        });

        // Compter par tranche d'âge
        if (entry.age <= 18) ageBrackets['0-18']++;
        else if (entry.age <= 40) ageBrackets['19-40']++;
        else if (entry.age <= 60) ageBrackets['41-60']++;
        else ageBrackets['61+']++;

        // Compter par sexe
        sexCounts[entry.sex] = (sexCounts[entry.sex] || 0) + 1;
      });

      return Response.json({
        total_entries: allData.length,
        symptom_counts: symptomCounts,
        age_distribution: ageBrackets,
        sex_distribution: sexCounts
      });
    }

    return Response.json({ error: 'Action non reconnue' }, { status: 400 });

  } catch (error) {
    console.error('THIN Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Extrait les symptômes à partir du texte
 * Liste de symptômes courants à détecter
 */
function extractSymptoms(motif, anamnese) {
  const text = `${motif || ''} ${anamnese || ''}`.toLowerCase();
  const symptoms = [];

  const symptomKeywords = {
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
    'lombalgie': ['lombalgie', 'mal de dos', 'douleur lombaire']
  };

  for (const [symptom, keywords] of Object.entries(symptomKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      symptoms.push(symptom);
    }
  }

  return symptoms;
}