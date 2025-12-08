import React, { useState } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';

export default function PatientSelector({ patients, onSelect }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  return (
    <div className="max-w-md mx-auto">
        <p className="text-center text-slate-600 mb-4">Sélectionnez un patient pour commencer la facturation.</p>
        <Command>
            <CommandInput placeholder="Rechercher un patient par nom ou NISS..." />
            <CommandList>
                <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                {patients.map((patient) => {
                    const officialName = patient.name?.find(n => n.use === 'official') || { family: '', given: [] };
                    const given = Array.isArray(officialName.given) ? officialName.given : [];
                    const niss = patient.identifier?.find(id => id.system === 'nn')?.value;

                    return (
                        <CommandItem
                            key={patient.id}
                            onSelect={() => onSelect(patient)}
                            className="cursor-pointer"
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">{given.join(' ')} {officialName.family || ''}</span>
                                <span className="text-xs text-slate-500">NISS: {niss || 'Non défini'}</span>
                            </div>
                        </CommandItem>
                    );
                })}
            </CommandList>
        </Command>
    </div>
  );
}