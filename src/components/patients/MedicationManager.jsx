import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Pill,
  Plus,
  Archive,
  Edit,
  Trash2,
  Check,
  ChevronsUpDown,
  Clock,
  Calendar,
  AlertTriangle,
  ArchiveRestore,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import DrugInteractionChecker, { useInteractionChecker } from '../clinical/DrugInteractionChecker';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Catégories d'interactions pour médicaments personnalisés
const INTERACTION_CATEGORIES = [
  { value: '', label: 'Aucune catégorie' },
  { value: 'ains', label: 'AINS (Anti-inflammatoires)' },
  { value: 'corticoide', label: 'Corticoïde' },
  { value: 'anticoagulant', label: 'Anticoagulant' },
  { value: 'antiagrégant', label: 'Antiagrégant plaquettaire' },
  { value: 'iec', label: 'IEC / ARA2' },
  { value: 'betabloquant', label: 'Bêtabloquant' },
  { value: 'diuretique', label: 'Diurétique' },
  { value: 'statine', label: 'Statine' },
  { value: 'isrs', label: 'Antidépresseur ISRS' },
  { value: 'benzodiazepine', label: 'Benzodiazépine' },
  { value: 'opioide', label: 'Opioïde' },
  { value: 'macrolide', label: 'Macrolide (antibiotique)' },
  { value: 'fluoroquinolone', label: 'Fluoroquinolone (antibiotique)' },
  { value: 'metformine', label: 'Metformine' },
  { value: 'sulfamide', label: 'Sulfamide hypoglycémiant' },
  { value: 'lithium', label: 'Lithium' },
  { value: 'digoxine', label: 'Digoxine' },
  { value: 'potassium', label: 'Potassium' },
];

// Liste des médicaments courants pré-remplis
const COMMON_MEDICATIONS = [
  // Antihypertenseurs
  { name: 'Amlodipine', category: 'Antihypertenseur', defaultDosage: '5mg' },
  { name: 'Lisinopril', category: 'Antihypertenseur', defaultDosage: '10mg' },
  { name: 'Losartan', category: 'Antihypertenseur', defaultDosage: '50mg' },
  { name: 'Bisoprolol', category: 'Antihypertenseur', defaultDosage: '5mg' },
  { name: 'Ramipril', category: 'Antihypertenseur', defaultDosage: '5mg' },
  
  // Antidiabétiques
  { name: 'Metformine', category: 'Antidiabétique', defaultDosage: '500mg' },
  { name: 'Gliclazide', category: 'Antidiabétique', defaultDosage: '30mg' },
  { name: 'Sitagliptine', category: 'Antidiabétique', defaultDosage: '100mg' },
  { name: 'Empagliflozine', category: 'Antidiabétique', defaultDosage: '10mg' },
  
  // Statines
  { name: 'Atorvastatine', category: 'Hypolipémiant', defaultDosage: '20mg' },
  { name: 'Rosuvastatine', category: 'Hypolipémiant', defaultDosage: '10mg' },
  { name: 'Simvastatine', category: 'Hypolipémiant', defaultDosage: '20mg' },
  
  // Anticoagulants/Antiagrégants
  { name: 'Aspirine', category: 'Antiagrégant', defaultDosage: '100mg' },
  { name: 'Clopidogrel', category: 'Antiagrégant', defaultDosage: '75mg' },
  { name: 'Rivaroxaban', category: 'Anticoagulant', defaultDosage: '20mg' },
  { name: 'Apixaban', category: 'Anticoagulant', defaultDosage: '5mg' },
  
  // Antiacides/IPP
  { name: 'Oméprazole', category: 'IPP', defaultDosage: '20mg' },
  { name: 'Pantoprazole', category: 'IPP', defaultDosage: '40mg' },
  { name: 'Esoméprazole', category: 'IPP', defaultDosage: '20mg' },
  
  // Thyroïde
  { name: 'Lévothyroxine', category: 'Thyroïde', defaultDosage: '50µg' },
  
  // Antidépresseurs/Anxiolytiques
  { name: 'Sertraline', category: 'Antidépresseur', defaultDosage: '50mg' },
  { name: 'Escitalopram', category: 'Antidépresseur', defaultDosage: '10mg' },
  { name: 'Alprazolam', category: 'Anxiolytique', defaultDosage: '0.25mg' },
  
  // Antalgiques
  { name: 'Paracétamol', category: 'Antalgique', defaultDosage: '1g' },
  { name: 'Ibuprofène', category: 'AINS', defaultDosage: '400mg' },
  { name: 'Tramadol', category: 'Antalgique', defaultDosage: '50mg' },
  
  // Respiratoire
  { name: 'Salbutamol', category: 'Bronchodilatateur', defaultDosage: '100µg/dose' },
  { name: 'Budésonide/Formotérol', category: 'Corticoïde inhalé', defaultDosage: '160/4.5µg' },
  { name: 'Montelukast', category: 'Antileucotriène', defaultDosage: '10mg' },
  
  // Autres
  { name: 'Furosémide', category: 'Diurétique', defaultDosage: '40mg' },
  { name: 'Spironolactone', category: 'Diurétique', defaultDosage: '25mg' },
  { name: 'Allopurinol', category: 'Antigoutteux', defaultDosage: '100mg' },
];

