/**
 * Vérification TOTP (Time-based One-Time Password) — RFC 6238
 *
 * SÉCURITÉ CRITIQUE : la vérification du code doit impérativement se faire
 * CÔTÉ SERVEUR (fonction backend sécurisée), jamais côté client.
 * Raisons :
 *  - Le secret TOTP ne doit jamais transiter vers le navigateur
 *  - La vérification client est contournable par inspection du JS
 *  - Le rate-limiting doit être appliqué côté serveur (pas seulement UI)
 *
 * Conformité : NIST SP 800-63B AAL2, eHealth platform MFA requirements
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Loader2, Key } from 'lucide-react';
import { AuditLog } from '@/entities/AuditLog';
import { base44 } from '@/api/base44Client';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export default function TOTPVerification({ userEmail, onSuccess, onCancel }) {
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [lockedUntil, setLockedUntil] = useState(null);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) {
      const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      setLockedUntil(until);
      setError(`Trop de tentatives. Compte bloqué jusqu'à ${until.toLocaleTimeString('fr-BE')}.`);
    }
  }, [attempts]);

  const isLocked = lockedUntil && new Date() < lockedUntil;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (isLocked || attempts >= MAX_ATTEMPTS) return;

    setIsLoading(true);
    setError(null);

    try {
      // Appel backend pour vérification TOTP sécurisée côté serveur
      // Le backend vérifie avec clock-skew ±1 pas (30s) et invalide le code
      // après usage pour éviter les replay attacks
      let isValid = false;

      try {
        const result = await base44.functions.verifyTOTP({
          user_email: userEmail,
          totp_code: totpCode,
        });
        isValid = result?.valid === true;
      } catch (backendErr) {
        // Si la fonction backend n'est pas encore déployée, bloquer plutôt
        // qu'accepter — fail secure (principe de moindre privilège)
        throw new Error(
          'Service de vérification MFA indisponible. Contactez l\'administrateur.'
        );
      }

      if (isValid) {
        await AuditLog.create({
          user_email: userEmail,
          action: 'MFA_VERIFY_SUCCESS',
          target_entity: 'User',
          details: 'Authentification TOTP réussie',
          timestamp: new Date().toISOString(),
        });
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        await AuditLog.create({
          user_email: userEmail,
          action: 'MFA_VERIFY_FAILED',
          target_entity: 'User',
          details: `Échec TOTP (tentative ${newAttempts}/${MAX_ATTEMPTS})`,
          timestamp: new Date().toISOString(),
        });
        setError(
          newAttempts >= MAX_ATTEMPTS
            ? `Compte bloqué après ${MAX_ATTEMPTS} tentatives (${LOCKOUT_MINUTES} min).`
            : `Code invalide. Tentatives restantes : ${MAX_ATTEMPTS - newAttempts}.`
        );
        setTotpCode('');
      }
    } catch (err) {
      setError(err.message || 'Erreur de vérification. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodeVerify = async () => {
    if (!backupCode.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await base44.functions.verifyBackupCode({
        user_email: userEmail,
        backup_code: backupCode.trim().toUpperCase(),
      });

      if (result?.valid === true) {
        await AuditLog.create({
          user_email: userEmail,
          action: 'MFA_BACKUP_CODE_USED',
          target_entity: 'User',
          details: 'Code de secours utilisé — invalidé après usage',
          timestamp: new Date().toISOString(),
        });
        onSuccess();
      } else {
        setError('Code de secours invalide ou déjà utilisé.');
        setBackupCode('');
      }
    } catch (err) {
      setError(err.message || 'Erreur de vérification du code de secours.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl text-center">Authentification à deux facteurs</CardTitle>
        <CardDescription className="text-center">
          Entrez le code à 6 chiffres de votre application d'authentification
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showBackupCode ? (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="text-center text-3xl font-mono tracking-widest"
                autoFocus
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-2">
                Code TOTP • Période 30s • RFC 6238
              </p>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {attempts > 0 && !isLocked && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800">
                  Tentatives restantes : {MAX_ATTEMPTS - attempts}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading || totpCode.length !== 6 || isLocked}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Vérification…</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Vérifier le code</>
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowBackupCode(true)}
                className="text-sm text-slate-600"
              >
                <Key className="w-3 h-3 mr-2" />
                Utiliser un code de secours
              </Button>
            </div>

            <Button type="button" variant="outline" onClick={onCancel} className="w-full">
              Annuler
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Code de secours</strong><br />
                Entrez l'un de vos codes à usage unique. Il sera invalidé immédiatement après usage.
              </AlertDescription>
            </Alert>

            <Input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              className="text-center font-mono"
            />

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleBackupCodeVerify}
              disabled={isLoading || !backupCode.trim()}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Vérifier le code de secours
            </Button>

            <Button variant="outline" onClick={() => { setShowBackupCode(false); setError(null); }} className="w-full">
              Retour au code TOTP
            </Button>
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 text-center">
            🔒 Vérification serveur · Clock-skew ±30s · Rate-limit {MAX_ATTEMPTS} tentatives/{LOCKOUT_MINUTES}min<br />
            Conforme NIST SP 800-63B (AAL2)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
