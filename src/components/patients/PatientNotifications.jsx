import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Plus, Check, X, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useI18n } from '../i18n/i18nContext';

export default function PatientNotifications({ patient }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'FOLLOW_UP',
    due_date: '',
    title: '',
    description: ''
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', patient.id],
    queryFn: async () => {
      try {
        return await base44.entities.PatientReminder.filter({ patient_id: patient.id }, '-due_date', 50);
      } catch {
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.PatientReminder.create({
        patient_id: patient.id,
        type: data.type,
        due_date: data.due_date,
        title: data.title,
        description: data.description,
        status: 'PENDING',
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(t('reminders.created'));
      setShowForm(false);
      setFormData({ type: 'FOLLOW_UP', due_date: '', title: '', description: '' });
    }
  });

  const completeMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientReminder.update(id, { status: 'COMPLETED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(t('reminders.markedComplete'));
    }
  });

  const typeLabels = {
    FOLLOW_UP: { label: t('reminders.followUp'), color: 'bg-blue-100 text-blue-800' },
    LAB_RESULTS: { label: t('reminders.labResults'), color: 'bg-purple-100 text-purple-800' },
    VACCINATION: { label: t('reminders.vaccination'), color: 'bg-green-100 text-green-800' },
    MEDICATION: { label: t('reminders.medication'), color: 'bg-orange-100 text-orange-800' },
    GENERAL: { label: t('reminders.general'), color: 'bg-slate-100 text-slate-800' }
  };

  const pendingReminders = reminders.filter(r => r.status === 'PENDING');
  const completedReminders = reminders.filter(r => r.status === 'COMPLETED');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {t('reminders.title')}
        </h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {t('reminders.new')}
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>{t('reminders.type')}</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOLLOW_UP">{t('reminders.followUp')}</SelectItem>
                  <SelectItem value="LAB_RESULTS">{t('reminders.labResults')}</SelectItem>
                  <SelectItem value="VACCINATION">{t('reminders.vaccination')}</SelectItem>
                  <SelectItem value="MEDICATION">{t('reminders.medication')}</SelectItem>
                  <SelectItem value="GENERAL">{t('reminders.general')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('reminders.dueDate')}</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
            <div>
              <Label>{t('reminders.titleField')}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder={t('reminders.titlePlaceholder')}
              />
            </div>
            <div>
              <Label>{t('reminders.description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder={t('reminders.descPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.title || !formData.due_date}
                className="flex-1"
              >
                {t('reminders.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t('actions.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rappels en attente */}
      {pendingReminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">{t('reminders.pendingCount')} ({pendingReminders.length})</h4>
          {pendingReminders.map(reminder => {
            const typeInfo = typeLabels[reminder.type] || typeLabels.GENERAL;
            const dueDate = new Date(reminder.due_date);
            const isOverdue = dueDate < new Date();
            
            return (
              <Card key={reminder.id} className={isOverdue ? 'border-red-300 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t('reminders.overdue')}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium mb-1">{reminder.title}</p>
                      {reminder.description && (
                        <p className="text-sm text-slate-600 mb-2">{reminder.description}</p>
                      )}
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(dueDate, 'dd MMMM yyyy', { locale: dateLocale })}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => completeMutation.mutate(reminder.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rappels complétés */}
      {completedReminders.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
            {t('reminders.completedCount')} ({completedReminders.length})
          </summary>
          <div className="space-y-2 mt-2">
            {completedReminders.slice(0, 5).map(reminder => {
              const typeInfo = typeLabels[reminder.type] || typeLabels.GENERAL;
              return (
                <Card key={reminder.id} className="opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm line-through">{reminder.title}</span>
                      <Badge className={typeInfo.color + ' text-xs'}>{typeInfo.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </details>
      )}

      {reminders.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('reminders.noReminders')}</p>
        </div>
      )}
    </div>
  );
}