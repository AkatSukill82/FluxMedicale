import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  ShoppingCart,
  TrendingDown,
  Calendar,
  BarChart3,
  FileText
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import StockList from './StockList';
import StockForm from './StockForm';
import StockAlerts from './StockAlerts';
import StockOrders from './StockOrders';
import StockMovements from './StockMovements';

export default function StockDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list('-created_date', 500)
  });

  // Calculer les statistiques
  const stats = React.useMemo(() => {
    const today = new Date();
    const in30Days = addDays(today, 30);

    const lowStock = stocks.filter(s => s.quantity <= s.min_quantity && s.quantity > 0);
    const outOfStock = stocks.filter(s => s.quantity === 0);
    const expiringSoon = stocks.filter(s => {
      if (!s.expiry_date) return false;
      const expDate = new Date(s.expiry_date);
      return expDate <= in30Days && expDate > today;
    });
    const expired = stocks.filter(s => {
      if (!s.expiry_date) return false;
      return new Date(s.expiry_date) <= today;
    });

    const totalValue = stocks.reduce((sum, s) => sum + (s.quantity * (s.purchase_price || 0)), 0);
    const totalItems = stocks.reduce((sum, s) => sum + s.quantity, 0);

    return {
      total: stocks.length,
      totalItems,
      totalValue,
      lowStock,
      outOfStock,
      expiringSoon,
      expired,
      alertCount: lowStock.length + outOfStock.length + expiringSoon.length + expired.length
    };
  }, [stocks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des stocks</h1>
          <p className="text-muted-foreground">Médicaments et fournitures médicales</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un produit
        </Button>
      </div>

      {/* Alertes urgentes */}
      {stats.alertCount > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{stats.alertCount} alerte(s) :</strong>{' '}
            {stats.outOfStock.length > 0 && `${stats.outOfStock.length} rupture(s), `}
            {stats.lowStock.length > 0 && `${stats.lowStock.length} stock(s) bas, `}
            {stats.expired.length > 0 && `${stats.expired.length} produit(s) expiré(s), `}
            {stats.expiringSoon.length > 0 && `${stats.expiringSoon.length} expiration(s) proche(s)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Produits référencés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.lowStock.length + stats.outOfStock.length}</p>
                <p className="text-xs text-muted-foreground">Stocks critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon.length + stats.expired.length}</p>
                <p className="text-xs text-muted-foreground">Expirations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalValue.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground">Valeur du stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Package className="w-4 h-4" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertes
            {stats.alertCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{stats.alertCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Commandes
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <FileText className="w-4 h-4" />
            Mouvements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <StockList stocks={stocks} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <StockAlerts 
            lowStock={stats.lowStock}
            outOfStock={stats.outOfStock}
            expiringSoon={stats.expiringSoon}
            expired={stats.expired}
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <StockOrders stocks={stocks} />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <StockMovements />
        </TabsContent>
      </Tabs>

      {/* Modal ajout produit */}
      {showAddForm && (
        <StockForm 
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}