const FREQUENCY_OPTIONS = [
  { value: '1x/jour', label: '1x par jour' },
  { value: '2x/jour', label: '2x par jour' },
  { value: '3x/jour', label: '3x par jour' },
  { value: '4x/jour', label: '4x par jour' },
  { value: 'matin', label: 'Le matin' },
  { value: 'soir', label: 'Le soir' },
  { value: 'matin+soir', label: 'Matin et soir' },
  { value: 'midi', label: 'À midi' },
  { value: 'au_repas', label: 'Aux repas' },
  { value: 'avant_repas', label: 'Avant les repas' },
  { value: 'apres_repas', label: 'Après les repas' },
  { value: 'au_coucher', label: 'Au coucher' },
  { value: 'si_necessaire', label: 'Si nécessaire' },
  { value: '1x/semaine', label: '1x par semaine' },
  { value: 'autre', label: 'Autre (préciser)' },
];

export default function MedicationManager({ patient }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    customFrequency: '',
    startDate: '',
    endDate: '',
    notes: '',
    archived: false,
    isCustom: false,
    interactionCategory: ''
  });

  // Parse les médicaments du patient (format JSON ou texte)
  const parseMedications = () => {
    if (!patient.medicaments_actuels) return [];
    
    try {
      // Essayer de parser comme JSON
      const parsed = JSON.parse(patient.medicaments_actuels);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback: format texte simple (ancien format)
      return patient.medicaments_actuels.split(',').map((m, idx) => ({
        id: `legacy-${idx}`,
        name: m.trim(),
        dosage: '',
        frequency: '',
        startDate: '',
        endDate: '',
        notes: '',
        archived: false,
        isCustom: false,
        interactionCategory: ''
      })).filter(m => m.name);
    }
  };

  const medications = parseMedications();
  const activeMedications = medications.filter(m => !m.archived);
  const archivedMedications = medications.filter(m => m.archived);
  
  // Vérifier les interactions entre tous les médicaments actifs
  const medicationNamesForInteraction = activeMedications.map(m => 
    m.interactionCategory || m.name
  );
  const { interactions, hasInteractions, hasCritical, hasHigh } = useInteractionChecker(medicationNamesForInteraction);

  const updatePatientMutation = useMutation({
    mutationFn: (newMedications) => {
      return base44.entities.Patient.update(patient.id, {
        medicaments_actuels: JSON.stringify(newMedications)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Médicaments mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleSelectMedication = (medicationName) => {
    const found = COMMON_MEDICATIONS.find(m => m.name === medicationName);
    setFormData({
      ...formData,
      name: medicationName,
      dosage: found?.defaultDosage || ''
    });
    setComboboxOpen(false);
  };

  const handleSaveMedication = () => {
    if (!formData.name.trim()) {
      toast.error('Veuillez entrer le nom du médicament');
      return;
    }

    const newMedication = {
      id: editingMedication?.id || `med-${Date.now()}`,
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      frequency: formData.frequency === 'autre' ? formData.customFrequency : formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate,
      notes: formData.notes.trim(),
      archived: formData.archived,
      isCustom: formData.isCustom,
      interactionCategory: formData.interactionCategory
    };

    let newMedications;
    if (editingMedication) {
      newMedications = medications.map(m => 
        m.id === editingMedication.id ? newMedication : m
      );
    } else {
      newMedications = [...medications, newMedication];
    }

    updatePatientMutation.mutate(newMedications);
    resetForm();
  };

  const handleArchive = (medication) => {
    const newMedications = medications.map(m => 
      m.id === medication.id ? { ...m, archived: true, endDate: format(new Date(), 'yyyy-MM-dd') } : m
    );
    updatePatientMutation.mutate(newMedications);
  };

  const handleRestore = (medication) => {
    const newMedications = medications.map(m => 
      m.id === medication.id ? { ...m, archived: false, endDate: '' } : m
    );
    updatePatientMutation.mutate(newMedications);
  };

  const handleDelete = (medication) => {
    if (!confirm('Supprimer définitivement ce médicament ?')) return;
    const newMedications = medications.filter(m => m.id !== medication.id);
    updatePatientMutation.mutate(newMedications);
  };

  const handleEdit = (medication) => {
    const freq = FREQUENCY_OPTIONS.find(f => f.value === medication.frequency);
    setEditingMedication(medication);
    setFormData({
      name: medication.name,
      dosage: medication.dosage || '',
      frequency: freq ? medication.frequency : 'autre',
      customFrequency: freq ? '' : medication.frequency,
      startDate: medication.startDate || '',
      endDate: medication.endDate || '',
      notes: medication.notes || '',
      archived: medication.archived || false,
      isCustom: medication.isCustom || false,
      interactionCategory: medication.interactionCategory || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: '',
      customFrequency: '',
      startDate: '',
      endDate: '',
      notes: '',
      archived: false,
      isCustom: false,
      interactionCategory: ''
    });
    setEditingMedication(null);
    setShowAddModal(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: fr }) : null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Médicaments actuels
            <Badge variant="outline">{activeMedications.length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {archivedMedications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4 mr-1" />
                Archivés ({archivedMedications.length})
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Alertes d'interactions */}
        {hasInteractions && (
          <Alert className={`mb-4 ${hasCritical ? 'border-red-600 bg-red-50' : hasHigh ? 'border-orange-500 bg-orange-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <AlertTriangle className={`w-4 h-4 ${hasCritical ? 'text-red-600' : hasHigh ? 'text-orange-600' : 'text-yellow-600'}`} />
            <AlertDescription>
              <strong>{interactions.length} interaction(s) détectée(s)</strong> entre les médicaments actuels.
              <DrugInteractionChecker 
                medications={medicationNamesForInteraction}
                showInline={true}
              />
            </AlertDescription>
          </Alert>
        )}

        {activeMedications.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Aucun médicament enregistré
          </p>
        ) : (
          <div className="space-y-3">
            {activeMedications.map((med) => (
              <div 
                key={med.id} 
                className="p-3 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-900">{med.name}</span>
                      {med.dosage && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {med.dosage}
                        </Badge>
                      )}
                      {med.isCustom && (
                        <Badge variant="outline" className="text-purple-600 border-purple-300 gap-1">
                          <Sparkles className="w-3 h-3" />
                          Personnalisé
                        </Badge>
                      )}
                      {med.interactionCategory && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                          {INTERACTION_CATEGORIES.find(c => c.value === med.interactionCategory)?.label || med.interactionCategory}
                        </Badge>
                      )}
                    </div>
                    {med.frequency && (
                      <div className="flex items-center gap-1 text-sm text-blue-700 mt-1">
                        <Clock className="w-3 h-3" />
                        {med.frequency}
                      </div>
                    )}
                    {(med.startDate || med.endDate) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        {med.startDate && `Depuis ${formatDate(med.startDate)}`}
                        {med.startDate && med.endDate && ' — '}
                        {med.endDate && `Jusqu'au ${formatDate(med.endDate)}`}
                      </div>
                    )}
                    {med.notes && (
                      <p className="text-xs text-slate-600 mt-1 italic">{med.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => handleEdit(med)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                      onClick={() => handleArchive(med)}
                      title="Archiver"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section archivés */}
        {showArchived && archivedMedications.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Médicaments archivés
            </h4>
            <div className="space-y-2">
              {archivedMedications.map((med) => (
                <div 
                  key={med.id} 
                  className="p-3 bg-slate-100 rounded-lg border border-slate-200 opacity-75"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-600 line-through">{med.name}</span>
                        {med.dosage && (
                          <Badge variant="outline" className="text-slate-500">
                            {med.dosage}
                          </Badge>
                        )}
                      </div>
                      {med.endDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          Arrêté le {formatDate(med.endDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => handleRestore(med)}
                        title="Restaurer"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => handleDelete(med)}
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal Ajout/Modification */}
      <Dialog open={showAddModal} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              {editingMedication ? 'Modifier le médicament' : 'Ajouter un médicament'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle médicament personnalisé */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <input
                type="checkbox"
                id="isCustom"
                checked={formData.isCustom}
                onChange={(e) => setFormData({ ...formData, isCustom: e.target.checked })}
                className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="isCustom" className="flex items-center gap-2 cursor-pointer text-purple-800">
                <Sparkles className="w-4 h-4" />
                Médicament personnalisé (non trouvé dans SAMv2)
              </Label>
            </div>

            {/* Sélecteur de médicament avec combobox */}
            <div className="space-y-2">
              <Label>Médicament *</Label>
              {formData.isCustom ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du médicament personnalisé..."
                />
              ) : (
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                    >
                      {formData.name || "Sélectionner ou saisir..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Rechercher un médicament..." 
                        value={formData.name}
                        onValueChange={(val) => setFormData({ ...formData, name: val })}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm">
                            Appuyez sur Entrée pour ajouter "{formData.name}"
                          </div>
                        </CommandEmpty>
                        {Object.entries(
                          COMMON_MEDICATIONS.reduce((acc, med) => {
                            if (!acc[med.category]) acc[med.category] = [];
                            acc[med.category].push(med);
                            return acc;
                          }, {})
                        ).map(([category, meds]) => (
                          <CommandGroup key={category} heading={category}>
                            {meds.map((med) => (
                              <CommandItem
                                key={med.name}
                                value={med.name}
                                onSelect={() => handleSelectMedication(med.name)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.name === med.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {med.name}
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {med.defaultDosage}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Catégorie d'interaction pour médicaments personnalisés */}
            {formData.isCustom && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Catégorie d'interaction (pour alertes)
                </Label>
                <Select
                  value={formData.interactionCategory}
                  onValueChange={(val) => setFormData({ ...formData, interactionCategory: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Associer à une classe médicamenteuse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERACTION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Associez ce médicament à une classe pour détecter les interactions avec d'autres traitements.
                </p>
              </div>
            )}

            {/* Dosage */}
            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="Ex: 500mg, 10ml..."
              />
            </div>

            {/* Fréquence */}
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select
                value={formData.frequency}
                onValueChange={(val) => setFormData({ ...formData, frequency: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.frequency === 'autre' && (
                <Input
                  value={formData.customFrequency}
                  onChange={(e) => setFormData({ ...formData, customFrequency: e.target.value })}
                  placeholder="Préciser la fréquence..."
                  className="mt-2"
                />
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin (optionnel)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes / Instructions</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Instructions particulières, effets secondaires à surveiller..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Annuler
            </Button>
            <Button onClick={handleSaveMedication} disabled={updatePatientMutation.isPending}>
              {updatePatientMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}