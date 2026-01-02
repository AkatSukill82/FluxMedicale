import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Shield,
  Building2,
  Train,
  Globe,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Configuration des régimes d'assurance
const INSURANCE_REGIMES = {
  MUTUELLE_BE: {
    name: 'Mutuelle belge',
    icon: Building2,
    color: 'bg-blue-100 text-blue-800',
    reimbursementRate: 75,
    description: 'Système belge standard (MyCareNet)'
  },
  RCAM: {
    name: 'RCAM (Fonctionnaires UE)',
    icon: Globe,
    color: 'bg-purple-100 text-purple-800',
    reimbursementRate: 85,
    description: 'Régime Commun Assurance Maladie - Commission Européenne'
  },
  SNCB: {
    name: 'HR Rail / SNCB',
    icon: Train,
    color: 'bg-orange-100 text-orange-800',
    reimbursementRate: 100,
    description: 'Cheminots et ayants droit'
  },
  CAAMI: {
    name: 'CAAMI / HZIV',
    icon: Building2,
    color: 'bg-teal-100 text-teal-800',
    reimbursementRate: 75,
    description: 'Caisse Auxiliaire d\'Assurance Maladie-Invalidité'
  },
  OSSOM: {
    name: 'OSSOM',
    icon: Globe,
    color: 'bg-indigo-100 text-indigo-800',
    reimbursementRate: 80,
    description: 'Office de Sécurité Sociale d\'Outre-Mer'
  },
  ASSURANCE_PRIVEE: {
    name: 'Assurance privée',
    icon: CreditCard,
    color: 'bg-green-100 text-green-800',
    reimbursementRate: 100,
    description: 'DKV, AG, Ethias, etc.'
  },
  AUCUN: {
    name: 'Aucune couverture',
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    reimbursementRate: 0,
    description: 'Patient non assuré'
  }
};

const STATUS_CONFIG = {
  EN_ORDRE: { label: 'En ordre', color: 'bg-green-500', icon: CheckCircle2 },
  ACTIF: { label: 'Actif', color: 'bg-green-500', icon: CheckCircle2 },
  PAS_EN_ORDRE: { label: 'Pas en ordre', color: 'bg-red-500', icon: XCircle },
  SUSPENDU: { label: 'Suspendu', color: 'bg-orange-500', icon: AlertTriangle },
  EXPIRE: { label: 'Expiré', color: 'bg-red-500', icon: XCircle },
  NON_VERIFIE: { label: 'Non vérifié', color: 'bg-slate-400', icon: HelpCircle }
};

