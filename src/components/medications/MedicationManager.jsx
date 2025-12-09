import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Pill, Search, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MedicationManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    product_name: '',
    substance_name: '',
    atc_code: '',
    form: '',
    strength: '',
    unit: 'mg',
    route: 'orale',
    package_size: '',
    package_unit: 'comprimés',
    cnk: '',
    monography_json: {}
  });

  const { data: drugs = [], isLoading } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 500)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Drug.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success('Médicament ajouté');
      closeDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Drug.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success('Médicament mis à jour');
      closeDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Drug.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success('Médicament supprimé');
    }
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingDrug(null);
    setFormData({
      product_name: '',
      substance_name: '',
      atc_code: '',
      form: '',
      strength: '',
      unit: 'mg',
      route: 'orale',
      package_size: '',
      package_unit: 'comprimés',
      cnk: '',
      monography_json: {}
    });
  };

  const handleEdit = (drug) => {
    setEditingDrug(drug);
    setFormData({
      product_name: drug.product_name || '',
      substance_name: drug.substance_name || '',
      atc_code: drug.atc_code || '',
      form: drug.form || '',
      strength: drug.strength || '',
      unit: drug.unit || 'mg',
      route: drug.route || 'orale',
      package_size: drug.package_size || '',
      package_unit: drug.package_unit || 'comprimés',
      cnk: drug.cnk || '',
      monography_json: drug.monography_json || {}
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingDrug) {
      updateMutation.mutate({ id: editingDrug.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredDrugs = drugs.filter(drug => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      drug.product_name?.toLowerCase().includes(term) ||
      drug.substance_name?.toLowerCase().includes(term) ||
      drug.atc_code?.toLowerCase().includes(term) ||
      drug.cnk?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Base de données médicaments</h2>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau médicament
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, substance, ATC, CNK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filteredDrugs.map(drug => (
          <Card key={drug.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{drug.product_name}</h3>
                    {drug.cnk && <Badge variant="outline">CNK: {drug.cnk}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {drug.substance_name && (
                      <p><span className="text-slate-600">DCI:</span> {drug.substance_name}</p>
                    )}
                    {drug.atc_code && (
                      <p><span className="text-slate-600">ATC:</span> {drug.atc_code}</p>
                    )}
                    {drug.strength && drug.unit && (
                      <p><span className="text-slate-600">Dosage:</span> {drug.strength} {drug.unit}</p>
                    )}
                    {drug.form && (
                      <p><span className="text-slate-600">Forme:</span> {drug.form}</p>
                    )}
                    {drug.route && (
                      <p><span className="text-slate-600">Voie:</span> {drug.route}</p>
                    )}
                    {drug.package_size && (
                      <p><span className="text-slate-600">Conditionnement:</span> {drug.package_size} {drug.package_unit}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(drug)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteMutation.mutate(drug.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDrug ? 'Modifier le médicament' : 'Nouveau médicament'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom commercial *</Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  placeholder="Ex: Dafalgan"
                />
              </div>

              <div>
                <Label>DCI (Substance active)</Label>
                <Input
                  value={formData.substance_name}
                  onChange={(e) => setFormData({...formData, substance_name: e.target.value})}
                  placeholder="Ex: Paracétamol"
                />
              </div>

              <div>
                <Label>Code ATC</Label>
                <Input
                  value={formData.atc_code}
                  onChange={(e) => setFormData({...formData, atc_code: e.target.value})}
                  placeholder="Ex: N02BE01"
                />
              </div>

              <div>
                <Label>Forme galénique</Label>
                <Input
                  value={formData.form}
                  onChange={(e) => setFormData({...formData, form: e.target.value})}
                  placeholder="Ex: Comprimé"
                />
              </div>

              <div>
                <Label>Voie d'administration</Label>
                <Input
                  value={formData.route}
                  onChange={(e) => setFormData({...formData, route: e.target.value})}
                  placeholder="Ex: orale, IV, IM"
                />
              </div>

              <div>
                <Label>Dosage</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.strength}
                    onChange={(e) => setFormData({...formData, strength: e.target.value})}
                    placeholder="500"
                    className="flex-1"
                  />
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="mg"
                    className="w-20"
                  />
                </div>
              </div>

              <div>
                <Label>Conditionnement</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.package_size}
                    onChange={(e) => setFormData({...formData, package_size: e.target.value})}
                    placeholder="30"
                    className="flex-1"
                  />
                  <Input
                    value={formData.package_unit}
                    onChange={(e) => setFormData({...formData, package_unit: e.target.value})}
                    placeholder="comprimés"
                    className="w-32"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label>Code CNK</Label>
                <Input
                  value={formData.cnk}
                  onChange={(e) => setFormData({...formData, cnk: e.target.value})}
                  placeholder="Ex: 1234567"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.product_name}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingDrug ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}