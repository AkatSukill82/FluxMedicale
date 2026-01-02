import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  ShoppingCart, 
  Send, 
  Check,
  Loader2,
  FileText,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  envoyee: { label: 'Envoyée', color: 'bg-blue-100 text-blue-800' },
  confirmee: { label: 'Confirmée', color: 'bg-purple-100 text-purple-800' },
  livree: { label: 'Livrée', color: 'bg-green-100 text-green-800' },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
};

export default function StockOrders({ stocks = [] }) {
  const queryClient = useQueryClient();
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['stockOrders'],
    queryFn: () => base44.entities.StockOrder.list('-created_date', 100)
  });

  // Produits en stock bas pour suggestion
  const lowStockProducts = stocks.filter(s => s.quantity <= s.min_quantity);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {lowStockProducts.length} produit(s) à commander
          </p>
        </div>
        <Button onClick={() => setShowCreateOrder(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle commande
        </Button>
      </div>

      {/* Suggestions de commande */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
              <ShoppingCart className="w-4 h-4" />
              Produits à commander
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <Badge key={p.id} variant="outline" className="bg-white">
                  {p.product_name} ({p.quantity}/{p.min_quantity})
                </Badge>
              ))}
              {lowStockProducts.length > 5 && (
                <Badge variant="secondary">+{lowStockProducts.length - 5} autres</Badge>
              )}
            </div>
            <Button 
              size="sm" 
              className="mt-3"
              onClick={() => {
                setSelectedProducts(lowStockProducts.map(p => ({
                  stock_id: p.id,
                  product_name: p.product_name,
                  quantity_ordered: p.min_quantity * 2 - p.quantity,
                  unit_price: p.purchase_price || 0
                })));
                setShowCreateOrder(true);
              }}
            >
              Créer commande pour tous
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste des commandes */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Commande</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune commande
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">{order.order_number || order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.order_date ? format(new Date(order.order_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{order.items?.length || 0} article(s)</TableCell>
                  <TableCell>{order.total_amount?.toFixed(2) || '0.00'}€</TableCell>
                  <TableCell>
                    <Badge className={STATUS_CONFIG[order.status]?.color}>
                      {STATUS_CONFIG[order.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {order.status === 'brouillon' && (
                        <Button size="sm" variant="outline">
                          <Send className="w-3 h-3 mr-1" />
                          Envoyer
                        </Button>
                      )}
                      {order.status === 'confirmee' && (
                        <Button size="sm" variant="outline">
                          <Check className="w-3 h-3 mr-1" />
                          Réceptionner
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal création commande */}
      {showCreateOrder && (
        <CreateOrderModal
          isOpen={showCreateOrder}
          onClose={() => {
            setShowCreateOrder(false);
            setSelectedProducts([]);
          }}
          stocks={stocks}
          initialItems={selectedProducts}
        />
      )}
    </div>
  );
}

function CreateOrderModal({ isOpen, onClose, stocks, initialItems = [] }) {
  const queryClient = useQueryClient();
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState(initialItems);
  const [selectedStock, setSelectedStock] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = items.reduce((sum, i) => sum + (i.quantity_ordered * (i.unit_price || 0)), 0);
      
      await base44.entities.StockOrder.create({
        order_number: `CMD-${Date.now()}`,
        supplier,
        status: 'brouillon',
        items,
        total_amount: totalAmount,
        order_date: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockOrders'] });
      toast.success('Commande créée');
      onClose();
    }
  });

  const addItem = () => {
    const stock = stocks.find(s => s.id === selectedStock);
    if (!stock || items.some(i => i.stock_id === selectedStock)) return;

    setItems([...items, {
      stock_id: stock.id,
      product_name: stock.product_name,
      quantity_ordered: stock.min_quantity * 2,
      unit_price: stock.purchase_price || 0
    }]);
    setSelectedStock('');
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, i) => sum + (i.quantity_ordered * (i.unit_price || 0)), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nouvelle commande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Nom du fournisseur"
            />
          </div>

          {/* Ajouter un produit */}
          <div className="flex gap-2">
            <Select value={selectedStock} onValueChange={setSelectedStock}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Ajouter un produit..." />
              </SelectTrigger>
              <SelectContent>
                {stocks.map(s => (
                  <SelectItem key={s.id} value={s.id} disabled={items.some(i => i.stock_id === s.id)}>
                    {s.product_name} (stock: {s.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addItem} disabled={!selectedStock}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Liste des articles */}
          {items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="w-24">Quantité</TableHead>
                    <TableHead className="w-28">Prix unit.</TableHead>
                    <TableHead className="w-24">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(idx, 'quantity_ordered', Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(item.quantity_ordered * item.unit_price).toFixed(2)}€
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => removeItem(idx)}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 bg-slate-50 border-t flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold">{total.toFixed(2)}€</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!supplier || items.length === 0 || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer la commande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}