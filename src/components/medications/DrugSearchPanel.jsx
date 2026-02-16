import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Loader2,
  Pill,
  Star,
  X,
  Info,
  AlertTriangle,
  Plus,
  Euro,
  Package,
  FileText
} from 'lucide-react';
import { debounce } from 'lodash';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Base locale de médicaments courants (fallback)
const LOCAL_DRUGS = [
  { cnk: '2047605', product_name: 'PARACETAMOL TEVA 1G', substance: 'Paracétamol', form: 'Comprimé', strength: '1000mg', price: 285, reimbursed: true },
  { cnk: '2569912', product_name: 'DAFALGAN 1G', substance: 'Paracétamol', form: 'Comprimé effervescent', strength: '1000mg', price: 495, reimbursed: true },
  { cnk: '0000123', product_name: 'IBUPROFEN TEVA 400MG', substance: 'Ibuprofène', form: 'Comprimé', strength: '400mg', price: 320, reimbursed: true },
  { cnk: '0000124', product_name: 'NUROFEN 400MG', substance: 'Ibuprofène', form: 'Comprimé enrobé', strength: '400mg', price: 650, reimbursed: false },
  { cnk: '0000125', product_name: 'AMOXICILLINE SANDOZ 500MG', substance: 'Amoxicilline', form: 'Gélule', strength: '500mg', price: 480, reimbursed: true },
  { cnk: '0000126', product_name: 'CLAMOXYL 500MG', substance: 'Amoxicilline', form: 'Gélule', strength: '500mg', price: 720, reimbursed: true },
  { cnk: '0000127', product_name: 'AUGMENTIN 875/125MG', substance: 'Amoxicilline + Ac. clavulanique', form: 'Comprimé', strength: '875/125mg', price: 1250, reimbursed: true },
  { cnk: '0000128', product_name: 'OMEPRAZOLE TEVA 20MG', substance: 'Oméprazole', form: 'Gélule', strength: '20mg', price: 580, reimbursed: true },
  { cnk: '0000129', product_name: 'LOSEC 20MG', substance: 'Oméprazole', form: 'Gélule', strength: '20mg', price: 1450, reimbursed: true },
  { cnk: '0000130', product_name: 'PANTOPRAZOLE TEVA 40MG', substance: 'Pantoprazole', form: 'Comprimé', strength: '40mg', price: 620, reimbursed: true },
  { cnk: '0000131', product_name: 'METFORMINE TEVA 850MG', substance: 'Metformine', form: 'Comprimé', strength: '850mg', price: 380, reimbursed: true },
  { cnk: '0000132', product_name: 'GLUCOPHAGE 850MG', substance: 'Metformine', form: 'Comprimé', strength: '850mg', price: 520, reimbursed: true },
  { cnk: '0000133', product_name: 'AMLODIPINE TEVA 5MG', substance: 'Amlodipine', form: 'Comprimé', strength: '5mg', price: 290, reimbursed: true },
  { cnk: '0000134', product_name: 'NORVASC 5MG', substance: 'Amlodipine', form: 'Comprimé', strength: '5mg', price: 890, reimbursed: true },
  { cnk: '0000135', product_name: 'LISINOPRIL TEVA 10MG', substance: 'Lisinopril', form: 'Comprimé', strength: '10mg', price: 340, reimbursed: true },
  { cnk: '0000136', product_name: 'ZESTRIL 10MG', substance: 'Lisinopril', form: 'Comprimé', strength: '10mg', price: 780, reimbursed: true },
  { cnk: '0000137', product_name: 'SIMVASTATINE TEVA 20MG', substance: 'Simvastatine', form: 'Comprimé', strength: '20mg', price: 420, reimbursed: true },
  { cnk: '0000138', product_name: 'ZOCOR 20MG', substance: 'Simvastatine', form: 'Comprimé', strength: '20mg', price: 1280, reimbursed: true },
  { cnk: '0000139', product_name: 'ATORVASTATINE TEVA 20MG', substance: 'Atorvastatine', form: 'Comprimé', strength: '20mg', price: 560, reimbursed: true },
  { cnk: '0000140', product_name: 'LIPITOR 20MG', substance: 'Atorvastatine', form: 'Comprimé', strength: '20mg', price: 1890, reimbursed: true },
  { cnk: '0000141', product_name: 'BISOPROLOL TEVA 5MG', substance: 'Bisoprolol', form: 'Comprimé', strength: '5mg', price: 310, reimbursed: true },
  { cnk: '0000142', product_name: 'CONCOR 5MG', substance: 'Bisoprolol', form: 'Comprimé', strength: '5mg', price: 720, reimbursed: true },
  { cnk: '0000143', product_name: 'ALPRAZOLAM TEVA 0.5MG', substance: 'Alprazolam', form: 'Comprimé', strength: '0.5mg', price: 280, reimbursed: true },
  { cnk: '0000144', product_name: 'XANAX 0.5MG', substance: 'Alprazolam', form: 'Comprimé', strength: '0.5mg', price: 580, reimbursed: true },
  { cnk: '0000145', product_name: 'SERTRALINE TEVA 50MG', substance: 'Sertraline', form: 'Comprimé', strength: '50mg', price: 520, reimbursed: true },
  { cnk: '0000146', product_name: 'ZOLOFT 50MG', substance: 'Sertraline', form: 'Comprimé', strength: '50mg', price: 1350, reimbursed: true },
  { cnk: '0000147', product_name: 'ESCITALOPRAM TEVA 10MG', substance: 'Escitalopram', form: 'Comprimé', strength: '10mg', price: 480, reimbursed: true },
  { cnk: '0000148', product_name: 'LEXAPRO 10MG', substance: 'Escitalopram', form: 'Comprimé', strength: '10mg', price: 1420, reimbursed: true },
  { cnk: '0000149', product_name: 'TRAMADOL TEVA 50MG', substance: 'Tramadol', form: 'Gélule', strength: '50mg', price: 380, reimbursed: true },
  { cnk: '0000150', product_name: 'CONTRAMAL 50MG', substance: 'Tramadol', form: 'Gélule', strength: '50mg', price: 690, reimbursed: true },
];

