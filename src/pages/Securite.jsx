
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MFADevice } from '@/entities/MFADevice';
import { AuditLog } from '@/entities/AuditLog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Smartphone,
  Key,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Plus,
  Trash2,
  CreditCard, // New import
  RefreshCw // New import
} from 'lucide-react';
import TOTPEnrollment from '../components/auth/TOTPEnrollment';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAutoOpenEID } from '../components/eid/useAutoOpenEID'; // New import
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // New import

export default function SecuritePage() {
  const [user, setUser] = useState(null);
  const [mfaDevices, setMfaDevices] = useState([]);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { isEnabled: autoOpenEnabled, agentStatus, toggleAutoOpen, checkAgentStatus } = useAutoOpenEID();

  useEffect(() => {
    loadData();
    checkAgentStatus(); // Check agent status on initial load
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const devices = await MFADevice.filter({ user_email: currentUser.email });

      setUser(currentUser);
      setMfaDevices(devices);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollmentComplete = () => {
    setShowEnrollment(false);
    loadData();
  };

  const handleRevokeMFA = async (device) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer ce dispositif MFA ?')) {
      return;
    }

    try {
      await MFADevice.update(device.id, { is_active: false });

      await AuditLog.create({
        user_email: user.email,
        action: 'MFA_REVOKE',
        target_entity: 'MFADevice',
        target_id: device.id,
        details: `Révocation dispositif MFA: ${device.device_name}`,
        timestamp: new Date().toISOString()
      });

      loadData();
    } catch (error) {
      console.error('Erreur révocation MFA:', error);
    }
  };

  const activeMFADevices = mfaDevices.filter(d => d.is_active && d.device_type === 'TOTP');
  const hasMFA = activeMFADevices.length > 0;

  if (showEnrollment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => setShowEnrollment(false)}
          className="mb-6"
        >
          ← Retour aux paramètres
        </Button>
        <TOTPEnrollment user={user} onComplete={handleEnrollmentComplete} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Paramètres de sécurité</h1>
        <p className="text-slate-600">
          Gérez vos dispositifs d'authentification à deux facteurs (2FA) et autres paramètres de sécurité.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="mfa">MFA</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="eid">eID & Appareil</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          {/* Statut de sécurité global */}
          <Card className={hasMFA ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {hasMFA ? (
                  <>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 text-lg mb-1">
                        Authentification à deux facteurs activée
                      </h3>
                      <p className="text-green-700 text-sm">
                        Votre compte est protégé par un second facteur d'authentification (TOTP).
                        Niveau de sécurité: <strong>AAL2 (NIST SP 800-63B)</strong>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900 text-lg mb-1">
                        Authentification à deux facteurs désactivée
                      </h3>
                      <p className="text-orange-700 text-sm mb-3">
                        Pour sécuriser votre compte et les données de santé sensibles,
                        nous recommandons fortement d'activer l'authentification à deux facteurs.
                      </p>
                      <Button
                        onClick={() => setShowEnrollment(true)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Activer la 2FA maintenant
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations de sécurité */}
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Bonnes pratiques de sécurité</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Utilisez une application d'authentification conforme (Google Authenticator, Microsoft Authenticator, FreeOTP, Yubico Authenticator)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Sauvegardez vos codes de secours dans un endroit sûr (hors ligne de préférence)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Ne partagez jamais vos codes TOTP ou vos codes de secours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Vérifiez régulièrement vos dispositifs actifs et révoquez ceux que vous n'utilisez plus</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Assurez-vous que l'heure de votre appareil est synchronisée (NTP)</span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 text-center">
                  🔒 <strong>Conformité:</strong> TOTP (RFC 6238) • Clock-skew tolérance ±30s • Rate-limit 5/15min<br />
                  NIST SP 800-63B (AAL2) • OWASP Authentication Guidelines
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mfa">
          {/* Dispositifs MFA actifs */}
          {hasMFA && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Mes dispositifs d'authentification
                </CardTitle>
                <CardDescription>
                  Gérez les applications d'authentification configurées sur votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeMFADevices.map(device => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{device.device_name || 'Authentificateur TOTP'}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ajouté le {format(new Date(device.enrolled_at), 'dd MMMM yyyy', { locale: fr })}
                          </span>
                          {device.last_used_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              Dernière utilisation: {format(new Date(device.last_used_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-800">
                            RFC 6238 • 6 chiffres • 30s
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeMFA(device)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Révoquer
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setShowEnrollment(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un nouveau dispositif
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Codes de secours */}
          {hasMFA && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Codes de secours
                </CardTitle>
                <CardDescription>
                  Utilisez ces codes pour accéder à votre compte si vous perdez l'accès à votre application d'authentification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-900">
                    <strong>Important:</strong> Chaque code de secours ne peut être utilisé qu'une seule fois.
                    Après utilisation, générez de nouveaux codes.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger les codes
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Régénérer les codes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          {/* Appareils de confiance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Appareils de confiance
              </CardTitle>
              <CardDescription>
                Gérez les appareils sur lesquels vous avez choisi de mémoriser votre connexion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-slate-50 border-slate-200">
                <AlertDescription className="text-slate-700">
                  Aucun appareil de confiance enregistré.
                  Lors de votre prochaine connexion, vous pourrez cocher "Se souvenir de cet appareil pendant 30 jours".
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eid">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Configuration eID & Appareil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statut agent PC/SC */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Agent PC/SC Local</h4>
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Statut de l'agent</span>
                    {agentStatus.isConnected ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connecté
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Déconnecté
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkAgentStatus}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Vérifier l'agent
                  </Button>
                </div>
              </div>

              {/* Auto-ouverture eID */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Auto-ouverture patient</h4>
                <Alert className="bg-blue-50 border-blue-200 mb-3">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>RGPD - Privacy by Default:</strong> Cette fonctionnalité est désactivée par défaut.
                    Lorsqu'activée, le patient sera automatiquement ouvert à l'insertion de sa carte eID.
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="auto-open-eid"
                          checked={autoOpenEnabled}
                          onChange={(e) => toggleAutoOpen(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="auto-open-eid" className="font-medium text-slate-900 cursor-pointer">
                          Ouvrir automatiquement le patient à l'insertion eID
                        </label>
                      </div>
                      <p className="text-sm text-slate-600 ml-6">
                        Lorsqu'une carte eID est insérée, le dossier du patient correspondant sera automatiquement ouvert.
                        Si le patient n'existe pas, un dossier minimal sera créé.
                      </p>
                    </div>
                    {autoOpenEnabled && (
                      <Badge className="bg-green-100 text-green-800 ml-3">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activé
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Sécurité et confidentialité */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Sécurité & Confidentialité</h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>L'agent local ne transmet aucune donnée à des tiers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Connexion sécurisée localhost uniquement (loopback)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Debounce 5s pour éviter doubles lectures</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Toutes les lectures sont auditées (journal complet)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Le PIN n'est jamais lu ni stocké</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
