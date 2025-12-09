import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Pill, Plus } from 'lucide-react';

export default function MedicationSearch({ onSelect, selectedMedications = [], showPrice = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: drugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 500)
  });

  const searchResults = drugs
    .filter(drug => {
      if (!searchTerm || searchTerm.length < 2) return false;
      const term = searchTerm.toLowerCase();
      return (
        drug.product_name?.toLowerCase().includes(term) ||
        drug.substance_name?.toLowerCase().includes(term) ||
        drug.atc_code?.toLowerCase().includes(term) ||
        drug.cnk?.toLowerCase().includes(term)
      );
    })
    .slice(0, 10);

  useEffect(() => {
    setShowResults(searchTerm.length >= 2 && searchResults.length > 0);
  }, [searchTerm, searchResults.length]);

  const handleSelect = (drug) => {
    onSelect(drug);
    setSearchTerm('');
    setShowResults(false);
  };

  const isSelected = (drugId) => {
    return selectedMedications.some(m => m.id === drugId || m.drug_id === drugId);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Rechercher un médicament (nom, DCI, ATC, CNK)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          onFocus={() => setShowResults(searchTerm.length >= 2 && searchResults.length > 0)}
        />
      </div>

      {showResults && (
        <Card className="absolute z-50 w-full mt-2 shadow-xl max-h-[400px] overflow-y-auto">
          <CardContent className="p-2">
            {searchResults.map(drug => {
              const selected = isSelected(drug.id);
              return (
                <button
                  key={drug.id}
                  onClick={() => handleSelect(drug)}
                  disabled={selected}
                  className={`w-full p-3 text-left rounded-lg transition-colors ${
                    selected 
                      ? 'bg-slate-100 opacity-50 cursor-not-allowed' 
                      : 'hover:bg-blue-50 border border-transparent hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-sm">{drug.product_name}</p>
                        {selected && <Badge variant="outline" className="text-xs">Déjà ajouté</Badge>}
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        {drug.substance_name && (
                          <p>DCI: {drug.substance_name}</p>
                        )}
                        {drug.strength && drug.unit && (
                          <p>Dosage: {drug.strength} {drug.unit}</p>
                        )}
                        <div className="flex items-center gap-2">
                          {drug.form && <span>{drug.form}</span>}
                          {drug.cnk && <Badge variant="outline" className="text-xs">CNK: {drug.cnk}</Badge>}
                        </div>
                      </div>
                    </div>
                    {!selected && (
                      <Plus className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {searchTerm.length >= 2 && searchResults.length === 0 && (
        <Card className="absolute z-50 w-full mt-2 shadow-xl">
          <CardContent className="p-4 text-center text-sm text-slate-600">
            Aucun médicament trouvé
          </CardContent>
        </Card>
      )}
    </div>
  );
}