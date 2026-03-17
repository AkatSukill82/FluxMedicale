import { useMemo } from 'react';

function getAge(birthDate) {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function matchesTerm(text, term) {
  if (!term || !text) return false;
  return text.toLowerCase().includes(term.toLowerCase());
}

export default function usePopulationFilter(filters, data) {
  return useMemo(() => {
    const { patients, vaccinations, allergies, medicalHistories, prescriptions, dmgs, labResults, consultations } = data || {};
    if (!patients?.length) return { results: [], stats: {} };

    // Build lookup maps
    const vaccinationsByPatient = {};
    (vaccinations || []).forEach(v => {
      if (!vaccinationsByPatient[v.patient_id]) vaccinationsByPatient[v.patient_id] = [];
      vaccinationsByPatient[v.patient_id].push(v);
    });

    const allergiesByPatient = {};
    (allergies || []).forEach(a => {
      if (!allergiesByPatient[a.patient_id]) allergiesByPatient[a.patient_id] = [];
      allergiesByPatient[a.patient_id].push(a);
    });

    const historyByPatient = {};
    (medicalHistories || []).forEach(h => {
      if (!historyByPatient[h.patient_id]) historyByPatient[h.patient_id] = [];
      historyByPatient[h.patient_id].push(h);
    });

    const prescriptionsByPatient = {};
    (prescriptions || []).forEach(p => {
      if (!prescriptionsByPatient[p.patient_id]) prescriptionsByPatient[p.patient_id] = [];
      prescriptionsByPatient[p.patient_id].push(p);
    });

    const dmgByPatient = {};
    (dmgs || []).forEach(d => {
      dmgByPatient[d.patient_id] = d;
    });

    const labByPatient = {};
    (labResults || []).forEach(l => {
      if (!labByPatient[l.patient_id]) labByPatient[l.patient_id] = [];
      labByPatient[l.patient_id].push(l);
    });

    const consultByPatient = {};
    (consultations || []).forEach(c => {
      if (!consultByPatient[c.patient_id]) consultByPatient[c.patient_id] = [];
      consultByPatient[c.patient_id].push(c);
    });

    // Apply each filter
    let results = [...patients];

    for (const filter of filters) {
      results = results.filter(patient => {
        const pid = patient.id;

        switch (filter.type) {
          case 'age': {
            const age = getAge(patient.birthDate);
            if (age === null) return false;
            if (filter.ageMin && age < parseInt(filter.ageMin)) return false;
            if (filter.ageMax && age > parseInt(filter.ageMax)) return false;
            return true;
          }
          case 'gender': {
            if (filter.value === 'all') return true;
            return patient.gender === filter.value;
          }
          case 'diagnosis': {
            if (!filter.searchTerm) return true;
            const history = historyByPatient[pid] || [];
            return history.some(h => {
              const termMatch = matchesTerm(h.title, filter.searchTerm) || matchesTerm(h.description, filter.searchTerm) || matchesTerm(h.icd10_code, filter.searchTerm);
              if (filter.active) return termMatch && h.is_active;
              return termMatch;
            });
          }
          case 'medication': {
            if (!filter.searchTerm) return true;
            const rxs = prescriptionsByPatient[pid] || [];
            return rxs.some(rx =>
              (rx.medicaments || []).some(m => matchesTerm(m.nom_produit, filter.searchTerm))
            );
          }
          case 'allergy': {
            if (!filter.searchTerm) return true;
            const alls = allergiesByPatient[pid] || [];
            return alls.some(a => {
              const termMatch = matchesTerm(a.allergen, filter.searchTerm);
              if (filter.active) return termMatch && a.status === 'ACTIVE';
              return termMatch;
            });
          }
          case 'vaccination': {
            if (!filter.searchTerm) return true;
            const vacs = vaccinationsByPatient[pid] || [];
            const hasVac = vacs.some(v =>
              matchesTerm(v.vaccine_name, filter.searchTerm) || matchesTerm(v.vaccine_type, filter.searchTerm)
            );
            return filter.vaccinated ? hasVac : !hasVac;
          }
          case 'lab': {
            if (!filter.searchTerm) return true;
            const labs = labByPatient[pid] || [];
            return labs.some(l =>
              (l.results || []).some(r => {
                const termMatch = matchesTerm(r.name, filter.searchTerm) || matchesTerm(r.code, filter.searchTerm);
                if (filter.abnormal) return termMatch && r.flag && r.flag !== 'normal';
                return termMatch;
              })
            );
          }
          case 'insurance': {
            if (filter.regime !== 'all' && patient.insurance_regime !== filter.regime) return false;
            if (filter.status !== 'all' && patient.insurance_status !== filter.status) return false;
            return true;
          }
          case 'dmg': {
            const dmg = dmgByPatient[pid];
            if (!dmg) return filter.statut === 'AUCUN';
            return dmg.statut === filter.statut;
          }
          case 'consultation': {
            const consults = consultByPatient[pid] || [];
            if (filter.period === 'never') return consults.length === 0;
            const months = parseInt(filter.period);
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - months);
            return consults.some(c => new Date(c.date_consultation) >= cutoff);
          }
          default:
            return true;
        }
      });
    }

    // Compute stats
    const stats = {
      total: patients.length,
      matched: results.length,
      percentage: patients.length > 0 ? Math.round((results.length / patients.length) * 100) : 0,
      genderBreakdown: { male: 0, female: 0, other: 0 },
      ageBreakdown: { '0-17': 0, '18-44': 0, '45-64': 0, '65-74': 0, '75+': 0 },
    };

    results.forEach(p => {
      // Gender
      if (p.gender === 'male') stats.genderBreakdown.male++;
      else if (p.gender === 'female') stats.genderBreakdown.female++;
      else stats.genderBreakdown.other++;
      // Age
      const age = getAge(p.birthDate);
      if (age !== null) {
        if (age <= 17) stats.ageBreakdown['0-17']++;
        else if (age <= 44) stats.ageBreakdown['18-44']++;
        else if (age <= 64) stats.ageBreakdown['45-64']++;
        else if (age <= 74) stats.ageBreakdown['65-74']++;
        else stats.ageBreakdown['75+']++;
      }
    });

    return { results, stats };
  }, [filters, data]);
}