export default function InsuranceVerification({ patient, onVerified, autoCheck = true }) {
  const queryClient = useQueryClient();
  const [verificationResult, setVerificationResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Vérification automatique à l'ouverture si activée
  useEffect(() => {
    if (autoCheck && patient) {
      checkInsurance();
    }
  }, [patient?.id]);

  const updatePatientMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Patient.update(patient.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
    }
  });

  const checkInsurance = async () => {
    if (!patient) return;
    
    setIsChecking(true);
    setVerificationResult(null);

    try {
      const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value;
      
      // Simuler les vérifications dans différentes bases de données
      const results = await Promise.all([
        checkMyCareNet(niss, patient),
        checkRCAM(niss, patient),
        checkSNCB(niss, patient),
        checkCAAMI(niss, patient)
      ]);

      // Trouver le premier match valide
      const validResult = results.find(r => r.found && r.status === 'EN_ORDRE');
      const anyResult = results.find(r => r.found);

      if (validResult) {
        setVerificationResult(validResult);
        
        // Mettre à jour le patient avec les infos d'assurance
        await updatePatientMutation.mutateAsync({
          insurance_regime: validResult.regime,
          insurance_status: 'EN_ORDRE',
          insurance_verified_at: new Date().toISOString(),
          insurance_details: validResult.details || {}
        });

        toast.success(`Patient trouvé: ${INSURANCE_REGIMES[validResult.regime].name}`);
        onVerified?.(validResult);
      } else if (anyResult) {
        // Trouvé mais pas en ordre
        setVerificationResult(anyResult);
        
        await updatePatientMutation.mutateAsync({
          insurance_regime: anyResult.regime,
          insurance_status: anyResult.status,
          insurance_verified_at: new Date().toISOString(),
          insurance_details: anyResult.details || {}
        });

        toast.warning(`Patient trouvé mais ${STATUS_CONFIG[anyResult.status].label.toLowerCase()}`);
        onVerified?.(anyResult);
      } else {
        // Aucun match trouvé
        const noInsurance = {
          found: false,
          regime: 'AUCUN',
          status: 'NON_VERIFIE',
          message: 'Aucune couverture d\'assurance trouvée'
        };
        setVerificationResult(noInsurance);
        
        await updatePatientMutation.mutateAsync({
          insurance_regime: 'AUCUN',
          insurance_status: 'NON_VERIFIE',
          insurance_verified_at: new Date().toISOString()
        });

        toast.error('Aucune couverture trouvée - Patient non assuré');
        onVerified?.(noInsurance);
      }
    } catch (error) {
      console.error('Erreur vérification assurance:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsChecking(false);
    }
  };

  // Simulation vérification MyCareNet (mutuelles belges)
  const checkMyCareNet = async (niss, patient) => {
    await new Promise(r => setTimeout(r, 500));
    
    // Simulation - en prod, appeler l'API MyCareNet
    if (patient.mutuelle && patient.numero_mutuelle) {
      const isInOrder = Math.random() > 0.2; // 80% en ordre
      return {
        found: true,
        regime: 'MUTUELLE_BE',
        status: isInOrder ? 'EN_ORDRE' : 'PAS_EN_ORDRE',
        details: {
          mutuelle: patient.mutuelle,
          numero: patient.numero_mutuelle,
          bim: Math.random() > 0.7, // 30% BIM
          omnio: Math.random() > 0.8 // 20% OMNIO
        },
        reimbursementRate: isInOrder ? 75 : 0
      };
    }
    return { found: false };
  };

  // Simulation vérification RCAM
  const checkRCAM = async (niss, patient) => {
    await new Promise(r => setTimeout(r, 400));
    
    // Simulation - chercher dans la base RCAM
    // En prod, appeler l'API RCAM de la Commission Européenne
    const rcamDetails = patient.insurance_details?.rcam_number;
    
    if (rcamDetails) {
      return {
        found: true,
        regime: 'RCAM',
        status: 'EN_ORDRE',
        details: {
          rcam_number: rcamDetails,
          category: patient.insurance_details?.rcam_category || '1'
        },
        reimbursementRate: 85
      };
    }
    
    // Vérifier par le nom/NISS dans la base RCAM (simulation)
    if (niss && niss.startsWith('9')) { // Simulation: NISS commençant par 9
      return {
        found: true,
        regime: 'RCAM',
        status: 'EN_ORDRE',
        details: {
          rcam_number: `RCAM-${niss.slice(-6)}`,
          category: '1'
        },
        reimbursementRate: 85
      };
    }
    
    return { found: false };
  };

  // Simulation vérification SNCB/HR Rail
  const checkSNCB = async (niss, patient) => {
    await new Promise(r => setTimeout(r, 300));
    
    const sncbNumber = patient.insurance_details?.sncb_number;
    
    if (sncbNumber) {
      return {
        found: true,
        regime: 'SNCB',
        status: 'EN_ORDRE',
        details: {
          sncb_number: sncbNumber
        },
        reimbursementRate: 100
      };
    }
    
    return { found: false };
  };

  // Simulation vérification CAAMI
  const checkCAAMI = async (niss, patient) => {
    await new Promise(r => setTimeout(r, 300));
    
    // La CAAMI est souvent pour les personnes sans mutuelle classique
    if (patient.mutuelle?.toLowerCase().includes('caami') || 
        patient.mutuelle?.toLowerCase().includes('hziv')) {
      return {
        found: true,
        regime: 'CAAMI',
        status: 'EN_ORDRE',
        details: {},
        reimbursementRate: 75
      };
    }
    
    return { found: false };
  };

  const currentRegime = verificationResult?.regime || patient?.insurance_regime || 'NON_VERIFIE';
  const currentStatus = verificationResult?.status || patient?.insurance_status || 'NON_VERIFIE';
  const regimeConfig = INSURANCE_REGIMES[currentRegime] || INSURANCE_REGIMES.AUCUN;
  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.NON_VERIFIE;
  const StatusIcon = statusConfig.icon;
  const RegimeIcon = regimeConfig.icon;

  return (
    <div className="space-y-3">
      {/* Bouton de vérification */}
      <Button
        onClick={checkInsurance}
        disabled={isChecking}
        variant="outline"
        className="w-full"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Vérification en cours...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Vérifier l'assurabilité
          </>
        )}
      </Button>

      {/* Résultat de la vérification */}
      {(verificationResult || patient?.insurance_regime) && (
        <Alert className={`${
          currentStatus === 'EN_ORDRE' || currentStatus === 'ACTIF'
            ? 'bg-green-50 border-green-200'
            : currentStatus === 'PAS_EN_ORDRE' || currentStatus === 'EXPIRE'
            ? 'bg-red-50 border-red-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            <StatusIcon className={`w-5 h-5 mt-0.5 ${
              currentStatus === 'EN_ORDRE' || currentStatus === 'ACTIF'
                ? 'text-green-600'
                : currentStatus === 'PAS_EN_ORDRE' || currentStatus === 'EXPIRE'
                ? 'text-red-600'
                : 'text-orange-600'
            }`} />
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={regimeConfig.color}>
                  <RegimeIcon className="w-3 h-3 mr-1" />
                  {regimeConfig.name}
                </Badge>
                <Badge variant={
                  currentStatus === 'EN_ORDRE' || currentStatus === 'ACTIF' 
                    ? 'default' 
                    : 'destructive'
                }>
                  {statusConfig.label}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                {regimeConfig.description}
              </p>

              {/* Détails spécifiques au régime */}
              {verificationResult?.details && (
                <div className="text-xs space-y-1 pt-1 border-t border-slate-200">
                  {verificationResult.details.mutuelle && (
                    <p><strong>Mutuelle:</strong> {verificationResult.details.mutuelle}</p>
                  )}
                  {verificationResult.details.numero && (
                    <p><strong>N°:</strong> {verificationResult.details.numero}</p>
                  )}
                  {verificationResult.details.rcam_number && (
                    <p><strong>N° RCAM:</strong> {verificationResult.details.rcam_number}</p>
                  )}
                  {verificationResult.details.rcam_category && (
                    <p><strong>Catégorie:</strong> {verificationResult.details.rcam_category}</p>
                  )}
                  {verificationResult.details.sncb_number && (
                    <p><strong>N° HR Rail:</strong> {verificationResult.details.sncb_number}</p>
                  )}
                  {verificationResult.details.bim && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50">BIM</Badge>
                  )}
                  {verificationResult.details.omnio && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 ml-1">OMNIO</Badge>
                  )}
                </div>
              )}

              {/* Taux de remboursement */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-medium">Taux remboursement:</span>
                <Badge variant="outline" className="text-xs">
                  {verificationResult?.reimbursementRate || regimeConfig.reimbursementRate}%
                </Badge>
              </div>

              {/* Alerte si pas en ordre */}
              {(currentStatus === 'PAS_EN_ORDRE' || currentStatus === 'EXPIRE' || currentStatus === 'SUSPENDU') && (
                <AlertDescription className="text-xs text-red-700 font-medium mt-2 p-2 bg-red-100 rounded">
                  ⚠️ Le patient n'est pas en ordre d'assurance. La facturation sera à charge du patient.
                </AlertDescription>
              )}

              {currentRegime === 'AUCUN' && (
                <AlertDescription className="text-xs text-red-700 font-medium mt-2 p-2 bg-red-100 rounded">
                  ⚠️ Aucune couverture trouvée. Le patient devra payer l'intégralité des soins.
                </AlertDescription>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}