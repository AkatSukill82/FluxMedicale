import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function CabinetSelector({ value, onChange, showAll = false }) {
  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinets'],
    queryFn: () => base44.entities.Cabinet.filter({ actif: true })
  });

  if (cabinets.length <= 1 && !showAll) return null;

  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="w-4 h-4 mr-2 text-slate-500" />
        <SelectValue placeholder="Tous les cabinets" />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">Tous les cabinets</SelectItem>}
        {cabinets.map(cabinet => (
          <SelectItem key={cabinet.id} value={cabinet.id}>
            <div className="flex items-center gap-2">
              {cabinet.couleur && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: cabinet.couleur }}
                />
              )}
              {cabinet.nom}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}