import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Pill, FileText, TestTubes, CalendarPlus, 
  Stethoscope, X, ChevronDown, ChevronUp,
  Shield, Syringe, BookOpen
} from 'lucide-react';
import SAMv2Search from '../medications/SAMv2Search';
import TemplateSelector from '../medications/TemplateSelector';
import InteractionChecker from '../medications/InteractionChecker';
import DosageScheduler from '../medications/DosageScheduler';
import GenericAlternatives from '../medications/GenericAlternatives';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import AllergyInteractionBanner from './AllergyInteractionBanner';

const CARE_SECTIONS = [
  { id: 'medications', label: 'Prescriptions médicamenteuses', icon: Pill, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'non_drug', label: 'Traitement non-médicamenteux', icon: Stethoscope, color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'lab_orders', label: 'Examens complémentaires', icon: TestTubes, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'certificates', label: 'Certificats médicaux', icon: FileText, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'followup', label: 'Suivi & Rendez-vous', icon: CalendarPlus, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'referral', label: 'Lettre au spécialiste', icon: BookOpen, color: 'text-rose-600 bg-rose-50 border-rose-200' },
];

export default function CarePlanStep({ 
  patient, 
  consultationData,
  selectedMedications, 
  setSelectedMedications,
  carePlanData,
  setCarePlanData
}) {
  const [openSections, setOpenSections] = useState([]);
  const [showMedTemplates, setShowMedTemplates] = useState(false);

  const toggleSection = (id) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isSectionOpen = (id) => openSections.includes(id);

  const hasSectionContent = (id) => {
    switch (id) {
      case 'medications': return selectedMedications.length > 0;
      case 'non_drug': return !!carePlanData.non_drug_treatment;
      case 'lab_orders': return !!carePlanData.lab_orders;
      case 'certificates': return !!carePlanData.certificate_type;
      case 'followup': return !!carePlanData.followup_notes || !!carePlanData.followup_date;
      case 'referral': return !!carePlanData.referral_notes;
      default: return false;
    }
  };

  const handleAddMedication = (drug) => {
    const alreadyExists = selectedMedications.find(m => 
      (m.cnk && drug.cnk && m.cnk === drug.cnk) || 
      m.product_name === drug.product_name
    );
    if (!alreadyExists) {
      setSelectedMedications([...selectedMedications, {
        ...drug,
        id: drug.cnk || `temp-${Date.now()}`,
        dosage_prescribed: drug.strength ? `${drug.strength}${drug.unit || ''}` : '',
        frequency: '1x/jour',
        duration: '7 jours'
      }]);
    }
  };

  const handleRemoveMedication = (index) => {
    setSelectedMedications(selectedMedications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    setSelectedMedications(selectedMedications.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const activeCount = CARE_SECTIONS.filter(s => hasSectionContent(s.id)).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Allergy/Interaction Banner */}
      <AllergyInteractionBanner patientId={patient?.id} selectedMedications={selectedMedications} />

      {/* En-tête */}
      <div className="text-center mb-6">
        <p className="text-slate-500 text-sm">
          Sélectionnez les actions nécessaires. Toutes les sections sont optionnelles.
        </p>
        {activeCount > 0 && (
          <Badge className="mt-2 bg-blue-100 text-blue-700">
            {activeCount} action(s) planifiée(s)
          </Badge>
        )}
      </div>

      {/* Sections pliables */}
      {CARE_SECTIONS.map(section => {
        const Icon = section.icon;
        const isOpen = isSectionOpen(section.id);
        const hasContent = hasSectionContent(section.id);

        return (
          <Card key={section.id} className={`overflow-hidden transition-all ${hasContent ? 'ring-1 ring-blue-300' : ''}`}>
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors ${
                isOpen ? 'border-b' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${section.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-sm">{section.label}</span>
                  {hasContent && (
                    <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">✓ Rempli</Badge>
                  )}
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isOpen && (
              <div className="p-4">
                {section.id === 'medications' && (
                  <MedicationsSection
                    patient={patient}
                    selectedMedications={selectedMedications}
                    onAdd={handleAddMedication}
                    onRemove={handleRemoveMedication}
                    onChange={handleMedicationChange}
                    showTemplates={showMedTemplates}
                    setShowTemplates={setShowMedTemplates}
                    setSelectedMedications={setSelectedMedications}
                    consultationData={consultationData}
                  />
                )}
                {section.id === 'non_drug' && (
                  <NonDrugSection data={carePlanData} onChange={setCarePlanData} />
                )}
                {section.id === 'lab_orders' && (
                  <LabOrdersSection data={carePlanData} onChange={setCarePlanData} />
                )}
                {section.id === 'certificates' && (
                  <CertificatesSection data={carePlanData} onChange={setCarePlanData} />
                )}
                {section.id === 'followup' && (
                  <FollowUpSection data={carePlanData} onChange={setCarePlanData} />
                )}
                {section.id === 'referral' && (
                  <ReferralSection data={carePlanData} onChange={setCarePlanData} />
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Message "rien à prescrire" */}
      {activeCount === 0 && (
        <Card className="p-6 text-center border-dashed bg-slate-50/50">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">Aucune action planifiée</p>
          <p className="text-sm text-slate-400 mt-1">
            Vous pouvez passer directement à la facturation si aucun plan de soins n'est nécessaire.
          </p>
        </Card>
      )}
    </div>
  );
}

// --- Sub-sections ---

function MedicationsSection({ patient, selectedMedications, onAdd, onRemove, onChange, showTemplates, setShowTemplates, setSelectedMedications, consultationData }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={!showTemplates ? "default" : "outline"} size="sm" onClick={() => setShowTemplates(false)} className="flex-1">
          🔍 Recherche SAM v2
        </Button>
        <Button variant={showTemplates ? "default" : "outline"} size="sm" onClick={() => setShowTemplates(true)} className="flex-1">
          📋 Modèles
        </Button>
      </div>

      {!showTemplates ? (
        <SAMv2Search onSelect={onAdd} selectedMedications={selectedMedications} patient={patient} />
      ) : (
        <TemplateSelector
          onSelectTemplate={(selected) => {
            const meds = selected.data.medications.map(m => ({
              id: m.drug_id,
              product_name: m.drug_name,
              dosage_prescribed: m.dosage,
              frequency: m.frequency,
              duration: m.duration
            }));
            setSelectedMedications([...selectedMedications, ...meds]);
            setShowTemplates(false);
            toast.success('Modèle appliqué');
          }}
          onCreateTemplate={async () => {
            if (selectedMedications.length === 0) { toast.error('Aucun médicament'); return; }
            const name = prompt('Nom du modèle:');
            if (name) {
              await base44.entities.PrescriptionTemplate.create({
                name,
                use_case: consultationData.diagnostic || consultationData.motif,
                medications: selectedMedications.map(m => ({
                  drug_id: m.id, drug_name: m.product_name,
                  dosage: m.dosage_prescribed, frequency: m.frequency, duration: m.duration
                })),
                category: 'OTHER'
              });
              toast.success('Modèle créé');
            }
          }}
          currentMedications={selectedMedications}
        />
      )}

      <InteractionChecker selectedMedications={selectedMedications} patientId={patient.id} />

      {selectedMedications.length > 0 && (
        <div className="space-y-3">
          <Label className="font-semibold block">Médicaments prescrits ({selectedMedications.length})</Label>
          {selectedMedications.map((med, index) => (
            <div key={med.cnk || index} className="space-y-2">
              <Card className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">{med.product_name}</h3>
                        {med.substance_name && <p className="text-xs text-slate-600">{med.substance_name}</p>}
                        {med.cnk && <Badge variant="outline" className="text-xs mt-1">CNK: {med.cnk}</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-red-500 hover:bg-red-50">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <DosageScheduler
                      medication={med}
                      onChange={(data) => {
                        onChange(index, 'frequency', data.frequency);
                        onChange(index, 'duration', data.duration);
                        onChange(index, 'instructions', data.instructions);
                      }}
                    />
                  </div>
                </div>
              </Card>
              <GenericAlternatives
                medication={med}
                onSelectAlternative={(alt) => {
                  const updated = selectedMedications.map((m, i) => 
                    i === index ? { ...alt, id: alt.cnk || `temp-${Date.now()}`, dosage_prescribed: med.dosage_prescribed, frequency: med.frequency, duration: med.duration, instructions: med.instructions } : m
                  );
                  setSelectedMedications(updated);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NonDrugSection({ data, onChange }) {
  const SUGGESTIONS = [
    'Repos au lit', 'Régime alimentaire adapté', 'Kinésithérapie', 
    'Arrêt tabac', 'Activité physique modérée', 'Surélévation du membre',
    'Application de glace', 'Contention élastique', 'Bains de bouche',
    'Hygiène nasale (sérum physiologique)'
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {SUGGESTIONS.map(s => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onChange({ ...data, non_drug_treatment: (data.non_drug_treatment ? data.non_drug_treatment + '\n' : '') + '• ' + s })}
          >
            + {s}
          </Button>
        ))}
      </div>
      <Textarea
        value={data.non_drug_treatment || ''}
        onChange={(e) => onChange({ ...data, non_drug_treatment: e.target.value })}
        placeholder="Mesures hygiéno-diététiques, physiothérapie, conseils..."
        className="h-28 resize-none"
      />
    </div>
  );
}

function LabOrdersSection({ data, onChange }) {
  const COMMON_LABS = [
    'Biologie sanguine complète', 'CRP', 'Glycémie à jeun', 'HbA1c',
    'Bilan lipidique', 'TSH', 'Ferritine', 'Vitamine D', 'Créatinine/eGFR',
    'Bandelette urinaire', 'ECG', 'Radiographie thorax', 'Échographie abdominale'
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {COMMON_LABS.map(lab => (
          <Button
            key={lab}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onChange({ ...data, lab_orders: (data.lab_orders ? data.lab_orders + '\n' : '') + '• ' + lab })}
          >
            + {lab}
          </Button>
        ))}
      </div>
      <Textarea
        value={data.lab_orders || ''}
        onChange={(e) => onChange({ ...data, lab_orders: e.target.value })}
        placeholder="Analyses de sang, imagerie, bilans demandés..."
        className="h-28 resize-none"
      />
      <Textarea
        value={data.lab_clinical_info || ''}
        onChange={(e) => onChange({ ...data, lab_clinical_info: e.target.value })}
        placeholder="Renseignements cliniques pour le biologiste / radiologue..."
        className="h-16 resize-none text-sm"
      />
    </div>
  );
}

function CertificatesSection({ data, onChange }) {
  const CERT_TYPES = [
    { id: 'arret_travail', label: 'Arrêt de travail', icon: '🏢' },
    { id: 'aptitude_sport', label: 'Aptitude sport', icon: '🏃' },
    { id: 'bonne_sante', label: 'Bonne santé', icon: '💚' },
    { id: 'aptitude_conduite', label: 'Aptitude conduite', icon: '🚗' },
    { id: 'voyage', label: 'Voyage', icon: '✈️' },
    { id: 'personnalise', label: 'Personnalisé', icon: '📄' },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-sm">Type de certificat</Label>
      <div className="grid grid-cols-3 gap-2">
        {CERT_TYPES.map(cert => (
          <button
            key={cert.id}
            onClick={() => onChange({ ...data, certificate_type: data.certificate_type === cert.id ? '' : cert.id })}
            className={`p-3 rounded-lg border text-center text-sm transition-all ${
              data.certificate_type === cert.id 
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200 font-semibold' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-lg block mb-1">{cert.icon}</span>
            {cert.label}
          </button>
        ))}
      </div>

      {data.certificate_type === 'arret_travail' && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <Label className="text-xs">Date début</Label>
            <input type="date" className="w-full mt-1 rounded-md border border-input px-3 py-1.5 text-sm"
              value={data.cert_start_date || new Date().toISOString().split('T')[0]}
              onChange={(e) => onChange({ ...data, cert_start_date: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Date fin</Label>
            <input type="date" className="w-full mt-1 rounded-md border border-input px-3 py-1.5 text-sm"
              value={data.cert_end_date || ''}
              onChange={(e) => onChange({ ...data, cert_end_date: e.target.value })}
            />
          </div>
        </div>
      )}

      <Textarea
        value={data.certificate_notes || ''}
        onChange={(e) => onChange({ ...data, certificate_notes: e.target.value })}
        placeholder="Notes pour le certificat (observations, restrictions...)"
        className="h-20 resize-none"
      />
    </div>
  );
}

function FollowUpSection({ data, onChange }) {
  const FOLLOWUP_OPTIONS = ['1 semaine', '2 semaines', '1 mois', '3 mois', '6 mois', 'Si pas d\'amélioration'];

  return (
    <div className="space-y-3">
      <Label className="text-sm">Revoir le patient dans</Label>
      <div className="flex flex-wrap gap-2">
        {FOLLOWUP_OPTIONS.map(opt => (
          <Button
            key={opt}
            variant={data.followup_delay === opt ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => onChange({ ...data, followup_delay: data.followup_delay === opt ? '' : opt })}
          >
            {opt}
          </Button>
        ))}
      </div>
      <Textarea
        value={data.followup_notes || ''}
        onChange={(e) => onChange({ ...data, followup_notes: e.target.value })}
        placeholder="Consignes de suivi pour le patient, signes d'alerte..."
        className="h-20 resize-none"
      />
    </div>
  );
}

function ReferralSection({ data, onChange }) {
  const SPECIALTIES = [
    'Cardiologue', 'Dermatologue', 'ORL', 'Ophtalmologue', 'Pneumologue',
    'Gastro-entérologue', 'Rhumatologue', 'Neurologue', 'Urologue', 'Gynécologue',
    'Orthopédiste', 'Psychiatre', 'Endocrinologue', 'Chirurgien'
  ];

  return (
    <div className="space-y-3">
      <Label className="text-sm">Spécialité</Label>
      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map(spec => (
          <Button
            key={spec}
            variant={data.referral_specialty === spec ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => onChange({ ...data, referral_specialty: data.referral_specialty === spec ? '' : spec })}
          >
            {spec}
          </Button>
        ))}
      </div>
      <Textarea
        value={data.referral_notes || ''}
        onChange={(e) => onChange({ ...data, referral_notes: e.target.value })}
        placeholder="Motif d'adressage, question posée au spécialiste..."
        className="h-24 resize-none"
      />
    </div>
  );
}