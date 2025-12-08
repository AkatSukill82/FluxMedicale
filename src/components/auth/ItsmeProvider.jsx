import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';

// Configuration itsme® OIDC
const ITSME_CONFIG = {
  ACPT: {
    authorization_endpoint: 'https://idp.e2e.itsme.services/v2/authorization',
    token_endpoint: 'https://idp.e2e.itsme.services/v2/token',
    userinfo_endpoint: 'https://idp.e2e.itsme.services/v2/userinfo',
    client_id: 'YOUR_CLIENT_ID_ACPT',
    issuer: 'https://idp.e2e.itsme.services/v2'
  },
  PROD: {
    authorization_endpoint: 'https://idp.prd.itsme.services/v2/authorization',
    token_endpoint: 'https://idp.prd.itsme.services/v2/token',
    userinfo_endpoint: 'https://idp.prd.itsme.services/v2/userinfo',
    client_id: 'YOUR_CLIENT_ID_PROD',
    issuer: 'https://idp.prd.itsme.services/v2'
  }
};

export default function ItsmeProvider({ onSuccess, environment = 'ACPT' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleItsmeLogin = async () => {
    setIsLoading(true);
    setError(null);

    console.log('[itsme® OIDC] Initialisation du flux Authorization Code...');

    try {
      // Simulation : en production, rediriger vers itsme®
      // const authUrl = `${ITSME_CONFIG[environment].authorization_endpoint}?client_id=${ITSME_CONFIG[environment].client_id}&redirect_uri=${window.location.origin}/auth/itsme/callback&response_type=code&scope=openid profile email&state=${generateState()}`;
      // window.location.href = authUrl;

      // Pour la démo, simuler le retour d'itsme avec des claims
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockClaims = {
        sub: `itsme-${Math.random().toString(36).substring(7)}`, // Identifiant persistant itsme
        name: 'Jean Dupont',
        given_name: 'Jean',
        family_name: 'Dupont',
        email: `jean.dupont.itsme@example.be`,
        email_verified: true,
        birthdate: '1980-05-15',
        phone_number: '+32471234567',
        phone_number_verified: true,
        iss: ITSME_CONFIG[environment].issuer,
        aud: ITSME_CONFIG[environment].client_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      console.log('[itsme® OIDC] Claims récupérés:', mockClaims);

      // Vérifier si l'utilisateur existe déjà (match sur sub itsme)
      const users = await User.list();
      let user = users.find(u => u.itsme_sub === mockClaims.sub);

      if (!user) {
        // Créer un nouvel utilisateur
        console.log('[itsme® OIDC] Nouvel utilisateur - création du compte');
        
        user = await User.create({
          full_name: mockClaims.name,
          email: mockClaims.email,
          role: 'user',
          itsme_sub: mockClaims.sub,
          itsme_verified: true,
          telephone_cabinet: mockClaims.phone_number,
          specialite: 'Médecine Générale', // À compléter
          numero_inami: '12345678901', // À compléter
          adresse_cabinet: '', // À compléter
          horaires_consultation: '', // À compléter
        });

        await AuditLog.create({
          user_email: mockClaims.email,
          action: 'ITSME_ACCOUNT_CREATED',
          target_entity: 'User',
          target_id: user.id,
          details: `Compte créé via itsme® (sub: ${mockClaims.sub})`,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('[itsme® OIDC] Utilisateur existant trouvé');
        
        await AuditLog.create({
          user_email: user.email,
          action: 'ITSME_LOGIN_SUCCESS',
          target_entity: 'User',
          target_id: user.id,
          details: 'Connexion réussie via itsme®',
          timestamp: new Date().toISOString()
        });
      }

      // Créer la session (géré par base44, simulation ici)
      setIsLoading(false);
      onSuccess(user);

    } catch (err) {
      console.error('[itsme® OIDC] Erreur:', err);
      setError('Erreur lors de la connexion avec itsme®. Veuillez réessayer.');
      
      await AuditLog.create({
        user_email: 'anonymous',
        action: 'ITSME_LOGIN_FAILED',
        details: `Échec connexion itsme®: ${err.message}`,
        timestamp: new Date().toISOString()
      });
      
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-2 border-pink-200">
      <CardHeader className="text-center bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Connexion avec itsme®</CardTitle>
        <CardDescription>
          Authentification forte avec votre identité numérique belge
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <strong>Identité vérifiée</strong>
              <p className="text-xs">Pas besoin de mot de passe</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <strong>Sécurisé</strong>
              <p className="text-xs">Conforme eIDAS & RGPD</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <strong>Simple</strong>
              <p className="text-xs">Validez avec votre smartphone</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleItsmeLogin}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-lg py-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            'Se connecter avec itsme®'
          )}
        </Button>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-center text-slate-500">
          <p>Environnement: <strong>{environment}</strong></p>
          <p className="mt-1">
            En continuant, vous acceptez que vos données d'identité itsme® 
            soient utilisées pour créer votre compte médecin.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Fonction utilitaire pour générer un state CSRF
function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}