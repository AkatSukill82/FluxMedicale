import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Euro,
  Tag,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'ACTE_TECHNIQUE', label: 'Acte technique' },
  { value: 'FORFAIT', label: 'Forfait' },
  { value: 'MATERIEL', label: 'Matériel' },
  { value: 'AUTRE', label: 'Autre' },
];

export default function TarifManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTarif, setEditingTarif] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const { data: tarifs = [], isLoading } = useQuery({
    queryKey: ['tarifs'],
    queryFn: () => base44.entities.Tarif.list('code', 200)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tarif.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifs'] });
      toast.success('Tarif créé');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tarif.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifs'] });
      toast.success('Tarif mis à jour');
      setShowForm(false);
      setEditingTarif(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarif.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifs'] });
      toast.success('Tarif supprimé');
    }
  });

  const filteredTarifs = tarifs.filter(t => {
    const matchesSearch = !searchQuery || 
      t.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.label?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (tarif) => {
    setEditingTarif(tarif);
    setShowForm(true);
  };

  const handleDelete = (tarif) => {
    if (confirm(`Supprimer le tarif "${tarif.label}" ?`)) {
      deleteMutation.mutate(tarif.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestion des tarifs</h2>
        <Button onClick={() => { setEditingTarif(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau tarif
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes catégories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des tarifs */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTarifs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun tarif configuré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Prix base</TableHead>
                  <TableHead className="text-right">Part patient</TableHead>
                  <TableHead>Convention</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTarifs.map(tarif => (
                  <TableRow key={tarif.id}>
                    <TableCell className="font-mono font-medium">{tarif.code}</TableCell>
                    <TableCell>{tarif.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === tarif.category)?.label || tarif.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(tarif.base_price / 100).toFixed(2)}€
                    </TableCell>
                    <TableCell className="text-right">
                      {tarif.patient_share ? `${(tarif.patient_share / 100).toFixed(2)}€` : '-'}
                    </TableCell>
                    <TableCell>
                      {tarif.is_convention ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tarif.is_active ? 'default' : 'secondary'}>
                        {tarif.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tarif)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(tarif)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de création/édition */}
      <TarifFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingTarif(null); }}
        tarif={editingTarif}
        onSave={(data) => {
          if (editingTarif) {
            updateMutation.mutate({ id: editingTarif.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function TarifFormModal({ isOpen, onClose, tarif, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    code: tarif?.code || '',
    label: tarif?.label || '',
    category: tarif?.category || 'CONSULTATION',
    base_price: tarif?.base_price || 0,
    insurance_price: tarif?.insurance_price || 0,
    patient_share: tarif?.patient_share || 0,
    vat_rate: tarif?.vat_rate || 0,
    is_convention: tarif?.is_convention ?? true,
    nomenclature_code: tarif?.nomenclature_code || '',
    duration_minutes: tarif?.duration_minutes || 15,
    is_active: tarif?.is_active ?? true,
    notes: tarif?.notes || ''
  });

  React.useEffect(() => {
    if (tarif) {
      setFormData({
        code: tarif.code || '',
        label: tarif.label || '',
        category: tarif.category || 'CONSULTATION',
        base_price: tarif.base_price || 0,
        insurance_price: tarif.insurance_price || 0,
        patient_share: tarif.patient_share || 0,
        vat_rate: tarif.vat_rate || 0,
        is_convention: tarif.is_convention ?? true,
        nomenclature_code: tarif.nomenclature_code || '',
        duration_minutes: tarif.duration_minutes || 15,
        is_active: tarif.is_active ?? true,
        notes: tarif.notes || ''
      });
    } else {
      setFormData({
        code: '',
        label: '',
        category: 'CONSULTATION',
        base_price: 0,
        insurance_price: 0,
        patient_share: 0,
        vat_rate: 0,
        is_convention: true,
        nomenclature_code: '',
        duration_minutes: 15,
        is_active: true,
        notes: ''
      });
    }
  }, [tarif]);

  const handleSubmit = () => {
    if (!formData.code || !formData.label) {
      toast.error('Code et libellé requis');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tarif ? 'Modifier le tarif' : 'Nouveau tarif'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="CONSULT01"
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Libellé *</Label>
            <Input
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Consultation standard"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prix base (ct)</Label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                = {(formData.base_price / 100).toFixed(2)}€
              </p>
            </div>
            <div className="space-y-2">
              <Label>Part assurance (ct)</Label>
              <Input
                type="number"
                value={formData.insurance_price}
                onChange={(e) => setFormData({ ...formData, insurance_price: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Part patient (ct)</Label>
              <Input
                type="number"
                value={formData.patient_share}
                onChange={(e) => setFormData({ ...formData, patient_share: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code nomenclature INAMI</Label>
              <Input
                value={formData.nomenclature_code}
                onChange={(e) => setFormData({ ...formData, nomenclature_code: e.target.value })}
                placeholder="101010"
              />
            </div>
            <div className="space-y-2">
              <Label>Durée estimée (min)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 15 })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_convention}
                onChange={(e) => setFormData({ ...formData, is_convention: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Tarif conventionné</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Actif</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {tarif ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}