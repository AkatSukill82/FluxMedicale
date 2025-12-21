import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Stethoscope } from 'lucide-react';
import ItsmeProvider from '../components/auth/ItsmeProvider';
import { createPageUrl } from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        navigate(createPageUrl('Dashboard'));
      } else {
        setChecking(false);
      }
    } catch (error) {
      setChecking(false);
    }
  };

  const handleItsmeSuccess = (user) => {
    navigate(createPageUrl('Dashboard'));
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-slate-900">MediBridge</h1>
              <p className="text-slate-600">Dossier Patient Médical Belge</p>
            </div>
          </div>
        </div>

        {/* Options de connexion */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Connexion classique */}
          <Card className="shadow-xl border-2 border-blue-200">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Connexion classique
                </h2>
                <p className="text-slate-600 text-sm">
                  Utilisez vos identifiants existants
                </p>
              </div>
              <Button
                onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              >
                Se connecter
              </Button>
            </CardContent>
          </Card>

          {/* Connexion itsme® */}
          <ItsmeProvider 
            onSuccess={handleItsmeSuccess}
            environment="ACPT"
          />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 space-y-2">
          <p>
            Application conforme aux normes belges eHealth
          </p>
          <p className="text-xs">
            RGPD • eIDAS • Sécurisé • Chiffré
          </p>
        </div>
      </div>
    </div>
  );
}