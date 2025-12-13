import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AllergiesManager({ patient }) {
  const queryClient = useQueryClient();
  const [showNewAllergy, setShowNewAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    allergen: '',
    allergen_type: 'MEDICATION',
    severity: 'MODERATE',
    reaction: '',
    onset_date: '',
    notes: ''
  });

  const { data: allergies = [] } = useQuery({
    queryKey: ['allergies', patient.id],
    queryFn: () => base44.entities.Allergy.filter({ patient_id: patient.id, status: 'ACTIVE' })
  });

  const createAllergyMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.Allergy.create({
        ...newAllergy,
        patient_id: patient.id,
        status: 'ACTIVE',
        created_by: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allergies']);
      toast.success('Allergie ajoutée');
      setShowNewAllergy(false);
      setNewAllergy({
        allergen: '',
        allergen_type: 'MEDICATION',
        severity: 'MODERATE',
        reaction: '',
        onset_date: '',
        notes: ''
      });
    }
  });

  const deleteAllergyMutation = useMutation({
    mutationFn: (id) => base44.entities.Allergy.update(id, { status: 'INACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allergies']);
      toast.success('Allergie désactivée');
    }
  });

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'MILD': return 'bg-yellow-100 text-yellow-800';
      case 'MODERATE': return 'bg-orange-100 text-orange-800';
      case 'SEVERE': return 'bg-red-100 text-red-800';
      case 'LIFE_THREATENING': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card className={allergies.length > 0 ? 'border-red-200 bg-red-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Allergies ({allergies.length})
            </CardTitle>
            <Button onClick={() => setShowNewAllergy(true)} size="sm" variant="destructive">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter allergie
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Aucune allergie connue</p>
          ) : (
            <div className="space-y-2">
              {allergies.map(allergy => (
                <div key={allergy.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-red-900">{allergy.allergen}</h4>
                      <Badge className={getSeverityColor(allergy.severity)}>
                        {allergy.severity}
                      </Badge>
                      <Badge variant="outline">{allergy.allergen_type}</Badge>
                    </div>
                    {allergy.reaction && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Réaction: {allergy.reaction}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAllergyMutation.mutate(allergy.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewAllergy} onOpenChange={setShowNewAllergy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une allergie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Allergène</Label>
              <Input
                value={newAllergy.allergen}
                onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
                placeholder="Ex: Pénicilline, Arachides..."
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select 
                value={newAllergy.allergen_type}
                onValueChange={(v) => setNewAllergy({ ...newAllergy, allergen_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICATION">Médicament</SelectItem>
                  <SelectItem value="FOOD">Alimentaire</SelectItem>
                  <SelectItem value="ENVIRONMENTAL">Environnement</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sévérité</Label>
              <Select 
                value={newAllergy.severity}
                onValueChange={(v) => setNewAllergy({ ...newAllergy, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Légère</SelectItem>
                  <SelectItem value="MODERATE">Modérée</SelectItem>
                  <SelectItem value="SEVERE">Sévère</SelectItem>
                  <SelectItem value="LIFE_THREATENING">Potentiellement mortelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Réaction</Label>
              <Input
                value={newAllergy.reaction}
                onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
                placeholder="Ex: Urticaire, choc anaphylactique..."
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={newAllergy.notes}
                onChange={(e) => setNewAllergy({ ...newAllergy, notes: e.target.value })}
                placeholder="Notes supplémentaires..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewAllergy(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => createAllergyMutation.mutate()}
                disabled={!newAllergy.allergen || createAllergyMutation.isPending}
                variant="destructive"
              >
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}