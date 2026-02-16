import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Star,
  Trash2,
  Info,
  AlertTriangle,
  Euro,
  Package,
  Pill
} from 'lucide-react';
import { toast } from 'sonner';

export default function DrugFavorites({ onSelect, onAddToInteractions }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('drug_favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const removeFavorite = (drug) => {
    const newFavorites = favorites.filter(f => f.cnk !== drug.cnk);
    setFavorites(newFavorites);
    localStorage.setItem('drug_favorites', JSON.stringify(newFavorites));
    toast.success('Retiré des favoris');
  };

  const formatPrice = (cents) => {
    if (!cents) return '-';
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          Mes médicaments favoris
        </CardTitle>
      </CardHeader>
      <CardContent>
        {favorites.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {favorites.map((drug, index) => (
                <div
                  key={drug.cnk || index}
                  className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{drug.product_name}</h3>
                        {drug.reimbursed && (
                          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                            Remboursé
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {drug.substance} • {drug.form} • {drug.strength}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Package className="w-3 h-3" />
                          CNK: {drug.cnk}
                        </span>
                        {drug.price && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Euro className="w-3 h-3" />
                            {formatPrice(drug.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelect(drug)}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAddToInteractions(drug)}
                        title="Vérifier les interactions"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFavorite(drug)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-2">Aucun médicament favori</p>
            <p className="text-sm">
              Ajoutez des médicaments depuis la recherche en cliquant sur l'étoile
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}