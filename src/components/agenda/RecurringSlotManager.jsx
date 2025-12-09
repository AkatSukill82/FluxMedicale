import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Repeat } from 'lucide-react';
import { toast } from 'sonner';

export default function RecurringSlotManager({ onSave, onClose }) {
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '10:00',
    slotDuration: '30',
    type: 'Consultation'
  });

  const daysOfWeek = [
    { value: '1', label: 'Lundi' },
    { value: '2', label: 'Mardi' },
    { value: '3', label: 'Mercredi' },
    { value: '4', label: 'Jeudi' },
    { value: '5', label: 'Vendredi' },
    { value: '6', label: 'Samedi' },
    { value: '7', label: 'Dimanche' }
  ];

  const handleAddSlot = () => {
    if (!newSlot.startTime || !newSlot.endTime) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSlots([...slots, { ...newSlot, id: Date.now().toString() }]);
    toast.success('Créneau ajouté');
  };

  const handleRemoveSlot = (id) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const handleSaveAll = async () => {
    await onSave(slots);
    toast.success('Créneaux récurrents enregistrés');
    onClose();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="w-5 h-5" />
          Gérer les créneaux récurrents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulaire d'ajout */}
        <div className="p-4 border rounded-lg bg-slate-50">
          <h3 className="font-semibold mb-4">Ajouter un créneau récurrent</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Jour de la semaine</Label>
              <Select value={newSlot.dayOfWeek} onValueChange={(v) => setNewSlot({...newSlot, dayOfWeek: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map(day => (
                    <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de consultation</Label>
              <Select value={newSlot.type} onValueChange={(v) => setNewSlot({...newSlot, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                  <SelectItem value="Téléconsultation">Téléconsultation</SelectItem>
                  <SelectItem value="Urgence">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Heure de début</Label>
              <Input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})} />
            </div>
            <div>
              <Label>Heure de fin</Label>
              <Input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})} />
            </div>
            <div>
              <Label>Durée par créneau (min)</Label>
              <Select value={newSlot.slotDuration} onValueChange={(v) => setNewSlot({...newSlot, slotDuration: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddSlot} className="mt-4 w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter ce créneau
          </Button>
        </div>

        {/* Liste des créneaux */}
        {slots.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Créneaux configurés ({slots.length})</h3>
            {slots.map(slot => {
              const day = daysOfWeek.find(d => d.value === slot.dayOfWeek);
              return (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-medium">{day?.label}</p>
                      <p className="text-sm text-slate-600">
                        {slot.startTime} - {slot.endTime} • {slot.slotDuration}min • {slot.type}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(slot.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSaveAll} disabled={slots.length === 0}>
            Enregistrer tous les créneaux
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}