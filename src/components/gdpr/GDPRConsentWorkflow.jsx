/**
 * Workflow de consentement RGPD / droits du patient
 *
 * Références légales :
 *  - RGPD (UE) 2016/679, art. 9(2)(h) : traitement à des fins médicales —
 *    base légale : nécessité pour des soins de santé, PAS le consentement libre.
 *  - Loi belge 30/07/2018 relative à la protection des personnes physiques
 *    à l'égard des traitements de données à caractère personnel.
 *  - Loi belge 22/08/2002 sur les droits du patient.
 *  - AR 21/09/2018 relatif à la plateforme eHealth (partage de données).
 *
 * IMPORTANT :
 *  - Pour les soins primaires (traitement médical), la base légale est l'art. 9(2)(h)
 *    RGPD, PAS le consentement (art. 9(2)(a)). Le consentement "libre" serait invalide
 *    car le patient dépend du médecin pour ses soins.
 *  - Le partage via le Hub / Réseau santé wallon / Vitalink requiert le consentement
 *    eHealth (AR 21/09/2018), qui est distinct du consentement RGPD.
 *  - Les données médicales NE peuvent PAS être effacées (pas de droit à l'oubli)
 *    en vertu de l'art. 17(3)(c) RGPD et de la loi sur les droits du patient.
 *    Conservation minimum : 30 ans (adultes) / 30 ans après majorité (mineurs).
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Info, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CONSENT_VERSION = '2.0';

export default function GDPRConsentWorkflow({ patient, isOpen, onClose, onConsented }) {
  const [consents, setConsents] = useState({
    // Prise de connaissance de la politique de confidentialité (obligatoire)
    privacy_notice_acknowledged: false,
    // Consentement eHealth Hub (partage inter-établissements via plateforme belge)
    ehealth_hub_sharing: false,
    // Consentement recherche médicale anonymisée (optionnel)
    anonymized_research: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const patientName = patient
    ? `${patient.name?.[0]?.given?.join(' ') || ''} ${patient.name?.[0]?.family || ''}`.trim()
    : 'Patient';

  const handleSave = async () => {
    if (!consents.privacy_notice_acknowledged) {
      toast.error('Le patient doit prendre connaissance de la politique de confidentialité.');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          version: CONSENT_VERSION,
          consent_date: new Date().toISOString(),
          // Base légale principale : art. 9(2)(h) RGPD — soins de santé (pas consentement libre)
          legal_basis_treatment: 'RGPD art. 9(2)(h) – soins de santé',
          // Prise de connaissance de la politique (transparence art. 13-14 RGPD)
          privacy_notice_acknowledged: consents.privacy_notice_acknowledged,
          privacy_notice_date: new Date().toISOString(),
          // Consentement eHealth Hub (AR 21/09/2018 — distinct du RGPD)
          ehealth_hub_sharing_consent: consents.ehealth_hub_sharing,
          ehealth_hub_consent_date: consents.ehealth_hub_sharing ? new Date().toISOString() : null,
          // Consentement recherche anonymisée (art. 9(2)(j) RGPD)
          anonymized_research_consent: consents.anonymized_research,
          // Droits du patient informés
          patient_rights_informed: true,
          // Durée de conservation légale
          retention_period: '30 ans minimum (Loi droits du patient + SPF Santé publique)',
          // Le droit à l'effacement ne s'applique PAS aux données médicales (art. 17(3)(c) RGPD)
          erasure_right_applicable: false,
          revoked: false,
        },
      });
      toast.success('Consentement enregistré');
      onConsented?.();
      onClose();
    } catch (error) {
      console.error('Erreur RGPD:', error);
      toast.error("Erreur lors de l'enregistrement du consentement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Information et consentements — {patientName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-2">
            {/* Base légale principale */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900 space-y-1">
                <p>
                  <strong>Base légale du traitement (art. 9(2)(h) RGPD) :</strong> vos données
                  de santé sont traitées dans le cadre de la dispensation de soins médicaux.
                  Cette base légale ne nécessite pas votre consentement préalable pour les soins
                  directs, mais vous avez le droit d'être informé(e).
                </p>
                <p>
                  <strong>Loi belge 30/07/2018 :</strong> responsable du traitement : votre
                  médecin traitant. DPO : consultez l'affichage en salle d'attente ou demandez
                  au secrétariat.
                </p>
              </AlertDescription>
            </Alert>

            {/* Droits du patient */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <p className="text-sm font-semibold mb-3">
                Vos droits (Loi 22/08/2002 + RGPD) :
              </p>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                <li>Accès à votre dossier médical (copie sous 15 jours)</li>
                <li>Rectification des données inexactes</li>
                <li>Désignation d'une personne de confiance</li>
                <li>
                  <strong>Pas de droit à l'effacement</strong> pour les données médicales
                  (art. 17(3)(c) RGPD) — conservation minimale : <strong>30 ans</strong>
                </li>
                <li>Portabilité de votre dossier vers un autre prestataire</li>
                <li>Dépôt d'une plainte auprès de l'Autorité de Protection des Données (APD)</li>
              </ul>
            </div>

            {/* Durée de conservation */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-900">
                <strong>Conservation :</strong> votre dossier médical est conservé{' '}
                <strong>30 ans minimum</strong> à compter de votre dernier contact (50 ans si
                vous êtes mineur(e) au début du traitement). Cette obligation légale prime sur
                toute demande d'effacement.
              </AlertDescription>
            </Alert>

            {/* Formulaires de consentement */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">Documents à signer :</p>

              {/* 1. Prise de connaissance politique de confidentialité */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="privacy_notice"
                  checked={consents.privacy_notice_acknowledged}
                  onCheckedChange={(v) =>
                    setConsents((prev) => ({ ...prev, privacy_notice_acknowledged: v }))
                  }
                />
                <div>
                  <Label htmlFor="privacy_notice" className="font-medium cursor-pointer">
                    Prise de connaissance de la politique de confidentialité *
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    J'ai été informé(e) de la manière dont mes données de santé sont traitées,
                    de mes droits et de la durée de conservation. Je comprends que ce traitement
                    est basé sur l'art. 9(2)(h) RGPD et non sur mon consentement.
                  </p>
                </div>
              </div>

              {/* 2. Consentement Hub eHealth (AR 21/09/2018) */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="ehealth_hub"
                  checked={consents.ehealth_hub_sharing}
                  onCheckedChange={(v) =>
                    setConsents((prev) => ({ ...prev, ehealth_hub_sharing: v }))
                  }
                />
                <div>
                  <Label htmlFor="ehealth_hub" className="font-medium cursor-pointer">
                    Partage via le Hub de santé belge (eHealth / Vitalink / RSW / Abrumet)
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    J'autorise le partage de mon dossier médical avec d'autres professionnels
                    de santé qui me suivent, via la plateforme eHealth belge (AR 21/09/2018).
                    Ce consentement est révocable à tout moment.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Recommandé pour assurer la continuité des soins entre prestataires.
                  </p>
                </div>
              </div>

              {/* 3. Recherche anonymisée */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="research"
                  checked={consents.anonymized_research}
                  onCheckedChange={(v) =>
                    setConsents((prev) => ({ ...prev, anonymized_research: v }))
                  }
                />
                <div>
                  <Label htmlFor="research" className="font-medium cursor-pointer">
                    Utilisation à des fins de recherche médicale anonymisée
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    J'autorise l'utilisation de mes données médicales, strictement anonymisées,
                    à des fins de recherche épidémiologique ou de santé publique
                    (art. 9(2)(j) RGPD). Refus sans conséquence sur ma prise en charge.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Version du document : {CONSENT_VERSION} —{' '}
              {format(new Date(), 'dd/MM/yyyy', { locale: fr })}
            </p>
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !consents.privacy_notice_acknowledged}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
