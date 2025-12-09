import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, X, Coffee, Plane, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

export default function UnavailabilityManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '18:00',
    reason: '',
    type: 'VACATION'
  });

  const { data: unavailabilities = [], isLoading } = useQuery({
    queryKey: ['unavailabilities'],
    queryFn: async () => {
      try {
        return await base44.entities.CalendarSlot.filter({ type: 'Bloque' }, '-start_time', 50);
      } catch {
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.CalendarSlot.create({
        medecin_email: user.email,
        start_time: `${data.start_date}T${data.start_time}:00`,
        end_time: `${data.end_date}T${data.end_time}:00`,
        type: 'Bloque',
        statut: 'Indisponible'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailabilities'] });
      toast.success('Indisponibilité ajoutée');
      setShowForm(false);
      setFormData({ start_date: '', end_date: '', start_time: '09:00', end_time: '18:00', reason: '', type: 'VACATION' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarSlot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailabilities'] });
      toast.success('Indisponibilité supprimée');
    }
  });

  const typeIcons = {
    VACATION: Plane,
    BREAK: Coffee,
    TRAINING: Stethoscope,
    OTHER: Calendar
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Indisponibilités</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? 'Annuler' : 'Ajouter une indisponibilité'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Heure de début</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                />
              </div>
              <div>
                <Label>Heure de fin</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Motif</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Vacances, formation, congé..."
              />
            </div>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.start_date || !formData.end_date || createMutation.isPending}
              className="w-full"
            >
              Enregistrer l'indisponibilité
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {unavailabilities.map(unavail => {
          const start = new Date(unavail.start_time);
          const end = new Date(unavail.end_time);
          return (
            <Card key={unavail.id} className="border-orange-200 bg-orange-50">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium">
                      {format(start, 'dd/MM/yyyy HH:mm', { locale: fr })} → {format(end, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">Indisponible</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(unavail.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}