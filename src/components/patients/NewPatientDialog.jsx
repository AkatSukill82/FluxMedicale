import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { handleError, handleSuccess } from '../utils/ErrorHandler';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useI18n } from '../i18n/i18nContext';

export default function NewPatientDialog({ isOpen, onClose }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    sexe: 'male',
    email: '',
    telephone: '',
    niss: ''
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Patient.create({
        name: [{
          use: 'official',
          family: data.nom,
          given: [data.prenom]
        }],
        birthDate: data.date_naissance,
        gender: data.sexe,
        telecom: [
          { system: 'email', value: data.email, use: 'home' },
          { system: 'phone', value: data.telephone, use: 'mobile' }
        ],
        identifier: data.niss ? [{
          system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin',
          value: data.niss
        }] : [],
        statut: 'Actif'
      });
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      handleSuccess('Patient créé avec succès');
      onClose();
      navigate(`/Patients?patient=${patient.id}`);
    },
    onError: (error) => {
      handleError(error, 'Création patient');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom || !formData.date_naissance) {
      handleError({ message: 'validation' }, 'Veuillez remplir les champs obligatoires');
      return;
    }

    createPatientMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t('newPatient.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('newPatient.lastName')} *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Dupont"
                required
              />
            </div>
            <div>
              <Label>{t('newPatient.firstName')} *</Label>
              <Input
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Jean"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('newPatient.birthDate')} *</Label>
              <Input
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>{t('newPatient.gender')}</Label>
              <Select value={formData.sexe} onValueChange={(value) => setFormData({ ...formData, sexe: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('newPatient.male')}</SelectItem>
                  <SelectItem value="female">{t('newPatient.female')}</SelectItem>
                  <SelectItem value="other">{t('newPatient.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('newPatient.niss')}</Label>
            <Input
              value={formData.niss}
              onChange={(e) => setFormData({ ...formData, niss: e.target.value })}
              placeholder="00.00.00-000.00"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('newPatient.nissFormat')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('newPatient.email')}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.dupont@email.com"
              />
            </div>
            <div>
              <Label>{t('newPatient.phone')}</Label>
              <Input
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="0470 12 34 56"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={createPatientMutation.isPending}>
              {createPatientMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('newPatient.creating')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('newPatient.create')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}