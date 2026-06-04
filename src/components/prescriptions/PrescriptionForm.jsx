/**
 * Formulaire de prescription électronique Recip-e
 * Champs obligatoires selon AR 10/08/2005 (modifié AR 21/01/2009 et circulaires INAMI)
 * - INAMI/NIHII du prescripteur
 * - Date de prescription
 * - NISS du patient
 * - Dénomination commune internationale (DCI/INN) ou nom commercial
 * - Forme pharmaceutique + concentration
 * - Posologie (dose unitaire, fréquence, voie)
 * - Durée OU nombre d'unités
 * - Délivrance unique ou multiple (avec délai)
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Send, Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useKmehrGenerator } from './useKmehrGenerator';
import { Prescription } from '@/entities/Prescription';
import { nissValidator } from '../eid/nissValidator';
import { format } from 'date-fns';
import { toast } from 'sonner';

const EMPTY_MED = {
  inn_name: '',
  brand_name: '',
  use_inn: true,
  pharmaceutical_form: '',
  strength: '',
  route: 'oral',
  dose_per_intake: '',
  frequency: '',
  duration_days: '',
  units_count: '',
  refills: 0,
  refill_interval_days: '',
  substitution_allowed: true,
  chapter_iv: false,
  chapter_iv_indication: '',
  special_instructions: '',
};

const ROUTES = [
  { value: 'oral', label: 'Orale' },
  { value: 'topical', label: 'Topique' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'subcutaneous', label: 'Sous-cutanée' },
  { value: 'intramuscular', label: 'Intramusculaire' },
  { value: 'intravenous', label: 'Intraveineuse' },
  { value: 'rectal', label: 'Rectale' },
  { value: 'sublingual', label: 'Sublinguale' },
  { value: 'nasal', label: 'Nasale' },
  { value: 'ophthalmic', label: 'Ophtalmique' },
  { value: 'otic', label: 'Auriculaire' },
  { value: 'transdermal', label: 'Transdermique' },
];

export default function PrescriptionForm({ patient, currentUser, onPrescriptionSent }) {
  const [medicaments, setMedicaments] = useState([{ ...EMPTY_MED }]);
  const [prescriptionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { isLoading, status, error, generatedRid, generateAndSendKmehr } = useKmehrGenerator();

  const patientNiss = patient?.identifier?.find((id) => id.system?.includes('ssin'))?.value || '';
  const presciberInami = currentUser?.inami || currentUser?.numero_inami || '';

  // Validation NISS patient
  const nissValidation = patientNiss ? nissValidator.validate(patientNiss) : null;

  const handleMedChange = (index, field, value) => {
    setMedicaments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMed = () => setMedicaments((prev) => [...prev, { ...EMPTY_MED }]);

  const removeMed = (index) =>
    setMedicaments((prev) => prev.filter((_, i) => i !== index));

  const validate = () => {
    if (!presciberInami) {
      toast.error('Votre numéro INAMI/NIHII est requis. Complétez votre profil.');
      return false;
    }
    if (!patientNiss) {
      toast.error('Le NISS du patient est requis pour une prescription Recip-e.');
      return false;
    }
    if (nissValidation && !nissValidation.isValid) {
      toast.error(`NISS patient invalide : ${nissValidation.error}`);
      return false;
    }
    const valid = medicaments.every((m, i) => {
      const name = m.use_inn ? m.inn_name : m.brand_name;
      if (!name) {
        toast.error(`Médicament ${i + 1} : le nom est obligatoire.`);
        return false;
      }
      if (!m.pharmaceutical_form) {
        toast.error(`Médicament ${i + 1} : la forme pharmaceutique est obligatoire.`);
        return false;
      }
      if (!m.dose_per_intake || !m.frequency) {
        toast.error(`Médicament ${i + 1} : posologie complète requise (dose + fréquence).`);
        return false;
      }
      if (!m.duration_days && !m.units_count) {
        toast.error(`Médicament ${i + 1} : indiquez la durée OU le nombre d'unités.`);
        return false;
      }
      if (m.chapter_iv && !m.chapter_iv_indication) {
        toast.error(`Médicament ${i + 1} : l'indication médicale est obligatoire pour un médicament Chapitre IV.`);
        return false;
      }
      return true;
    });
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const prescriptionData = {
      patient_id: patient.id,
      medecin_email: currentUser.email,
      medecin_inami: presciberInami,
      patient_niss: patientNiss,
      date_prescription: prescriptionDate,
      medicaments: medicaments.filter((m) => m.use_inn ? m.inn_name : m.brand_name),
    };

    const result = await generateAndSendKmehr(prescriptionData, patient, currentUser);

    if (result.success) {
      await Prescription.create({
        ...prescriptionData,
        statut_recip_e: 'Validé',
        recip_e_rid: result.rid,
      });
      if (onPrescriptionSent) onPrescriptionSent();
    } else {
      await Prescription.create({
        ...prescriptionData,
        statut_recip_e: 'Erreur',
        feedback_recip_e: result.error,
      });
    }
  };

  if (status === 'acknowledged') {
    return (
      <Alert className="border-green-500 bg-green-50 text-green-800">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-bold">Prescription envoyée avec succès via Recip-e !</p>
          <p className="mt-1">
            RID : <strong className="font-mono">{generatedRid}</strong>
          </p>
          <p className="text-xs mt-1 text-green-700">
            Le RID doit être communiqué au patient pour le retrait en pharmacie.
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            Nouvelle prescription
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-600" />
          Nouvelle Prescription Électronique (Recip-e)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations prescripteur / patient */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Date de prescription</Label>
              <p className="font-medium text-sm">{prescriptionDate}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">INAMI/NIHII prescripteur *</Label>
              {presciberInami ? (
                <p className="font-mono text-sm font-medium">{presciberInami}</p>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Non configuré — complétez votre profil
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">NISS patient *</Label>
              {patientNiss ? (
                <p className="font-mono text-sm font-medium">
                  {nissValidator.format(patientNiss)}
                  {nissValidation?.isValid && (
                    <CheckCircle className="inline w-3 h-3 ml-1 text-green-600" />
                  )}
                </p>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  NISS manquant — requis pour Recip-e
                </Badge>
              )}
            </div>
          </div>

          {/* Médicaments */}
          {medicaments.map((med, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Médicament {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMed(index)}
                  disabled={medicaments.length === 1}
                  className="text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Nom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-xs">
                      {med.use_inn ? 'DCI / INN *' : 'Nom commercial *'}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        id={`use-inn-${index}`}
                        checked={med.use_inn}
                        onCheckedChange={(v) => handleMedChange(index, 'use_inn', v)}
                      />
                      <label htmlFor={`use-inn-${index}`} className="text-xs text-slate-500 cursor-pointer">
                        DCI/INN (recommandé)
                      </label>
                    </div>
                  </div>
                  <Input
                    value={med.use_inn ? med.inn_name : med.brand_name}
                    onChange={(e) =>
                      handleMedChange(index, med.use_inn ? 'inn_name' : 'brand_name', e.target.value)
                    }
                    placeholder={med.use_inn ? 'ex: amoxicilline' : 'ex: Clamoxyl®'}
                    required
                  />
                  {!med.use_inn && (
                    <p className="text-xs text-amber-600">
                      Préférez la DCI/INN — obligatoire pour la substitution générique (AR 2012).
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Forme pharmaceutique *</Label>
                  <Input
                    value={med.pharmaceutical_form}
                    onChange={(e) => handleMedChange(index, 'pharmaceutical_form', e.target.value)}
                    placeholder="ex: comprimé, sirop, pommade..."
                    required
                  />
                </div>
              </div>

              {/* Concentration + voie */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Concentration / Dosage</Label>
                  <Input
                    value={med.strength}
                    onChange={(e) => handleMedChange(index, 'strength', e.target.value)}
                    placeholder="ex: 500mg, 0.05%"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Voie d'administration</Label>
                  <Select
                    value={med.route}
                    onValueChange={(v) => handleMedChange(index, 'route', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dose par prise *</Label>
                  <Input
                    value={med.dose_per_intake}
                    onChange={(e) => handleMedChange(index, 'dose_per_intake', e.target.value)}
                    placeholder="ex: 1 comprimé, 500mg"
                    required
                  />
                </div>
              </div>

              {/* Fréquence + durée */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fréquence *</Label>
                  <Input
                    value={med.frequency}
                    onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                    placeholder="ex: 3x/jour, matin + soir"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Durée (jours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={med.duration_days}
                    onChange={(e) => handleMedChange(index, 'duration_days', e.target.value)}
                    placeholder="ex: 7"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nb d'unités (boîtes)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={med.units_count}
                    onChange={(e) => handleMedChange(index, 'units_count', e.target.value)}
                    placeholder="ex: 1"
                  />
                </div>
              </div>

              {/* Renouvellements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre de renouvellements</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={med.refills}
                    onChange={(e) => handleMedChange(index, 'refills', parseInt(e.target.value) || 0)}
                  />
                </div>
                {med.refills > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Délai min. entre renouvellements (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={med.refill_interval_days}
                      onChange={(e) => handleMedChange(index, 'refill_interval_days', e.target.value)}
                      placeholder="ex: 28"
                    />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`sub-${index}`}
                    checked={med.substitution_allowed}
                    onCheckedChange={(v) => handleMedChange(index, 'substitution_allowed', v)}
                  />
                  <label htmlFor={`sub-${index}`} className="text-xs cursor-pointer">
                    Substitution générique autorisée
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`chiv-${index}`}
                    checked={med.chapter_iv}
                    onCheckedChange={(v) => handleMedChange(index, 'chapter_iv', v)}
                  />
                  <label htmlFor={`chiv-${index}`} className="text-xs cursor-pointer">
                    Médicament Chapitre IV INAMI
                  </label>
                </div>
              </div>

              {med.chapter_iv && (
                <div className="space-y-1 p-3 bg-amber-50 border border-amber-200 rounded">
                  <Label className="text-xs text-amber-800">
                    Indication médicale obligatoire (Chapitre IV) *
                  </Label>
                  <Input
                    value={med.chapter_iv_indication}
                    onChange={(e) => handleMedChange(index, 'chapter_iv_indication', e.target.value)}
                    placeholder="Diagnostic justifiant le remboursement Chapitre IV"
                    className="border-amber-300"
                    required
                  />
                </div>
              )}

              {/* Instructions spéciales */}
              <div className="space-y-1">
                <Label className="text-xs">Instructions particulières pour le patient</Label>
                <Input
                  value={med.special_instructions}
                  onChange={(e) => handleMedChange(index, 'special_instructions', e.target.value)}
                  placeholder="ex: à prendre au repas, éviter l'alcool..."
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addMed} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un médicament
          </Button>

          {/* Notice légale */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              <strong>AR 10/08/2005 :</strong> la prescription électronique doit comporter le
              numéro INAMI du prescripteur, le NISS du patient, la DCI ou le nom commercial, la
              forme, la concentration, la posologie et la durée. La signature électronique via
              eHealth est requise pour la transmission Recip-e.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end pt-2 border-t">
            <Button
              type="submit"
              disabled={isLoading || !presciberInami || !patientNiss}
              className="min-w-36"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isLoading ? `En cours (${status})…` : 'Envoyer via Recip-e'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
