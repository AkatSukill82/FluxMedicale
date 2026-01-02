import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const MOVEMENT_CONFIG = {
  entree: { label: 'Entrée', icon: ArrowUpCircle, color: 'text-green-600 bg-green-50' },
  sortie: { label: 'Sortie', icon: ArrowDownCircle, color: 'text-red-600 bg-red-50' },
  prescription: { label: 'Prescription', icon: ArrowDownCircle, color: 'text-blue-600 bg-blue-50' },
  perte: { label: 'Perte', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  ajustement: { label: 'Ajustement', icon: RefreshCw, color: 'text-purple-600 bg-purple-50' },
  perime: { label: 'Périmé', icon: AlertTriangle, color: 'text-red-600 bg-red-50' }
};

export default function StockMovements() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 200)
  });

  const filteredMovements = movements.filter(m => {
    const matchSearch = m.product_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || m.movement_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="entree">Entrées</SelectItem>
            <SelectItem value="sortie">Sorties</SelectItem>
            <SelectItem value="prescription">Prescriptions</SelectItem>
            <SelectItem value="perte">Pertes</SelectItem>
            <SelectItem value="ajustement">Ajustements</SelectItem>
            <SelectItem value="perime">Périmés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Quantité</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Utilisateur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun mouvement trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map(movement => {
                const config = MOVEMENT_CONFIG[movement.movement_type] || MOVEMENT_CONFIG.sortie;
                const Icon = config.icon;
                const isPositive = movement.movement_type === 'entree';

                return (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {format(new Date(movement.created_date), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{movement.product_name}</TableCell>
                    <TableCell>
                      <Badge className={config.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                        {isPositive ? '+' : '-'}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.quantity_before} → {movement.quantity_after}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {movement.reason || '-'}
                      {movement.patient_name && (
                        <span className="text-blue-600"> • {movement.patient_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.user_email?.split('@')[0]}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}