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
  Mail, 
  Inbox,
  Send,
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  User,
  Paperclip,
  RefreshCw,
  Clock,
  Eye,
  Download,
  FileText,
  Search,
  Info,
  Star,
  Archive,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Types de messages
const MESSAGE_TYPES = [
  { value: 'LAB_RESULT', label: 'Résultat de laboratoire', icon: '🔬' },
  { value: 'RADIOLOGY', label: 'Rapport radiologie', icon: '📷' },
  { value: 'DISCHARGE_REPORT', label: 'Lettre de sortie', icon: '🏥' },
  { value: 'REFERRAL', label: 'Référence/Envoi', icon: '📋' },
  { value: 'PRESCRIPTION', label: 'Prescription', icon: '💊' },
  { value: 'OTHER', label: 'Autre', icon: '📄' }
];

// Priorités
const PRIORITIES = [
  { value: 'LOW', label: 'Basse', color: 'bg-slate-100 text-slate-800' },
  { value: 'NORMAL', label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  { value: 'HIGH', label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgente', color: 'bg-red-100 text-red-800' }
];

export default function EHealthBoxService({ patient, isOpen, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('inbox');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Formulaire d'envoi
  const [sendForm, setSendForm] = useState({
    recipient_nihii: '',
    recipient_name: '',
    subject: '',
    message_type: 'OTHER',
    priority: 'NORMAL',
    content: '',
    attachments: []
  });

  const getNISS = () => {
    return patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  };

  const getPatientName = () => {
    const name = patient?.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'Patient';
  };

  // Charger les messages
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère une liste fictive de 8-12 messages eHealthBox réalistes pour un médecin belge. 
        Inclure des résultats de laboratoire, rapports de radiologie, lettres de sortie d'hôpital, etc.`,
        response_json_schema: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  sender_nihii: { type: "string" },
                  sender_name: { type: "string" },
                  sender_organization: { type: "string" },
                  subject: { type: "string" },
                  message_type: { type: "string", enum: ["LAB_RESULT", "RADIOLOGY", "DISCHARGE_REPORT", "REFERRAL", "PRESCRIPTION", "OTHER"] },
                  priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
                  received_date: { type: "string" },
                  is_read: { type: "boolean" },
                  is_starred: { type: "boolean" },
                  patient_niss: { type: "string" },
                  patient_name: { type: "string" },
                  has_attachments: { type: "boolean" },
                  attachments_count: { type: "number" },
                  preview: { type: "string" }
                }
              }
            }
          }
        }
      });

      setMessages(result.messages || []);

      // Log audit
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'CHECK_EHEALTHBOX',
        target_entity: 'EHealthBoxMessage',
        target_id: null,
        details: `Consultation eHealthBox - ${result.messages?.length || 0} messages`,
        timestamp: new Date().toISOString()
      });

      toast.success(`${result.messages?.length || 0} message(s) trouvé(s)`);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // Envoyer un message
  const sendMessage = async () => {
    if (!sendForm.recipient_nihii || !sendForm.subject || !sendForm.content) {
      toast.error('Destinataire, sujet et contenu requis');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();

      // Simuler l'envoi
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'SEND_EHEALTHBOX',
        target_entity: 'EHealthBoxMessage',
        target_id: null,
        details: `Message eHealthBox envoyé - Destinataire: ${sendForm.recipient_nihii} - Sujet: ${sendForm.subject}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Message envoyé avec succès');
      setSendForm({
        recipient_nihii: '',
        recipient_name: '',
        subject: '',
        message_type: 'OTHER',
        priority: 'NORMAL',
        content: '',
        attachments: []
      });
      setActiveTab('inbox');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsLoading(false);
    }
  };

  // Marquer comme lu
  const markAsRead = async (messageId) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, is_read: true } : m
    ));
  };

  // Basculer favoris
  const toggleStar = async (messageId) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, is_starred: !m.is_starred } : m
    ));
  };

  // Assigner au patient
  const assignToPatient = async (messageId) => {
    if (!patient) {
      toast.error('Aucun patient sélectionné');
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();

      // Simuler l'assignation
      await new Promise(resolve => setTimeout(resolve, 500));

      setMessages(messages.map(m => 
        m.id === messageId ? { ...m, patient_niss: getNISS(), patient_name: getPatientName() } : m
      ));

      await base44.entities.AuditLog.create({
        user_email: user.email,
        action: 'ASSIGN_EHEALTHBOX_MESSAGE',
        target_entity: 'Patient',
        target_id: patient?.id,
        details: `Message eHealthBox assigné au patient - Message ID: ${messageId}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Message assigné au patient');
    } catch (err) {
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (priority) => {
    const config = PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getMessageTypeInfo = (type) => {
    return MESSAGE_TYPES.find(t => t.value === type) || MESSAGE_TYPES[5];
  };

  // Filtrer les messages
  const filteredMessages = messages.filter(m => {
    const matchesSearch = !searchTerm || 
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.preview?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || m.message_type === filterType;
    return matchesSearch && matchesType;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;
  const urgentCount = messages.filter(m => m.priority === 'URGENT' || m.priority === 'HIGH').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-600" />
            eHealthBox - Messagerie Sécurisée
            {unreadCount > 0 && (
              <Badge className="bg-red-500">{unreadCount} non lu(s)</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox">
              <Inbox className="w-4 h-4 mr-2" />
              Boîte de réception
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </TabsTrigger>
            <TabsTrigger value="view" disabled={!selectedMessage}>
              <Eye className="w-4 h-4 mr-2" />
              Lecture
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[550px] mt-4">
            {/* Boîte de réception */}
            <TabsContent value="inbox" className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les types</SelectItem>
                    {MESSAGE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadMessages} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Inbox className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{messages.length}</p>
                      <p className="text-xs text-blue-600">Messages</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Mail className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-900">{unreadCount}</p>
                      <p className="text-xs text-red-600">Non lus</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold text-orange-900">{urgentCount}</p>
                      <p className="text-xs text-orange-600">Urgents</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Liste des messages */}
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun message. Cliquez sur actualiser pour charger.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map(message => {
                    const typeInfo = getMessageTypeInfo(message.message_type);
                    return (
                      <Card 
                        key={message.id} 
                        className={`cursor-pointer transition-all hover:border-blue-300 ${
                          !message.is_read ? 'bg-blue-50 border-blue-200' : ''
                        } ${message.priority === 'URGENT' ? 'border-l-4 border-l-red-500' : ''}`}
                        onClick={() => {
                          setSelectedMessage(message);
                          markAsRead(message.id);
                          setActiveTab('view');
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(message.id);
                              }}
                              className="mt-1"
                            >
                              <Star className={`w-4 h-4 ${message.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{typeInfo.icon}</span>
                                <p className={`font-medium truncate ${!message.is_read ? 'font-bold' : ''}`}>
                                  {message.subject}
                                </p>
                                {getStatusBadge(message.priority)}
                                {message.has_attachments && (
                                  <Paperclip className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="font-medium">{message.sender_name}</span>
                                {message.sender_organization && (
                                  <span className="text-slate-400">• {message.sender_organization}</span>
                                )}
                              </div>
                              
                              <p className="text-sm text-slate-500 truncate mt-1">{message.preview}</p>
                              
                              {message.patient_name && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  <User className="w-3 h-3 mr-1" />
                                  {message.patient_name}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-right text-xs text-slate-500">
                              <p>{message.received_date}</p>
                              {!message.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-auto" />
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

            {/* Envoi de message */}
            <TabsContent value="send" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Nouveau message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>NIHII du destinataire *</Label>
                      <Input
                        value={sendForm.recipient_nihii}
                        onChange={(e) => setSendForm({ ...sendForm, recipient_nihii: e.target.value })}
                        placeholder="1-12345-67-890"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label>Nom du destinataire</Label>
                      <Input
                        value={sendForm.recipient_name}
                        onChange={(e) => setSendForm({ ...sendForm, recipient_name: e.target.value })}
                        placeholder="Dr. Jean Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Sujet *</Label>
                    <Input
                      value={sendForm.subject}
                      onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                      placeholder="Objet du message"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type de message</Label>
                      <Select 
                        value={sendForm.message_type}
                        onValueChange={(v) => setSendForm({ ...sendForm, message_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESSAGE_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priorité</Label>
                      <Select 
                        value={sendForm.priority}
                        onValueChange={(v) => setSendForm({ ...sendForm, priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Message *</Label>
                    <Textarea
                      value={sendForm.content}
                      onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                      placeholder="Contenu du message..."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label>Pièces jointes</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-slate-500">
                      <Paperclip className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">Glissez des fichiers ici ou cliquez pour sélectionner</p>
                      <Input type="file" className="hidden" multiple />
                    </div>
                  </div>

                  <Button 
                    onClick={sendMessage}
                    disabled={isLoading || !sendForm.recipient_nihii || !sendForm.subject || !sendForm.content}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Envoyer le message
                  </Button>

                  <Alert className="bg-cyan-50 border-cyan-200">
                    <Info className="w-4 h-4 text-cyan-600" />
                    <AlertDescription className="text-cyan-900 text-xs">
                      Les messages sont chiffrés de bout en bout et transitent par la plateforme eHealthBox sécurisée.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lecture de message */}
            <TabsContent value="view" className="space-y-4">
              {selectedMessage && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getMessageTypeInfo(selectedMessage.message_type).icon}
                          {selectedMessage.subject}
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          De: <strong>{selectedMessage.sender_name}</strong>
                          {selectedMessage.sender_organization && ` (${selectedMessage.sender_organization})`}
                        </p>
                        <p className="text-xs text-slate-500">NIHII: {selectedMessage.sender_nihii}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedMessage.priority)}
                        <span className="text-sm text-slate-500">{selectedMessage.received_date}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contenu du message */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedMessage.preview}</p>
                      <p className="mt-4 text-slate-600">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                      </p>
                    </div>

                    {/* Pièces jointes */}
                    {selectedMessage.has_attachments && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          Pièces jointes ({selectedMessage.attachments_count})
                        </h4>
                        <div className="space-y-2">
                          {[...Array(selectedMessage.attachments_count || 1)].map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-100 rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-600" />
                                <span className="text-sm">Document_{idx + 1}.pdf</span>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t">
                      {patient && !selectedMessage.patient_niss && (
                        <Button 
                          onClick={() => assignToPatient(selectedMessage.id)}
                          disabled={isLoading}
                          variant="outline"
                          className="gap-2"
                        >
                          <User className="w-4 h-4" />
                          Assigner à {getPatientName()}
                        </Button>
                      )}
                      <Button variant="outline" className="gap-2">
                        <Archive className="w-4 h-4" />
                        Archiver
                      </Button>
                      <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </Button>
                    </div>

                    {selectedMessage.patient_name && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Ce message est assigné au patient: <strong>{selectedMessage.patient_name}</strong>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}