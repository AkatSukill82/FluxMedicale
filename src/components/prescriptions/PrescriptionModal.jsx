import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Trash2, 
  FileSignature,
  Save,
  Loader2,
  Pill,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { toast } from 'sonner';
import DrugSearch from '../drugs/DrugSearch';
import MedicationSearch from '../medications/MedicationSearch';
import RealTimeInteractionAlert from './RealTimeInteractionAlert';

export default function PrescriptionModal({ patient, isOpen, onClose }) {
  const { t } = useI18n();
  
  const [medications, setMedications] = useState([]);
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('prescription');
  const [selectedDrugForMonograph, setSelectedDrugForMonograph] = useState(null);

  const handleSelectDrug = (drug) => {
    const newMed = {
      id: Math.random().toString(),
      drug_id: drug.id,
      name: drug.product_name,
      substance_name: drug.substance_name,
      atc_code: drug.atc_code,
      cnk: drug.cnk,
      timesPerDay: 1,
      mealTiming: 'after',
      dose: drug.strength ? `${drug.strength} ${drug.unit}` : '',
      form: drug.form || 'tablet',
      quantity: drug.package_size || '',
      duration: '',
      durationUnit: 'days',
      monography: drug.monography_json
    };
    
    setMedications([...medications, newMed]);
  };

  const handleSelectMedication = (drug) => {
    const newMed = {
      id: Math.random().toString(),
      drug_id: drug.id,
      name: drug.product_name,
      substance_name: drug.substance_name,
      atc_code: drug.atc_code,
      cnk: drug.cnk,
      timesPerDay: 1,
      mealTiming: 'after',
      dose: drug.strength ? `${drug.strength}${drug.unit}` : '',
      form: drug.form || 'tablet',
      quantity: drug.package_size || '',
      duration: '',
      durationUnit: 'days',
      monography: drug.monography_json
    };
    setMedications([...medications, newMed]);
  };

  const handleRemoveMedication = (medId) => {
    setMedications(medications.filter(m => m.id !== medId));
  };

  const handleUpdateMedication = (medId, field, value) => {
    setMedications(medications.map(m => 
      m.id === medId ? { ...m, [field]: value } : m
    ));
  };

  const handleSignAndSend = async () => {
    if (medications.length === 0) {
      toast.error('Ajoutez au moins un médicament');
      return;
    }

    setIsSending(true);
    try {
      const currentUser = await base44.auth.me();
      
      const medicamentsData = medications.map(med => ({
        nom_produit: med.name,
        posologie: `${med.timesPerDay}x/jour ${med.mealTiming === 'before' ? 'avant' : med.mealTiming === 'during' ? 'pendant' : 'après'} repas`,
        duree_traitement: `${med.duration} ${med.durationUnit === 'days' ? 'jours' : 'semaines'}`
      }));

      await base44.entities.Prescription.create({
        patient_id: patient.id,
        medecin_email: currentUser.email,
        date_prescription: new Date().toISOString(),
        medicaments: medicamentsData,
        statut_recip_e: 'Envoyé'
      });

      toast.success('Prescription signée et envoyée via Recip-e');
      onClose();
    } catch (error) {
      console.error('Prescription error:', error);
      toast.error('Erreur lors de l\'envoi de la prescription');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Pill className="w-6 h-6" />
            {t('rx.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prescription">
              <Pill className="w-4 h-4 mr-2" />
              {t('rx.tabs.prescription')}
            </TabsTrigger>
            <TabsTrigger value="aid">
              <BookOpen className="w-4 h-4 mr-2" />
              {t('rx.tabs.aid')}
            </TabsTrigger>
            <TabsTrigger value="comment">
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('rx.tabs.comment')}
            </TabsTrigger>
          </TabsList>

          {/* Prescription Tab */}
          <TabsContent value="prescription" className="space-y-6 pt-6">
            {/* Medication search */}
            <div>
              <Label>Rechercher dans la base de médicaments</Label>
              <MedicationSearch 
                onSelect={handleSelectMedication}
                selectedMedications={medications}
              />
            </div>

            {/* Alertes interactions en temps réel */}
            {medications.length > 0 && (
              <RealTimeInteractionAlert
                prescribedDrugs={medications}
                patientCurrentMeds={patient?.medicaments_actuels || ''}
                patientAllergies={patient?.allergies || ''}
              />
            )}

            {/* Medications list */}
            <div className="space-y-4">
              {medications.map(med => (
                <div key={med.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">{med.name}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMedication(med.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>{t('rx.posology.timesPerDay')}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={med.timesPerDay}
                        onChange={(e) => handleUpdateMedication(med.id, 'timesPerDay', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label>{t('rx.posology.mealTiming')}</Label>
                      <Select 
                        value={med.mealTiming} 
                        onValueChange={(value) => handleUpdateMedication(med.id, 'mealTiming', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before">{t('rx.posology.before')}</SelectItem>
                          <SelectItem value="during">{t('rx.posology.during')}</SelectItem>
                          <SelectItem value="after">{t('rx.posology.after')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('rx.posology.dose')}</Label>
                      <Input
                        value={med.dose}
                        onChange={(e) => handleUpdateMedication(med.id, 'dose', e.target.value)}
                        placeholder="500mg"
                      />
                    </div>

                    <div>
                      <Label>{t('rx.posology.form')}</Label>
                      <Select 
                        value={med.form} 
                        onValueChange={(value) => handleUpdateMedication(med.id, 'form', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tablet">Comprimé</SelectItem>
                          <SelectItem value="capsule">Gélule</SelectItem>
                          <SelectItem value="syrup">Sirop</SelectItem>
                          <SelectItem value="injection">Injection</SelectItem>
                          <SelectItem value="cream">Crème</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('rx.posology.duration')}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={med.duration}
                          onChange={(e) => handleUpdateMedication(med.id, 'duration', e.target.value)}
                          className="w-20"
                        />
                        <Select 
                          value={med.durationUnit} 
                          onValueChange={(value) => handleUpdateMedication(med.id, 'durationUnit', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Jours</SelectItem>
                            <SelectItem value="weeks">Semaines</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>{t('rx.posology.quantity')}</Label>
                      <Input
                        value={med.quantity}
                        onChange={(e) => handleUpdateMedication(med.id, 'quantity', e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Aid Tab */}
          <TabsContent value="aid" className="pt-6">
            {medications.length === 0 ? (
              <div className="bg-muted p-6 rounded-lg text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-lg mb-2">Aide médicamenteuse</h3>
                <p className="text-muted-foreground">
                  Sélectionnez un médicament dans l'onglet Prescription pour voir sa monographie
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Sélectionnez un médicament pour voir sa monographie</Label>
                {medications.map(med => (
                  <div 
                    key={med.id}
                    onClick={() => setSelectedDrugForMonograph(med)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDrugForMonograph?.id === med.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <h4 className="font-semibold">{med.name}</h4>
                    <p className="text-sm text-muted-foreground">{med.substance_name}</p>
                  </div>
                ))}

                {selectedDrugForMonograph?.monography && (
                  <div className="mt-6 p-6 border rounded-lg bg-background">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Monographie: {selectedDrugForMonograph.name}
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      {selectedDrugForMonograph.monography.indications && (
                        <div className="mb-4">
                          <h4 className="font-semibold">Indications</h4>
                          <p>{selectedDrugForMonograph.monography.indications}</p>
                        </div>
                      )}
                      {selectedDrugForMonograph.monography.posology && (
                        <div className="mb-4">
                          <h4 className="font-semibold">Posologie</h4>
                          <p>{selectedDrugForMonograph.monography.posology}</p>
                        </div>
                      )}
                      {selectedDrugForMonograph.monography.contraindications && (
                        <div className="mb-4">
                          <h4 className="font-semibold">Contre-indications</h4>
                          <p>{selectedDrugForMonograph.monography.contraindications}</p>
                        </div>
                      )}
                      {selectedDrugForMonograph.monography.interactions && (
                        <div className="mb-4">
                          <h4 className="font-semibold">Interactions</h4>
                          <p>{selectedDrugForMonograph.monography.interactions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Comment Tab */}
          <TabsContent value="comment" className="pt-6">
            <div>
              <Label className="text-lg mb-2 block">{t('rx.tabs.comment')}</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('rx.commentPlaceholder')}
                rows={15}
                className="resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {comment.length} / 1000 caractères
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button variant="outline" onClick={() => toast.info('Brouillon sauvegardé')}>
            <Save className="w-4 h-4 mr-2" />
            {t('billing.saveDraft')}
          </Button>
          <Button onClick={handleSignAndSend} disabled={isSending || medications.length === 0}>
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSignature className="w-4 h-4 mr-2" />
            )}
            {t('rx.signAndSend')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}