import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Hook pour eHealth I.AM (préparatoire)
export const useEHealthIAM = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [samlToken, setSamlToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Configuration eHealth I.AM
  const EHEALTH_CONFIG = {
    // Configuration pour production (à configurer via l'interface admin)
    endpoint: 'https://services-int.ehealth.fgov.be/IAM/exchange',
    client_certificate: 'DEMO_CLIENT_CERT', // À remplacer par la vraie valeur
    client_key: 'DEMO_CLIENT_KEY', // À remplacer par la vraie valeur
    
    // Paramètres requis
    assertion_consumer_service: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/ehealth/acs`,
    sp_entity_id: 'urn:be:fgov:medibridge:sp', // À personnaliser
    
    // Claims requis pour médecins belges
    required_claims: [
      'urn:be:fgov:ehealth:2.0:doctor:ssin',
      'urn:be:fgov:ehealth:2.0:doctor:nihii',
      'urn:be:fgov:ehealth:2.0:doctor:speciality'
    ]
  };

  const exchangeAccessTokenForSAML = async (accessToken) => {
    if (!isConfigured) {
      setError('eHealth I.AM non configuré. Contactez l\'administrateur.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Échange access token vers SAML eHealth...');
      
      // TODO: Implémentation réelle I.AM eXchange
      // Cette logique doit être côté serveur pour des raisons de sécurité
      const response = await fetch('/api/auth/ehealth/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          subject_token: accessToken,
          subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          requested_token_type: 'urn:oasis:names:tc:SAML:2.0:assertion'
        })
      });

      if (!response.ok) {
        throw new Error('Échange I.AM échoué');
      }

      const samlResponse = await response.json();
      setSamlToken(samlResponse.saml_token);
      
      return samlResponse.saml_token;

    } catch (err) {
      setError(`Erreur I.AM eXchange: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const validateEHealthCredentials = async (samlToken) => {
    try {
      // Validation du token SAML et extraction des attributs eHealth
      const validationResponse = await fetch('/api/auth/ehealth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ saml_token: samlToken })
      });

      return await validationResponse.json();
    } catch (err) {
      throw new Error('Validation credentials eHealth échouée');
    }
  };

  return {
    isConfigured,
    samlToken,
    isLoading,
    error,
    config: EHEALTH_CONFIG,
    exchangeAccessTokenForSAML,
    validateEHealthCredentials,
    setIsConfigured
  };
};

// Composant de diagnostic eHealth
export default function EHealthConnector({ user }) {
  const { 
    isConfigured, 
    samlToken, 
    isLoading, 
    error, 
    exchangeAccessTokenForSAML,
    setIsConfigured 
  } = useEHealthIAM();

  const handleTestConnection = async () => {
    if (!user) {
      alert('Utilisateur non authentifié');
      return;
    }

    // Simulation d'un access token (en réalité récupéré après itsme®)
    const mockAccessToken = 'mock_access_token_from_itsme';
    await exchangeAccessTokenForSAML(mockAccessToken);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          eHealth I.AM Connector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              Status: {isConfigured ? 'Configuré' : 'Non configuré'}
            </span>
          </div>
          {user?.role === 'admin' && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsConfigured(!isConfigured)}
            >
              {isConfigured ? 'Désactiver' : 'Activer'}
            </Button>
          )}
        </div>

        {!isConfigured && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Le connecteur eHealth I.AM n'est pas configuré. 
              Configuration requise côté serveur avec certificats eHealth.
            </AlertDescription>
          </Alert>
        )}

        {samlToken && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Token SAML eHealth obtenu avec succès. 
              Accès aux services eHealth autorisé.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={handleTestConnection}
            disabled={!isConfigured || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            Tester I.AM eXchange
          </Button>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
          <strong>Configuration requise (production):</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Certificat client eHealth (.p12)</li>
            <li>Enregistrement SP auprès de eHealth</li>
            <li>Configuration endpoints I.AM</li>
            <li>Validation SAML côté serveur</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}