import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Users, Database, Lock } from 'lucide-react';
import { toast } from 'sonner';

const CONSENT_VERSION = '1.0.0';

export default function GDPRConsent({ patient, isOpen, onClose, onConsentGranted }) {
  const [dataProcessing, setDataProcessing] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);
  const [hasReadAll, setHasReadAll] = useState(false);

  const handleSubmit = async () => {
    if (!dataProcessing) {
      toast.error('Le consentement au traitement des données est obligatoire');
      return;
    }

    if (!hasReadAll) {
      toast.error('Veuillez lire l\'intégralité du document');
      return;
    }

    try {
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: CONSENT_VERSION,
          data_processing_consent: dataProcessing,
          data_sharing_consent: dataSharing,
          revoked: false
        }
      });

      // Logger le consentement
      await base44.entities.AuditLog.create({
        user_email: (await base44.auth.me()).email,
        action: 'GDPR_CONSENT_GRANTED',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Consentement RGPD accordé - Traitement: ${dataProcessing}, Partage: ${dataSharing}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Consentement RGPD enregistré');
      if (onConsentGranted) onConsentGranted();
      onClose();
    } catch (error) {
      console.error('Error saving consent:', error);
      toast.error('Erreur lors de l\'enregistrement du consentement');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Consentement RGPD - Protection des Données
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96 pr-4">
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="w-5 h-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-semibold mb-2">Respect de votre vie privée</p>
                <p className="text-sm">
                  Conformément au Règlement Général sur la Protection des Données (RGPD), 
                  nous avons besoin de votre consentement pour traiter vos données de santé.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Database className="w-6 h-6 text-slate-600 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Données Collectées</h3>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Identité et coordonnées</li>
                    <li>• Données médicales (consultations, diagnostics, prescriptions)</li>
                    <li>• Historique de soins et traitements</li>
                    <li>• Résultats d'examens et analyses</li>
                    <li>• Informations d'assurance maladie</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <FileText className="w-6 h-6 text-slate-600 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Finalités du Traitement</h3>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Assurer votre suivi médical et la continuité des soins</li>
                    <li>• Établir des diagnostics et prescrire des traitements</li>
                    <li>• Gérer votre dossier médical et administratif</li>
                    <li>• Facturation et gestion avec les mutuelles</li>
                    <li>• Obligations légales et réglementaires</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Users className="w-6 h-6 text-slate-600 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Destinataires des Données</h3>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Votre médecin traitant et l'équipe médicale</li>
                    <li>• Autres professionnels de santé (sur votre demande)</li>
                    <li>• Organismes d'assurance maladie</li>
                    <li>• Autorités sanitaires (si obligation légale)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Lock className="w-6 h-6 text-slate-600 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Vos Droits</h3>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• <strong>Droit d'accès:</strong> Consulter vos données à tout moment</li>
                    <li>• <strong>Droit de rectification:</strong> Corriger vos données</li>
                    <li>• <strong>Droit à l'effacement:</strong> Demander la suppression (sauf obligations légales)</li>
                    <li>• <strong>Droit d'opposition:</strong> Vous opposer au traitement</li>
                    <li>• <strong>Droit à la portabilité:</strong> Récupérer vos données</li>
                    <li>• <strong>Droit de retrait:</strong> Retirer votre consentement à tout moment</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Conservation des Données</h3>
                <p className="text-sm text-slate-700">
                  Vos données médicales sont conservées pendant une durée de <strong>30 ans</strong> 
                  à compter de la dernière consultation, conformément à la législation belge en matière 
                  de dossier médical. Les données administratives sont conservées 10 ans.
                </p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Sécurité</h3>
                <p className="text-sm text-slate-700">
                  Vos données sont protégées par des mesures de sécurité techniques et organisationnelles 
                  conformes au RGPD: chiffrement, contrôle d'accès, audit trail, sauvegardes sécurisées.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Checkbox
              id="dataProcessing"
              checked={dataProcessing}
              onCheckedChange={setDataProcessing}
            />
            <Label htmlFor="dataProcessing" className="text-sm cursor-pointer">
              <strong className="text-red-600">* Obligatoire</strong> - Je consens au traitement de mes 
              données de santé pour les finalités décrites ci-dessus.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="dataSharing"
              checked={dataSharing}
              onCheckedChange={setDataSharing}
            />
            <Label htmlFor="dataSharing" className="text-sm cursor-pointer">
              <strong>Optionnel</strong> - J'autorise le partage de mes données avec d'autres 
              professionnels de santé impliqués dans mes soins.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="hasRead"
              checked={hasReadAll}
              onCheckedChange={setHasReadAll}
            />
            <Label htmlFor="hasRead" className="text-sm cursor-pointer">
              <strong className="text-red-600">* Obligatoire</strong> - J'ai lu et compris 
              l'intégralité des informations concernant le traitement de mes données.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!dataProcessing || !hasReadAll}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Donner mon Consentement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}