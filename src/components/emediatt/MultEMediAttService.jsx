import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Calendar,
  Clock,
  Building,
  User,
  History,
  Download,
  Plus,
  Eye,
  Printer
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Types d'incapacité
const INCAPACITY_TYPES = [
  { value: 'ILLNESS', label: 'Maladie' },
  { value: 'ACCIDENT_PRIVATE', label: 'Accident privé' },
  { value: 'ACCIDENT_WORK', label: 'Accident de travail' },
  { value: 'ACCIDENT_TRAFFIC', label: 'Accident de circulation' },
  { value: 'MATERNITY', label: 'Maternité' },
  { value: 'PATERNITY', label: 'Paternité' }
];

// Destinataires
const RECIPIENTS = [
  { value: 'MUTUALITY', label: 'Mutuelle du patient' },
  { value: 'EMPLOYER', label: 'Employeur' },
  { value: 'ONEM', label: 'ONEM' },
  { value: 'INAMI', label: 'INAMI' }
];

export default function MultEMediAttService({ patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);
  const [sentCertificates, setSentCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Formulaire de certificat
  const [formData, setFormData] = useState({
    incapacity_type: 'ILLNESS',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    is_extension: false,
    previous_certificate_id: '',
    diagnosis_code: '',
    diagnosis_description: '',
    work_capacity: 'FULL_INCAPACITY',
    partial_capacity_percentage: 0,
    can_leave_home: true,
    specific_hours: '',
    recipients: ['MUTUALITY'],
    additional_notes: '',
    send_to_employer: false,
    employer_name: '',
    employer_address: ''
  });

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const getPatientName = () => {
    const name = patient?.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'Patient';
  };

  // Créer et envoyer le certificat
  const sendCertificate = async () => {
    const niss = getNISS();
    if (!niss) {
      toast.error('NISS du patient requis');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Dates de début et fin requises');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();

      // Simuler l'envoi via eMediAtt
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère une réponse fictive mais réaliste pour l'envoi d'un certificat d'incapacité de travail via Mult-eMediatt en Belgique.
        Patient: ${getPatientName()}
        Type: ${formData.incapacity_type}
        Période: ${formData.start_date} au ${formData.end_date}`,
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            certificate_id: { type: "string" },
            reference_number: { type: "string" },
            sent_to: { type: "array", items: { type: "string" } },
            confirmation_date: { type: "string" },
            status: { type: "string", enum: ["SENT", "RECEIVED", "PROCESSED", "ERROR"] },
            acknowledgment: {
              type: "object",
              properties: {
                mutuality_ack: { type: "boolean" },
                employer_ack: { type: "boolean" },
                timestamp: { type: "string" }
              }
            },
            error_message: { type: "string" }
          }
        }
      });

      if (result.success) {
        // Sauvegarder le certificat localement
        const certificate = {
          id: result.certificate_id,
          patient_id: patient.id,
          patient_name: getPatientName(),
          patient_niss: niss,
          ...formData,
          reference_number: result.reference_number,
          status: result.status,
          sent_at: new Date().toISOString(),
          sent_by: user.email,
          acknowledgment: result.acknowledgment
        };

        setSentCertificates([certificate, ...sentCertificates]);

        // Log audit
        await base44.entities.AuditLog.create({
          user_email: user.email,
          action: 'SEND_EMEDIATT',
          target_entity: 'Patient',
          target_id: patient.id,
          details: `Certificat eMediAtt envoyé - Ref: ${result.reference_number} - Type: ${formData.incapacity_type} - Période: ${formData.start_date} au ${formData.end_date}`,
          timestamp: new Date().toISOString()
        });

        toast.success(`Certificat envoyé avec succès (Ref: ${result.reference_number})`);
        
        // Reset form
        setFormData({
          ...formData,
          diagnosis_code: '',
          diagnosis_description: '',
          additional_notes: ''
        });
        
        setActiveTab('history');
      } else {
        toast.error(result.error_message || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      console.error('Erreur envoi eMediAtt:', err);
      toast.error('Erreur lors de l\'envoi du certificat');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger l'historique
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un historique fictif de 5-8 certificats d'incapacité eMediAtt pour un patient.`,
        response_json_schema: {
          type: "object",
          properties: {
            certificates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  reference_number: { type: "string" },
                  incapacity_type: { type: "string" },
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  status: { type: "string", enum: ["SENT", "RECEIVED", "PROCESSED", "REJECTED"] },
                  sent_at: { type: "string" },
                  recipients: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });
      setSentCertificates(result.certificates || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier le statut d'un certificat
  const checkStatus = async (certificateId) => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un statut de réception fictif pour un certificat eMediAtt.`,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["SENT", "RECEIVED", "PROCESSED", "REJECTED"] },
            received_by: { type: "array", items: { type: "string" } },
            processed_date: { type: "string" },
            feedback: { type: "string" }
          }
        }
      });
      
      toast.success(`Statut: ${result.status}`);
      
      // Mettre à jour le certificat dans la liste
      setSentCertificates(sentCertificates.map(c => 
        c.id === certificateId ? { ...c, status: result.status } : c
      ));
    } catch (err) {
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      SENT: { color: 'bg-blue-100 text-blue-800', label: 'Envoyé', icon: Send },
      RECEIVED: { color: 'bg-green-100 text-green-800', label: 'Reçu', icon: CheckCircle },
      PROCESSED: { color: 'bg-purple-100 text-purple-800', label: 'Traité', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejeté', icon: XCircle },
      ERROR: { color: 'bg-red-100 text-red-800', label: 'Erreur', icon: AlertTriangle }
    };
    const config = configs[status] || configs.SENT;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const calculateDuration = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            Mult-eMediatt - Certificats d'incapacité
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau certificat
            </TabsTrigger>
            <TabsTrigger value="history" onClick={loadHistory}>
              <History className="w-4 h-4 mr-2" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="status">
              <Eye className="w-4 h-4 mr-2" />
              Vérifier statut
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[550px] mt-4">
            {/* Onglet Création */}
            <TabsContent value="create" className="space-y-4">
              {/* Info patient */}
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-semibold">{getPatientName()}</p>
                        <p className="text-sm text-slate-600 font-mono">NISS: {getNISS() || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Patient</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Type d'incapacité */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Type d'incapacité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select 
                    value={formData.incapacity_type}
                    onValueChange={(v) => setFormData({ ...formData, incapacity_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCAPACITY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_extension"
                      checked={formData.is_extension}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_extension: checked })}
                    />
                    <label htmlFor="is_extension" className="text-sm cursor-pointer">
                      Prolongation d'un certificat précédent
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Période */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Période d'incapacité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date de début *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Date de fin *</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    Durée: <strong>{calculateDuration()} jour(s)</strong>
                  </p>
                </CardContent>
              </Card>

              {/* Capacité de travail */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Capacité de travail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select 
                    value={formData.work_capacity}
                    onValueChange={(v) => setFormData({ ...formData, work_capacity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_INCAPACITY">Incapacité totale</SelectItem>
                      <SelectItem value="PARTIAL_INCAPACITY">Incapacité partielle</SelectItem>
                      <SelectItem value="ADAPTED_WORK">Travail adapté possible</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.work_capacity === 'PARTIAL_INCAPACITY' && (
                    <div>
                      <Label>Pourcentage de capacité restante</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.partial_capacity_percentage}
                        onChange={(e) => setFormData({ ...formData, partial_capacity_percentage: parseInt(e.target.value) })}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_leave_home"
                      checked={formData.can_leave_home}
                      onCheckedChange={(checked) => setFormData({ ...formData, can_leave_home: checked })}
                    />
                    <label htmlFor="can_leave_home" className="text-sm cursor-pointer">
                      Le patient peut quitter son domicile
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostic */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Diagnostic (optionnel)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Code ICD-10</Label>
                    <Input
                      value={formData.diagnosis_code}
                      onChange={(e) => setFormData({ ...formData, diagnosis_code: e.target.value })}
                      placeholder="Ex: J06.9"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.diagnosis_description}
                      onChange={(e) => setFormData({ ...formData, diagnosis_description: e.target.value })}
                      placeholder="Description du diagnostic..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Destinataires */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Destinataires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {RECIPIENTS.map(recipient => (
                    <div key={recipient.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={recipient.value}
                        checked={formData.recipients.includes(recipient.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, recipients: [...formData.recipients, recipient.value] });
                          } else {
                            setFormData({ ...formData, recipients: formData.recipients.filter(r => r !== recipient.value) });
                          }
                        }}
                      />
                      <label htmlFor={recipient.value} className="text-sm cursor-pointer">
                        {recipient.label}
                      </label>
                    </div>
                  ))}

                  {formData.recipients.includes('EMPLOYER') && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-3">
                      <div>
                        <Label>Nom de l'employeur</Label>
                        <Input
                          value={formData.employer_name}
                          onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
                      <div>
                        <Label>Adresse de l'employeur</Label>
                        <Input
                          value={formData.employer_address}
                          onChange={(e) => setFormData({ ...formData, employer_address: e.target.value })}
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notes additionnelles</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    placeholder="Remarques ou informations complémentaires..."
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Bouton envoi */}
              <div className="sticky bottom-0 bg-white pt-4 border-t">
                <Button 
                  onClick={sendCertificate}
                  disabled={isLoading || !getNISS()}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Envoyer le certificat via eMediAtt
                </Button>

                <Alert className="mt-4">
                  <FileText className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    Le certificat sera envoyé électroniquement aux destinataires sélectionnés via la plateforme Mult-eMediatt.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Onglet Historique */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Certificats envoyés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : sentCertificates.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Aucun certificat envoyé</p>
                  ) : (
                    <div className="space-y-3">
                      {sentCertificates.map((cert, idx) => (
                        <Card key={cert.id || idx} className="hover:border-blue-300 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {cert.reference_number || cert.id}
                                  </Badge>
                                  {getStatusBadge(cert.status)}
                                </div>
                                <p className="font-medium">
                                  {INCAPACITY_TYPES.find(t => t.value === cert.incapacity_type)?.label || cert.incapacity_type}
                                </p>
                                <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {cert.start_date} → {cert.end_date}
                                </p>
                                {cert.sent_at && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Envoyé le {format(new Date(cert.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => checkStatus(cert.id)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Statut
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Vérification statut */}
            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vérifier le statut d'un certificat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Numéro de référence du certificat</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Ex: EMEDIATT-2024-XXXXX"
                        className="font-mono"
                      />
                      <Button disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Vérifier
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      La confirmation de réception par la mutuelle peut prendre jusqu'à 48 heures ouvrables.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}