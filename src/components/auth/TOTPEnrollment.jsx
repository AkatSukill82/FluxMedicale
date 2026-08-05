import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Copy, CheckCircle, Download, QrCode, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { recordAudit } from '@/lib/auditLog';

/**
 * Enrôlement TOTP (RFC 6238).
 *
 * Le secret est produit par le serveur (fonction `mfa`), chiffré au repos, et
 * ne transite qu'une seule fois — ici — pour l'affichage du QR code. Celui-ci
 * est rendu localement avec la bibliothèque `qrcode` : le secret n'est jamais
 * envoyé à un service externe de génération d'images.
 *
 * La validation du premier code est faite côté serveur ; le composant ne
 * décide de rien.
 */
export default function TOTPEnrollment({ user, onComplete }) {
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [step, setStep] = useState(1); // 1: QR, 2: vérification, 3: codes de secours
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await base44.functions.mfa({
          action: 'enroll_start',
          device_name: 'Application d\'authentification',
        });
        const data = res?.data ?? res;
        if (data?.error) throw new Error(data.error);
        if (cancelled) return;

        setSecret(data.secret);
        // Rendu local du QR code, sans appel réseau.
        setQrDataUrl(await QRCode.toDataURL(data.otpauth_url, {
          width: 300, margin: 1, errorCorrectionLevel: 'M',
        }));
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error
            || err.message
            || "Impossible de démarrer l'enrôlement MFA.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    start();
    return () => { cancelled = true; };
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const res = await base44.functions.mfa({
        action: 'enroll_confirm',
        code: verificationCode,
      });
      const data = res?.data ?? res;

      if (data?.valid !== true) {
        throw new Error(data?.error || 'Code invalide');
      }

      setBackupCodes(data.backup_codes || []);
      await recordAudit({
        action: 'MFA_ENROLL',
        target_entity: 'MFADevice',
        details: 'Enrôlement TOTP confirmé',
      });
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Vérification échouée');
      setVerificationCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = `FluxMed — Codes de secours\n`
      + `Utilisateur: ${user?.email}\n`
      + `Généré le: ${new Date().toLocaleString('fr-BE')}\n\n`
      + `${backupCodes.join('\n')}\n\n`
      + `⚠️ Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.\n`
      + `Ils ne seront plus jamais affichés.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxmed-codes-secours-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySecret = () => navigator.clipboard.writeText(secret);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-600" />
          Configuration de l&apos;authentification à deux facteurs
        </CardTitle>
        <CardDescription>
          Sécurisez votre compte avec un second facteur d&apos;authentification (TOTP)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Étape 1:</strong> Scannez ce QR code avec votre application
                d&apos;authentification (Google Authenticator, Microsoft Authenticator,
                FreeOTP, Yubico Authenticator…)
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <div className="inline-block p-6 bg-white rounded-xl shadow-lg">
                {isLoading ? (
                  <div className="w-64 h-64 flex items-center justify-center bg-slate-100">
                    <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
                  </div>
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR code TOTP" className="w-64 h-64" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-slate-100">
                    <QrCode className="w-20 h-20 text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            {secret && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Ou entrez manuellement ce secret dans votre application:
                </p>
                <div className="flex gap-2">
                  <Input value={secret} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={handleCopySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Base32 • Période 30 s • SHA-1 • 6 chiffres
                </p>
              </div>
            )}

            <Button
              onClick={() => setStep(2)}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!secret}
            >
              Continuer vers la vérification
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Étape 2:</strong> Entrez le code à 6 chiffres généré par votre
                application. Il est vérifié par le serveur.
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="text-center text-3xl font-mono tracking-widest max-w-xs mx-auto"
                autoFocus
              />
            </div>

            <Button
              onClick={handleVerify}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={verificationCode.length !== 6 || isVerifying}
            >
              {isVerifying
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Vérification…</>
                : <><CheckCircle className="w-4 h-4 mr-2" />Vérifier et activer</>}
            </Button>

            <Button variant="outline" onClick={() => setStep(1)} className="w-full">
              Retour
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Conservez ces codes de secours.</strong> Ils permettent de vous
                connecter si vous perdez votre téléphone. Chacun ne fonctionne qu&apos;une
                fois, et ils ne seront plus jamais affichés.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-lg font-mono text-sm">
              {backupCodes.map((code) => (
                <div key={code} className="p-2 bg-white rounded border text-center">
                  {code}
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={handleDownloadBackupCodes} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Télécharger les codes
            </Button>

            <Button
              onClick={() => onComplete && onComplete()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Terminer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
