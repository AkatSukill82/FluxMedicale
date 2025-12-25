import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Loader2,
  FileText,
  Users,
  Key
} from 'lucide-react';
import { toast } from 'sonner';

// Catégories de données sensibles selon RGPD Art. 9
const SENSITIVE_CATEGORIES = [
  {
    id: 'psychiatric',
    label: 'Psychiatrie / Santé mentale',
    icon: '🧠',
    description: 'Troubles psychiatriques, dépression, anxiété, addictions',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  {
    id: 'hiv_std',
    label: 'VIH / IST',
    icon: '🔬',
    description: 'Infections sexuellement transmissibles, sérologie VIH',
    color: 'bg-red-100 text-red-800 border-red-300'
  },
  {
    id: 'genetics',
    label: 'Données génétiques',
    icon: '🧬',
    description: 'Tests génétiques, maladies héréditaires',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    id: 'reproductive',
    label: 'Santé reproductive',
    icon: '👶',
    description: 'IVG, PMA, contraception, grossesse',
    color: 'bg-pink-100 text-pink-800 border-pink-300'
  },
  {
    id: 'addiction',
    label: 'Addictions',
    icon: '⚠️',
    description: 'Toxicomanie, alcoolisme, traitement de substitution',
    color: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  {
    id: 'violence',
    label: 'Violence / Maltraitance',
    icon: '🛡️',
    description: 'Violence conjugale, abus, maltraitance',
    color: 'bg-amber-100 text-amber-800 border-amber-300'
  }
];

const ACCESS_LEVELS = [
  { value: 'standard', label: 'Standard', description: 'Accessible à tous les praticiens du cabinet' },
  { value: 'restricted', label: 'Restreint', description: 'Médecin traitant uniquement' },
  { value: 'confidential', label: 'Confidentiel', description: 'Médecin + autorisation explicite requise' },
  { value: 'sealed', label: 'Scellé', description: 'Médecin uniquement, caché de l\'historique' }
];

export default function SensitiveDataManager({ document, patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [accessLevel, setAccessLevel] = useState(document?.access_level || 'standard');
  const [categories, setCategories] = useState(document?.sensitive_categories || []);
  const [authorizedUsers, setAuthorizedUsers] = useState(document?.authorized_users || []);
  const [justification, setJustification] = useState('');

  const updateSecurityMutation = useMutation({
    mutationFn: async (data) => {
      // Mettre à jour le document avec les paramètres de sécurité
      await base44.entities.SecureDocument.update(document.id, {
        access_level: data.accessLevel,
        sensitive_categories: data.categories,
        authorized_users: data.authorizedUsers,
        is_encrypted: data.accessLevel !== 'standard',
        encryption_date: data.accessLevel !== 'standard' ? new Date().toISOString() : null
      });

      // Audit log
      const currentUser = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'SENSITIVE_DATA_CLASSIFICATION',
        target_entity: 'SecureDocument',
        target_id: document.id,
        details: `Niveau: ${data.accessLevel}, Catégories: ${data.categories.join(', ')}. Justification: ${data.justification}`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-documents'] });
      toast.success('Classification de sécurité mise à jour');
      onUpdate?.();
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const toggleCategory = (categoryId) => {
    setCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = () => {
    if (accessLevel !== 'standard' && !justification) {
      toast.error('Veuillez justifier la classification');
      return;
    }

    updateSecurityMutation.mutate({
      accessLevel,
      categories,
      authorizedUsers,
      justification
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Classification des données sensibles
          </DialogTitle>
          <DialogDescription>
            Définir le niveau de confidentialité et les restrictions d'accès
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Niveau d'accès */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Niveau d'accès
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {ACCESS_LEVELS.map(level => (
                <Card 
                  key={level.value}
                  className={`cursor-pointer transition-all ${accessLevel === level.value ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}
                  onClick={() => setAccessLevel(level.value)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {level.value === 'standard' && <Eye className="w-4 h-4 text-green-600" />}
                      {level.value === 'restricted' && <EyeOff className="w-4 h-4 text-yellow-600" />}
                      {level.value === 'confidential' && <Lock className="w-4 h-4 text-orange-600" />}
                      {level.value === 'sealed' && <Key className="w-4 h-4 text-red-600" />}
                      <span className="font-medium text-sm">{level.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">{level.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Catégories sensibles */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Catégories de données sensibles
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {SENSITIVE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    categories.includes(cat.id) 
                      ? cat.color + ' ring-2 ring-offset-1' 
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium text-sm">{cat.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Alerte si données très sensibles */}
          {(accessLevel === 'sealed' || categories.includes('hiv_std') || categories.includes('psychiatric')) && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Données hautement sensibles</strong><br />
                Ces données seront chiffrées et leur accès strictement limité. 
                Un journal d'audit complet sera maintenu pour toute consultation.
              </AlertDescription>
            </Alert>
          )}

          {/* Justification obligatoire */}
          {accessLevel !== 'standard' && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Justification de la classification *</h3>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Expliquez pourquoi cette classification est nécessaire..."
                className="h-20"
              />
            </div>
          )}

          {/* Info chiffrement */}
          {accessLevel !== 'standard' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">Chiffrement activé</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Le document sera chiffré AES-256. Seuls les utilisateurs autorisés pourront le déchiffrer.
                      Tout accès sera tracé dans le journal d'audit.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={updateSecurityMutation.isPending}
            >
              {updateSecurityMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Appliquer la classification
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}