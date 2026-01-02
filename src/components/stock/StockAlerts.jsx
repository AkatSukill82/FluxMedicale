import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  XCircle,
  ShoppingCart,
  Trash2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function StockAlerts({ lowStock, outOfStock, expiringSoon, expired }) {
  const queryClient = useQueryClient();

  // Marquer un produit expiré comme retiré
  const removeExpiredMutation = useMutation({
    mutationFn: async (stock) => {
      const currentUser = await base44.auth.me();
      
      // Créer le mouvement
      await base44.entities.StockMovement.create({
        stock_id: stock.id,
        product_name: stock.product_name,
        movement_type: 'perime',
        quantity: stock.quantity,
        quantity_before: stock.quantity,
        quantity_after: 0,
        reason: 'Produit expiré - retiré du stock',
        user_email: currentUser.email
      });

      // Mettre à jour le stock
      await base44.entities.Stock.update(stock.id, {
        quantity: 0,
        status: 'expire'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success('Produit retiré du stock');
    }
  });

  const AlertSection = ({ title, icon: Icon, items, color, actionLabel, onAction }) => {
    if (items.length === 0) return null;

    return (
      <Card className={`border-l-4 ${color}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {title}
            <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map(item => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-2 bg-slate-50 rounded"
            >
              <div>
                <p className="font-medium text-sm">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} {item.unit}(s) en stock
                  {item.expiry_date && (
                    <> • Exp: {format(new Date(item.expiry_date), 'dd/MM/yyyy')}</>
                  )}
                </p>
              </div>
              {onAction && (
                <Button size="sm" variant="outline" onClick={() => onAction(item)}>
                  {actionLabel}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const hasAlerts = lowStock.length > 0 || outOfStock.length > 0 || expiringSoon.length > 0 || expired.length > 0;

  if (!hasAlerts) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucune alerte de stock</p>
        <p className="text-sm">Tous les produits sont en ordre</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertSection
        title="Rupture de stock"
        icon={XCircle}
        items={outOfStock}
        color="border-l-red-500"
        actionLabel="Commander"
      />

      <AlertSection
        title="Stock bas"
        icon={AlertTriangle}
        items={lowStock}
        color="border-l-orange-500"
        actionLabel="Commander"
      />

      <AlertSection
        title="Produits expirés"
        icon={Trash2}
        items={expired}
        color="border-l-red-500"
        actionLabel="Retirer"
        onAction={(item) => removeExpiredMutation.mutate(item)}
      />

      <AlertSection
        title="Expiration proche (< 30 jours)"
        icon={Clock}
        items={expiringSoon}
        color="border-l-yellow-500"
      />
    </div>
  );
}