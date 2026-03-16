import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  MapPin,
  Phone,
  CreditCard,
  Save,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { nissValidator } from '../../eid/nissValidator';
import { toast } from 'sonner';
import { useI18n } from '../../i18n/i18nContext';

import IdSupportButton from '../../idsupport/IdSupportButton';
import MedicationManager from '../MedicationManager';
import PrescriptionReminders from '../../prescriptions/PrescriptionReminders';
import PatientCommunicationPanel from '../../communication/PatientCommunicationPanel';
import GDPRConsentManager from '../../gdpr/GDPRConsentManager';
import MedicalHistoryPanel from '../MedicalHistoryPanel';

export default function FicheAdministrativeTab({ patient }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Extraire données actuelles
  const officialName = patient.name?.find(n => n.use === 'official') || { use: 'official', family: '', given: [''] };
  const address = patient.address?.[0] || { line: [''], city: '', postalCode: '', country: 'BE' };
  const phone = patient.telecom?.find(t => t.system === 'phone') || { system: 'phone', value: '', use: 'mobile' };
  const email = patient.telecom?.find(t => t.system === 'email') || { system: 'email', value: '', use: 'home' };
  const niss = patient.identifier?.find(id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin')?.value || '';

  const [formData, setFormData] = useState({
    given: (officialName.given || [''])[0],
    family: officialName.family || '',
    birthDate: patient.birthDate || '',
    gender: patient.gender || 'unknown',
    niss: niss,
    address_line: (address.line || [''])[0],
    city: address.city || '',
    postalCode: address.postalCode || '',
    phone: phone.value || '',
    email: email.value || '',
    mutuelle: patient.mutuelle || '',
    numero_mutuelle: patient.numero_mutuelle || ''
  });

  const [nissValidation, setNissValidation] = useState({
    isValid: niss ? nissValidator.validate(niss).isValid : null,
    error: null
  });

  const updatePatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.update(patient.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success(t('admin.updateSuccess'));
      setIsEditing(false);
    },
    onError: () => {
      toast.error(t('errors.savingData'));
    }
  });

  const handleNissChange = (value) => {
    setFormData({ ...formData, niss: value });

    // Validation en temps réel
    if (value.length === 0) {
      setNissValidation({ isValid: null, error: null });
      return;
    }

    const normalized = nissValidator.normalize(value);

    if (normalized.length < 11) {
      setNissValidation({ isValid: false, error: t('admin.nissIncomplete') });
      return;
    }

    const validation = nissValidator.validate(normalized);
    setNissValidation({
      isValid: validation.isValid,
      error: validation.error
    });
  };

  const handleVerifyNiss = () => {
    const validation = nissValidator.validate(formData.niss);
    setNissValidation(validation);

    if (validation.isValid) {
      toast.success(t('admin.nissValid'));
    } else {
      toast.error(validation.error || t('admin.nissInvalid'));
    }
  };

  const handleSave = async () => {
    // Vérifier NISS avant sauvegarde
    if (formData.niss) {
      const validation = nissValidator.validate(formData.niss);
      if (!validation.isValid) {
        toast.error(validation.error || t('admin.nissInvalid'));
        return;
      }
    }

    try {
      const normalizedNiss = nissValidator.normalize(formData.niss);

      // Vérifier doublons NISS
      if (normalizedNiss) {
        const allPatients = await base44.entities.Patient.list();
        const duplicates = allPatients.filter(p =>
          p.id !== patient.id &&
          p.identifier?.some(id =>
            id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin' &&
            nissValidator.normalize(id.value) === normalizedNiss
          )
        );

        if (duplicates.length > 0) {
          toast.error(t('admin.nissDuplicate', { count: duplicates.length }));
          return;
        }
      }

      const updatedPatient = {
        name: [
          {
            use: 'official',
            family: formData.family,
            given: [formData.given]
          }
        ],
        birthDate: formData.birthDate,
        gender: formData.gender,
        identifier: normalizedNiss ? [
          {
            system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin',
            value: normalizedNiss
          }
        ] : [],
        address: [
          {
            line: [formData.address_line],
            city: formData.city,
            postalCode: formData.postalCode,
            country: 'BE'
          }
        ],
        telecom: [
          {
            system: 'phone',
            value: formData.phone,
            use: 'mobile'
          },
          {
            system: 'email',
            value: formData.email,
            use: 'home'
          }
        ],
        mutuelle: formData.mutuelle,
        numero_mutuelle: formData.numero_mutuelle
      };

      updatePatientMutation.mutate(updatedPatient);

      // Audit log
      if (currentUser) {
        await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: 'UPDATE_PATIENT_ADMIN',
          target_entity: 'Patient',
          target_id: patient.id,
          details: `Mise à jour fiche administrative${normalizedNiss ? ` - NISS: ${nissValidator.format(normalizedNiss, true)}` : ''}`,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('errors.savingData'));
    }
  };

  const getNissBadge = () => {
    if (nissValidation.isValid === null) return null;

    if (nissValidation.isValid) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {t('admin.nissValid')}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          {t('admin.nissInvalid')}
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">{t('admin.title')}</h3>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            {t('common.modify')}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={updatePatientMutation.isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {updatePatientMutation.isLoading ? t('admin.saving') : t('admin.save')}
            </Button>
          </div>
        )}
      </div>

      {/* Identité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            {t('admin.identity')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="given">{t('admin.firstName')}</Label>
              <Input
                id="given"
                value={formData.given}
                onChange={(e) => setFormData({ ...formData, given: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="family">{t('admin.lastName')}</Label>
              <Input
                id="family"
                value={formData.family}
                onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="birthDate">{t('admin.birthDate')}</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="gender">{t('admin.gender')}</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
                className="w-full p-2 border rounded-md"
              >
                <option value="male">{t('admin.male')}</option>
                <option value="female">{t('admin.female')}</option>
                <option value="other">{t('admin.other')}</option>
                <option value="unknown">{t('admin.unknown')}</option>
              </select>
            </div>
          </div>

          {/* NISS + IdSupport */}
          <div className="pt-4 border-t">
            <div className="space-y-4"> {/* Changed to space-y-4 to match new structure */}
              {/* NISS - Section dédiée */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="niss" className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    {t('admin.nissLabel')}
                  </Label>
                  {getNissBadge()}
                </div>

                <div className="flex gap-2">
                  <Input
                    id="niss"
                    value={formData.niss}
                    onChange={(e) => handleNissChange(e.target.value)}
                    disabled={!isEditing}
                    placeholder={t('admin.nissPlaceholder')}
                    className="font-mono"
                    maxLength={13}
                  />
                  {isEditing && formData.niss && (
                    <Button
                      onClick={handleVerifyNiss}
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('admin.verify')}
                    </Button>
                  )}
                </div>

                {nissValidation.error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-900">
                      {nissValidation.error}
                    </AlertDescription>
                  </Alert>
                )}

                {formData.niss && nissValidation.isValid && (
                  <p className="text-sm text-slate-600">
                    {t('admin.normalizedFormat')}: <code className="bg-slate-100 px-2 py-1 rounded font-mono text-xs">
                      {nissValidator.format(formData.niss)}
                    </code>
                  </p>
                )}

                <p className="text-xs text-slate-500">
                  {t('admin.nissValidationRules')}
                </p>
              </div>

              {/* Bouton IdSupport */}
              {!isEditing && patient.identifier?.some(id =>
                id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
              ) && (
                <IdSupportButton patient={patient} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adresse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            {t('admin.addressFhir')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address_line">{t('admin.streetNumber')}</Label>
            <Input
              id="address_line"
              value={formData.address_line}
              onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">{t('admin.postalCode')}</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="city">{t('admin.city')}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            {t('admin.contactFhir')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">{t('admin.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">{t('admin.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mutuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            {t('admin.insuranceTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mutuelle">{t('admin.mutuelle')}</Label>
              <Input
                id="mutuelle"
                value={formData.mutuelle}
                onChange={(e) => setFormData({ ...formData, mutuelle: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="numero_mutuelle">{t('admin.affiliationNumber')}</Label>
              <Input
                id="numero_mutuelle"
                value={formData.numero_mutuelle}
                onChange={(e) => setFormData({ ...formData, numero_mutuelle: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Antécédents médicaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            {t('admin.medicalHistoryTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalHistoryPanel patientId={patient.id} />
        </CardContent>
      </Card>

      {/* Consentement RGPD */}
      <GDPRConsentManager 
        patient={patient} 
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['patient', patient.id] })}
      />

      {/* Médicaments */}
      <MedicationManager patient={patient} />

      {/* Rappels ordonnances */}
      <PrescriptionReminders patient={patient} />

      {/* Communications patient */}
      <PatientCommunicationPanel patient={patient} />

    </div>
  );
}