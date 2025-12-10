// Règles de compatibilité INAMI
// Basé sur les règles officielles de facturation belges

export const INCOMPATIBILITY_RULES = {
  // Consultations multiples même jour
  SAME_DAY_CONSULTATIONS: {
    codes: ['101010', '101032', '101054', '102010', '102032', '102054'],
    rule: 'max_one_per_day',
    message: 'Une seule consultation peut être facturée par jour pour le même patient',
    severity: 'error'
  },

  // Visites domicile + consultation cabinet
  VISIT_AND_CONSULTATION: {
    incompatible_pairs: [
      { codes: ['103110', '103132'], conflicts: ['101010', '101032', '102010'] }
    ],
    message: 'Une visite à domicile ne peut pas être facturée avec une consultation au cabinet le même jour',
    severity: 'error'
  },

  // Actes techniques répétés
  TECHNICAL_ACTS_FREQUENCY: {
    codes: ['475012', '475034', '475056'], // ECG par exemple
    rule: 'max_per_period',
    max_count: 1,
    period_days: 1,
    message: 'Cet acte technique ne peut être facturé qu\'une fois par jour',
    severity: 'warning'
  },

  // Prestations forfaitaires exclusives
  FORFAIT_EXCLUSIONS: {
    forfait_codes: ['101771', '101793'],
    excludes_all: true,
    message: 'Les prestations forfaitaires excluent toute autre prestation le même jour',
    severity: 'error'
  },

  // Suppléments honoraires incompatibles
  SUPPLEMENT_LIMITS: {
    night_supplement: ['103412'],
    weekend_supplement: ['103434'],
    urgent_supplement: ['103515'],
    rule: 'max_one_supplement',
    message: 'Un seul supplément peut être appliqué par consultation',
    severity: 'warning'
  },

  // Actes de biologie clinique - cumul limité
  BIOLOGY_CUMUL: {
    codes: ['591000', '591022', '591044'], // Exemples
    rule: 'max_cumul_value',
    max_value: 50, // Points de nomenclature
    message: 'Le cumul des actes de biologie ne peut dépasser 50 points',
    severity: 'error'
  }
};

export function validateActsCompatibility(selectedActs, newAct) {
  const warnings = [];
  const errors = [];

  // Rule 1: Check same day consultations
  const consultationCodes = INCOMPATIBILITY_RULES.SAME_DAY_CONSULTATIONS.codes;
  if (consultationCodes.includes(newAct.code)) {
    const hasConsultation = selectedActs.some(act => consultationCodes.includes(act.code));
    if (hasConsultation) {
      errors.push({
        rule: 'SAME_DAY_CONSULTATIONS',
        message: INCOMPATIBILITY_RULES.SAME_DAY_CONSULTATIONS.message,
        severity: 'error',
        conflictingCodes: selectedActs.filter(act => consultationCodes.includes(act.code)).map(a => a.code)
      });
    }
  }

  // Rule 2: Check visit + consultation conflicts
  const visitConsult = INCOMPATIBILITY_RULES.VISIT_AND_CONSULTATION.incompatible_pairs;
  visitConsult.forEach(pair => {
    if (pair.codes.includes(newAct.code)) {
      const hasConflict = selectedActs.some(act => pair.conflicts.includes(act.code));
      if (hasConflict) {
        errors.push({
          rule: 'VISIT_AND_CONSULTATION',
          message: INCOMPATIBILITY_RULES.VISIT_AND_CONSULTATION.message,
          severity: 'error',
          conflictingCodes: selectedActs.filter(act => pair.conflicts.includes(act.code)).map(a => a.code)
        });
      }
    }
  });

  // Rule 3: Check forfait exclusions
  const forfaitCodes = INCOMPATIBILITY_RULES.FORFAIT_EXCLUSIONS.forfait_codes;
  if (forfaitCodes.includes(newAct.code) && selectedActs.length > 0) {
    errors.push({
      rule: 'FORFAIT_EXCLUSIONS',
      message: INCOMPATIBILITY_RULES.FORFAIT_EXCLUSIONS.message,
      severity: 'error',
      conflictingCodes: selectedActs.map(a => a.code)
    });
  }
  if (selectedActs.some(act => forfaitCodes.includes(act.code))) {
    errors.push({
      rule: 'FORFAIT_EXCLUSIONS',
      message: 'Un forfait est déjà sélectionné, aucun autre acte ne peut être ajouté',
      severity: 'error',
      conflictingCodes: selectedActs.filter(act => forfaitCodes.includes(act.code)).map(a => a.code)
    });
  }

  // Rule 4: Check supplement limits
  const supplements = [
    ...INCOMPATIBILITY_RULES.SUPPLEMENT_LIMITS.night_supplement,
    ...INCOMPATIBILITY_RULES.SUPPLEMENT_LIMITS.weekend_supplement,
    ...INCOMPATIBILITY_RULES.SUPPLEMENT_LIMITS.urgent_supplement
  ];
  if (supplements.includes(newAct.code)) {
    const hasSupplement = selectedActs.some(act => supplements.includes(act.code));
    if (hasSupplement) {
      warnings.push({
        rule: 'SUPPLEMENT_LIMITS',
        message: INCOMPATIBILITY_RULES.SUPPLEMENT_LIMITS.message,
        severity: 'warning',
        conflictingCodes: selectedActs.filter(act => supplements.includes(act.code)).map(a => a.code)
      });
    }
  }

  // Rule 5: Check technical acts frequency
  const techCodes = INCOMPATIBILITY_RULES.TECHNICAL_ACTS_FREQUENCY.codes;
  if (techCodes.includes(newAct.code)) {
    const count = selectedActs.filter(act => act.code === newAct.code).length;
    if (count >= INCOMPATIBILITY_RULES.TECHNICAL_ACTS_FREQUENCY.max_count) {
      warnings.push({
        rule: 'TECHNICAL_ACTS_FREQUENCY',
        message: INCOMPATIBILITY_RULES.TECHNICAL_ACTS_FREQUENCY.message,
        severity: 'warning',
        conflictingCodes: [newAct.code]
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    canProceed: errors.length === 0, // Can add if no errors, warnings are informative only
    hasWarnings: warnings.length > 0
  };
}

// Check global compatibility of all selected acts
export function validateAllActs(selectedActs) {
  const allErrors = [];
  const allWarnings = [];

  // Check each act against others
  selectedActs.forEach((act, index) => {
    const otherActs = selectedActs.filter((_, i) => i !== index);
    const validation = validateActsCompatibility(otherActs, act);
    allErrors.push(...validation.errors);
    allWarnings.push(...validation.warnings);
  });

  // Remove duplicates
  const uniqueErrors = Array.from(new Set(allErrors.map(e => JSON.stringify(e)))).map(e => JSON.parse(e));
  const uniqueWarnings = Array.from(new Set(allWarnings.map(w => JSON.stringify(w)))).map(w => JSON.parse(w));

  return {
    isValid: uniqueErrors.length === 0,
    errors: uniqueErrors,
    warnings: uniqueWarnings,
    summary: {
      errorCount: uniqueErrors.length,
      warningCount: uniqueWarnings.length,
      totalIssues: uniqueErrors.length + uniqueWarnings.length
    }
  };
}

// Get detailed information about a specific incompatibility
export function getIncompatibilityDetails(ruleKey) {
  return INCOMPATIBILITY_RULES[ruleKey] || null;
}

// Check if a specific code pair is compatible
export function areCodesCompatible(code1, code2) {
  const tempActs = [{ code: code1 }];
  const validation = validateActsCompatibility(tempActs, { code: code2 });
  return validation.isValid;
}