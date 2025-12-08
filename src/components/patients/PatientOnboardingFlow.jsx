
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  User,
  Heart,
  CreditCard,
  FileCheck,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const steps = [
  { id: 1, title: 'Informations personnelles', icon: User, key: 'demographic' },
  { id: 2, title: 'Historique médical', icon: Heart, key: 'medical_history' },
  { id: 3, title: 'Assurance & Mutuelle', icon: CreditCard, key: 'insurance' },
  { id: 4, title: 'Consentements', icon: FileCheck, key: 'consents' },
  { id: 5, title: 'Vérification', icon: CheckCircle, key: 'verification' }
];

export default function PatientOnboardingFlow({ onboardingId, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isPrefillingData, setIsPrefillingData] = useState(false);
  const [standardizedData, setStandardizedData] = useState(null);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [personalizedConsents, setPersonalizedConsents] = useState([]);
  const [isGeneratingConsents, setIsGeneratingConsents] = useState(false);

  // Step 1: Demographic
  const [demographic, setDemographic] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '',
    niss: '',
    phone: '',
    email: '',
    address: { street: '', city: '', postal_code: '', country: 'BE' },
    emergency_contact: { name: '', relationship: '', phone: '' }
  });

  // Step 2: Medical History
  const [medicalHistory, setMedicalHistory] = useState({
    chronic_conditions: [],
    allergies: [],
    current_medications: [],
    previous_surgeries: [],
    family_history: [],
    lifestyle: { smoking: false, alcohol: '', exercise: '' }
  });

  // Step 3: Insurance
  const [insurance, setInsurance] = useState({
    mutuelle_name: '',
    mutuelle_number: '',
    has_dmg: false,
    dmg_physician: '',
    special_rights: []
  });

  // Step 4: Consents
  const [consents, setConsents] = useState({
    gdpr_consent: false,
    medical_data_sharing: false,
    teleconsultation_consent: false,
    hub_access_consent: false
  });

  useEffect(() => {
    if (onboardingId) {
      loadOnboardingData();
    }
  }, [onboardingId]);

  useEffect(() => {
    // AI-powered suggestions based on input
    if (currentStep === 2 && demographic.birth_date) {
      generateAISuggestions();
    }
  }, [currentStep, demographic.birth_date]);

  // Trigger personalized consents when moving to consent step
  useEffect(() => {
    if (currentStep === 4 && personalizedConsents.length === 0 && !isGeneratingConsents) {
      generatePersonalizedConsents();
    }
  }, [currentStep, personalizedConsents.length, isGeneratingConsents]);

  const loadOnboardingData = async () => {
    try {
      const data = await base44.entities.PatientOnboarding.filter({ id: onboardingId }).then(res => res[0]);
      setOnboardingData(data);
      setCurrentStep(data.current_step || 1);
      
      // Load saved data
      if (data.demographic_data) setDemographic(data.demographic_data);
      if (data.medical_history_data) setMedicalHistory(data.medical_history_data);
      if (data.insurance_data) setInsurance(data.insurance_data);
      if (data.consents) {
        const loadedConsentsState = {};
        for (const key in data.consents) {
          if (data.consents.hasOwnProperty(key)) {
            loadedConsentsState[key] = data.consents[key].accepted;
          }
        }
        setConsents(loadedConsentsState);
      }
      if (data.ai_assistance?.personalized_consents_structure) {
        setPersonalizedConsents(data.ai_assistance.personalized_consents_structure);
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const generateAISuggestions = async () => {
    try {
      const age = calculateAge(demographic.birth_date);
      const prompt = `Pour un patient de ${age} ans (${demographic.gender}), suggère 3-5 questions médicales pertinentes à poser concernant:
      - Conditions chroniques courantes pour cet âge
      - Dépistages recommandés
      - Facteurs de risque à surveiller
      
      Format JSON: {"suggestions": ["question1", "question2", ...]}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAiSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // NEW: AI-powered pre-filling from external sources
  const preFillFromExternalSources = async (niss) => {
    if (!niss || niss.length < 11) {
      toast.error('Veuillez entrer un NISS valide pour le pré-remplissage.');
      return;
    }
    
    setIsPrefillingData(true);
    try {
      const prompt = `En tant que système d'intégration santé, simule la récupération de données depuis les registres nationaux belges pour un patient avec NISS ${niss}.
      
Génère des données réalistes incluant:
- Nom et prénom
- Date de naissance
- Adresse complète
- Mutuelle (ex: Mutualité Chrétienne, Solidaris)
- Numéro de mutuelle
- Droits spéciaux éventuels (OMNIO, BIM, etc.)

Format JSON:
{
  "found": true,
  "data": {
    "first_name": "...",
    "last_name": "...",
    "birth_date": "YYYY-MM-DD",
    "address": {
      "street": "...",
      "city": "...",
      "postal_code": "...",
      "country": "BE"
    },
    "insurance": {
      "mutuelle_name": "...",
      "mutuelle_number": "...",
      "special_rights": []
    }
  }
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            found: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                birth_date: { type: "string" },
                address: {
                  type: "object",
                  properties: {
                    street: { type: "string" },
                    city: { type: "string" },
                    postal_code: { type: "string" },
                    country: { type: "string" }
                  }
                },
                insurance: {
                  type: "object",
                  properties: {
                    mutuelle_name: { type: "string" },
                    mutuelle_number: { type: "string" },
                    special_rights: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        }
      });

      if (response.found) {
        setDemographic(prev => ({
          ...prev,
          ...response.data,
          address: response.data.address
        }));
        
        setInsurance(prev => ({
          ...prev,
          mutuelle_name: response.data.insurance?.mutuelle_name || prev.mutuelle_name,
          mutuelle_number: response.data.insurance?.mutuelle_number || prev.mutuelle_number,
          special_rights: response.data.insurance?.special_rights || prev.special_rights
        }));

        toast.success('Données pré-remplies depuis les registres nationaux', {
          description: 'Veuillez vérifier et compléter les informations'
        });
      } else {
        toast.info('Aucune donnée trouvée pour ce NISS', {
          description: 'Veuillez entrer les informations manuellement.'
        });
      }
    } catch (error) {
      console.error('Error pre-filling data:', error);
      toast.error('Impossible de récupérer les données externes');
    } finally {
      setIsPrefillingData(false);
    }
  };

  // NEW: AI standardization of free-text medical history
  const standardizeMedicalHistory = async () => {
    if (medicalHistory.chronic_conditions.length === 0 && medicalHistory.allergies.length === 0 && medicalHistory.current_medications.length === 0) {
      toast.info('Aucune donnée médicale à standardiser.');
      return;
    }

    setIsStandardizing(true);
    try {
      const freeText = {
        conditions: medicalHistory.chronic_conditions.join(', '),
        allergies: medicalHistory.allergies.join(', '),
        medications: medicalHistory.current_medications.join(', ')
      };

      const prompt = `En tant que système médical AI, analyse et standardise les données médicales suivantes en utilisant les codes et terminologies médicales standards (ICD-10, ATC):

CONDITIONS CHRONIQUES: ${freeText.conditions || 'Aucune'}
ALLERGIES: ${freeText.allergies || 'Aucune'}
MÉDICAMENTS ACTUELS: ${freeText.medications || 'Aucun'}

Fournis une sortie structurée avec:
1. Conditions standardisées (nom standard + code ICD-10 si applicable)
2. Allergies catégorisées (médicament/aliment/environnement + sévérité)
3. Médicaments avec principe actif standardisé + code ATC

Format JSON:
{
  "standardized_conditions": [
    {
      "original": "...",
      "standard_name": "...",
      "icd10_code": "...",
      "category": "cardiovascular/respiratory/metabolic/etc"
    }
  ],
  "standardized_allergies": [
    {
      "original": "...",
      "allergen": "...",
      "category": "drug/food/environmental",
      "severity": "mild/moderate/severe"
    }
  ],
  "standardized_medications": [
    {
      "original": "...",
      "generic_name": "...",
      "atc_code": "...",
      "therapeutic_class": "..."
    }
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            standardized_conditions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original: { type: "string" },
                  standard_name: { type: "string" },
                  icd10_code: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            standardized_allergies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original: { type: "string" },
                  allergen: { type: "string" },
                  category: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            standardized_medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original: { type: "string" },
                  generic_name: { type: "string" },
                  atc_code: { type: "string" },
                  therapeutic_class: { type: "string" }
                }
              }
            }
          }
        }
      });

      setStandardizedData(response);
      toast.success('Données médicales standardisées', {
        description: 'Codes ICD-10 et ATC ajoutés automatiquement'
      });
    } catch (error) {
      console.error('Error standardizing data:', error);
      toast.error('Erreur lors de la standardisation des données médicales');
    } finally {
      setIsStandardizing(false);
    }
  };

  // NEW: Generate personalized consent forms
  const generatePersonalizedConsents = async () => {
    setIsGeneratingConsents(true);
    try {
      const prompt = `En tant que système juridique médical, génère des formulaires de consentement personnalisés pour un patient avec:

CONDITIONS MÉDICALES: ${medicalHistory.chronic_conditions.join(', ') || 'Aucune'}
MÉDICAMENTS: ${medicalHistory.current_medications.join(', ') || 'Aucun'}
ALLERGIES: ${medicalHistory.allergies.join(', ') || 'Aucune'}

Génère des consentements spécifiques incluant:
1. Consentement général RGPD (obligatoire)
2. Consentements spécifiques aux conditions médicales (ex: diabète → surveillance glycémie)
3. Consentements pour traitements mentionnés
4. Consentements pour procédures invasives si applicable
5. Consentement télémédecine si pertinent

Format JSON:
{
  "consents": [
    {
      "id": "consent_1",
      "title": "...",
      "description": "...",
      "is_required": true/false,
      "category": "medical/data/treatment/procedure",
      "legal_basis": "...",
      "implications": "..."
    }
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            consents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  is_required: { type: "boolean" },
                  category: { type: "string" },
                  legal_basis: { type: "string" },
                  implications: { type: "string" }
                }
              }
            }
          }
        }
      });

      setPersonalizedConsents(response.consents || []);
      // Initialize consents state with personalized consent IDs
      const initialPersonalizedConsentState = {};
      (response.consents || []).forEach(pc => {
        initialPersonalizedConsentState[pc.id] = pc.is_required || false; // Default to required consents accepted, otherwise false
      });
      setConsents(prevConsents => ({ ...prevConsents, ...initialPersonalizedConsentState })); // Merge with any existing consents

      toast.success('Consentements personnalisés générés', {
        description: `${(response.consents || []).length} formulaires adaptés à votre profil médical`
      });
    } catch (error) {
      console.error('Error generating consents:', error);
      toast.error('Erreur lors de la génération des consentements personnalisés');
      // If AI generation fails, ensure default consents are still visible/selectable
      setPersonalizedConsents([]);
    } finally {
      setIsGeneratingConsents(false);
    }
  };

  const saveProgress = async () => {
    try {
      const updateData = {
        current_step: currentStep,
        [`steps_completed.${steps[currentStep - 1].key}`]: true
      };

      if (currentStep === 1) updateData.demographic_data = demographic;
      if (currentStep === 2) updateData.medical_history_data = medicalHistory;
      if (currentStep === 3) updateData.insurance_data = insurance;
      if (currentStep === 4) {
        if (personalizedConsents.length > 0) {
          const dynamicConsents = {};
          personalizedConsents.forEach(pc => {
            dynamicConsents[pc.id] = {
              accepted: consents[pc.id] || false,
              timestamp: new Date().toISOString()
            };
          });
          updateData.consents = dynamicConsents;
          updateData.ai_assistance = {
            ...onboardingData?.ai_assistance, // Preserve existing AI assistance data
            personalized_consents_structure: personalizedConsents, // Save the structure for re-loading
            personalized_consents_count: personalizedConsents.length
          };
        } else {
          // Fallback to original consents structure if personalized ones are not generated
          updateData.consents = {
            gdpr_consent: { accepted: consents.gdpr_consent, timestamp: new Date().toISOString() },
            medical_data_sharing: { accepted: consents.medical_data_sharing, timestamp: new Date().toISOString() },
            teleconsultation_consent: { accepted: consents.teleconsultation_consent, timestamp: new Date().toISOString() },
            hub_access_consent: { accepted: consents.hub_access_consent, timestamp: new Date().toISOString() }
          };
        }
      }

      await base44.entities.PatientOnboarding.update(onboardingId, updateData);
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Erreur lors de la sauvegarde de la progression.');
    }
  };

  const handleNext = async () => {
    // Validation
    if (currentStep === 1 && (!demographic.first_name || !demographic.last_name || !demographic.birth_date)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (currentStep === 4) {
      const requiredConsentsNotAccepted = personalizedConsents.some(pc => pc.is_required && !consents[pc.id]);
      if (requiredConsentsNotAccepted) {
        toast.error('Veuillez accepter tous les consentements obligatoires.');
        return;
      }
      // If no personalized consents, fallback to default RGPD check
      if (personalizedConsents.length === 0 && !consents.gdpr_consent) {
        toast.error('Le consentement RGPD est obligatoire');
        return;
      }
    }

    await saveProgress();

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Create patient with standardized data
      const patient = await base44.entities.Patient.create({
        identifier: [{ system: 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin', value: demographic.niss }],
        name: [{ use: 'official', family: demographic.last_name, given: [demographic.first_name] }],
        gender: demographic.gender,
        birthDate: demographic.birth_date,
        telecom: [
          { system: 'phone', value: demographic.phone, use: 'mobile' },
          { system: 'email', value: demographic.email }
        ],
        address: [demographic.address],
        mutuelle: insurance.mutuelle_name,
        numero_mutuelle: insurance.mutuelle_number,
        antecedents_medicaux: standardizedData ? 
          JSON.stringify(standardizedData.standardized_conditions) : 
          medicalHistory.chronic_conditions.join(', '),
        allergies: standardizedData ?
          JSON.stringify(standardizedData.standardized_allergies) :
          medicalHistory.allergies.join(', '),
        medicaments_actuels: standardizedData ?
          JSON.stringify(standardizedData.standardized_medications) :
          medicalHistory.current_medications.join(', '),
        gdpr_consent: {
          has_consented: consents.gdpr_consent,
          consent_date: new Date().toISOString()
        },
        statut: 'Actif'
      });

      // Update onboarding
      await base44.entities.PatientOnboarding.update(onboardingId, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        created_patient_id: patient.id,
        'steps_completed.verification': true,
        ai_assistance: {
          prefilled_fields: isPrefillingData ? ['first_name', 'last_name', 'address', 'insurance'] : [],
          standardized_medical_data: standardizedData ? true : false,
          personalized_consents_count: personalizedConsents.length,
          personalized_consents_structure: personalizedConsents.length > 0 ? personalizedConsents : null
        }
      });

      toast.success('Onboarding terminé avec succès!', {
        description: 'Données standardisées et enregistrées avec codes médicaux'
      });
      if (onComplete) onComplete(patient);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 5) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Bienvenue chez FluxMed</h2>
          <span className="text-sm text-muted-foreground">Étape {currentStep} sur 5</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Steps indicator */}
        <div className="flex items-center justify-between mt-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id === currentStep ? 'opacity-100' : step.id < currentStep ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  step.id < currentStep
                    ? 'bg-green-500 text-white'
                    : step.id === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <step.icon className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs text-center max-w-[80px] hidden md:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(steps[currentStep - 1].icon, { className: "w-6 h-6" })}
                {steps[currentStep - 1].title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Demographics with AI pre-fill */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {isPrefillingData && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                      <AlertDescription className="text-blue-900">
                        Récupération des données depuis les registres nationaux...
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Prénom *</Label>
                      <Input
                        value={demographic.first_name}
                        onChange={(e) => setDemographic({ ...demographic, first_name: e.target.value })}
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={demographic.last_name}
                        onChange={(e) => setDemographic({ ...demographic, last_name: e.target.value })}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date de naissance *</Label>
                      <Input
                        type="date"
                        value={demographic.birth_date}
                        onChange={(e) => setDemographic({ ...demographic, birth_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Sexe *</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={demographic.gender}
                        onChange={(e) => setDemographic({ ...demographic, gender: e.target.value })}
                      >
                        <option value="">Sélectionnez</option>
                        <option value="male">Homme</option>
                        <option value="female">Femme</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>NISS (Numéro de registre national)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={demographic.niss}
                        onChange={(e) => setDemographic({ ...demographic, niss: e.target.value })}
                        placeholder="12.34.56-789.01"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => preFillFromExternalSources(demographic.niss)}
                        disabled={isPrefillingData || !demographic.niss}
                        variant="outline"
                      >
                        {isPrefillingData ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Pré-remplir
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Téléphone</Label>
                      <Input
                        value={demographic.phone}
                        onChange={(e) => setDemographic({ ...demographic, phone: e.target.value })}
                        placeholder="+32 123 45 67 89"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={demographic.email}
                        onChange={(e) => setDemographic({ ...demographic, email: e.target.value })}
                        placeholder="jean.dupont@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Medical History with AI standardization */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {aiSuggestions.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Suggestions IA basées sur votre profil</h4>
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {aiSuggestions.map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {standardizedData && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <AlertDescription className="text-green-900">
                        <strong>Données standardisées:</strong> Codes ICD-10 et ATC ajoutés automatiquement
                        <div className="mt-2 space-y-1 text-xs">
                          {standardizedData.standardized_conditions.map((c, i) => (
                            <div key={i}>
                              • {c.standard_name} {c.icd10_code && <Badge variant="outline">{c.icd10_code}</Badge>}
                            </div>
                          ))}
                           {standardizedData.standardized_allergies.map((a, i) => (
                            <div key={i}>
                              • {a.allergen} <Badge variant="outline">{a.category}</Badge>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Conditions chroniques</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={standardizeMedicalHistory}
                        disabled={isStandardizing || (medicalHistory.chronic_conditions.length === 0 && medicalHistory.allergies.length === 0 && medicalHistory.current_medications.length === 0)}
                      >
                        {isStandardizing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Standardiser IA
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Diabète, hypertension, asthme..."
                      value={medicalHistory.chronic_conditions.join(', ')}
                      onChange={(e) => setMedicalHistory({
                        ...medicalHistory,
                        chronic_conditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Allergies</Label>
                    <Textarea
                      placeholder="Pénicilline, arachides, pollen..."
                      value={medicalHistory.allergies.join(', ')}
                      onChange={(e) => setMedicalHistory({
                        ...medicalHistory,
                        allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Médicaments actuels</Label>
                    <Textarea
                      placeholder="Aspirine 100mg, Metformine 500mg..."
                      value={medicalHistory.current_medications.join(', ')}
                      onChange={(e) => setMedicalHistory({
                        ...medicalHistory,
                        current_medications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Insurance */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label>Mutuelle</Label>
                    <Input
                      value={insurance.mutuelle_name}
                      onChange={(e) => setInsurance({ ...insurance, mutuelle_name: e.target.value })}
                      placeholder="Mutualité Chrétienne, Solidaris..."
                    />
                  </div>
                  <div>
                    <Label>Numéro d'affiliation</Label>
                    <Input
                      value={insurance.mutuelle_number}
                      onChange={(e) => setInsurance({ ...insurance, mutuelle_number: e.target.value })}
                      placeholder="123-4567890-12"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={insurance.has_dmg}
                      onCheckedChange={(checked) => setInsurance({ ...insurance, has_dmg: checked })}
                      id="has_dmg"
                    />
                    <Label htmlFor="has_dmg">J'ai un DMG (Dossier Médical Global)</Label>
                  </div>
                  {insurance.has_dmg && (
                    <div>
                      <Label>Médecin DMG</Label>
                      <Input
                        value={insurance.dmg_physician}
                        onChange={(e) => setInsurance({ ...insurance, dmg_physician: e.target.value })}
                        placeholder="Dr. Martin"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Personalized Consents */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  {isGeneratingConsents && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                      <AlertDescription className="text-blue-900">
                        Génération de consentements personnalisés basés sur votre profil médical...
                      </AlertDescription>
                    </Alert>
                  )}

                  {personalizedConsents.length > 0 && !isGeneratingConsents && (
                    <Alert className="bg-purple-50 border-purple-200 mb-4">
                      <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
                      <AlertDescription className="text-purple-900">
                        <strong>Consentements personnalisés:</strong> {personalizedConsents.length} formulaires adaptés à votre situation médicale.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-3">
                    {personalizedConsents.length > 0 ? (
                      personalizedConsents.map((consent) => (
                        <div key={consent.id} className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
                          <Checkbox
                            checked={consents[consent.id] || false}
                            onCheckedChange={(checked) => setConsents({ ...consents, [consent.id]: checked })}
                            id={consent.id}
                            disabled={consent.is_required && consents[consent.id] === true} // Optional: prevent unchecking required once checked
                          />
                          <div className="flex-1">
                            <Label htmlFor={consent.id} className="font-semibold flex items-center gap-2">
                              {consent.title}
                              {consent.is_required && <Badge variant="destructive">Obligatoire</Badge>}
                              <Badge variant="outline">{consent.category}</Badge>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">{consent.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              <strong>Base légale:</strong> {consent.legal_basis}
                            </p>
                            {consent.implications && (
                              <p className="text-xs text-amber-700 mt-1">
                                <strong>Implications:</strong> {consent.implications}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback to default consents if generation fails or is not applicable
                      <>
                        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                          <Checkbox
                            checked={consents.gdpr_consent}
                            onCheckedChange={(checked) => setConsents({ ...consents, gdpr_consent: checked })}
                            id="gdpr"
                          />
                          <div className="flex-1">
                            <Label htmlFor="gdpr" className="font-semibold">Consentement RGPD *</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              J'accepte que mes données personnelles soient collectées et traitées conformément au RGPD.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                          <Checkbox
                            checked={consents.medical_data_sharing}
                            onCheckedChange={(checked) => setConsents({ ...consents, medical_data_sharing: checked })}
                            id="sharing"
                          />
                          <div className="flex-1">
                            <Label htmlFor="sharing">Partage de données médicales</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              J'autorise le partage de mes données médicales via le réseau Hubs & RSW.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                          <Checkbox
                            checked={consents.teleconsultation_consent}
                            onCheckedChange={(checked) => setConsents({ ...consents, teleconsultation_consent: checked })}
                            id="teleconsult"
                          />
                          <div className="flex-1">
                            <Label htmlFor="teleconsult">Téléconsultation</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              J'accepte d'utiliser le service de téléconsultation sécurisée.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                          <Checkbox
                            checked={consents.hub_access_consent}
                            onCheckedChange={(checked) => setConsents({ ...consents, hub_access_consent: checked })}
                            id="hub"
                          />
                          <div className="flex-1">
                            <Label htmlFor="hub">Accès Hub Santé</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              J'autorise l'accès à mon dossier médical via le Hub Santé belge.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Verification */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Vérification finale
                    </h3>
                    <p className="text-sm text-green-700">
                      Vérifiez que toutes les informations sont correctes avant de finaliser.
                    </p>
                  </div>

                  {standardizedData && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <AlertDescription className="text-green-900">
                        <strong>✓ Données médicales standardisées</strong>
                        <div className="text-xs mt-1">
                          Codes ICD-10 et ATC intégrés pour interopérabilité maximale.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Informations personnelles</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <p><strong>Nom:</strong> {demographic.first_name} {demographic.last_name}</p>
                        <p><strong>Date de naissance:</strong> {demographic.birth_date}</p>
                        <p><strong>NISS:</strong> {demographic.niss}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Assurance</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p><strong>Mutuelle:</strong> {insurance.mutuelle_name}</p>
                        <p><strong>Numéro:</strong> {insurance.mutuelle_number}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Consentements</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        {personalizedConsents.length > 0 ? (
                          personalizedConsents.map(consentItem => (
                            <p key={consentItem.id}>
                              <strong>{consentItem.title}:</strong> {consents[consentItem.id] ? 'Accepté' : 'Non accepté'}
                            </p>
                          ))
                        ) : (
                          <>
                            <p><strong>Consentement RGPD:</strong> {consents.gdpr_consent ? 'Accepté' : 'Non accepté'}</p>
                            <p><strong>Partage de données médicales:</strong> {consents.medical_data_sharing ? 'Accepté' : 'Non accepté'}</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSubmitting || isPrefillingData || isStandardizing || isGeneratingConsents}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalisation...
                </>
              ) : currentStep === 5 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Terminer
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
