import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Pill, Plus, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

export default function DrugSearch({ onSelect, selectedDrugs = [] }) {
  const { locale } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: drugs = [], isLoading } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list(),
    staleTime: 1000 * 60 * 30 // 30 minutes cache
  });

  const filteredDrugs = useMemo(() => {
    if (searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    return drugs
      .filter(d => d.lang === locale && d.is_current)
      .filter(d => 
        d.product_name?.toLowerCase().includes(term) ||
        d.substance_name?.toLowerCase().includes(term) ||
        d.atc_code?.toLowerCase().includes(term) ||
        d.cnk?.includes(term)
      )
      .slice(0, 20);
  }, [drugs, searchTerm, locale]);

  const handleSelect = (drug) => {
    onSelect(drug);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher un médicament (nom, DCI, ATC, CNK)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
      </div>

      {showResults && searchTerm.length >= 2 && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filteredDrugs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucun médicament trouvé
            </div>
          ) : (
            <div className="p-2">
              {filteredDrugs.map((drug) => {
                const isSelected = selectedDrugs.some(s => s.id === drug.id);
                return (
                  <div
                    key={drug.id}
                    onClick={() => !isSelected && handleSelect(drug)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-muted opacity-50 cursor-not-allowed' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold">{drug.product_name}</h4>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">Ajouté</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {drug.substance_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {drug.strength && drug.unit && (
                            <Badge variant="secondary">{drug.strength} {drug.unit}</Badge>
                          )}
                          {drug.form && (
                            <Badge variant="secondary">{drug.form}</Badge>
                          )}
                          {drug.cnk && (
                            <span>CNK: {drug.cnk}</span>
                          )}
                        </div>
                      </div>
                      {!isSelected && (
                        <Button size="sm" variant="ghost">
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}