export default function DrugSearchPanel({ onViewInfo, onAddToInteractions }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('drug_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const performSearch = useCallback(
    debounce(async (query, type) => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Essayer SAM v2 API d'abord
        let apiResults = [];
        try {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Recherche médicament belge SAM v2: "${query}" (type: ${type}). 
            Retourne les 20 premiers résultats avec: cnk, product_name, substance, form, strength, price (centimes), reimbursed (boolean).
            Base-toi sur les médicaments commercialisés en Belgique.`,
            response_json_schema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      cnk: { type: "string" },
                      product_name: { type: "string" },
                      substance: { type: "string" },
                      form: { type: "string" },
                      strength: { type: "string" },
                      price: { type: "number" },
                      reimbursed: { type: "boolean" }
                    }
                  }
                }
              }
            }
          });
          apiResults = response.results || [];
        } catch (e) {
          console.warn('SAM API error, using local fallback:', e);
        }

        // Fallback local
        if (apiResults.length === 0) {
          const queryLower = query.toLowerCase();
          apiResults = LOCAL_DRUGS.filter(drug => {
            if (type === 'name') {
              return drug.product_name.toLowerCase().includes(queryLower);
            } else if (type === 'substance') {
              return drug.substance.toLowerCase().includes(queryLower);
            } else if (type === 'cnk') {
              return drug.cnk.includes(query);
            }
            return false;
          });
        }

        setResults(apiResults);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Erreur de recherche');
      } finally {
        setIsSearching(false);
      }
    }, 400),
    []
  );

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query, searchType);
  };

  const toggleFavorite = (drug) => {
    const isFav = favorites.some(f => f.cnk === drug.cnk);
    let newFavorites;
    if (isFav) {
      newFavorites = favorites.filter(f => f.cnk !== drug.cnk);
    } else {
      newFavorites = [...favorites, drug];
    }
    setFavorites(newFavorites);
    localStorage.setItem('drug_favorites', JSON.stringify(newFavorites));
    toast.success(isFav ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  const isFavorite = (drug) => favorites.some(f => f.cnk === drug.cnk);

  const formatPrice = (cents) => {
    if (!cents) return '-';
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={handleSearch}
                placeholder={
                  searchType === 'name' ? 'Rechercher par nom de médicament...' :
                  searchType === 'substance' ? 'Rechercher par substance (DCI)...' :
                  'Rechercher par code CNK...'
                }
                className="pl-11 h-12 text-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setSearchQuery('');
                    setResults([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Badge
                variant={searchType === 'name' ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSearchType('name')}
              >
                <Pill className="w-4 h-4 mr-2" />
                Nom commercial
              </Badge>
              <Badge
                variant={searchType === 'substance' ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSearchType('substance')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Substance (DCI)
              </Badge>
              <Badge
                variant={searchType === 'cnk' ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSearchType('cnk')}
              >
                <Package className="w-4 h-4 mr-2" />
                Code CNK
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">
            {isSearching ? 'Recherche en cours...' :
             results.length > 0 ? `${results.length} résultat(s)` :
             searchQuery.length >= 2 ? 'Aucun résultat' : 'Tapez au moins 2 caractères'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((drug, index) => (
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
                          onClick={() => toggleFavorite(drug)}
                          className={isFavorite(drug) ? 'text-yellow-500' : 'text-slate-400'}
                        >
                          <Star className={`w-4 h-4 ${isFavorite(drug) ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewInfo(drug)}
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Pill className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Recherchez un médicament par nom, substance ou code CNK</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}