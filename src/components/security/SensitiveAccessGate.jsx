import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  Eye,
  Loader2,
  Key,
  FileWarning
} from 'lucide-react';
import { toast } from 'sonner';

const SENSITIVE_LABELS = {
  psychiatric: { label: 'Psychiatrie', icon: '🧠', color: 'bg-purple-100 text-purple-800' },
  hiv_std: { label: 'VIH/IST', icon: '🔬', color: 'bg-red-100 text-red-800' },
  genetics: { label: 'Génétique', icon: '🧬', color: 'bg-blue-100 text-blue-800' },
  reproductive: { label: 'Santé reproductive', icon: '👶', color: 'bg-pink-100 text-pink-800' },
  addiction: { label: 'Addictions', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
  violence: { label: 'Violence', icon: '🛡️', color: 'bg-amber-100 text-amber-800' }
};

const ACCESS_LEVEL_INFO = {
  restricted: {
    title: 'Accès restreint',
    description: 'Ce document est réservé au médecin traitant.',
    icon: Lock,
    color: 'text-yellow-600'
  },
  confidential: {
    title: 'Document confidentiel',
    description: 'Une autorisation explicite et une justification sont requises.',
    icon: Shield,
    color: 'text-orange-600'
  },
  sealed: {
    title: 'Document scellé',
    description: 'Accès extrêmement restreint. Tout accès sera audité.',
    icon: Key,
    color: 'text-red-600'
  }
};

export default function SensitiveAccessGate({ document, onAccessGranted, onCancel }) {
  const [justification, setJustification] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const accessLevel = document?.access_level || 'restricted';
  const levelInfo = ACCESS_LEVEL_INFO[accessLevel];
  const Icon = levelInfo?.icon || Lock;

  const requestAccessMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Vérifier si l'utilisateur est autorisé
      const isAuthorized = document.authorized_users?.includes(currentUser.email) || 
                          document.created_by === currentUser.email;

      if (!isAuthorized && accessLevel === 'sealed') {
        throw new Error('Vous n\'êtes pas autorisé à accéder à ce document scellé');
      }

      // Log l'accès
      await base44.entities.DataAccessLog.create({
        user_email: currentUser.email,
        document_id: document.id,
        patient_id: document.patient_id,
        access_type: 'VIEW_SENSITIVE',
        justification: justification,
        document_categories: document.sensitive_categories || [],
        access_level: accessLevel,
        timestamp: new Date().toISOString(),
        ip_address: 'N/A', // Serait récupéré côté serveur
        user_agent: navigator.userAgent
      });

      // Audit log également
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'SENSITIVE_DATA_ACCESS',
        target_entity: 'SecureDocument',
        target_id: document.id,
        details: `Accès au document sensible (${accessLevel}). Justification: ${justification}`,
        timestamp: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      toast.success('Accès autorisé - Action enregistrée dans l\'audit');
      onAccessGranted();
    },
    onError: (error) => {
      toast.error(error.message || 'Accès refusé');
    }
  });

  const handleRequestAccess = () => {
    if (!justification || justification.length < 10) {
      toast.error('Veuillez fournir une justification détaillée (min. 10 caractères)');
      return;
    }

    if (accessLevel === 'sealed' && confirmPhrase !== 'J\'ACCEPTE') {
      toast.error('Veuillez confirmer en tapant exactement "J\'ACCEPTE"');
      return;
    }

    requestAccessMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${levelInfo?.color}`} />
            {levelInfo?.title || 'Accès restreint'}
          </DialogTitle>
          <DialogDescription>
            {levelInfo?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Avertissement */}
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Attention :</strong> L'accès à ce document sera enregistré dans le journal d'audit 
              conformément au RGPD et aux exigences de l'INAMI.
            </AlertDescription>
          </Alert>

          {/* Catégories sensibles */}
          {document?.sensitive_categories?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Catégories de données :</p>
              <div className="flex flex-wrap gap-2">
                {document.sensitive_categories.map(catId => {
                  const cat = SENSITIVE_LABELS[catId];
                  return cat ? (
                    <Badge key={catId} className={cat.color}>
                      {cat.icon} {cat.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Justification obligatoire */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Justification de l'accès <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Expliquez pourquoi vous avez besoin d'accéder à ce document..."
              className="h-24"
            />
            <p className="text-xs text-slate-500">
              Cette justification sera conservée dans le journal d'audit
            </p>
          </div>

          {/* Confirmation supplémentaire pour documents scellés */}
          {accessLevel === 'sealed' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-600">
                Confirmation requise
              </label>
              <p className="text-xs text-slate-600">
                Tapez <strong>"J'ACCEPTE"</strong> pour confirmer que vous comprenez la sensibilité de ces données
              </p>
              <Input
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="J'ACCEPTE"
                className="font-mono"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleRequestAccess}
              className={`flex-1 ${accessLevel === 'sealed' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={requestAccessMutation.isPending}
            >
              {requestAccessMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Accéder au document
            </Button>
          </div>

          <p className="text-xs text-center text-slate-400">
            Conforme RGPD Art. 9 & Loi belge relative aux droits du patient
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}