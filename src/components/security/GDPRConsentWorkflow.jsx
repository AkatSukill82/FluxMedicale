import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  FileText, 
  UserCheck, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  Edit,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const CONSENT_VERSION = '2.0';

const CONSENT_ITEMS = [
  {
    id: 'data_processing',
    title: 'Traitement des données médicales',
    description: 'J\'autorise le traitement de mes données médicales pour la gestion de mon dossier de santé.',
    required: true,
    legal_basis: 'Article 9(2)(h) RGPD - Soins de santé'
  },
  {
    id: 'data_sharing',
    title: 'Partage avec professionnels de santé',
    description: 'J\'autorise le partage de mes données avec d\'autres professionnels de santé impliqués dans ma prise en charge (spécialistes, laboratoires, hôpitaux).',
    required: false,
    legal_basis: 'Article 9(2)(h) RGPD - Continuité des soins'
  },
  {
    id: 'hub_access',
    title: 'Accès aux coffres-forts régionaux',
    description: 'J\'autorise l\'accès et le partage de mes données via les hubs de santé (RSW, Vitalink, CoZo).',
    required: false,
    legal_basis: 'Consentement explicite - eHealth Belgique'
  },
  {
    id: 'research',
    title: 'Recherche médicale anonymisée',
    description: 'J\'autorise l\'utilisation de mes données anonymisées à des fins de recherche médicale.',
    required: false,
    legal_basis: 'Article 89 RGPD - Recherche scientifique'
  },
  {
    id: 'communication',
    title: 'Communications électroniques',
    description: 'J\'autorise l\'envoi de rappels de rendez-vous, résultats d\'examens et informations de santé par email/SMS.',
    required: false,
    legal_basis: 'Article 6(1)(a) RGPD - Consentement'
  }
];

export default function GDPRConsentWorkflow({ patient, isOpen, onClose, onConsentUpdated }) {
  const queryClient = useQueryClient();
  const [consents, setConsents] = useState(() => {
    const existing = patient?.gdpr_consent || {};
    return CONSENT_ITEMS.reduce((acc, item) => {
      acc[item.id] = existing[item.id] || false;
      return acc;
    }, {});
  });
  const [signature, setSignature] = useState('');

  const hasExistingConsent = patient?.gdpr_consent?.has_consented;

  const updateConsentMutation = useMutation({
    mutationFn: async (consentData) => {
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          has_consented: true,
          consent_date: new Date().toISOString(),
          consent_version: CONSENT_VERSION,
          ...consentData,
          revoked: false,
          revoked_date: null
        }
      });

      // Log audit
      const currentUser = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'GDPR_CONSENT_UPDATED',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Consentement RGPD v${CONSENT_VERSION} enregistré. Items: ${Object.entries(consentData).filter(([k,v]) => v).map(([k]) => k).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient'] });
      toast.success('Consentement RGPD enregistré');
      onConsentUpdated?.();
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const revokeConsentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Patient.update(patient.id, {
        gdpr_consent: {
          ...patient.gdpr_consent,
          revoked: true,
          revoked_date: new Date().toISOString()
        }
      });

      const currentUser = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'GDPR_CONSENT_REVOKED',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Consentement RGPD révoqué par le patient`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient'] });
      toast.success('Consentement révoqué');
      onConsentUpdated?.();
      onClose();
    }
  });

  const handleSubmit = () => {
    const requiredItems = CONSENT_ITEMS.filter(i => i.required);
    const allRequiredChecked = requiredItems.every(i => consents[i.id]);
    
    if (!allRequiredChecked) {
      toast.error('Veuillez accepter tous les consentements obligatoires');
      return;
    }

    updateConsentMutation.mutate(consents);
  };

  const toggleConsent = (id) => {
    setConsents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Consentement RGPD
          </DialogTitle>
          <DialogDescription>
            Gestion du consentement patient conformément au RGPD et à la législation belge
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Statut actuel */}
          {hasExistingConsent && !patient.gdpr_consent.revoked && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Consentement actif</strong> - Version {patient.gdpr_consent.consent_version || '1.0'}<br />
                <span className="text-sm">
                  Enregistré le {format(new Date(patient.gdpr_consent.consent_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {patient?.gdpr_consent?.revoked && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Consentement révoqué</strong><br />
                <span className="text-sm">
                  Le {format(new Date(patient.gdpr_consent.revoked_date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Liste des consentements */}
          <div className="space-y-3">
            {CONSENT_ITEMS.map((item) => (
              <Card 
                key={item.id} 
                className={`cursor-pointer transition-all ${consents[item.id] ? 'border-green-300 bg-green-50' : ''}`}
                onClick={() => toggleConsent(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={consents[item.id]} 
                      onCheckedChange={() => toggleConsent(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.title}</p>
                        {item.required && (
                          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        Base légale: {item.legal_basis}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Droits du patient */}
          <Card className="bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Vos droits RGPD
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2">
                <Eye className="w-4 h-4" />
                Droit d'accès
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2">
                <Edit className="w-4 h-4" />
                Droit de rectification
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2">
                <Download className="w-4 h-4" />
                Droit à la portabilité
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start gap-2 text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => revokeConsentMutation.mutate()}
                disabled={revokeConsentMutation.isPending || !hasExistingConsent}
              >
                <Trash2 className="w-4 h-4" />
                Droit à l'effacement
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={updateConsentMutation.isPending}
            >
              {updateConsentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Enregistrer le consentement
            </Button>
          </div>

          <p className="text-xs text-center text-slate-400">
            Version du formulaire: {CONSENT_VERSION} • Conforme RGPD & Loi belge du 30/07/2018
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}