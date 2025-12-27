import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Clock,
  Edit,
  Trash2,
  Star,
  Users,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16'
];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export default function CabinetManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    telephone: '',
    email: '',
    nihii_cabinet: '',
    couleur: COLORS[0],
    est_principal: false,
    horaires: {}
  });

  const { data: cabinets = [], isLoading } = useQuery({
    queryKey: ['cabinets'],
    queryFn: () => base44.entities.Cabinet.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cabinet.create({
      ...data,
      medecins: [currentUser?.email]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinets'] });
      toast.success('Cabinet créé');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cabinet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinets'] });
      toast.success('Cabinet mis à jour');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cabinet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinets'] });
      toast.success('Cabinet supprimé');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingCabinet(null);
    setFormData({
      nom: '',
      adresse: '',
      ville: '',
      code_postal: '',
      telephone: '',
      email: '',
      nihii_cabinet: '',
      couleur: COLORS[0],
      est_principal: false,
      horaires: {}
    });
  };

  const handleEdit = (cabinet) => {
    setEditingCabinet(cabinet);
    setFormData({
      nom: cabinet.nom || '',
      adresse: cabinet.adresse || '',
      ville: cabinet.ville || '',
      code_postal: cabinet.code_postal || '',
      telephone: cabinet.telephone || '',
      email: cabinet.email || '',
      nihii_cabinet: cabinet.nihii_cabinet || '',
      couleur: cabinet.couleur || COLORS[0],
      est_principal: cabinet.est_principal || false,
      horaires: cabinet.horaires || {}
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.nom || !formData.adresse || !formData.ville) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    if (editingCabinet) {
      updateMutation.mutate({ id: editingCabinet.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSetPrincipal = async (cabinetId) => {
    // Retirer le statut principal des autres
    for (const cab of cabinets.filter(c => c.est_principal && c.id !== cabinetId)) {
      await base44.entities.Cabinet.update(cab.id, { est_principal: false });
    }
    await base44.entities.Cabinet.update(cabinetId, { est_principal: true });
    queryClient.invalidateQueries({ queryKey: ['cabinets'] });
    toast.success('Cabinet principal défini');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mes Cabinets</h2>
          <p className="text-muted-foreground">Gérez vos différents lieux de pratique</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un cabinet
        </Button>
      </div>

      {/* Indicateur de synchronisation */}
      {cabinets.length > 1 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Synchronisation multi-cabinet active</p>
                <p className="text-sm text-blue-700">
                  Vos données sont synchronisées entre {cabinets.length} cabinets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des cabinets */}
      <div className="grid gap-4 md:grid-cols-2">
        {cabinets.map(cabinet => (
          <Card 
            key={cabinet.id} 
            className={`relative ${cabinet.est_principal ? 'ring-2 ring-blue-500' : ''}`}
          >
            {cabinet.est_principal && (
              <Badge className="absolute top-2 right-2 bg-blue-600">
                <Star className="w-3 h-3 mr-1" /> Principal
              </Badge>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: cabinet.couleur || COLORS[0] }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{cabinet.nom}</CardTitle>
                  {cabinet.nihii_cabinet && (
                    <p className="text-xs text-muted-foreground font-mono">
                      INAMI: {cabinet.nihii_cabinet}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{cabinet.adresse}, {cabinet.code_postal} {cabinet.ville}</span>
              </div>
              
              {cabinet.telephone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{cabinet.telephone}</span>
                </div>
              )}
              
              {cabinet.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{cabinet.email}</span>
                </div>
              )}

              {cabinet.medecins?.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{cabinet.medecins.length} médecin(s)</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(cabinet)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" /> Modifier
                </Button>
                {!cabinet.est_principal && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSetPrincipal(cabinet.id)}
                  >
                    <Star className="w-3 h-3" />
                  </Button>
                )}
                {cabinets.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Supprimer ce cabinet ?')) {
                        deleteMutation.mutate(cabinet.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {cabinets.length === 0 && (
          <Card className="col-span-2 p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-semibold text-slate-600 mb-2">Aucun cabinet configuré</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoutez votre premier cabinet pour commencer
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter un cabinet
            </Button>
          </Card>
        )}
      </div>

      {/* Dialog d'édition */}
      <Dialog open={showDialog} onOpenChange={resetForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCabinet ? 'Modifier le cabinet' : 'Nouveau cabinet'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom du cabinet *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Cabinet médical..."
                />
              </div>

              <div className="col-span-2">
                <Label>Adresse *</Label>
                <Input
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Rue et numéro"
                />
              </div>

              <div>
                <Label>Code postal</Label>
                <Input
                  value={formData.code_postal}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                />
              </div>

              <div>
                <Label>Ville *</Label>
                <Input
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                />
              </div>

              <div>
                <Label>Téléphone</Label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label>N° INAMI Cabinet</Label>
                <Input
                  value={formData.nihii_cabinet}
                  onChange={(e) => setFormData({ ...formData, nihii_cabinet: e.target.value })}
                />
              </div>

              <div>
                <Label>Couleur</Label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.couleur === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, couleur: color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Horaires */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Horaires d'ouverture
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {JOURS.map(jour => (
                  <div key={jour} className="flex items-center gap-2">
                    <span className="w-20 text-sm capitalize">{jour}</span>
                    <Input
                      className="h-8 text-sm"
                      placeholder="ex: 9h-12h, 14h-18h"
                      value={formData.horaires[jour] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        horaires: { ...formData.horaires, [jour]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.est_principal}
                onCheckedChange={(checked) => setFormData({ ...formData, est_principal: checked })}
              />
              <Label>Définir comme cabinet principal</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingCabinet ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}