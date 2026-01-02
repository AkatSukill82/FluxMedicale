import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Loader2, 
  Pill, 
  Star, 
  Clock,
  Filter,
  X,
  Database,
  Sparkles,
  History
} from 'lucide-react';
import { debounce } from 'lodash';
import { samV2Search } from '@/functions/samV2Search';

// Médicaments fréquemment prescrits (cache local)
const FREQUENT_MEDICATIONS = [
  { product_name: 'PARACETAMOL 1000MG', cnk: '2047605', substance_name: 'Paracétamol', form: 'Comprimé' },
  { product_name: 'IBUPROFENE 400MG', cnk: '0123456', substance_name: 'Ibuprofène', form: 'Comprimé' },
  { product_name: 'AMOXICILLINE 500MG', cnk: '0234567', substance_name: 'Amoxicilline', form: 'Gélule' },
  { product_name: 'OMEPRAZOLE 20MG', cnk: '0345678', substance_name: 'Oméprazole', form: 'Gélule' },
  { product_name: 'METFORMINE 850MG', cnk: '0456789', substance_name: 'Metformine', form: 'Comprimé' },
  { product_name: 'AMLODIPINE 5MG', cnk: '0567890', substance_name: 'Amlodipine', form: 'Comprimé' },
  { product_name: 'SIMVASTATINE 20MG', cnk: '0678901', substance_name: 'Simvastatine', form: 'Comprimé' },
  { product_name: 'LISINOPRIL 10MG', cnk: '0789012', substance_name: 'Lisinopril', form: 'Comprimé' },
];

export default function AdvancedMedicationSearch({ 
  onSelect, 
  selectedMedications = [],
  patient,
  showHistory = true 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name'); // name, substance, cnk
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('search');

  // Historique des prescriptions du patient
  const { data: prescriptionHistory = [] } = useQuery({
    queryKey: ['prescriptionHistory', patient?.id],
    queryFn: async () => {
      const prescriptions = await base44.entities.Prescription.filter({
        patient_id: patient.id
      }, '-date_prescription', 20);
      
      // Extraire les médicaments uniques
      const medsMap = new Map();
      prescriptions.forEach(p => {
        p.medicaments?.forEach(med => {
          if (!medsMap.has(med.nom_produit)) {
            medsMap.set(med.nom_produit, {
              product_name: med.nom_produit,
              cnk: med.cnk,
              posology: med.posologie,
              last_prescribed: p.date_prescription
            });
          }
        });
      });
      
      return Array.from(medsMap.values());
    },
    enabled: !!patient?.id && showHistory
  });

  // Recherche avec debounce
  const performSearch = useCallback(
    debounce(async (query, type) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Appeler l'API SAM v2
        const response = await samV2Search({
          query,
          search_type: type,
          limit: 30
        });

        if (response.data?.results) {
          setSearchResults(response.data.results);
        } else {
          // Fallback: recherche locale
          const localResults = FREQUENT_MEDICATIONS.filter(med => {
            const searchLower = query.toLowerCase();
            if (type === 'name') {
              return med.product_name.toLowerCase().includes(searchLower);
            } else if (type === 'substance') {
              return med.substance_name.toLowerCase().includes(searchLower);
            } else if (type === 'cnk') {
              return med.cnk.includes(query);
            }
            return false;
          });
          setSearchResults(localResults);
        }
      } catch (error) {
        console.error('Erreur recherche:', error);
        // Fallback local en cas d'erreur
        const localResults = FREQUENT_MEDICATIONS.filter(med =>
          med.product_name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(localResults);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query, searchType);
  };

  const handleSelect = (medication) => {
    // Vérifier si déjà sélectionné
    const isSelected = selectedMedications.some(
      m => m.product_name === medication.product_name || m.cnk === medication.cnk
    );
    
    if (!isSelected) {
      onSelect(medication);
    }
  };

  const isAlreadySelected = (med) => {
    return selectedMedications.some(
      m => m.product_name === med.product_name || (m.cnk && m.cnk === med.cnk)
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="gap-1">
            <Search className="w-4 h-4" />
            Recherche
          </TabsTrigger>
          <TabsTrigger value="frequent" className="gap-1">
            <Star className="w-4 h-4" />
            Fréquents
          </TabsTrigger>
          {showHistory && (
            <TabsTrigger value="history" className="gap-1">
              <History className="w-4 h-4" />
              Historique patient
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Barre de recherche améliorée */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={
                    searchType === 'name' ? 'Rechercher par nom de médicament...' :
                    searchType === 'substance' ? 'Rechercher par substance active...' :
                    'Rechercher par code CNK...'
                  }
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filtres de recherche */}
            <div className="flex gap-2">
              <Badge
                variant={searchType === 'name' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSearchType('name')}
              >
                <Pill className="w-3 h-3 mr-1" />
                Nom
              </Badge>
              <Badge
                variant={searchType === 'substance' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSearchType('substance')}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Substance
              </Badge>
              <Badge
                variant={searchType === 'cnk' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSearchType('cnk')}
              >
                <Database className="w-3 h-3 mr-1" />
                CNK
              </Badge>
            </div>
          </div>

          {/* Résultats */}
          <ScrollArea className="h-[300px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((med, index) => (
                  <Card 
                    key={`${med.cnk || index}-${med.product_name}`}
                    className={`cursor-pointer transition-all hover:border-blue-300 ${
                      isAlreadySelected(med) ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    onClick={() => handleSelect(med)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{med.product_name}</p>
                          <p className="text-xs text-slate-600">
                            {med.substance_name}
                            {med.strength && ` • ${med.strength}${med.unit || ''}`}
                            {med.form && ` • ${med.form}`}
                          </p>
                          {med.cnk && (
                            <Badge variant="outline" className="text-xs mt-1">
                              CNK: {med.cnk}
                            </Badge>
                          )}
                        </div>
                        {isAlreadySelected(med) && (
                          <Badge className="bg-blue-600">Sélectionné</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Aucun résultat pour "{searchQuery}"</p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Tapez au moins 2 caractères pour rechercher</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="frequent">
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">
                <Star className="w-3 h-3 inline mr-1" />
                Médicaments les plus prescrits
              </p>
              {FREQUENT_MEDICATIONS.map((med, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all hover:border-blue-300 ${
                    isAlreadySelected(med) ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                  onClick={() => handleSelect(med)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{med.product_name}</p>
                        <p className="text-xs text-slate-600">{med.substance_name} • {med.form}</p>
                      </div>
                      {isAlreadySelected(med) && (
                        <Badge className="bg-blue-600">Sélectionné</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {showHistory && (
          <TabsContent value="history">
            <ScrollArea className="h-[350px]">
              {prescriptionHistory.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-3">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Médicaments déjà prescrits à ce patient
                  </p>
                  {prescriptionHistory.map((med, index) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-all hover:border-blue-300 ${
                        isAlreadySelected(med) ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                      onClick={() => handleSelect(med)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{med.product_name}</p>
                            {med.posology && (
                              <p className="text-xs text-slate-600">Dernière posologie: {med.posology}</p>
                            )}
                          </div>
                          {isAlreadySelected(med) ? (
                            <Badge className="bg-blue-600">Sélectionné</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Déjà prescrit
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Aucun historique de prescription pour ce patient</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}