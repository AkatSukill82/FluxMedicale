import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Edit, Trash2, Plus, Minus, Package, Pill } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import StockForm from './StockForm';
import StockAdjustment from './StockAdjustment';

const STATUS_CONFIG = {
  disponible: { label: 'Disponible', color: 'bg-green-100 text-green-800' },
  stock_bas: { label: 'Stock bas', color: 'bg-orange-100 text-orange-800' },
  rupture: { label: 'Rupture', color: 'bg-red-100 text-red-800' },
  expire: { label: 'Expiré', color: 'bg-red-100 text-red-800' },
  bientot_expire: { label: 'Expire bientôt', color: 'bg-yellow-100 text-yellow-800' }
};

const TYPE_CONFIG = {
  medicament: { label: 'Médicament', icon: Pill },
  fourniture: { label: 'Fourniture', icon: Package },
  consommable: { label: 'Consommable', icon: Package },
  equipement: { label: 'Équipement', icon: Package }
};

export default function StockList({ stocks = [], isLoading }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingStock, setEditingStock] = useState(null);
  const [adjustingStock, setAdjustingStock] = useState(null);

  // Filtrer les stocks
  const filteredStocks = stocks.filter(stock => {
    const matchSearch = stock.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                       stock.cnk?.includes(search) ||
                       stock.reference?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || stock.product_type === typeFilter;
    const matchStatus = statusFilter === 'all' || getStockStatus(stock) === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // Calculer le statut d'un stock
  function getStockStatus(stock) {
    if (stock.quantity === 0) return 'rupture';
    if (stock.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(stock.expiry_date), new Date());
      if (daysUntilExpiry <= 0) return 'expire';
      if (daysUntilExpiry <= 30) return 'bientot_expire';
    }
    if (stock.quantity <= stock.min_quantity) return 'stock_bas';
    return 'disponible';
  }

  const handleDelete = async (stock) => {
    if (!confirm(`Supprimer ${stock.product_name} ?`)) return;
    
    try {
      await base44.entities.Stock.delete(stock.id);
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success('Produit supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, CNK ou référence..."
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="medicament">Médicaments</SelectItem>
            <SelectItem value="fourniture">Fournitures</SelectItem>
            <SelectItem value="consommable">Consommables</SelectItem>
            <SelectItem value="equipement">Équipements</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="stock_bas">Stock bas</SelectItem>
            <SelectItem value="rupture">Rupture</SelectItem>
            <SelectItem value="bientot_expire">Expire bientôt</SelectItem>
            <SelectItem value="expire">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Quantité</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map(stock => {
                const status = getStockStatus(stock);
                const statusConfig = STATUS_CONFIG[status];
                const TypeIcon = TYPE_CONFIG[stock.product_type]?.icon || Package;
                
                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{stock.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {stock.cnk && `CNK: ${stock.cnk}`}
                          {stock.reference && ` • Réf: ${stock.reference}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <TypeIcon className="w-3 h-3" />
                        {TYPE_CONFIG[stock.product_type]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setAdjustingStock({ stock, type: 'sortie' })}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className={`font-bold ${stock.quantity <= stock.min_quantity ? 'text-red-600' : ''}`}>
                          {stock.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">/{stock.min_quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setAdjustingStock({ stock, type: 'entree' })}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stock.expiry_date ? (
                        <span className={differenceInDays(new Date(stock.expiry_date), new Date()) <= 30 ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(stock.expiry_date), 'dd/MM/yyyy')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stock.location || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingStock(stock)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAdjustingStock({ stock, type: 'ajustement' })}>
                            <Package className="w-4 h-4 mr-2" />
                            Ajuster le stock
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(stock)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal édition */}
      {editingStock && (
        <StockForm
          isOpen={!!editingStock}
          onClose={() => setEditingStock(null)}
          stock={editingStock}
        />
      )}

      {/* Modal ajustement */}
      {adjustingStock && (
        <StockAdjustment
          isOpen={!!adjustingStock}
          onClose={() => setAdjustingStock(null)}
          stock={adjustingStock.stock}
          defaultType={adjustingStock.type}
        />
      )}
    </div>
  );
}