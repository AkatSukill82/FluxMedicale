import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { toast } from 'sonner';

export default function PatientForm({ patient, onSave, onCancel, isSaving }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: [{ use: 'official', family: '', given: [''] }],
    birthDate: '',
    gender: 'unknown',
    identifier: [{ system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin', value: '' }],
    telecom: [],
    address: [{ line: [''], city: '', postalCode: '', country: 'BE' }],
    allergies: '',
    statut: 'Actif',
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || [{ use: 'official', family: '', given: [''] }],
        birthDate: patient.birthDate || '',
        gender: patient.gender || 'unknown',
        identifier: patient.identifier || [{ system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin', value: '' }],
        telecom: patient.telecom || [],
        address: patient.address || [{ line: [''], city: '', postalCode: '', country: 'BE' }],
        allergies: patient.allergies || '',
        statut: patient.statut || 'Actif',
      });
    }
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNameChange = (key, value) => {
    setFormData(prev => ({
        ...prev,
        name: [{ ...prev.name[0], [key]: value }]
    }));
  }

  const handleNissChange = (value) => {
      setFormData(prev => ({
          ...prev,
          identifier: [{...prev.identifier[0], value: value}]
      }))
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const familyName = formData.name[0].family;
    const givenName = formData.name[0].given[0];
    if (!familyName || !givenName || !formData.birthDate) {
      toast.error("Veuillez renseigner au moins le nom, le prénom et la date de naissance.");
      return;
    }
    onSave(formData);
  };
  
  const getIdentifierValue = (system) => {
    return formData.identifier?.find(id => id.system === system)?.value || '';
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="m-4">
        <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onCancel} type="button">
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle>{patient ? 'Modifier la fiche patient' : 'Créer un nouveau patient'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom de famille</Label>
              <Input id="lastName" value={formData.name[0].family} onChange={(e) => handleNameChange('family', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" value={formData.name[0].given[0]} onChange={(e) => handleNameChange('given', [e.target.value])} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input id="birthDate" type="date" value={formData.birthDate} onChange={handleChange} name="birthDate" required/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="gender">Sexe</Label>
                <Select name="gender" value={formData.gender} onValueChange={(value) => setFormData(prev => ({...prev, gender: value}))}>
                    <SelectTrigger id="gender">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="male">Homme</SelectItem>
                        <SelectItem value="female">Femme</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                        <SelectItem value="unknown">Inconnu</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="niss">NISS</Label>
              <Input id="niss" value={getIdentifierValue('https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin')} onChange={(e) => handleNissChange(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies connues</Label>
            <Textarea id="allergies" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Ex: Pénicilline, arachides..."/>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>{t('actions.cancel')}</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('actions.save')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}