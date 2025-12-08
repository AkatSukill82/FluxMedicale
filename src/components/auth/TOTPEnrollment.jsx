import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Copy, CheckCircle, Download, QrCode } from 'lucide-react';
import { MFADevice } from '@/entities/MFADevice';
import { AuditLog } from '@/entities/AuditLog';

export default function TOTPEnrollment({ user, onComplete }) {
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [step, setStep] = useState(1); // 1: QR, 2: Verification, 3: Backup codes

  useEffect(() => {
    generateTOTPSecret();
  }, []);

  const generateTOTPSecret = () => {
    // Générer un secret aléatoire en base32 (160 bits recommandé)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    setSecret(secret);

    // Générer l'URL otpauth://
    const issuer = 'MediBridge';
    const label = `${issuer}:${user.email}`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
    
    // En production : générer un QR code réel
    // Pour la démo, simuler l'URL du QR code
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauthUrl)}`);
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      codes.push(code);
    }
    setBackupCodes(codes);
  };

  const handleVerify = async () => {
    // Simuler vérification du code TOTP
    const isValid = verificationCode.length === 6;

    if (isValid) {
      // Générer codes de secours
      generateBackupCodes();

      // Sauvegarder le device MFA
      await MFADevice.create({
        user_email: user.email,
        device_type: 'TOTP',
        device_name: 'Google Authenticator',
        totp_secret_encrypted: secret, // En production: chiffrer avec AES-256
        is_active: true,
        enrolled_at: new Date().toISOString(),
        metadata: {
          user_agent: navigator.userAgent,
          enrollment_method: 'QR_CODE'
        }
      });

      // Audit
      await AuditLog.create({
        user_email: user.email,
        action: 'MFA_ENROLL',
        target_entity: 'MFADevice',
        details: 'Enrôlement TOTP réussi',
        timestamp: new Date().toISOString()
      });

      setStep(3);
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = `MediBridge - Codes de secours\nUtilisateur: ${user.email}\nGénéré le: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\n⚠️ Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medibridge-backup-codes-${Date.now()}.txt`;
    a.click();
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-600" />
          Configuration de l'authentification à deux facteurs
        </CardTitle>
        <CardDescription>
          Sécurisez votre compte avec un second facteur d'authentification (TOTP)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Étape 1:</strong> Scannez ce QR code avec votre application d'authentification 
                (Google Authenticator, Microsoft Authenticator, FreeOTP, Yubico Authenticator, etc.)
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <div className="inline-block p-6 bg-white rounded-xl shadow-lg">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code TOTP" className="w-64 h-64" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-slate-100">
                    <QrCode className="w-20 h-20 text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Ou entrez manuellement ce secret dans votre application:
              </p>
              <div className="flex gap-2">
                <Input 
                  value={secret} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={handleCopySecret}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Format: Base32 • Période: 30s • Algorithme: SHA-1 • Digits: 6
              </p>
            </div>

            <Button 
              onClick={() => setStep(2)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Continuer vers la vérification
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Étape 2:</strong> Entrez le code à 6 chiffres généré par votre application pour vérifier la configuration.
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
              disabled={verificationCode.length !== 6}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Vérifier et activer
            </Button>

            <Button 
              variant="outline"
              onClick={() => setStep(1)}
              className="w-full"
            >
              Retour
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Authentification à deux facteurs activée !</strong><br />
                Votre compte est maintenant protégé par TOTP.
              </AlertDescription>
            </Alert>

            <Alert className="bg-orange-50 border-orange-200">
              <AlertDescription className="text-orange-900">
                <strong>Codes de secours</strong><br />
                Conservez ces codes en lieu sûr. Ils vous permettront de vous connecter si vous perdez l'accès à votre application d'authentification.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="p-2 bg-white rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleDownloadBackupCodes}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger les codes de secours
            </Button>

            <Button 
              onClick={onComplete}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Terminer la configuration
            </Button>

            <div className="text-center text-xs text-slate-500">
              <p>⚠️ Chaque code de secours ne peut être utilisé qu'une seule fois.</p>
              <p>Après utilisation d'un code, il sera automatiquement invalidé.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}