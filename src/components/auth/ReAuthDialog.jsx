import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReAuthDialog({ isOpen, onSuccess, onCancel, user }) {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const hasMFA = user?.mfa_enabled;

  const handleVerify = async () => {
    setError(null);

    if (!password) {
      setError('Mot de passe requis');
      return;
    }

    if (hasMFA && !totpCode) {
      setError('Code 2FA requis');
      return;
    }

    setIsVerifying(true);

    try {
      // Vérification via backend
      // En production : appel à un endpoint /auth/verify-session
      // qui vérifie le mot de passe et le code TOTP sans créer de nouvelle session
      
      // Simulation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Vérifier TOTP si activé
      if (hasMFA) {
        const isValidCode = totpCode.length === 6 && /^\d{6}$/.test(totpCode);
        if (!isValidCode) {
          throw new Error('Code 2FA invalide');
        }
      }

      toast.success('Re-authentification réussie');
      onSuccess();

    } catch (error) {
      console.error('Erreur re-auth:', error);
      setError(error.message || 'Authentification échouée');
      toast.error('Authentification échouée');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isVerifying && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Confirmer votre identité</DialogTitle>
              <DialogDescription>
                Cette action nécessite une re-authentification
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="bg-orange-50 border-orange-200">
          <Lock className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-900 text-sm">
            <strong>Sécurité renforcée:</strong> Veuillez confirmer votre mot de passe
            {hasMFA && ' et votre code 2FA'} pour enregistrer vos modifications.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Votre mot de passe"
              disabled={isVerifying}
              autoFocus
            />
          </div>

          {hasMFA && (
            <div>
              <Label>Code 2FA (6 chiffres)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={handleKeyDown}
                placeholder="000000"
                disabled={isVerifying}
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isVerifying ? 'Vérification...' : 'Confirmer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}