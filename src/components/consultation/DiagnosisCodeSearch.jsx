import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, Tag } from 'lucide-react';

// Codes CISP-2 courants (médecine générale)
const CISP2_CODES = [
  // Système respiratoire (R)
  { code: 'R05', description: 'Toux', category: 'Respiratoire' },
  { code: 'R74', description: 'Infection aiguë voies respiratoires supérieures', category: 'Respiratoire' },
  { code: 'R78', description: 'Bronchite aiguë', category: 'Respiratoire' },
  { code: 'R80', description: 'Grippe', category: 'Respiratoire' },
  { code: 'R96', description: 'Asthme', category: 'Respiratoire' },
  { code: 'R95', description: 'BPCO', category: 'Respiratoire' },
  
  // Système digestif (D)
  { code: 'D01', description: 'Douleur abdominale généralisée', category: 'Digestif' },
  { code: 'D10', description: 'Vomissement', category: 'Digestif' },
  { code: 'D11', description: 'Diarrhée', category: 'Digestif' },
  { code: 'D73', description: 'Gastro-entérite présumée infectieuse', category: 'Digestif' },
  { code: 'D84', description: 'Reflux gastro-oesophagien', category: 'Digestif' },
  
  // Système cardiovasculaire (K)
  { code: 'K86', description: 'Hypertension non compliquée', category: 'Cardiovasculaire' },
  { code: 'K87', description: 'Hypertension avec atteinte organes cibles', category: 'Cardiovasculaire' },
  { code: 'K78', description: 'Fibrillation auriculaire', category: 'Cardiovasculaire' },
  { code: 'K74', description: 'Angor, angine de poitrine', category: 'Cardiovasculaire' },
  { code: 'K77', description: 'Insuffisance cardiaque', category: 'Cardiovasculaire' },
  
  // Système musculo-squelettique (L)
  { code: 'L03', description: 'Lombalgie', category: 'Musculo-squelettique' },
  { code: 'L86', description: 'Syndrome vertébral lombaire avec irradiation', category: 'Musculo-squelettique' },
  { code: 'L87', description: 'Coxarthrose', category: 'Musculo-squelettique' },
  { code: 'L90', description: 'Gonarthrose', category: 'Musculo-squelettique' },
  { code: 'L88', description: 'Polyarthrite rhumatoïde', category: 'Musculo-squelettique' },
  
  // Système endocrinien/métabolique (T)
  { code: 'T89', description: 'Diabète insulino-dépendant', category: 'Endocrinologie' },
  { code: 'T90', description: 'Diabète non insulino-dépendant', category: 'Endocrinologie' },
  { code: 'T82', description: 'Obésité', category: 'Endocrinologie' },
  { code: 'T93', description: 'Hyperlipidémie', category: 'Endocrinologie' },
  { code: 'T86', description: 'Hypothyroïdie', category: 'Endocrinologie' },
  
  // Psychologique (P)
  { code: 'P01', description: 'Sensation angoisse/nervosité/tension', category: 'Psychologique' },
  { code: 'P03', description: 'Dépression', category: 'Psychologique' },
  { code: 'P06', description: 'Troubles du sommeil', category: 'Psychologique' },
  { code: 'P74', description: 'Trouble anxieux', category: 'Psychologique' },
  { code: 'P76', description: 'Trouble dépressif', category: 'Psychologique' },
  
  // Général (A)
  { code: 'A03', description: 'Fièvre', category: 'Général' },
  { code: 'A04', description: 'Fatigue/faiblesse générale', category: 'Général' },
  { code: 'A97', description: 'Pas de maladie', category: 'Général' },
  { code: 'A98', description: 'Médecine préventive/de dépistage', category: 'Général' },
  
  // Peau (S)
  { code: 'S03', description: 'Verrue', category: 'Dermatologie' },
  { code: 'S74', description: 'Dermatophytose', category: 'Dermatologie' },
  { code: 'S87', description: 'Eczéma/dermatite atopique', category: 'Dermatologie' },
  { code: 'S91', description: 'Psoriasis', category: 'Dermatologie' },
  
  // Urinaire (U)
  { code: 'U71', description: 'Cystite/autre infection urinaire', category: 'Urinaire' },
  { code: 'U95', description: 'Lithiase urinaire', category: 'Urinaire' },
];

