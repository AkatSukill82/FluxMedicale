import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ArrowLeft, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { nissValidator } from '../eid/nissValidator';
import { toast } from 'sonner';

const SSIN_SYSTEM = 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin';

const EMPTY_FORM = {
  name: [{ use: 'official', family: '', given: [''] }],
  birthDate: '',
  gender: 'unknown',
  identifier: [{ system: SSIN_SYSTEM, value: '' }],
  telecom: [
    { system: 'phone', value: '', use: 'home' },
    { system: 'email', value: '', use: 'home' },
  ],
  address: [{ use: 'home', line: [''], city: '', postalCode: '', country: 'BE' }],
  communication: [{ language: { coding: [{ system: 'urn:ietf:bcp:47', code: 'fr' }] }, preferred: true }],
  allergies: '',
  statut: 'Actif',
};

export default function PatientForm({ patient, onSave, onCancel, isSaving }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [nissStatus, setNissStatus] = useState(null); // null | 'valid' | 'invalid' | 'warning'
  const [nissWarnings, setNissWarnings] = useState([]);

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || EMPTY_FORM.name,
        birthDate: patient.birthDate || '',
        gender: patient.gender || 'unknown',
        identifier: patient.identifier?.length
          ? patient.identifier
          : EMPTY_FORM.identifier,
        telecom: patient.telecom?.length ? patient.telecom : EMPTY_FORM.telecom,
        address: patient.address?.length ? patient.address : EMPTY_FORM.address,
        communication: patient.communication || EMPTY_FORM.communication,
        allergies: patient.allergies || '',
        statut: patient.statut || 'Actif',
      });
    }
  }, [patient]);

  const getNissValue = () =>
    formData.identifier?.find((id) => id.system === SSIN_SYSTEM)?.value || '';

  const handleNissChange = (raw) => {
    setFormData((prev) => ({
      ...prev,
      identifier: [{ ...prev.identifier[0], value: raw }],
    }));

    const normalized = nissValidator.normalize(raw);
    if (!normalized) {
      setNissStatus(null);
      setNissWarnings([]);
      return;
    }
    if (normalized.length < 11) {
      setNissStatus(null);
      return;
    }

    const validation = nissValidator.validate(normalized);
    if (!validation.isValid) {
      setNissStatus('invalid');
      setNissWarnings([validation.error]);
      return;
    }

    const warnings = nissValidator.checkConsistency(normalized, {
      birthDate: formData.birthDate,
      gender: formData.gender,
    });

    if (warnings.length > 0) {
      setNissStatus('warning');
      setNissWarnings(warnings);
    } else {
      setNissStatus('valid');
      setNissWarnings([]);
    }
  };

  // Re-validate NISS if birth date or gender changes
  useEffect(() => {
    const niss = getNissValue();
    if (niss) handleNissChange(niss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.birthDate, formData.gender]);

  const handleBirthDateChange = (value) => {
    setFormData((prev) => ({ ...prev, birthDate: value }));

    // Auto-fill birth date from NISS if not set yet
    const niss = getNissValue();
    if (!value && niss) {
      const extracted = nissValidator.extractBirthDate(niss);
      if (extracted) {
        const iso = extracted.toISOString().split('T')[0];
        setFormData((prev) => ({ ...prev, birthDate: iso }));
        toast.info(`Date de naissance extraite du NISS : ${extracted.toLocaleDateString('fr-BE')}`);
      }
    }
  };

  const handleGenderChange = (value) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleTelecomChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.telecom];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, telecom: updated };
    });
  };

  const handleAddressChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      address: [{ ...prev.address[0], [field]: value }],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const familyName = formData.name[0]?.family?.trim();
    const givenName = formData.name[0]?.given?.[0]?.trim();
    if (!familyName || !givenName || !formData.birthDate) {
      toast.error('Nom, prénom et date de naissance sont obligatoires.');
      return;
    }
    if (nissStatus === 'invalid') {
      toast.error('Le NISS est invalide. Corrigez-le avant de sauvegarder.');
      return;
    }
    onSave(formData);
  };

  const getPhone = () =>
    formData.telecom.find((t) => t.system === 'phone')?.value || '';
  const getEmail = () =>
    formData.telecom.find((t) => t.system === 'email')?.value || '';
  const getPreferredLanguage = () =>
    formData.communication?.[0]?.language?.coding?.[0]?.code || 'fr';

  const setPreferredLanguage = (code) => {
    setFormData((prev) => ({
      ...prev,
      communication: [
        { language: { coding: [{ system: 'urn:ietf:bcp:47', code }] }, preferred: true },
      ],
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="m-4">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel} type="button">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <CardTitle>
            {patient ? 'Modifier la fiche patient' : 'Créer un nouveau patient'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Identité */}
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              Identité
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="lastName">Nom de famille *</Label>
                <Input
                  id="lastName"
                  value={formData.name[0].family}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: [{ ...prev.name[0], family: e.target.value }],
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.name[0].given[0]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: [{ ...prev.name[0], given: [e.target.value] }],
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1">
                <Label htmlFor="birthDate">Date de naissance *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gender">Sexe</Label>
                <Select value={formData.gender} onValueChange={handleGenderChange}>
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
              <div className="space-y-1">
                <Label htmlFor="niss">
                  NISS / SSIN
                  {nissStatus === 'valid' && (
                    <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Valide
                    </Badge>
                  )}
                  {nissStatus === 'warning' && (
                    <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Avertissement
                    </Badge>
                  )}
                  {nissStatus === 'invalid' && (
                    <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Invalide
                    </Badge>
                  )}
                </Label>
                <Input
                  id="niss"
                  value={getNissValue()}
                  onChange={(e) => handleNissChange(e.target.value)}
                  placeholder="ex: 85.04.12-345.67"
                  className={
                    nissStatus === 'invalid'
                      ? 'border-red-400 focus-visible:ring-red-400'
                      : nissStatus === 'warning'
                      ? 'border-orange-400 focus-visible:ring-orange-400'
                      : nissStatus === 'valid'
                      ? 'border-green-400 focus-visible:ring-green-400'
                      : ''
                  }
                />
                {nissWarnings.length > 0 && (
                  <Alert
                    className={
                      nissStatus === 'invalid'
                        ? 'border-red-200 bg-red-50 mt-2'
                        : 'border-orange-200 bg-orange-50 mt-2'
                    }
                  >
                    <AlertDescription className="text-xs space-y-1">
                      {nissWarnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              Contact
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={getPhone()}
                  onChange={(e) => {
                    const idx = formData.telecom.findIndex((t) => t.system === 'phone');
                    if (idx >= 0) handleTelecomChange(idx, 'value', e.target.value);
                  }}
                  placeholder="+32 2 123 45 67"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={getEmail()}
                  onChange={(e) => {
                    const idx = formData.telecom.findIndex((t) => t.system === 'email');
                    if (idx >= 0) handleTelecomChange(idx, 'value', e.target.value);
                  }}
                  placeholder="patient@exemple.be"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              Adresse
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Rue et numéro</Label>
                <Input
                  value={formData.address[0]?.line?.[0] || ''}
                  onChange={(e) => handleAddressChange('line', [e.target.value])}
                  placeholder="Rue de la Paix 1"
                />
              </div>
              <div className="space-y-1">
                <Label>Code postal</Label>
                <Input
                  value={formData.address[0]?.postalCode || ''}
                  onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                  placeholder="1000"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1">
                <Label>Commune</Label>
                <Input
                  value={formData.address[0]?.city || ''}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="Bruxelles"
                />
              </div>
            </div>
          </div>

          {/* Préférences */}
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              Préférences
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="language">
                  Langue préférée
                  <span className="ml-1 text-xs text-slate-400">(Loi belge sur l'emploi des langues)</span>
                </Label>
                <Select value={getPreferredLanguage()} onValueChange={setPreferredLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, statut: v }))}
                >
                  <SelectTrigger id="statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Actif">Actif</SelectItem>
                    <SelectItem value="Inactif">Inactif</SelectItem>
                    <SelectItem value="Décédé">Décédé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Antécédents médicaux */}
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              Antécédents
            </p>
            <div className="space-y-1">
              <Label htmlFor="allergies">Allergies et intolérances connues</Label>
              <Textarea
                id="allergies"
                name="allergies"
                value={formData.allergies}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, allergies: e.target.value }))
                }
                placeholder="Ex: Pénicilline (anaphylaxie), AINS (urticaire), arachides..."
                rows={3}
              />
            </div>
          </div>

          {/* Notice RGPD */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              <strong>Loi 22/08/2002 – Droits du patient :</strong> le patient a le droit
              d'accéder à son dossier, de le faire rectifier, et de désigner une personne de
              confiance. Les données sont conservées{' '}
              <strong>30 ans minimum</strong> conformément aux recommandations SPF Santé
              publique.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSaving || nissStatus === 'invalid'}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('actions.save')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
