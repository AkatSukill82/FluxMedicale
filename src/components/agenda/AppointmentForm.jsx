import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, Save, X } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useI18n } from '../i18n/i18nContext';

export default function AppointmentForm({ appointment, patients, selectedSlot, onSave, onCancel }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    patient_id: '',
    date: '',
    heure_debut: '',
    type_consultation: 'Consultation',
    motif: '',
    statut: 'Planifié',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [openPatientSelector, setOpenPatientSelector] = useState(false);

  useEffect(() => {
    if (appointment) {
      setFormData({
        patient_id: appointment.patient_id || '',
        date: appointment.date || '',
        heure_debut: appointment.heure_debut || '',
        type_consultation: appointment.type_consultation || 'Consultation',
        motif: appointment.motif || '',
        statut: appointment.statut || 'Planifié',
      });
    } else if (selectedSlot) {
      setFormData(prev => ({
        ...prev,
        date: selectedSlot.date || format(new Date(), 'yyyy-MM-dd'),
        heure_debut: selectedSlot.time || format(new Date(), 'HH:mm')
      }));
    }
  }, [appointment, selectedSlot]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.date || !formData.heure_debut) {
      toast.error(t('toast.error.requiredFields'));
      return;
    }
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };
  
  const getPatientName = (patientId) => {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return t('agenda.selectPatient');
      const officialName = patient.name?.find(n => n.use === 'official') || {};
      return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{appointment ? t('agenda.editAppointment') : t('agenda.newAppointment')}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('common.patient')}</Label>
            <Popover open={openPatientSelector} onOpenChange={setOpenPatientSelector}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPatientSelector}
                  className="w-full justify-between"
                >
                  {getPatientName(formData.patient_id)}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t('actions.search') + "..."} />
                  <CommandEmpty>{t('dashboard.noResults')}</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {patients.map((patient) => {
                      const officialName = patient.name?.find(n => n.use === 'official') || {};
                      const fullName = `${(officialName.given || []).join(' ')} ${officialName.family}`;
                      return (
                        <CommandItem
                          key={patient.id}
                          value={fullName}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, patient_id: patient.id }));
                            setOpenPatientSelector(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.patient_id === patient.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {fullName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('common.date')}</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <Label>{t('common.time')}</Label>
              <Input type="time" value={formData.heure_debut} onChange={(e) => setFormData({...formData, heure_debut: e.target.value})} step="900" />
            </div>
          </div>
          <div>
            <Label>{t('agenda.type')}</Label>
            <Select value={formData.type_consultation} onValueChange={(value) => setFormData({...formData, type_consultation: value})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Consultation">Consultation</SelectItem>
                <SelectItem value="Contrôle">Contrôle</SelectItem>
                <SelectItem value="Urgence">🚨 Urgence</SelectItem>
                <SelectItem value="Téléconsultation">📞 Téléconsultation</SelectItem>
                <SelectItem value="Vaccination">💉 Vaccination</SelectItem>
                <SelectItem value="Bilan">📋 Bilan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={formData.statut} onValueChange={(value) => setFormData({...formData, statut: value})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Planifié">Planifié</SelectItem>
                <SelectItem value="Confirmé">Confirmé</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Terminé">Terminé</SelectItem>
                <SelectItem value="Annulé">Annulé</SelectItem>
                <SelectItem value="Report">Reporté</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('agenda.reason')}</Label>
            <Textarea value={formData.motif} onChange={(e) => setFormData({...formData, motif: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>{t('actions.cancel')}</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t('actions.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}