// Codes ICD-10 courants
const ICD10_CODES = [
  // Infections
  { code: 'J06.9', description: 'Infection aiguë des voies respiratoires supérieures, sans précision', category: 'Infections' },
  { code: 'J20.9', description: 'Bronchite aiguë, sans précision', category: 'Infections' },
  { code: 'J18.9', description: 'Pneumonie, sans précision', category: 'Infections' },
  { code: 'A09', description: 'Gastro-entérite infectieuse', category: 'Infections' },
  { code: 'N39.0', description: 'Infection urinaire, siège non précisé', category: 'Infections' },
  
  // Cardiovasculaire
  { code: 'I10', description: 'Hypertension essentielle (primaire)', category: 'Cardiovasculaire' },
  { code: 'I48.9', description: 'Fibrillation auriculaire, sans précision', category: 'Cardiovasculaire' },
  { code: 'I25.9', description: 'Cardiopathie ischémique chronique, sans précision', category: 'Cardiovasculaire' },
  { code: 'I50.9', description: 'Insuffisance cardiaque, sans précision', category: 'Cardiovasculaire' },
  
  // Endocrinologie
  { code: 'E11.9', description: 'Diabète sucré de type 2 sans complication', category: 'Endocrinologie' },
  { code: 'E78.0', description: 'Hypercholestérolémie pure', category: 'Endocrinologie' },
  { code: 'E66.9', description: 'Obésité, sans précision', category: 'Endocrinologie' },
  { code: 'E03.9', description: 'Hypothyroïdie, sans précision', category: 'Endocrinologie' },
  
  // Musculo-squelettique
  { code: 'M54.5', description: 'Lombalgie basse', category: 'Musculo-squelettique' },
  { code: 'M54.2', description: 'Cervicalgie', category: 'Musculo-squelettique' },
  { code: 'M17.9', description: 'Gonarthrose, sans précision', category: 'Musculo-squelettique' },
  { code: 'M16.9', description: 'Coxarthrose, sans précision', category: 'Musculo-squelettique' },
  
  // Psychiatrie
  { code: 'F32.9', description: 'Épisode dépressif, sans précision', category: 'Psychiatrie' },
  { code: 'F41.9', description: 'Trouble anxieux, sans précision', category: 'Psychiatrie' },
  { code: 'G47.9', description: 'Trouble du sommeil, sans précision', category: 'Psychiatrie' },
  
  // Dermatologie
  { code: 'L30.9', description: 'Dermatite, sans précision', category: 'Dermatologie' },
  { code: 'L40.9', description: 'Psoriasis, sans précision', category: 'Dermatologie' },
];

export default function DiagnosisCodeSearch({ value, onChange, codeSystem = 'both' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSystem, setActiveSystem] = useState(codeSystem === 'both' ? 'cisp2' : codeSystem);
  const [selectedCodes, setSelectedCodes] = useState(value || []);

  useEffect(() => {
    onChange?.(selectedCodes);
  }, [selectedCodes]);

  const codes = activeSystem === 'cisp2' ? CISP2_CODES : ICD10_CODES;

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(codes.map(c => c.category))];

  const addCode = (code) => {
    if (!selectedCodes.find(c => c.code === code.code && c.system === activeSystem)) {
      setSelectedCodes([...selectedCodes, { ...code, system: activeSystem }]);
    }
  };

  const removeCode = (codeToRemove) => {
    setSelectedCodes(selectedCodes.filter(c => !(c.code === codeToRemove.code && c.system === codeToRemove.system)));
  };

  return (
    <div className="space-y-3">
      {/* Codes sélectionnés */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg">
          {selectedCodes.map((code, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              <span className="font-mono text-xs">{code.code}</span>
              <span className="text-xs">({code.system.toUpperCase()})</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-red-100"
                onClick={() => removeCode(code)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Système de codage */}
      {codeSystem === 'both' && (
        <Tabs value={activeSystem} onValueChange={setActiveSystem}>
          <TabsList className="w-full">
            <TabsTrigger value="cisp2" className="flex-1">CISP-2</TabsTrigger>
            <TabsTrigger value="icd10" className="flex-1">ICD-10</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={`Rechercher un code ${activeSystem.toUpperCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Liste des codes */}
      <ScrollArea className="h-48 border rounded-lg">
        <div className="p-2 space-y-1">
          {searchTerm ? (
            filteredCodes.map(code => (
              <button
                key={code.code}
                onClick={() => addCode(code)}
                className="w-full text-left p-2 rounded hover:bg-blue-50 flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-blue-600">{code.code}</span>
                  <span className="text-sm ml-2">{code.description}</span>
                </div>
                <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100">
                  Ajouter
                </Badge>
              </button>
            ))
          ) : (
            categories.map(category => (
              <div key={category} className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">{category}</p>
                {codes.filter(c => c.category === category).slice(0, 3).map(code => (
                  <button
                    key={code.code}
                    onClick={() => addCode(code)}
                    className="w-full text-left p-2 rounded hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs font-semibold text-blue-600">{code.code}</span>
                    <span className="text-sm truncate">{code.description}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        <Tag className="w-3 h-3 inline mr-1" />
        {activeSystem === 'cisp2' 
          ? 'CISP-2: Classification Internationale des Soins Primaires (médecine générale)'
          : 'ICD-10: Classification Internationale des Maladies (codage hospitalier)'
        }
      </p>
    </div>
  );
}