import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Prominent banner shown at the top of CarePlanStep when the patient has known allergies
 * or when selected medications trigger interaction warnings.
 */
export default function AllergyInteractionBanner({ patientId, selectedMedications }) {
  // Fetch patient allergies
  const { data: allergies = [] } = useQuery({
    queryKey: ['patient-allergies-banner', patientId],
    queryFn: () => base44.entities.Allergy.filter({ patient_id: patientId, status: 'ACTIVE' }),
    enabled: !!patientId,
    staleTime: 60000
  });

  // Fetch current prescriptions for cross-check
  const { data: currentMeds = [] } = useQuery({
    queryKey: ['patient-current-meds-banner', patientId],
    queryFn: async () => {
      const prescriptions = await base44.entities.Prescription.filter({ patient_id: patientId });
      const recent = prescriptions.filter(p => {
        const d = new Date(p.date_prescription);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 3);
        return d > cutoff;
      });
      return recent.flatMap(p => p.medicaments || []);
    },
    enabled: !!patientId,
    staleTime: 60000
  });

  // Check for allergy matches among selected medications
  const allergyMatches = [];
  for (const med of selectedMedications) {
    for (const allergy of allergies) {
      const allergenLower = (allergy.allergen || '').toLowerCase();
      if (
        med.product_name?.toLowerCase().includes(allergenLower) ||
        med.substance_name?.toLowerCase().includes(allergenLower)
      ) {
        allergyMatches.push({
          med: med.product_name,
          allergen: allergy.allergen,
          severity: allergy.severity,
          reaction: allergy.reaction
        });
      }
    }
  }

  const hasMedicationAllergies = allergies.filter(a => a.allergen_type === 'MEDICATION');
  const showAllergyAlert = hasMedicationAllergies.length > 0;
  const showCritical = allergyMatches.length > 0;

  if (!showAllergyAlert && !showCritical) return null;

  return (
    <div className="space-y-2 mb-4">
      {/* Critical: active allergy match with selected meds */}
      {showCritical && (
        <Alert className="border-2 border-red-500 bg-red-50 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <AlertDescription>
            <div className="flex items-start gap-2">
              <div>
                <p className="font-bold text-red-900 text-sm">⛔ ALLERGIE MÉDICAMENTEUSE DÉTECTÉE</p>
                {allergyMatches.map((m, i) => (
                  <div key={i} className="mt-1">
                    <span className="font-semibold text-red-800 text-sm">{m.med}</span>
                    <span className="text-red-700 text-sm"> → Allergie à {m.allergen}</span>
                    {m.reaction && <span className="text-red-600 text-xs"> ({m.reaction})</span>}
                    <Badge className="ml-2 bg-red-600 text-white text-[10px]">
                      {m.severity === 'LIFE_THREATENING' ? 'VITAL' : m.severity || 'SÉVÈRE'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning: patient has known drug allergies */}
      {showAllergyAlert && !showCritical && (
        <Alert className="border-amber-400 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900">
            <strong>Allergies médicamenteuses connues :</strong>{' '}
            {hasMedicationAllergies.map(a => a.allergen).join(', ')}
            <span className="text-amber-700 ml-1">— Vérifiez avant de prescrire.</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}