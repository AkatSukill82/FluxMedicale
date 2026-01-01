import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Euro,
  TrendingUp,
  Building2,
  Plus,
  Settings,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TiersPayantFacturesList from './TiersPayantFacturesList';
import TiersPayantLotsList from './TiersPayantLotsList';
import MutuelleConventionsManager from './MutuelleConventionsManager';
import TiersPayantStats from './TiersPayantStats';
import CreateTiersPayantModal from './CreateTiersPayantModal';

const STATUT_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800', icon: FileText },
  envoyee: { label: 'Envoyée', color: 'bg-blue-100 text-blue-800', icon: Send },
  acceptee: { label: 'Acceptée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  payee: { label: 'Payée', color: 'bg-emerald-100 text-emerald-800', icon: Euro },
  partielle: { label: 'Paiement partiel', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  refusee: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
  contestee: { label: 'Contestée', color: 'bg-purple-100 text-purple-800', icon: AlertTriangle }
};

export default function TiersPayantDashboard() {
  const [activeTab, setActiveTab] = useState('factures');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Charger les factures TP
  const { data: factures = [], isLoading: loadingFactures, refetch: refetchFactures } = useQuery({
    queryKey: ['tiersPayantFactures'],
    queryFn: () => base44.entities.TiersPayantFacture.list('-date_facturation', 100)
  });

  // Charger les lots
  const { data: lots = [], isLoading: loadingLots } = useQuery({
    queryKey: ['tiersPayantLots'],
    queryFn: () => base44.entities.TiersPayantLot.list('-date_creation', 50)
  });

  // Charger les conventions
  const { data: conventions = [] } = useQuery({
    queryKey: ['mutuelleConventions'],
    queryFn: () => base44.entities.MutuelleConvention.filter({ actif: true })
  });

  // Calculer les statistiques
  const stats = {
    enAttente: factures.filter(f => f.statut === 'envoyee').length,
    montantEnAttente: factures.filter(f => f.statut === 'envoyee').reduce((sum, f) => sum + (f.montant_a_recevoir_mutuelle || 0), 0),
    aEnvoyer: factures.filter(f => f.statut === 'brouillon').length,
    refusees: factures.filter(f => f.statut === 'refusee' || f.statut === 'contestee').length,
    payesCeMois: factures.filter(f => {
      if (f.statut !== 'payee' || !f.date_paiement) return false;
      const paiementDate = new Date(f.date_paiement);
      const now = new Date();
      return paiementDate.getMonth() === now.getMonth() && paiementDate.getFullYear() === now.getFullYear();
    }).reduce((sum, f) => sum + (f.montant_paye || 0), 0)
  };

  if (loadingFactures) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Gestion Tiers Payant
          </h1>
          <p className="text-muted-foreground">
            Facturation mutuelles, suivi des paiements et conventions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchFactures()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle facture TP
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">En attente</p>
                <p className="text-2xl font-bold text-blue-900">{stats.enAttente}</p>
                <p className="text-xs text-blue-700">{stats.montantEnAttente.toFixed(2)} €</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">À envoyer</p>
                <p className="text-2xl font-bold text-orange-900">{stats.aEnvoyer}</p>
                <p className="text-xs text-orange-700">factures brouillon</p>
              </div>
              <FileText className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Refusées</p>
                <p className="text-2xl font-bold text-red-900">{stats.refusees}</p>
                <p className="text-xs text-red-700">à traiter</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Reçu ce mois</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.payesCeMois.toFixed(2)} €</p>
                <p className="text-xs text-emerald-700">paiements mutuelles</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="factures" className="gap-2">
            <FileText className="w-4 h-4" />
            Factures TP
            {stats.aEnvoyer > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.aEnvoyer}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lots" className="gap-2">
            <Send className="w-4 h-4" />
            Lots d'envoi
          </TabsTrigger>
          <TabsTrigger value="conventions" className="gap-2">
            <Building2 className="w-4 h-4" />
            Conventions
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="factures" className="mt-6">
          <TiersPayantFacturesList 
            factures={factures} 
            conventions={conventions}
            onRefresh={refetchFactures}
          />
        </TabsContent>

        <TabsContent value="lots" className="mt-6">
          <TiersPayantLotsList lots={lots} />
        </TabsContent>

        <TabsContent value="conventions" className="mt-6">
          <MutuelleConventionsManager conventions={conventions} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <TiersPayantStats factures={factures} />
        </TabsContent>
      </Tabs>

      {/* Modal création */}
      <CreateTiersPayantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        conventions={conventions}
        onSuccess={() => {
          refetchFactures();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}