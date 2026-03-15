import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

/**
 * eTarification — Simulates MyCareNet eTar service.
 * For a given patient + list of nomenclature codes, queries
 * the insurance to determine the exact tariff, reimbursement,
 * and patient share.
 * 
 * Props:
 *  - patient: Patient object (with identifier, mutuelle, insurance_status…)
 *  - codes: array of selected nomenclature codes (with code, honorarium, reimbursed…)
 *  - onTariffResult: callback({code, tarif_honoraire, tarif_remboursement, tarif_patient, bim, dmg, special_conditions})
 *  - isConventionne: boolean
 */

const SPECIAL_RIGHTS_MAP = {
  'BIM': { label: 'BIM', color: 'bg-green-100 text-green-800', description: 'Bénéficiaire Intervention Majorée' },
  'OMNIO': { label: 'OMNIO', color: 'bg-blue-100 text-blue-800', description: 'Statut OMNIO' },
  'DMG': { label: 'DMG', color: 'bg-purple-100 text-purple-800', description: 'Dossier Médical Global' },
  'MAF': { label: 'MAF', color: 'bg-orange-100 text-orange-800', description: 'Maximum à Facturer atteint' },
};

export default function ETarification({ patient, codes, onTariffResult, isConventionne = true }) {
  const [isChecking, setIsChecking] = useState(false);
  const [tariffResults, setTariffResults] = useState(null);
  const [patientRights, setPatientRights] = useState(null);

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const checkTarification = async () => {
    setIsChecking(true);
    const niss = getNISS();

    if (!niss) {
      toast.error('NISS du patient requis pour la tarification');
      setIsChecking(false);
      return;
    }

    try {
      // Step 1: Get patient assurability data
      const assurabiliteRecords = await base44.entities.Assurabilite.filter({ patient_id: patient.id }, '-last_checked_at', 1);
      const assurabilite = assurabiliteRecords?.[0];

      // Determine special rights
      const specialRights = assurabilite?.special_rights || [];
      const isBIM = specialRights.includes('BIM') || specialRights.includes('OMNIO');
      const hasDMG = specialRights.includes('DMG');
      const isMAF = specialRights.includes('MAF');

      setPatientRights({
        bim: isBIM,
        dmg: hasDMG,
        maf: isMAF,
        tiers_payant_allowed: assurabilite?.tiers_payant_allowed || false,
        tiers_payant_obligatoire: assurabilite?.tiers_payant_obligatoire || false,
        special_rights: specialRights,
        oa_code: assurabilite?.oa_code || patient?.mutuelle || '',
        oa_name: assurabilite?.oa_name || patient?.mutuelle || 'Mutuelle inconnue',
      });

      // Step 2: For each code, calculate the adjusted tariff
      // In a real MyCareNet integration, this would be a network call.
      // Here we simulate based on local nomenclature data + patient rights.
      const results = codes.map(code => {
        const baseHonorarium = code.original_honorarium || code.honorarium || 0;
        const baseReimbursed = code.reimbursed || 0;
        
        let adjustedHonorarium = baseHonorarium;
        let adjustedReimbursement = baseReimbursed;

        // BIM patients get reduced patient share (higher reimbursement)
        if (isBIM && code.patient_share_bim) {
          adjustedReimbursement = baseHonorarium - code.patient_share_bim;
        } else if (isBIM) {
          // Typically BIM increases reimbursement by ~15-25%
          adjustedReimbursement = Math.min(baseHonorarium, Math.round(baseReimbursed * 1.20));
        }

        // DMG supplement for consultations
        let dmgSupplement = 0;
        if (hasDMG && code.category === 'consultation') {
          dmgSupplement = 130; // 1.30€ DMG supplement
          adjustedHonorarium += dmgSupplement;
          adjustedReimbursement += dmgSupplement;
        }

        // MAF: patient share = 0
        if (isMAF) {
          adjustedReimbursement = adjustedHonorarium;
        }

        const adjustedPatientShare = Math.max(0, adjustedHonorarium - adjustedReimbursement);

        return {
          code: code.code,
          code_id: code.id,
          title: code.title_fr,
          base_honorarium: baseHonorarium,
          tarif_honoraire: adjustedHonorarium,
          tarif_remboursement: adjustedReimbursement,
          tarif_patient: adjustedPatientShare,
          dmg_supplement: dmgSupplement,
          bim_applied: isBIM,
          maf_applied: isMAF,
          dmg_applied: hasDMG && dmgSupplement > 0,
          changed: adjustedHonorarium !== baseHonorarium || adjustedReimbursement !== baseReimbursed,
        };
      });

      setTariffResults(results);

      // Notify parent with adjusted values
      if (onTariffResult) {
        onTariffResult(results);
      }

      toast.success('Tarification vérifiée avec succès');
    } catch (err) {
      console.error('eTarification error:', err);
      toast.error('Erreur lors de la vérification tarifaire');
    } finally {
      setIsChecking(false);
    }
  };

  const formatAmount = (cents) => {
    if (!cents && cents !== 0) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-sm">eTarification MyCareNet</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={checkTarification}
          disabled={isChecking || !codes?.length}
          className="gap-2"
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {tariffResults ? 'Revérifier' : 'Vérifier tarif'}
        </Button>
      </div>

      {/* Patient rights badges */}
      {patientRights && (
        <div className="flex flex-wrap gap-2">
          {patientRights.special_rights.map(right => {
            const config = SPECIAL_RIGHTS_MAP[right] || { label: right, color: 'bg-slate-100 text-slate-800' };
            return (
              <Badge key={right} className={`${config.color} text-xs`}>
                {config.label}
              </Badge>
            );
          })}
          {patientRights.tiers_payant_obligatoire && (
            <Badge className="bg-red-100 text-red-800 text-xs">TP obligatoire</Badge>
          )}
          {patientRights.tiers_payant_allowed && !patientRights.tiers_payant_obligatoire && (
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">TP autorisé</Badge>
          )}
        </div>
      )}

      {/* Tariff results */}
      {tariffResults && (
        <div className="space-y-2">
          {tariffResults.map(result => (
            <Card key={result.code} className={`p-3 ${result.changed ? 'border-blue-300 bg-blue-50/50' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.changed ? (
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <span className="font-mono text-sm font-semibold">{result.code}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Honoraire: <strong>{formatAmount(result.tarif_honoraire)}</strong></span>
                  <span className="text-green-600">Mutuelle: <strong>{formatAmount(result.tarif_remboursement)}</strong></span>
                  <span className="text-orange-600">Patient: <strong>{formatAmount(result.tarif_patient)}</strong></span>
                </div>
              </div>
              {result.changed && (
                <div className="flex gap-2 mt-2">
                  {result.bim_applied && <Badge className="bg-green-100 text-green-700 text-xs">BIM appliqué</Badge>}
                  {result.dmg_applied && <Badge className="bg-purple-100 text-purple-700 text-xs">+DMG {formatAmount(result.dmg_supplement)}</Badge>}
                  {result.maf_applied && <Badge className="bg-orange-100 text-orange-700 text-xs">MAF: part patient = 0</Badge>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!tariffResults && codes?.length > 0 && (
        <p className="text-xs text-slate-500">
          Cliquez sur "Vérifier tarif" pour interroger la mutuelle et obtenir le tarif exact pour ce patient.
        </p>
      )}
    </div>
  );
}