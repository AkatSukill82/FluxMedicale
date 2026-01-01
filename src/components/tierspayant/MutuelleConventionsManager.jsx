import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Building2,
  Plus,
  Edit,
  Trash2,
  Percent,
  Phone,
  Mail,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Mutuelles belges principales
const MUTUELLES_BELGES = [
  { code: '100', nom: 'Alliance Nationale des Mutualités Chrétiennes' },
  { code: '200', nom: 'Union Nationale des Mutualités Neutres' },
  { code: '300', nom: 'Union Nationale des Mutualités Socialistes' },
  { code: '400', nom: 'Union Nationale des Mutualités Libérales' },
  { code: '500', nom: 'Union Nationale des Mutualités Libres' },
  { code: '600', nom: 'Caisse Auxiliaire d\'Assurance Maladie-Invalidité (CAAMI)' },
  { code: '900', nom: 'Office de Sécurité Sociale d\'Outre-Mer' },
];

export default function MutuelleConventionsManager() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingConvention, setEditingConvention] = useState(null);

  const { data: conventions = [], isLoading } = useQuery({
    queryKey: ['mutuelleConventions'],
    queryFn: () => base44.entities.MutuelleConvention.list()
  });

  const [formData, setFormData] = useState({
    code_mutuelle: '',
    nom_mutuelle: '',
    type_convention: 'standard',
    taux_remboursement_base: 75,
    taux_remboursement_bim: 90,
    taux_remboursement_omnio: 85,
    plafond_ticket_moderateur: '',
    delai_paiement_jours: 30,
    contact_email: '',
    contact_telephone: '',
    adresse_facturation: '',
    numero_compte_bancaire: '',
    actif: true,
    notes: ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingConvention) {
        return base44.entities.MutuelleConvention.update(editingConvention.id, data);
      }
      return base44.entities.MutuelleConvention.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutuelleConventions'] });
      toast.success(editingConvention ? 'Convention mise à jour' : 'Convention créée');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MutuelleConvention.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutuelleConventions'] });
      toast.success('Convention supprimée');
    }
  });

  const resetForm = () => {
    setFormData({
      code_mutuelle: '',
      nom_mutuelle: '',
      type_convention: 'standard',
      taux_remboursement_base: 75,
      taux_remboursement_bim: 90,
      taux_remboursement_omnio: 85,
      plafond_ticket_moderateur: '',
      delai_paiement_jours: 30,
      contact_email: '',
      contact_telephone: '',
      adresse_facturation: '',
      numero_compte_bancaire: '',
      actif: true,
      notes: ''
    });
    setEditingConvention(null);
    setShowModal(false);
  };

  const handleEdit = (convention) => {
    setEditingConvention(convention);
    setFormData({
      code_mutuelle: convention.code_mutuelle || '',
      nom_mutuelle: convention.nom_mutuelle || '',
      type_convention: convention.type_convention || 'standard',
      taux_remboursement_base: convention.taux_remboursement_base || 75,
      taux_remboursement_bim: convention.taux_remboursement_bim || 90,
      taux_remboursement_omnio: convention.taux_remboursement_omnio || 85,
      plafond_ticket_moderateur: convention.plafond_ticket_moderateur || '',
      delai_paiement_jours: convention.delai_paiement_jours || 30,
      contact_email: convention.contact_email || '',
      contact_telephone: convention.contact_telephone || '',
      adresse_facturation: convention.adresse_facturation || '',
      numero_compte_bancaire: convention.numero_compte_bancaire || '',
      actif: convention.actif !== false,
      notes: convention.notes || ''
    });
    setShowModal(true);
  };

  const handleSelectMutuelle = (code) => {
    const mutuelle = MUTUELLES_BELGES.find(m => m.code === code);
    if (mutuelle) {
      setFormData({
        ...formData,
        code_mutuelle: code,
        nom_mutuelle: mutuelle.nom
      });
    }
  };

  const handleSave = () => {
    if (!formData.code_mutuelle || !formData.nom_mutuelle) {
      toast.error('Code et nom de mutuelle requis');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = (convention) => {
    if (confirm(`Supprimer la convention avec ${convention.nom_mutuelle} ?`)) {
      deleteMutation.mutate(convention.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Conventions Mutuelles</h3>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle convention
        </Button>
      </div>

      {conventions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune convention configurée</p>
            <p className="text-sm">Ajoutez vos conventions avec les mutuelles pour gérer les taux de remboursement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conventions.map((convention) => (
            <Card key={convention.id} className={!convention.actif ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base">{convention.nom_mutuelle}</CardTitle>
                      <p className="text-sm text-muted-foreground">Code OA: {convention.code_mutuelle}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(convention)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-600"
                      onClick={() => handleDelete(convention)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {convention.actif ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <Badge variant="outline">{convention.type_convention}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-xs text-muted-foreground">Standard</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      {convention.taux_remboursement_base}%
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-xs text-muted-foreground">BIM</p>
                    <p className="font-semibold text-blue-700">{convention.taux_remboursement_bim}%</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-xs text-muted-foreground">OMNIO</p>
                    <p className="font-semibold text-purple-700">{convention.taux_remboursement_omnio}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Délai: {convention.delai_paiement_jours}j
                  </span>
                  {convention.contact_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {convention.contact_email}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      <Dialog open={showModal} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {editingConvention ? 'Modifier la convention' : 'Nouvelle convention'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sélection mutuelle */}
            <div className="space-y-2">
              <Label>Mutuelle</Label>
              <Select value={formData.code_mutuelle} onValueChange={handleSelectMutuelle}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une mutuelle..." />
                </SelectTrigger>
                <SelectContent>
                  {MUTUELLES_BELGES.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.code} - {m.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code OA</Label>
                <Input
                  value={formData.code_mutuelle}
                  onChange={(e) => setFormData({ ...formData, code_mutuelle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type_convention} 
                  onValueChange={(v) => setFormData({ ...formData, type_convention: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="preferentiel">Préférentiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={formData.nom_mutuelle}
                onChange={(e) => setFormData({ ...formData, nom_mutuelle: e.target.value })}
              />
            </div>

            {/* Taux de remboursement */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Taux de remboursement
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Standard</Label>
                  <Input
                    type="number"
                    value={formData.taux_remboursement_base}
                    onChange={(e) => setFormData({ ...formData, taux_remboursement_base: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <Label className="text-xs">BIM</Label>
                  <Input
                    type="number"
                    value={formData.taux_remboursement_bim}
                    onChange={(e) => setFormData({ ...formData, taux_remboursement_bim: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <Label className="text-xs">OMNIO</Label>
                  <Input
                    type="number"
                    value={formData.taux_remboursement_omnio}
                    onChange={(e) => setFormData({ ...formData, taux_remboursement_omnio: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Délai paiement (jours)</Label>
                <Input
                  type="number"
                  value={formData.delai_paiement_jours}
                  onChange={(e) => setFormData({ ...formData, delai_paiement_jours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Plafond ticket modérateur (€)</Label>
                <Input
                  type="number"
                  value={formData.plafond_ticket_moderateur}
                  onChange={(e) => setFormData({ ...formData, plafond_ticket_moderateur: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email contact</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={formData.contact_telephone}
                  onChange={(e) => setFormData({ ...formData, contact_telephone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="actif"
                checked={formData.actif}
                onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="actif">Convention active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}