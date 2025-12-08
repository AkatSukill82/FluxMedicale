import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Plus, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

export default function NomenSearch({ onSelect, selectedCodes = [] }) {
  const { locale } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['nomenclature'],
    queryFn: () => base44.entities.NomenCode.list(),
    staleTime: 1000 * 60 * 30 // 30 minutes cache
  });

  const filteredCodes = useMemo(() => {
    if (searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    const today = new Date();

    return codes
      .filter(c => c.is_current)
      .filter(c => {
        // Check validity dates
        const validFrom = c.valid_from ? new Date(c.valid_from) : null;
        const validTo = c.valid_to ? new Date(c.valid_to) : null;
        
        if (validFrom && today < validFrom) return false;
        if (validTo && today > validTo) return false;
        
        return true;
      })
      .filter(c => 
        c.code?.toLowerCase().includes(term) ||
        c.title_fr?.toLowerCase().includes(term) ||
        c.title_nl?.toLowerCase().includes(term) ||
        c.description_fr?.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [codes, searchTerm]);

  const handleSelect = (code) => {
    onSelect(code);
    setSearchTerm('');
    setShowResults(false);
  };

  const formatAmount = (cents) => {
    if (!cents) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher un code nomenclature..."
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
          ) : filteredCodes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucun code trouvé
            </div>
          ) : (
            <div className="p-2">
              {filteredCodes.map((code) => {
                const isSelected = selectedCodes.some(s => s.id === code.id);
                const title = locale === 'nl' ? code.title_nl : code.title_fr;
                
                return (
                  <div
                    key={code.id}
                    onClick={() => !isSelected && handleSelect(code)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-muted opacity-50 cursor-not-allowed' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold">{code.code}</h4>
                          <span className="text-sm text-muted-foreground">
                            {formatAmount(code.honorarium)}
                          </span>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">Ajouté</Badge>
                          )}
                        </div>
                        <p className="text-sm">{title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>Remb: {formatAmount(code.reimbursed)}</span>
                          <span>•</span>
                          <span>Ticket mod: {formatAmount(code.patient_share)}</span>
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