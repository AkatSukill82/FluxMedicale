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
import { Syringe, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VaccinationsPanel({ patient }) {
  const queryClient = useQueryClient();
  const [showNewVaccine, setShowNewVaccine] = useState(false);
  const [newVaccine, setNewVaccine] = useState({
    vaccine_name: '',
    vaccine_type: 'AUTRE',
    vaccination_date: format(new Date(), 'yyyy-MM-dd'),
    lot_number: '',
    dose_number: 1,
    site: 'Bras gauche'
  });

  const { data: vaccinations = [] } = useQuery({
    queryKey: ['vaccinations', patient.id],
    queryFn: () => base44.entities.Vaccination.filter({ patient_id: patient.id }, '-vaccination_date')
  });

  const createVaccineMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.Vaccination.create({
        ...newVaccine,
        patient_id: patient.id,
        administered_by: currentUser.email,
        created_by: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vaccinations']);
      toast.success('Vaccination enregistrée');
      setShowNewVaccine(false);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5" />
              Vaccinations ({vaccinations.length})
            </CardTitle>
            <Button onClick={() => setShowNewVaccine(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer vaccination
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vaccinations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Aucune vaccination enregistrée</p>
          ) : (
            <div className="space-y-2">
              {vaccinations.map(vacc => (
                <div key={vacc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{vacc.vaccine_name}</h4>
                      <Badge variant="outline">{vacc.vaccine_type}</Badge>
                      {vacc.dose_number && (
                        <Badge>Dose {vacc.dose_number}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(vacc.vaccination_date), 'dd/MM/yyyy')}
                      </div>
                      {vacc.lot_number && (
                        <span className="font-mono text-xs">Lot: {vacc.lot_number}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewVaccine} onOpenChange={setShowNewVaccine}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une vaccination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de vaccin</Label>
              <Select 
                value={newVaccine.vaccine_type}
                onValueChange={(v) => setNewVaccine({ ...newVaccine, vaccine_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COVID">COVID-19</SelectItem>
                  <SelectItem value="GRIPPE">Grippe</SelectItem>
                  <SelectItem value="TETANOS">Tétanos</SelectItem>
                  <SelectItem value="HEPATITE_B">Hépatite B</SelectItem>
                  <SelectItem value="PNEUMOCOQUE">Pneumocoque</SelectItem>
                  <SelectItem value="HPV">HPV</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nom du vaccin</Label>
              <Input
                value={newVaccine.vaccine_name}
                onChange={(e) => setNewVaccine({ ...newVaccine, vaccine_name: e.target.value })}
                placeholder="Ex: Comirnaty, Influvac..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de vaccination</Label>
                <Input
                  type="date"
                  value={newVaccine.vaccination_date}
                  onChange={(e) => setNewVaccine({ ...newVaccine, vaccination_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Numéro de dose</Label>
                <Input
                  type="number"
                  value={newVaccine.dose_number}
                  onChange={(e) => setNewVaccine({ ...newVaccine, dose_number: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>

            <div>
              <Label>Numéro de lot</Label>
              <Input
                value={newVaccine.lot_number}
                onChange={(e) => setNewVaccine({ ...newVaccine, lot_number: e.target.value })}
                placeholder="Ex: FN8765"
              />
            </div>

            <div>
              <Label>Site d'injection</Label>
              <Select 
                value={newVaccine.site}
                onValueChange={(v) => setNewVaccine({ ...newVaccine, site: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bras gauche">Bras gauche</SelectItem>
                  <SelectItem value="Bras droit">Bras droit</SelectItem>
                  <SelectItem value="Cuisse gauche">Cuisse gauche</SelectItem>
                  <SelectItem value="Cuisse droite">Cuisse droite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewVaccine(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => createVaccineMutation.mutate()}
                disabled={!newVaccine.vaccine_name || createVaccineMutation.isPending}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}