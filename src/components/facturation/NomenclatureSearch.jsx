import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';

// Nomenclature RIZIV simulée (à remplacer par une vraie base de données)
const NOMENCLATURES = [
  { code: '101010', label_fr: 'Consultation au cabinet', base_price: 25.00, allowed_profiles: ['generaliste', 'specialist'] },
  { code: '101032', label_fr: 'Consultation à domicile', base_price: 35.00, allowed_profiles: ['generaliste'] },
  { code: '102010', label_fr: 'Première consultation', base_price: 30.00, allowed_profiles: ['generaliste', 'specialist'] },
  { code: '102012', label_fr: 'Consultation de suivi', base_price: 20.00, allowed_profiles: ['generaliste', 'specialist'] },
  { code: '475010', label_fr: 'Électrocardiogramme', base_price: 15.00, allowed_profiles: ['generaliste', 'cardiologist'] },
  { code: '471012', label_fr: 'Spirométrie', base_price: 18.00, allowed_profiles: ['generaliste', 'pneumologist'] },
  { code: '103132', label_fr: 'Certificat médical', base_price: 10.00, allowed_profiles: ['generaliste', 'specialist'] },
];

export default function NomenclatureSearch({ onSelect, userINAMI }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState(NOMENCLATURES);

  const handleSearch = (value) => {
    setSearch(value);
    const results = NOMENCLATURES.filter(n => 
      n.code.includes(value.toLowerCase()) || 
      n.label_fr.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(results);
  };

  const handleSelect = (nomenclature) => {
    // Vérifier si autorisé pour le profil INAMI
    const userProfile = 'generaliste'; // À adapter selon currentUser.specialite
    
    if (!nomenclature.allowed_profiles.includes(userProfile)) {
      alert(`Code ${nomenclature.code} non autorisé pour votre profil INAMI`);
      return;
    }

    onSelect({
      code: nomenclature.code,
      label_fr: nomenclature.label_fr,
      base_price: nomenclature.base_price || 0
    });

    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une prestation
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Rechercher par code ou libellé..." 
            value={search}
            onValueChange={handleSearch}
          />
          <CommandList>
            <CommandEmpty>Aucune prestation trouvée</CommandEmpty>
            <CommandGroup>
              {filtered.map((nomenclature) => (
                <CommandItem
                  key={nomenclature.code}
                  onSelect={() => handleSelect(nomenclature)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-semibold">{nomenclature.code}</div>
                      <div className="text-xs text-slate-600">{nomenclature.label_fr}</div>
                    </div>
                    <div className="font-semibold text-blue-600">
                      {(nomenclature.base_price || 0).toFixed(2)}€
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}