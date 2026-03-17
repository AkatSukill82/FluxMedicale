import { useMemo } from 'react';

function getAge(birthDate) {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function matchesTerm(text, term) {
  if (!term || !text) return false;
  return text.toLowerCase().includes(term.toLowerCase());
}

function buildLookupMap(items, key) {
  const map = {};
  (items || []).forEach(item => {
    const k = item[key];
    if (!k) return;
    if (!map[k]) map[k] = [];
    map[k].push(item);
  });
  return map;
}

const SEVERITY_ORDER = ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'];

export default function usePopulationFilter(filters, data) {
  return useMemo(() => {
    const { patients, vaccinations, allergies, medicalHistories, prescriptions, dmgs, labResults, consultations, sumehrs, vitalSigns } = data || {};
    if (!patients?.length) return { results: [], stats: {}, medicalStats: {} };

    const vaccinationsByPatient = buildLookupMap(vaccinations, 'patient_id');
    const allergiesByPatient = buildLookupMap(allergies, 'patient_id');
    const historyByPatient = buildLookupMap(medicalHistories, 'patient_id');
    const prescriptionsByPatient = buildLookupMap(prescriptions, 'patient_id');
    const labByPatient = buildLookupMap(labResults, 'patient_id');
    const consultByPatient = buildLookupMap(consultations, 'patient_id');
    const vitalsByPatient = buildLookupMap(vitalSigns, 'patient_id');

    const dmgByPatient = {};
    (dmgs || []).forEach(d => { dmgByPatient[d.patient_id] = d; });

    const sumehrPatientIds = new Set(
      (sumehrs || []).filter(s => s.status === 'published' || s.status === 'validated').map(s => s.patient_id)
    );

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
          case 'city': {
            if (!filter.searchTerm) return true;
            const addresses = patient.address || [];
            return addresses.some(a =>
              matchesTerm(a.city, filter.searchTerm) || matchesTerm(a.postalCode, filter.searchTerm)
            );
          }
          case 'status': {
            return patient.statut === filter.value;
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
          case 'medication_class': {
            const rxs = prescriptionsByPatient[pid] || [];
            const allMeds = new Set();
            rxs.forEach(rx => (rx.medicaments || []).forEach(m => { if (m.nom_produit) allMeds.add(m.nom_produit.toLowerCase()); }));
            const min = parseInt(filter.minCount) || 0;
            if (filter.searchTerm) {
              return allMeds.has(filter.searchTerm.toLowerCase()) && allMeds.size >= min;
            }
            return allMeds.size >= min;
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
          case 'allergy_severity': {
            const alls = allergiesByPatient[pid] || [];
            const minIdx = SEVERITY_ORDER.indexOf(filter.minSeverity);
            return alls.some(a => a.status === 'ACTIVE' && SEVERITY_ORDER.indexOf(a.severity) >= minIdx);
          }
          case 'vaccination': {
            if (!filter.searchTerm) return true;
            const vacs = vaccinationsByPatient[pid] || [];
            const hasVac = vacs.some(v =>
              matchesTerm(v.vaccine_name, filter.searchTerm) || matchesTerm(v.vaccine_type, filter.searchTerm)
            );
            return filter.vaccinated ? hasVac : !hasVac;
          }
          case 'vaccination_overdue': {
            const vacs = vaccinationsByPatient[pid] || [];
            const days = parseInt(filter.daysOverdue) || 30;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            return vacs.some(v => v.next_dose_date && new Date(v.next_dose_date) < cutoff);
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
          case 'lab_range': {
            if (!filter.searchTerm || !filter.threshold) return true;
            const labs = labByPatient[pid] || [];
            const threshold = parseFloat(filter.threshold);
            const thresholdMax = filter.thresholdMax ? parseFloat(filter.thresholdMax) : null;
            return labs.some(l =>
              (l.results || []).some(r => {
                if (!matchesTerm(r.name, filter.searchTerm) && !matchesTerm(r.code, filter.searchTerm)) return false;
                const val = r.numeric_value ?? parseFloat(r.value);
                if (isNaN(val)) return false;
                if (filter.operator === 'above') return val > threshold;
                if (filter.operator === 'below') return val < threshold;
                if (filter.operator === 'between' && thresholdMax !== null) return val >= threshold && val <= thresholdMax;
                return false;
              })
            );
          }
          case 'vital_signs': {
            if (!filter.threshold) return true;
            const vitals = vitalsByPatient[pid] || [];
            const threshold = parseFloat(filter.threshold);
            // Get most recent vital sign
            const metricKey = { systolic: 'systolic_bp', diastolic: 'diastolic_bp', heart_rate: 'heart_rate', temperature: 'temperature', weight: 'weight' }[filter.metric] || filter.metric;
            return vitals.some(v => {
              const val = v[metricKey];
              if (val == null) return false;
              return filter.operator === 'above' ? val > threshold : val < threshold;
            });
          }
          case 'bmi': {
            if (!filter.threshold) return true;
            const vitals = vitalsByPatient[pid] || [];
            const threshold = parseFloat(filter.threshold);
            return vitals.some(v => {
              if (v.bmi) return filter.operator === 'above' ? v.bmi > threshold : v.bmi < threshold;
              if (v.weight && v.height) {
                const bmi = v.weight / ((v.height / 100) ** 2);
                return filter.operator === 'above' ? bmi > threshold : bmi < threshold;
              }
              return false;
            });
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
          case 'sumehr': {
            return filter.hasSumehr ? sumehrPatientIds.has(pid) : !sumehrPatientIds.has(pid);
          }
          case 'consultation': {
            const consults = consultByPatient[pid] || [];
            if (filter.period === 'never') return consults.length === 0;
            if (filter.period === '24_plus') {
              if (consults.length === 0) return true;
              const cutoff = new Date();
              cutoff.setMonth(cutoff.getMonth() - 24);
              return !consults.some(c => new Date(c.date_consultation || c.created_date) >= cutoff);
            }
            const months = parseInt(filter.period);
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - months);
            return consults.some(c => new Date(c.date_consultation || c.created_date) >= cutoff);
          }
          case 'consultation_count': {
            const consults = consultByPatient[pid] || [];
            const months = parseInt(filter.period) || 12;
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - months);
            const count = consults.filter(c => new Date(c.date_consultation || c.created_date) >= cutoff).length;
            const target = parseInt(filter.count) || 0;
            if (filter.operator === 'less') return count < target;
            if (filter.operator === 'more') return count > target;
            if (filter.operator === 'equal') return count === target;
            return true;
          }
          case 'prescription_recurring': {
            const rxs = prescriptionsByPatient[pid] || [];
            const hasRecurring = rxs.some(rx => rx.is_recurring);
            return filter.isRecurring ? hasRecurring : !hasRecurring;
          }
          case 'no_followup': {
            const consults = consultByPatient[pid] || [];
            const months = parseInt(filter.months) || 6;
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - months);
            if (consults.length === 0) return true;
            return !consults.some(c => new Date(c.date_consultation || c.created_date) >= cutoff);
          }
          default:
            return true;
        }
      });
    }

    // Compute demographics stats
    const stats = {
      total: patients.length,
      matched: results.length,
      percentage: patients.length > 0 ? Math.round((results.length / patients.length) * 100) : 0,
      genderBreakdown: { male: 0, female: 0, other: 0 },
      ageBreakdown: { '0-17': 0, '18-44': 0, '45-64': 0, '65-74': 0, '75+': 0 },
      insuranceBreakdown: {},
      cityBreakdown: {},
    };

    results.forEach(p => {
      if (p.gender === 'male') stats.genderBreakdown.male++;
      else if (p.gender === 'female') stats.genderBreakdown.female++;
      else stats.genderBreakdown.other++;

      const age = getAge(p.birthDate);
      if (age !== null) {
        if (age <= 17) stats.ageBreakdown['0-17']++;
        else if (age <= 44) stats.ageBreakdown['18-44']++;
        else if (age <= 64) stats.ageBreakdown['45-64']++;
        else if (age <= 74) stats.ageBreakdown['65-74']++;
        else stats.ageBreakdown['75+']++;
      }

      const regime = p.insurance_regime || 'Non spécifié';
      stats.insuranceBreakdown[regime] = (stats.insuranceBreakdown[regime] || 0) + 1;

      const city = ((p.address || [])[0]?.city) || 'Inconnue';
      stats.cityBreakdown[city] = (stats.cityBreakdown[city] || 0) + 1;
    });

    // Medical stats for the cohort
    const resultIds = new Set(results.map(p => p.id));
    const medicalStats = {
      topDiagnoses: {},
      topMedications: {},
      topAllergies: {},
      vaccinationCoverage: {},
      avgAge: 0,
    };

    let ageSum = 0, ageCount = 0;
    results.forEach(p => {
      const age = getAge(p.birthDate);
      if (age !== null) { ageSum += age; ageCount++; }
    });
    medicalStats.avgAge = ageCount > 0 ? Math.round(ageSum / ageCount * 10) / 10 : 0;

    (medicalHistories || []).forEach(h => {
      if (resultIds.has(h.patient_id) && h.is_active && h.title) {
        const k = h.title.toLowerCase();
        medicalStats.topDiagnoses[k] = (medicalStats.topDiagnoses[k] || { name: h.title, count: 0, patients: new Set() });
        medicalStats.topDiagnoses[k].count++;
        medicalStats.topDiagnoses[k].patients.add(h.patient_id);
      }
    });

    (prescriptions || []).forEach(rx => {
      if (resultIds.has(rx.patient_id)) {
        (rx.medicaments || []).forEach(m => {
          if (m.nom_produit) {
            const k = m.nom_produit.toLowerCase();
            medicalStats.topMedications[k] = (medicalStats.topMedications[k] || { name: m.nom_produit, count: 0, patients: new Set() });
            medicalStats.topMedications[k].count++;
            medicalStats.topMedications[k].patients.add(rx.patient_id);
          }
        });
      }
    });

    (allergies || []).forEach(a => {
      if (resultIds.has(a.patient_id) && a.status === 'ACTIVE' && a.allergen) {
        const k = a.allergen.toLowerCase();
        medicalStats.topAllergies[k] = (medicalStats.topAllergies[k] || { name: a.allergen, count: 0 });
        medicalStats.topAllergies[k].count++;
      }
    });

    const vaccineTypes = ['GRIPPE', 'COVID', 'TETANOS', 'HEPATITE_B', 'PNEUMOCOQUE'];
    vaccineTypes.forEach(vt => {
      const patientsVac = new Set(
        (vaccinations || []).filter(v => resultIds.has(v.patient_id) && (v.vaccine_type === vt || matchesTerm(v.vaccine_name, vt)))
          .map(v => v.patient_id)
      );
      medicalStats.vaccinationCoverage[vt] = { vaccinated: patientsVac.size, total: results.length };
    });

    // Convert objects to sorted arrays
    const sortDesc = obj => Object.values(obj)
      .map(v => ({ ...v, patients: v.patients ? v.patients.size : v.count }))
      .sort((a, b) => (b.patients || b.count) - (a.patients || a.count))
      .slice(0, 10);

    medicalStats.topDiagnoses = sortDesc(medicalStats.topDiagnoses);
    medicalStats.topMedications = sortDesc(medicalStats.topMedications);
    medicalStats.topAllergies = Object.values(medicalStats.topAllergies).sort((a, b) => b.count - a.count).slice(0, 10);

    return { results, stats, medicalStats };
  }, [filters, data]);
}