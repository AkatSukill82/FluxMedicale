import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import HubAccessPanel from '../../hub/HubAccessPanel';

export default function HubsTab({ patient }) {
  const { t } = useI18n();
  const isLoading = false;
  
  const hasConsent = patient?.gdpr_consent?.has_consented || false;
  const hasTherapeuticLink = false; // À implémenter avec vraies données

  const renderStatus = (status, loading, title, description, icon) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Vérification...</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Nouveau panneau d'accès HUB avec gestion délégation */}
      <HubAccessPanel patient={patient} />

      <Card>
        <CardHeader>
          <CardTitle>Accès aux Réseaux de Santé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Vérifiez et gérez le consentement du patient et le lien thérapeutique pour accéder aux données partagées sur les hubs de santé (RSW, Abrumet, CoZo).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {renderStatus(
              hasConsent,
              isLoading,
              "Consentement Patient",
              hasConsent ? "Le patient a donné son consentement éclairé pour le partage de ses données." : "Le patient n'a pas encore donné son consentement.",
              hasConsent ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <ShieldAlert className="h-4 w-4 text-destructive" />
            )}
            {renderStatus(
              hasTherapeuticLink,
              isLoading,
              "Lien Thérapeutique",
              hasTherapeuticLink ? "Un lien thérapeutique est actif avec ce patient." : "Aucun lien thérapeutique actif n'a été trouvé.",
              hasTherapeuticLink ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="flex gap-4 pt-4">
            <Button disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Vérifier/Créer le Lien
            </Button>
            <Button variant="outline" disabled={isLoading}>Demander le Consentement</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}