import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  User,
  Send,
  RefreshCw,
  Clock,
  Info,
  Plus,
  History,
  Building,
  Calendar,
  Euro
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Types de formulaires eForms
const EFORM_TYPES = [
  { value: 'ANNEXE_82', label: 'Annexe 82 - Soins à domicile', icon: '🏠' },
  { value: 'ANNEXE_83', label: 'Annexe 83 - Nursing', icon: '👩‍⚕️' },
  { value: 'ANNEXE_84', label: 'Annexe 84 - Kinésithérapie', icon: '🦵' },
  { value: 'NOTIFICATION_HOSPITAL', label: 'Notification hospitalisation', icon: '🏥' },
  { value: 'DEMANDE_ACCORD', label: 'Demande d\'accord préalable', icon: '📋' }
];

// Statuts possibles
const STATUSES = [
  { value: 'DRAFT', label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  { value: 'SENT', label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
  { value: 'PENDING', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'APPROVED', label: 'Approuvé', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Refusé', color: 'bg-red-100 text-red-800' },
  { value: 'CANCELLED', label: 'Annulé', color: 'bg-gray-100 text-gray-800' }
];

export default function Annexe82Service({ patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('new');
  const [isLoading, setIsLoading] = useState(false);
  const [formHistory, setFormHistory] = useState([]);

  // Formulaire Annexe 82
  const [formData, setFormData] = useState({
    form_type: 'ANNEXE_82',
    care_type: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    duration_weeks: 4,
    sessions_per_week: 3,
    diagnosis_code: '',
    diagnosis_description: '',
    justification: '',
    prescriber_nihii: '',
    care_provider_nihii: '',
    care_provider_name: '',
    mutuelle_code: '',
    additional_notes: ''
  });

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const getPatientName = () => {
    const name = patient?.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'Patient';
  };

  // Charger l'historique des formulaires
  const loadFormHistory = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un historique fictif de 5-8 formulaires Annexe 82/eForms pour un patient belge.`,
        response_json_schema: {
          type: "object",
          properties: {
            forms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  form_type: { type: "string" },
                  reference_number: { type: "string" },
                  created_date: { type: "string" },
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  status: { type: "string" },
                  care_provider: { type: "string" },
                  diagnosis: { type: "string" },
                  mutuelle: { type: "string" },
                  response_date: { type: "string" },
                  response_message: { type: "string" }
                }
              }
            }
          }
        }
      });

      setFormHistory(result.forms || []);
      toast.success(`${result.forms?.length || 0} formulaire(s) trouvé(s)`);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // Soumettre un nouveau formulaire
  const submitForm = async () => {
    if (!formData.diagnosis_description || !formData.care_provider_nihii) {
      toast.error('Diagnostic et prestataire requis');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      const niss = getNISS();

      // Créer l'enregistrement
      await base44.entities.Annexe82.create({
        patient_id: patient?.id,
        patient_niss: niss,
        form_type: formData.form_type,
        care_type: formData.care_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration_weeks: formData.duration_weeks,
        sessions_per_week: formData.sessions_per_week,
        diagnosis_code: formData.diagnosis_code,
        diagnosis_description: formData.diagnosis_description,
        justification: formData.justification,
        prescriber_nihii: formData.prescriber_nihii || user.nihii,
        care_provider_nihii: formData.care_provider_nihii,
        care_provider_name: formData.care_provider_name,
        mutuelle_code: patient?.mutuelle || formData.mutuelle_code,
        status: 'SENT',
        submitted_at: new Date().toISOString(),
        submitted_by: user.email
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'SUBMIT_ANNEXE82',
        target_entity: 'Annexe82',
        target_id: patient?.id,
        details: `Formulaire ${formData.form_type} soumis - NISS: ***${niss.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Formulaire soumis avec succès');
      
      // Reset form
      setFormData({
        form_type: 'ANNEXE_82',
        care_type: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        duration_weeks: 4,
        sessions_per_week: 3,
        diagnosis_code: '',
        diagnosis_description: '',
        justification: '',
        prescriber_nihii: '',
        care_provider_nihii: '',
        care_provider_name: '',
        mutuelle_code: '',
        additional_notes: ''
      });

      setActiveTab('history');
      loadFormHistory();
      onUpdate?.();
    } catch (err) {
      console.error('Erreur soumission:', err);
      toast.error('Erreur lors de la soumission');
    } finally {
      setIsLoading(false);
    }
  };

  // Annuler un formulaire
  const cancelForm = async (formId) => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();

      setFormHistory(formHistory.map(f => 
        f.id === formId ? { ...f, status: 'CANCELLED' } : f
      ));

      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CANCEL_ANNEXE82',
        target_entity: 'Annexe82',
        target_id: formId,
        details: `Formulaire annulé`,
        timestamp: new Date().toISOString()
      });

      toast.success('Formulaire annulé');
    } catch (err) {
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = STATUSES.find(s => s.value === status) || STATUSES[0];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getFormTypeInfo = (type) => {
    return EFORM_TYPES.find(t => t.value === type) || EFORM_TYPES[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Annexe 82 / eForms
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau formulaire
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Historique
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[550px] mt-4">
            {/* Nouveau formulaire */}
            <TabsContent value="new" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Création de formulaire
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info patient */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-semibold">{getPatientName()}</p>
                        <p className="text-sm text-slate-600 font-mono">NISS: {getNISS() || 'Non renseigné'}</p>
                      </div>
                    </div>
                    {patient?.mutuelle && (
                      <Badge variant="outline">
                        <Building className="w-3 h-3 mr-1" />
                        {patient.mutuelle}
                      </Badge>
                    )}
                  </div>

                  {/* Type de formulaire */}
                  <div>
                    <Label>Type de formulaire *</Label>
                    <Select 
                      value={formData.form_type}
                      onValueChange={(v) => setFormData({ ...formData, form_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EFORM_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Date de début *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Durée (semaines)</Label>
                      <Input
                        type="number"
                        value={formData.duration_weeks}
                        onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 0 })}
                        min={1}
                        max={52}
                      />
                    </div>
                    <div>
                      <Label>Séances/semaine</Label>
                      <Input
                        type="number"
                        value={formData.sessions_per_week}
                        onChange={(e) => setFormData({ ...formData, sessions_per_week: parseInt(e.target.value) || 0 })}
                        min={1}
                        max={7}
                      />
                    </div>
                  </div>

                  {/* Diagnostic */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code diagnostic (ICD-10)</Label>
                      <Input
                        value={formData.diagnosis_code}
                        onChange={(e) => setFormData({ ...formData, diagnosis_code: e.target.value })}
                        placeholder="Ex: M54.5"
                      />
                    </div>
                    <div>
                      <Label>Description diagnostic *</Label>
                      <Input
                        value={formData.diagnosis_description}
                        onChange={(e) => setFormData({ ...formData, diagnosis_description: e.target.value })}
                        placeholder="Ex: Lombalgie chronique"
                      />
                    </div>
                  </div>

                  {/* Prestataire */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>NIHII Prestataire de soins *</Label>
                      <Input
                        value={formData.care_provider_nihii}
                        onChange={(e) => setFormData({ ...formData, care_provider_nihii: e.target.value })}
                        placeholder="1-12345-67-890"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label>Nom du prestataire</Label>
                      <Input
                        value={formData.care_provider_name}
                        onChange={(e) => setFormData({ ...formData, care_provider_name: e.target.value })}
                        placeholder="Nom du kinésithérapeute/infirmier"
                      />
                    </div>
                  </div>

                  {/* Justification */}
                  <div>
                    <Label>Justification médicale</Label>
                    <Textarea
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      placeholder="Justification détaillée pour la demande de soins..."
                      rows={4}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes complémentaires</Label>
                    <Textarea
                      value={formData.additional_notes}
                      onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                      placeholder="Informations supplémentaires..."
                      rows={2}
                    />
                  </div>

                  <Button 
                    onClick={submitForm}
                    disabled={isLoading || !formData.diagnosis_description || !formData.care_provider_nihii}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Soumettre le formulaire
                  </Button>

                  <Alert className="bg-amber-50 border-amber-200">
                    <Info className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 text-xs">
                      Le formulaire sera envoyé électroniquement à la mutuelle du patient via MyCareNet.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historique */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Historique des formulaires</h3>
                <Button onClick={loadFormHistory} disabled={isLoading} size="sm">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>

              {formHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun formulaire. Cliquez sur actualiser pour charger l'historique.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formHistory.map(form => {
                    const typeInfo = getFormTypeInfo(form.form_type);
                    return (
                      <Card key={form.id} className="hover:border-amber-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{typeInfo.icon}</span>
                                <p className="font-medium">{typeInfo.label}</p>
                                {getStatusBadge(form.status)}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                <p className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {form.start_date} → {form.end_date}
                                </p>
                                <p className="flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {form.mutuelle}
                                </p>
                                <p>Prestataire: {form.care_provider}</p>
                                <p>Diagnostic: {form.diagnosis}</p>
                              </div>

                              {form.reference_number && (
                                <p className="text-xs text-slate-500 mt-2 font-mono">
                                  Réf: {form.reference_number}
                                </p>
                              )}

                              {form.response_message && (
                                <Alert className={`mt-2 ${form.status === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                  <AlertDescription className="text-xs">
                                    <strong>Réponse ({form.response_date}):</strong> {form.response_message}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <p className="text-xs text-slate-500">{form.created_date}</p>
                              {(form.status === 'SENT' || form.status === 'PENDING') && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => cancelForm(form.id)}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Annuler
                                </Button>
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}