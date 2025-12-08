import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

const defaultPrestation = {
    code_nomenclature: '',
    libelle: '',
    quantite: 1,
    montant: 0,
    date_prestation: format(new Date(), 'yyyy-MM-dd')
};

export default function PrestationForm({ onSubmit }) {
  const [prestations, setPrestations] = useState([defaultPrestation]);

  const handleAddPrestation = () => {
    setPrestations([...prestations, { ...defaultPrestation }]);
  };

  const handleRemovePrestation = (index) => {
    const newPrestations = prestations.filter((_, i) => i !== index);
    setPrestations(newPrestations);
  };

  const handleChange = (index, field, value) => {
    const newPrestations = [...prestations];
    newPrestations[index][field] = value;
    if (field === 'montant' || field === 'quantite') {
        newPrestations[index][field] = parseFloat(value) || 0;
    }
    setPrestations(newPrestations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(prestations);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {prestations.map((prestation, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Label>Code Nomenclature</Label>
              <Input value={prestation.code_nomenclature} onChange={(e) => handleChange(index, 'code_nomenclature', e.target.value)} required />
            </div>
            <div>
              <Label>Quantité</Label>
              <Input type="number" value={prestation.quantite} onChange={(e) => handleChange(index, 'quantite', e.target.value)} required min="1" />
            </div>
            <div>
              <Label>Montant (€)</Label>
              <Input type="number" value={prestation.montant} onChange={(e) => handleChange(index, 'montant', e.target.value)} required step="0.01" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={prestation.date_prestation} onChange={(e) => handleChange(index, 'date_prestation', e.target.value)} required />
            </div>
          </div>
          <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => handleRemovePrestation(index)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={handleAddPrestation}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une prestation
        </Button>
        <Button type="submit">Valider les prestations</Button>
      </div>
    </form>
  );
}