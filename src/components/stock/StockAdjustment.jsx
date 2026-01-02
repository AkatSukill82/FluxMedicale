import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Minus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function StockAdjustment({ isOpen, onClose, stock, defaultType = 'entree' }) {
  const queryClient = useQueryClient();
  
  const [movementType, setMovementType] = useState(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const quantityChange = movementType === 'entree' ? quantity : -quantity;
      const newQuantity = Math.max(0, stock.quantity + quantityChange);

      // Créer le mouvement de stock
      await base44.entities.StockMovement.create({
        stock_id: stock.id,
        product_name: stock.product_name,
        movement_type: movementType,
        quantity: Math.abs(quantityChange),
        quantity_before: stock.quantity,
        quantity_after: newQuantity,
        reason,
        user_email: currentUser.email
      });

      // Mettre à jour le stock
      await base44.entities.Stock.update(stock.id, {
        quantity: newQuantity,
        last_inventory_date: movementType === 'ajustement' ? new Date().toISOString().split('T')[0] : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      toast.success('Stock mis à jour');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const getPreviewQuantity = () => {
    const change = movementType === 'entree' ? quantity : -quantity;
    return Math.max(0, stock.quantity + change);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuster le stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Produit */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-medium">{stock.product_name}</p>
            <p className="text-sm text-muted-foreground">
              Stock actuel: <strong>{stock.quantity} {stock.unit}(s)</strong>
            </p>
          </div>

          {/* Type de mouvement */}
          <div className="space-y-2">
            <Label>Type de mouvement</Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entree">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-600" />
                    Entrée (réception)
                  </div>
                </SelectItem>
                <SelectItem value="sortie">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-600" />
                    Sortie (utilisation)
                  </div>
                </SelectItem>
                <SelectItem value="perte">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-orange-600" />
                    Perte / Casse
                  </div>
                </SelectItem>
                <SelectItem value="perime">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-600" />
                    Produit périmé
                  </div>
                </SelectItem>
                <SelectItem value="ajustement">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    Ajustement inventaire
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantité */}
          <div className="space-y-2">
            <Label>Quantité</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          </div>

          {/* Aperçu */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              Nouveau stock après ajustement: <strong>{getPreviewQuantity()} {stock.unit}(s)</strong>
            </p>
          </div>

          {/* Motif */}
          <div className="space-y-2">
            <Label>Motif (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Livraison fournisseur, inventaire..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending}>
            {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}