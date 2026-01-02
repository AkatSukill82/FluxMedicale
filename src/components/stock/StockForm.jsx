import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Save } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Antibiotiques',
  'Antalgiques',
  'Anti-inflammatoires',
  'Cardiovasculaire',
  'Diabète',
  'Dermatologie',
  'Gastro-entérologie',
  'Vaccins',
  'Pansements',
  'Matériel injection',
  'Désinfectants',
  'Autre'
];

export default function StockForm({ isOpen, onClose, stock = null }) {
  const queryClient = useQueryClient();
  const isEditing = !!stock;

  const [formData, setFormData] = useState({
    product_name: stock?.product_name || '',
    product_type: stock?.product_type || 'medicament',
    cnk: stock?.cnk || '',
    reference: stock?.reference || '',
    category: stock?.category || '',
    quantity: stock?.quantity || 0,
    unit: stock?.unit || 'boîte',
    min_quantity: stock?.min_quantity || 5,
    expiry_date: stock?.expiry_date || '',
    lot_number: stock?.lot_number || '',
    supplier: stock?.supplier || '',
    supplier_reference: stock?.supplier_reference || '',
    purchase_price: stock?.purchase_price || '',
    selling_price: stock?.selling_price || '',
    location: stock?.location || '',
    notes: stock?.notes || ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        await base44.entities.Stock.update(stock.id, data);
      } else {
        await base44.entities.Stock.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success(isEditing ? 'Produit mis à jour' : 'Produit ajouté');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product_name) {
      toast.error('Le nom du produit est requis');
      return;
    }
    saveMutation.mutate({
      ...formData,
      quantity: Number(formData.quantity) || 0,
      min_quantity: Number(formData.min_quantity) || 5,
      purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
      selling_price: formData.selling_price ? Number(formData.selling_price) : null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isEditing ? 'Modifier le produit' : 'Ajouter un produit'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nom du produit *</Label>
              <Input
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="Ex: Paracétamol 1000mg"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={formData.product_type} 
                onValueChange={(v) => setFormData({ ...formData, product_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicament">Médicament</SelectItem>
                  <SelectItem value="fourniture">Fourniture médicale</SelectItem>
                  <SelectItem value="consommable">Consommable</SelectItem>
                  <SelectItem value="equipement">Équipement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Code CNK</Label>
              <Input
                value={formData.cnk}
                onChange={(e) => setFormData({ ...formData, cnk: e.target.value })}
                placeholder="Code CNK"
              />
            </div>

            <div className="space-y-2">
              <Label>Référence interne</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
          </div>

          {/* Quantités */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Quantité en stock</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Unité</Label>
              <Select 
                value={formData.unit} 
                onValueChange={(v) => setFormData({ ...formData, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boîte">Boîte</SelectItem>
                  <SelectItem value="flacon">Flacon</SelectItem>
                  <SelectItem value="unité">Unité</SelectItem>
                  <SelectItem value="pièce">Pièce</SelectItem>
                  <SelectItem value="tube">Tube</SelectItem>
                  <SelectItem value="sachet">Sachet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seuil alerte</Label>
              <Input
                type="number"
                min="0"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
              />
            </div>
          </div>

          {/* Expiration et lot */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Date d'expiration</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Numéro de lot</Label>
              <Input
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
              />
            </div>
          </div>

          {/* Fournisseur et prix */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Réf. fournisseur</Label>
              <Input
                value={formData.supplier_reference}
                onChange={(e) => setFormData({ ...formData, supplier_reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Prix d'achat (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Prix de vente (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              />
            </div>
          </div>

          {/* Emplacement et notes */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Emplacement de stockage</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Armoire A, Étagère 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}