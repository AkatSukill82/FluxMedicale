import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Bell,
  Plus,
  Calendar,
  Clock,
  Pill,
  RefreshCw,
  Check,
  X,
  Trash2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const REMINDER_TYPES = {
  renewal: { label: 'Renouvellement', icon: RefreshCw, color: 'bg-blue-100 text-blue-800' },
  medication_intake: { label: 'Prise de médicament', icon: Pill, color: 'bg-green-100 text-green-800' }
};

const FREQUENCIES = {
  once: 'Une seule fois',
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel'
};

export default function PrescriptionReminders({ patient }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['prescriptionReminders', patient.id],
    queryFn: () => base44.entities.PrescriptionReminder.filter(
      { patient_id: patient.id, status: 'active' },
      'reminder_date',
      50
    )
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PrescriptionReminder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptionReminders'] });
      toast.success('Rappel créé');
      setShowAddModal(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrescriptionReminder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptionReminders'] });
      toast.success('Rappel mis à jour');
      setEditingReminder(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrescriptionReminder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptionReminders'] });
      toast.success('Rappel supprimé');
    }
  });

  const markAsCompleted = (reminder) => {
    updateMutation.mutate({ id: reminder.id, data: { status: 'completed' } });
  };

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Aujourd\'hui';
    if (isTomorrow(date)) return 'Demain';
    if (isPast(date)) return 'En retard';
    return format(date, 'dd MMM yyyy', { locale: fr });
  };

  const getDateColor = (dateStr) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-red-600 bg-red-50';
    if (isToday(date)) return 'text-orange-600 bg-orange-50';
    if (isTomorrow(date)) return 'text-blue-600 bg-blue-50';
    return 'text-slate-600 bg-slate-50';
  };

  // Grouper par date
  const groupedReminders = reminders.reduce((acc, reminder) => {
    const dateKey = reminder.reminder_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(reminder);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedReminders).sort();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-blue-600" />
            Rappels ordonnances
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun rappel actif</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateKey => (
              <div key={dateKey}>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-2 ${getDateColor(dateKey)}`}>
                  <Calendar className="w-3 h-3" />
                  {getDateLabel(dateKey)}
                </div>
                <div className="space-y-2">
                  {groupedReminders[dateKey].map(reminder => {
                    const TypeIcon = REMINDER_TYPES[reminder.type]?.icon || Bell;
                    const typeConfig = REMINDER_TYPES[reminder.type] || {};
                    
                    return (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${typeConfig.color}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {reminder.medication_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            {reminder.reminder_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {reminder.reminder_time}
                              </span>
                            )}
                            {reminder.frequency !== 'once' && (
                              <Badge variant="secondary" className="text-xs">
                                {FREQUENCIES[reminder.frequency]}
                              </Badge>
                            )}
                          </div>
                          {reminder.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {reminder.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:bg-green-100"
                            onClick={() => markAsCompleted(reminder)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-100"
                            onClick={() => deleteMutation.mutate(reminder.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal d'ajout */}
      <ReminderFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={(data) => createMutation.mutate({ ...data, patient_id: patient.id })}
        isLoading={createMutation.isPending}
      />
    </Card>
  );
}

function ReminderFormModal({ isOpen, onClose, onSave, reminder, isLoading }) {
  const [formData, setFormData] = useState({
    type: 'renewal',
    medication_name: '',
    reminder_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    reminder_time: '09:00',
    frequency: 'once',
    notes: ''
  });

  React.useEffect(() => {
    if (reminder) {
      setFormData({
        type: reminder.type || 'renewal',
        medication_name: reminder.medication_name || '',
        reminder_date: reminder.reminder_date || format(new Date(), 'yyyy-MM-dd'),
        reminder_time: reminder.reminder_time || '09:00',
        frequency: reminder.frequency || 'once',
        notes: reminder.notes || ''
      });
    } else {
      setFormData({
        type: 'renewal',
        medication_name: '',
        reminder_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        reminder_time: '09:00',
        frequency: 'once',
        notes: ''
      });
    }
  }, [reminder, isOpen]);

  const handleSubmit = () => {
    if (!formData.medication_name || !formData.reminder_date) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            {reminder ? 'Modifier le rappel' : 'Nouveau rappel'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de rappel *</Label>
            <Select
              value={formData.type}
              onValueChange={(val) => setFormData({ ...formData, type: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renewal">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    Renouvellement d'ordonnance
                  </div>
                </SelectItem>
                <SelectItem value="medication_intake">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-green-600" />
                    Prise de médicament
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Médicament *</Label>
            <Input
              value={formData.medication_name}
              onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
              placeholder="Ex: Metformine 500mg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date du rappel *</Label>
              <Input
                type="date"
                value={formData.reminder_date}
                onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure</Label>
              <Input
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select
              value={formData.frequency}
              onValueChange={(val) => setFormData({ ...formData, frequency: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instructions particulières..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {reminder ? 'Modifier' : 'Créer le rappel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}