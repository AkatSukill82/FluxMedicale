import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Shield, Loader2 } from 'lucide-react';

export default function PatientInsuranceStatus({ patient }) {
  const [insuranceStatus, setInsuranceStatus] = useState(null);

  // Fetch latest insurance data
  const { data: assurabilite, isLoading } = useQuery({
    queryKey: ['assurabilite', patient.id],
    queryFn: async () => {
      const niss = patient.identifier?.find(id => id.system.includes('ssin'))?.value;
      if (!niss) return null;
      
      const results = await base44.entities.Assurabilite.filter({ 
        patient_niss: niss 
      }, '-last_checked_at', 1);
      
      return results[0] || null;
    },
    enabled: !!patient.id
  });

  useEffect(() => {
    if (assurabilite) {
      const status = {
        hasBIM: false,
        hasMAF: false,
        hasTiersPayant: false,
        specialRights: [],
        oaName: assurabilite.oa_name || patient.mutuelle || 'Non renseignée'
      };

      // Check special rights for BIM/OMNIO
      if (assurabilite.special_rights && Array.isArray(assurabilite.special_rights)) {
        status.hasBIM = assurabilite.special_rights.some(right => 
          right.toLowerCase().includes('bim') || 
          right.toLowerCase().includes('omnio') ||
          right.toLowerCase().includes('increased')
        );

        status.hasMAF = assurabilite.special_rights.some(right =>
          right.toLowerCase().includes('maf') ||
          right.toLowerCase().includes('maximum')
        );

        status.specialRights = assurabilite.special_rights;
      }

      status.hasTiersPayant = assurabilite.tiers_payant_allowed || false;

      setInsuranceStatus(status);
    }
  }, [assurabilite, patient]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Vérification assurabilité...</span>
      </div>
    );
  }

  if (!insuranceStatus) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-500" />
        <span className="text-sm text-slate-600">Assurabilité non vérifiée</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Organisme assureur */}
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium">{insuranceStatus.oaName}</span>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {insuranceStatus.hasBIM && (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            BIM / OMNIO
          </Badge>
        )}

        {insuranceStatus.hasMAF && (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            MàF atteint
          </Badge>
        )}

        {insuranceStatus.hasTiersPayant && (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tiers payant
          </Badge>
        )}

        {!insuranceStatus.hasBIM && !insuranceStatus.hasMAF && !insuranceStatus.hasTiersPayant && (
          <Badge variant="outline" className="text-slate-600">
            Régime standard
          </Badge>
        )}
      </div>

      {/* Last checked */}
      {assurabilite?.last_checked_at && (
        <p className="text-xs text-slate-500">
          Vérifié le {new Date(assurabilite.last_checked_at).toLocaleDateString('fr-BE')}
        </p>
      )}
    </div>
  );
}

// Export helper to calculate adjusted prices based on BIM status
export function calculateBIMPrices(basePrice, reimbursed, patientShare, hasBIM) {
  if (!hasBIM) {
    return { reimbursed, patientShare };
  }

  // BIM patients have reduced ticket modérateur
  // Typical reduction: ticket modérateur reduced by 40-75%
  const bimReduction = 0.6; // 60% reduction on patient share
  const adjustedPatientShare = patientShare * (1 - bimReduction);
  const adjustedReimbursed = basePrice - adjustedPatientShare;

  return {
    reimbursed: adjustedReimbursed,
    patientShare: adjustedPatientShare
  };
}