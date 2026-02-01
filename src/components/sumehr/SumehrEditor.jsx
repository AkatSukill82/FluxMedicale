import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Upload,
  CheckCircle,
  AlertTriangle,
  Pill,
  Heart,
  Syringe,
  Users,
  Activity,
  X,
  Send,
  History,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SumehrEditor({ patient, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('problems');
  
  const patientNiss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';

  // Charger le Sumehr existant
  const { data: existingSumehr, isLoading } = useQuery({
    queryKey: ['sumehr', patient?.id],
    queryFn: async () => {
      const sumehrs = await base44.entities.Sumehr.filter({ patient_id: patient.id });
      return sumehrs.sort((a, b) => b.version - a.version)[0] || null;
    },
    enabled: !!patient?.id
  });

  // Charger l'historique médical du patient
  const { data: medicalHistory = [] } = useQuery({
    queryKey: ['medicalHistory', patient?.id],
    queryFn: () => base44.entities.MedicalHistory.filter({ patient_id: patient.id }),
    enabled: !!patient?.id
  });

  // Charger les prescriptions actives
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions', patient?.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }),
    enabled: !!patient?.id
  });

  // Charger les vaccinations
  const { data: vaccinations = [] } = useQuery({
    queryKey: ['vaccinations', patient?.id],
    queryFn: () => base44.entities.Vaccination.filter({ patient_id: patient.id }),
    enabled: !!patient?.id
  });

  const [formData, setFormData] = useState({
    active_problems: [],
    inactive_problems: [],
    allergies: [],
    current_medications: [],
    vaccinations: [],
    surgical_history: [],
    social_history: {
      smoking: '',
      alcohol: '',
      occupation: ''
    },
    family_history: [],
    care_team: [],
    notes: ''
  });

  // Pré-remplir avec les données existantes
  useEffect(() => {
    if (existingSumehr) {
      setFormData({
        active_problems: existingSumehr.active_problems || [],
        inactive_problems: existingSumehr.inactive_problems || [],
        allergies: existingSumehr.allergies || [],
        current_medications: existingSumehr.current_medications || [],
        vaccinations: existingSumehr.vaccinations || [],
        surgical_history: existingSumehr.surgical_history || [],
        social_history: existingSumehr.social_history || { smoking: '', alcohol: '', occupation: '' },
        family_history: existingSumehr.family_history || [],
        care_team: existingSumehr.care_team || [],
        notes: existingSumehr.notes || ''
      });
    } else {
      // Pré-remplir depuis les données du patient
      const problems = medicalHistory.filter(h => h.type === 'maladie_chronique' && h.is_active);
      const allergies = medicalHistory.filter(h => h.type === 'allergie');
      
      setFormData(prev => ({
        ...prev,
        active_problems: problems.map(p => ({
          code: p.icd10_code || '',
          description: p.title,
          since: p.date_onset,
          certainty: 'confirmed'
        })),
        allergies: allergies.map(a => ({
          substance: a.title,
          type: a.allergen_type || 'other',
          severity: a.severity || 'moderate',
          reaction: a.reaction || ''
        })),
        vaccinations: vaccinations.map(v => ({
          name: v.vaccine_name,
          date: v.vaccination_date,
          lot: v.lot_number,
          administrator: v.administered_by
        }))
      }));
    }
  }, [existingSumehr, medicalHistory, vaccinations]);

  // Sauvegarder le Sumehr
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const sumehrData = {
        patient_id: patient.id,
        patient_niss: patientNiss,
        version: existingSumehr ? existingSumehr.version + 1 : 1,
        status: 'draft',
        ...data,
        author_email: user.email,
        author_nihii: user.numero_inami || user.nihii
      };

      if (existingSumehr) {
        return base44.entities.Sumehr.update(existingSumehr.id, sumehrData);
      } else {
        return base44.entities.Sumehr.create(sumehrData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sumehr'] });
      toast.success('Sumehr sauvegardé');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  });

  // Publier sur le Hub
  const publishMutation = useMutation({
    mutationFn: async (hub) => {
      // D'abord sauvegarder
      const user = await base44.auth.me();
      const sumehrData = {
        patient_id: patient.id,
        patient_niss: patientNiss,
        version: existingSumehr ? existingSumehr.version + 1 : 1,
        status: 'published',
        hub_target: hub,
        published_at: new Date().toISOString(),
        ...formData,
        author_email: user.email,
        author_nihii: user.numero_inami || user.nihii
      };

      // Simuler l'envoi au Hub
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (existingSumehr) {
        return base44.entities.Sumehr.update(existingSumehr.id, sumehrData);
      } else {
        return base44.entities.Sumehr.create(sumehrData);
      }
    },
    onSuccess: (_, hub) => {
      queryClient.invalidateQueries({ queryKey: ['sumehr'] });
      toast.success(`Sumehr publié sur ${hub}`);
    },
    onError: () => toast.error('Erreur lors de la publication')
  });

  // Ajouter un élément à une liste
  const addItem = (field, defaultItem) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], defaultItem]
    }));
  };

  // Supprimer un élément
  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Mettre à jour un élément
  const updateItem = (field, index, updates) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? { ...item, ...updates } : item)
    }));
  };

  const patientName = patient?.name?.[0] 
    ? `${(patient.name[0].given || []).join(' ')} ${patient.name[0].family || ''}`
    : 'Patient';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Sumehr - {patientName}</CardTitle>
                <CardDescription>
                  Dossier médical résumé • Version {existingSumehr?.version || 1}
                  {existingSumehr?.status === 'published' && (
                    <Badge className="ml-2 bg-green-100 text-green-700">
                      Publié sur {existingSumehr.hub_target}
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="problems" className="gap-2">
                <Activity className="w-4 h-4" />
                Problèmes
              </TabsTrigger>
              <TabsTrigger value="allergies" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Allergies
              </TabsTrigger>
              <TabsTrigger value="medications" className="gap-2">
                <Pill className="w-4 h-4" />
                Médicaments
              </TabsTrigger>
              <TabsTrigger value="vaccinations" className="gap-2">
                <Syringe className="w-4 h-4" />
                Vaccinations
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                Antécédents
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="w-4 h-4" />
                Équipe soins
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              {/* Problèmes actifs */}
              <TabsContent value="problems" className="m-0 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Problèmes actifs</Label>
                    <Button size="sm" variant="outline" onClick={() => addItem('active_problems', {
                      code: '', description: '', since: '', certainty: 'confirmed'
                    })}>
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.active_problems.map((problem, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Input
                          placeholder="Code ICD-10"
                          className="w-24"
                          value={problem.code}
                          onChange={(e) => updateItem('active_problems', idx, { code: e.target.value })}
                        />
                        <Input
                          placeholder="Description"
                          className="flex-1"
                          value={problem.description}
                          onChange={(e) => updateItem('active_problems', idx, { description: e.target.value })}
                        />
                        <Input
                          type="date"
                          className="w-40"
                          value={problem.since}
                          onChange={(e) => updateItem('active_problems', idx, { since: e.target.value })}
                        />
                        <Select value={problem.certainty} onValueChange={(v) => updateItem('active_problems', idx, { certainty: v })}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmé</SelectItem>
                            <SelectItem value="probable">Probable</SelectItem>
                            <SelectItem value="suspected">Suspecté</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" onClick={() => removeItem('active_problems', idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    {formData.active_problems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun problème actif</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Problèmes résolus</Label>
                    <Button size="sm" variant="outline" onClick={() => addItem('inactive_problems', {
                      code: '', description: '', resolved_date: ''
                    })}>
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.inactive_problems.map((problem, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                        <Input
                          placeholder="Code"
                          className="w-24"
                          value={problem.code}
                          onChange={(e) => updateItem('inactive_problems', idx, { code: e.target.value })}
                        />
                        <Input
                          placeholder="Description"
                          className="flex-1"
                          value={problem.description}
                          onChange={(e) => updateItem('inactive_problems', idx, { description: e.target.value })}
                        />
                        <Input
                          type="date"
                          placeholder="Date résolution"
                          className="w-40"
                          value={problem.resolved_date}
                          onChange={(e) => updateItem('inactive_problems', idx, { resolved_date: e.target.value })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeItem('inactive_problems', idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Allergies */}
              <TabsContent value="allergies" className="m-0">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Allergies & Intolérances</Label>
                  <Button size="sm" variant="outline" onClick={() => addItem('allergies', {
                    substance: '', type: 'medication', severity: 'moderate', reaction: ''
                  })}>
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.allergies.map((allergy, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <Input
                        placeholder="Substance"
                        className="flex-1"
                        value={allergy.substance}
                        onChange={(e) => updateItem('allergies', idx, { substance: e.target.value })}
                      />
                      <Select value={allergy.type} onValueChange={(v) => updateItem('allergies', idx, { type: v })}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medication">Médicament</SelectItem>
                          <SelectItem value="food">Alimentaire</SelectItem>
                          <SelectItem value="environmental">Environnemental</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={allergy.severity} onValueChange={(v) => updateItem('allergies', idx, { severity: v })}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Légère</SelectItem>
                          <SelectItem value="moderate">Modérée</SelectItem>
                          <SelectItem value="severe">Sévère</SelectItem>
                          <SelectItem value="life_threatening">Vitale</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Réaction"
                        className="w-40"
                        value={allergy.reaction}
                        onChange={(e) => updateItem('allergies', idx, { reaction: e.target.value })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeItem('allergies', idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {formData.allergies.length === 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Aucune allergie connue
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* Médicaments */}
              <TabsContent value="medications" className="m-0">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Médicaments en cours</Label>
                  <Button size="sm" variant="outline" onClick={() => addItem('current_medications', {
                    name: '', cnk: '', posology: '', since: ''
                  })}>
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.current_medications.map((med, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Input
                        placeholder="Nom du médicament"
                        className="flex-1"
                        value={med.name}
                        onChange={(e) => updateItem('current_medications', idx, { name: e.target.value })}
                      />
                      <Input
                        placeholder="CNK"
                        className="w-24"
                        value={med.cnk}
                        onChange={(e) => updateItem('current_medications', idx, { cnk: e.target.value })}
                      />
                      <Input
                        placeholder="Posologie"
                        className="w-40"
                        value={med.posology}
                        onChange={(e) => updateItem('current_medications', idx, { posology: e.target.value })}
                      />
                      <Input
                        type="date"
                        className="w-36"
                        value={med.since}
                        onChange={(e) => updateItem('current_medications', idx, { since: e.target.value })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeItem('current_medications', idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Vaccinations */}
              <TabsContent value="vaccinations" className="m-0">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Vaccinations</Label>
                  <Button size="sm" variant="outline" onClick={() => addItem('vaccinations', {
                    name: '', date: '', lot: '', administrator: ''
                  })}>
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.vaccinations.map((vax, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                      <Input
                        placeholder="Vaccin"
                        className="flex-1"
                        value={vax.name}
                        onChange={(e) => updateItem('vaccinations', idx, { name: e.target.value })}
                      />
                      <Input
                        type="date"
                        className="w-36"
                        value={vax.date}
                        onChange={(e) => updateItem('vaccinations', idx, { date: e.target.value })}
                      />
                      <Input
                        placeholder="N° lot"
                        className="w-28"
                        value={vax.lot}
                        onChange={(e) => updateItem('vaccinations', idx, { lot: e.target.value })}
                      />
                      <Input
                        placeholder="Administrateur"
                        className="w-40"
                        value={vax.administrator}
                        onChange={(e) => updateItem('vaccinations', idx, { administrator: e.target.value })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeItem('vaccinations', idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Antécédents */}
              <TabsContent value="history" className="m-0 space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Antécédents chirurgicaux</Label>
                  <div className="flex items-center justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={() => addItem('surgical_history', {
                      procedure: '', date: '', hospital: ''
                    })}>
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.surgical_history.map((surg, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                        <Input
                          placeholder="Intervention"
                          className="flex-1"
                          value={surg.procedure}
                          onChange={(e) => updateItem('surgical_history', idx, { procedure: e.target.value })}
                        />
                        <Input
                          type="date"
                          className="w-36"
                          value={surg.date}
                          onChange={(e) => updateItem('surgical_history', idx, { date: e.target.value })}
                        />
                        <Input
                          placeholder="Hôpital"
                          className="w-40"
                          value={surg.hospital}
                          onChange={(e) => updateItem('surgical_history', idx, { hospital: e.target.value })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeItem('surgical_history', idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Contexte social</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Tabac</Label>
                      <Input
                        placeholder="Ex: Non-fumeur, Ex-fumeur..."
                        value={formData.social_history.smoking}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_history: { ...prev.social_history, smoking: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Alcool</Label>
                      <Input
                        placeholder="Ex: Occasionnel..."
                        value={formData.social_history.alcohol}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_history: { ...prev.social_history, alcohol: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Profession</Label>
                      <Input
                        placeholder="Profession"
                        value={formData.social_history.occupation}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_history: { ...prev.social_history, occupation: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Antécédents familiaux</Label>
                  <div className="flex items-center justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={() => addItem('family_history', {
                      relation: '', condition: ''
                    })}>
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.family_history.map((fam, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                        <Select value={fam.relation} onValueChange={(v) => updateItem('family_history', idx, { relation: v })}>
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Lien" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pere">Père</SelectItem>
                            <SelectItem value="mere">Mère</SelectItem>
                            <SelectItem value="frere">Frère</SelectItem>
                            <SelectItem value="soeur">Sœur</SelectItem>
                            <SelectItem value="grand_parent">Grand-parent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Pathologie"
                          className="flex-1"
                          value={fam.condition}
                          onChange={(e) => updateItem('family_history', idx, { condition: e.target.value })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeItem('family_history', idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Équipe de soins */}
              <TabsContent value="team" className="m-0">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Équipe de soins</Label>
                  <Button size="sm" variant="outline" onClick={() => addItem('care_team', {
                    role: '', name: '', nihii: '', specialty: ''
                  })}>
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.care_team.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <Select value={member.role} onValueChange={(v) => updateItem('care_team', idx, { role: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gp">Médecin traitant</SelectItem>
                          <SelectItem value="specialist">Spécialiste</SelectItem>
                          <SelectItem value="nurse">Infirmier(e)</SelectItem>
                          <SelectItem value="pharmacist">Pharmacien</SelectItem>
                          <SelectItem value="physio">Kinésithérapeute</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Nom"
                        className="flex-1"
                        value={member.name}
                        onChange={(e) => updateItem('care_team', idx, { name: e.target.value })}
                      />
                      <Input
                        placeholder="NIHII"
                        className="w-32"
                        value={member.nihii}
                        onChange={(e) => updateItem('care_team', idx, { nihii: e.target.value })}
                      />
                      <Input
                        placeholder="Spécialité"
                        className="w-36"
                        value={member.specialty}
                        onChange={(e) => updateItem('care_team', idx, { specialty: e.target.value })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeItem('care_team', idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Textarea
              placeholder="Notes..."
              className="w-64 h-10"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              variant="outline"
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder brouillon
            </Button>
            <Select onValueChange={(hub) => publishMutation.mutate(hub)}>
              <SelectTrigger className="w-48 bg-blue-600 text-white hover:bg-blue-700">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Publier sur Hub</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RSW">Réseau Santé Wallon</SelectItem>
                <SelectItem value="VITALINK">Vitalink (Flandre)</SelectItem>
                <SelectItem value="COZO">CoZo/Abrumet (Bruxelles)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}