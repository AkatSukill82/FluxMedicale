import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Heart,
  AlertTriangle,
  Pill,
  Scissors,
  Users,
  Calendar,
  Trash2,
  Edit,
  Loader2,
  Activity,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  maladie_passee: { label: 'Maladie passée', icon: Activity, color: 'bg-blue-100 text-blue-700' },
  maladie_chronique: { label: 'Maladie chronique', icon: Heart, color: 'bg-purple-100 text-purple-700' },
  allergie: { label: 'Allergie', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  chirurgie: { label: 'Chirurgie', icon: Scissors, color: 'bg-orange-100 text-orange-700' },
  antecedent_familial: { label: 'Antécédent familial', icon: Users, color: 'bg-green-100 text-green-700' }
};

const SEVERITY_CONFIG = {
  legere: { label: 'Légère', color: 'bg-yellow-100 text-yellow-700' },
  moderee: { label: 'Modérée', color: 'bg-orange-100 text-orange-700' },
  severe: { label: 'Sévère', color: 'bg-red-100 text-red-700' },
  critique: { label: 'Critique', color: 'bg-red-200 text-red-800' }
};

const FAMILY_MEMBERS = {
  pere: 'Père', mere: 'Mère', frere: 'Frère', soeur: 'Sœur',
  grand_parent_paternel: 'Grand-parent paternel', grand_parent_maternel: 'Grand-parent maternel',
  oncle_tante: 'Oncle/Tante', autre: 'Autre'
};

export default function MedicalHistoryPanel({ patientId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['medicalHistory', patientId],
    queryFn: () => base44.entities.MedicalHistory.filter({ patient_id: patientId }, '-created_date'),
    enabled: !!patientId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalHistory.create({ ...data, patient_id: patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('Antécédent ajouté');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MedicalHistory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('Antécédent mis à jour');
      setEditingRecord(null);
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MedicalHistory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('Antécédent supprimé');
    }
  });

  const filteredRecords = activeTab === 'all' 
    ? records 
    : records.filter(r => r.type === activeTab);

  const allergies = records.filter(r => r.type === 'allergie');
  const chronicConditions = records.filter(r => r.type === 'maladie_chronique' && r.is_active);

  return (
    <div className="space-y-4">
      {/* Alertes importantes */}
      {(allergies.length > 0 || chronicConditions.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {allergies.filter(a => a.severity === 'severe' || a.severity === 'critique').map(a => (
                <Badge key={a.id} variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {a.title}
                </Badge>
              ))}
              {chronicConditions.map(c => (
                <Badge key={c.id} className="bg-purple-600 gap-1">
                  <Heart className="w-3 h-3" />
                  {c.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold">Antécédents médicaux</h3>
        <Button onClick={() => { setEditingRecord(null); setShowForm(true); }} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">Tout ({records.length})</TabsTrigger>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => {
            const count = records.filter(r => r.type === key).length;
            return (
              <TabsTrigger key={key} value={key} className="text-xs gap-1">
                <config.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{config.label}</span>
                ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-muted-foreground">Aucun antécédent enregistré</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredRecords.map(record => {
                const config = TYPE_CONFIG[record.type];
                const Icon = config?.icon || Activity;
                
                return (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config?.color || 'bg-slate-100'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{record.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{config?.label}</Badge>
                                {record.severity && (
                                  <Badge className={`text-xs ${SEVERITY_CONFIG[record.severity]?.color}`}>
                                    {SEVERITY_CONFIG[record.severity]?.label}
                                  </Badge>
                                )}
                                {record.is_active && record.type !== 'antecedent_familial' && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Actif</Badge>
                                )}
                                {record.family_member && (
                                  <Badge variant="outline" className="text-xs">
                                    {FAMILY_MEMBERS[record.family_member]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => { setEditingRecord(record); setShowForm(true); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => deleteMutation.mutate(record.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {record.description && (
                            <p className="text-sm text-muted-foreground mt-2">{record.description}</p>
                          )}
                          
                          {record.reaction && (
                            <p className="text-sm mt-1"><span className="font-medium">Réaction:</span> {record.reaction}</p>
                          )}
                          
                          {record.date_onset && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(record.date_onset), 'dd MMMM yyyy', { locale: fr })}
                              {record.date_end && ` → ${format(new Date(record.date_end), 'dd MMM yyyy', { locale: fr })}`}
                            </p>
                          )}
                          
                          {record.notes && (
                            <p className="text-xs text-slate-500 mt-2 italic">{record.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <MedicalHistoryForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingRecord(null); }}
        record={editingRecord}
        onSave={(data) => {
          if (editingRecord) {
            updateMutation.mutate({ id: editingRecord.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function MedicalHistoryForm({ isOpen, onClose, record, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    type: 'maladie_passee',
    title: '',
    description: '',
    date_onset: '',
    date_end: '',
    is_active: true,
    severity: '',
    allergen_type: '',
    reaction: '',
    family_member: '',
    surgery_type: '',
    hospital: '',
    icd10_code: '',
    notes: ''
  });

  React.useEffect(() => {
    if (record) {
      setFormData({
        type: record.type || 'maladie_passee',
        title: record.title || '',
        description: record.description || '',
        date_onset: record.date_onset || '',
        date_end: record.date_end || '',
        is_active: record.is_active ?? true,
        severity: record.severity || '',
        allergen_type: record.allergen_type || '',
        reaction: record.reaction || '',
        family_member: record.family_member || '',
        surgery_type: record.surgery_type || '',
        hospital: record.hospital || '',
        icd10_code: record.icd10_code || '',
        notes: record.notes || ''
      });
    } else {
      setFormData({
        type: 'maladie_passee', title: '', description: '', date_onset: '', date_end: '',
        is_active: true, severity: '', allergen_type: '', reaction: '', family_member: '',
        surgery_type: '', hospital: '', icd10_code: '', notes: ''
      });
    }
  }, [record, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
    );
    onSave(cleanData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>{record ? 'Modifier' : 'Ajouter'} un antécédent</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Titre/Nom *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Diabète type 2, Pénicilline..."
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date début/diagnostic</Label>
                <Input
                  type="date"
                  value={formData.date_onset}
                  onChange={(e) => setFormData({ ...formData, date_onset: e.target.value })}
                />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={formData.date_end}
                  onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                />
              </div>
            </div>

            {/* Champs spécifiques allergies */}
            {formData.type === 'allergie' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sévérité</Label>
                    <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type d'allergène</Label>
                    <Select value={formData.allergen_type} onValueChange={(v) => setFormData({ ...formData, allergen_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medicament">Médicament</SelectItem>
                        <SelectItem value="alimentaire">Alimentaire</SelectItem>
                        <SelectItem value="environnemental">Environnemental</SelectItem>
                        <SelectItem value="contact">Contact</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Réaction</Label>
                  <Input
                    value={formData.reaction}
                    onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                    placeholder="Ex: Urticaire, anaphylaxie..."
                  />
                </div>
              </>
            )}

            {/* Champs spécifiques antécédents familiaux */}
            {formData.type === 'antecedent_familial' && (
              <div>
                <Label>Membre de la famille</Label>
                <Select value={formData.family_member} onValueChange={(v) => setFormData({ ...formData, family_member: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FAMILY_MEMBERS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Champs spécifiques chirurgie */}
            {formData.type === 'chirurgie' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hôpital/Clinique</Label>
                  <Input
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Code ICD-10</Label>
                  <Input
                    value={formData.icd10_code}
                    onChange={(e) => setFormData({ ...formData, icd10_code: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={isLoading || !formData.title}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {record ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}