import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickAssurabilityCheck({ patient }) {
  const queryClient = useQueryClient();
  const [lastCheck, setLastCheck] = useState(null);

  const niss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value;

  const checkMutation = useMutation({
    mutationFn: async () => {
      if (!niss) {
        throw new Error('NISS non renseigné');
      }

      // Simulation de vérification MyCareNet
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simuler une réponse MyCareNet
      const mockResponse = {
        oa_code: '300',
        oa_name: 'Mutualité Chrétienne',
        insurance_period_start: '2024-01-01',
        insurance_period_end: '2024-12-31',
        tiers_payant_allowed: true,
        special_rights: Math.random() > 0.7 ? ['BIM'] : []
      };

      // Sauvegarder dans Assurabilite
      const existingAssur = await base44.entities.Assurabilite.filter({
        patient_niss: niss
      }, '-last_checked_at', 1);

      const assurData = {
        patient_id: patient.id,
        patient_niss: niss,
        oa_code: mockResponse.oa_code,
        oa_name: mockResponse.oa_name,
        insurance_period_start: mockResponse.insurance_period_start,
        insurance_period_end: mockResponse.insurance_period_end,
        tiers_payant_allowed: mockResponse.tiers_payant_allowed,
        special_rights: mockResponse.special_rights,
        last_checked_at: new Date().toISOString(),
        checked_by: (await base44.auth.me()).email
      };

      if (existingAssur.length > 0) {
        await base44.entities.Assurabilite.update(existingAssur[0].id, assurData);
      } else {
        await base44.entities.Assurabilite.create(assurData);
      }

      // Mettre à jour les données mutuelle du patient
      await base44.entities.Patient.update(patient.id, {
        mutuelle: mockResponse.oa_name,
        numero_mutuelle: mockResponse.oa_code
      });

      return mockResponse;
    },
    onSuccess: (data) => {
      setLastCheck(data);
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['assurabilite', patient.id] });
      toast.success(`Mutuelle mise à jour: ${data.oa_name}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la vérification');
    }
  });

  const hasBIM = lastCheck?.special_rights?.includes('BIM') || 
    patient?.mutuelle?.toLowerCase().includes('bim');

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => checkMutation.mutate()}
        disabled={checkMutation.isPending || !niss}
        className="h-7 px-2 text-xs gap-1"
        title={niss ? "Vérifier l'assurabilité" : "NISS requis"}
      >
        {checkMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Shield className="w-3 h-3" />
        )}
        <span className="hidden sm:inline">Check</span>
      </Button>

      {patient?.mutuelle && (
        <Badge variant="outline" className="text-xs font-normal">
          {patient.mutuelle}
          {hasBIM && (
            <span className="ml-1 text-purple-600 font-semibold">BIM</span>
          )}
        </Badge>
      )}

      {lastCheck && (
        <CheckCircle2 className="w-4 h-4 text-green-500" title="Vérifié" />
      )}
    </div>
  );
}