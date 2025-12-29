import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Inbox, 
  Send, 
  Loader2, 
  RefreshCw, 
  Paperclip, 
  CheckCircle,
  Clock,
  User,
  FileText,
  ExternalLink,
  Info,
  Search,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Simulation de la boîte eHealthBox
async function simulateFetchMessages() {
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  return [
    {
      id: 'msg-001',
      from: { name: 'Dr. Sophie Lambert', nihii: '11234567001', type: 'DOCTOR' },
      subject: 'Rapport de consultation - Patient Dupont',
      date: '2024-12-28T14:30:00Z',
      read: false,
      hasAttachments: true,
      attachments: [{ name: 'rapport_consultation.pdf', size: 245000 }],
      preview: 'Suite à la consultation du 27/12, voici mon rapport concernant...'
    },
    {
      id: 'msg-002',
      from: { name: 'Labo BioMed', nihii: '71234567890', type: 'LAB' },
      subject: 'Résultats analyses - Réf: LAB-2024-12789',
      date: '2024-12-27T09:15:00Z',
      read: true,
      hasAttachments: true,
      attachments: [{ name: 'resultats_labo.pdf', size: 180000 }],
      preview: 'Veuillez trouver ci-joint les résultats des analyses demandées...'
    },
    {
      id: 'msg-003',
      from: { name: 'CHU Saint-Pierre', nihii: '81234567890', type: 'HOSPITAL' },
      subject: 'Lettre de sortie - Patient Martin',
      date: '2024-12-26T16:45:00Z',
      read: true,
      hasAttachments: true,
      attachments: [{ name: 'lettre_sortie.pdf', size: 320000 }, { name: 'protocole_operatoire.pdf', size: 450000 }],
      preview: 'Le patient a quitté notre établissement le 26/12...'
    }
  ];
}

async function simulateSendMessage(message) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    success: true,
    messageId: `msg-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

async function simulateSearchRecipient(query) {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const mockResults = [
    { nihii: '11234567001', name: 'Dr. Sophie Lambert', specialty: 'Cardiologue', type: 'DOCTOR' },
    { nihii: '11234567002', name: 'Dr. Pierre Martin', specialty: 'Généraliste', type: 'DOCTOR' },
    { nihii: '71234567890', name: 'Labo BioMed', specialty: 'Laboratoire', type: 'LAB' },
    { nihii: '81234567890', name: 'CHU Saint-Pierre', specialty: 'Hôpital', type: 'HOSPITAL' }
  ];
  
  return mockResults.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    r.nihii.includes(query)
  );
}

export default function EHealthBoxService({ onMessageReceived, onMessageSelected }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  
  // Compose state
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const fetchedMessages = await simulateFetchMessages();
      setMessages(fetchedMessages);
      
      const unreadCount = fetchedMessages.filter(m => !m.read).length;
      if (unreadCount > 0) {
        toast.info(`${unreadCount} nouveau(x) message(s) dans eHealthBox`);
      }
      
      // Audit
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'EHEALTHBOX_FETCH',
        target_entity: 'EHealthBoxMessage',
        details: `Récupération boîte eHealthBox: ${fetchedMessages.length} messages`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Erreur récupération eHealthBox:', error);
      toast.error('Erreur lors de la récupération des messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipientSearch = async (query) => {
    setRecipientSearch(query);
    if (query.length >= 2) {
      const results = await simulateSearchRecipient(query);
      setRecipientResults(results);
    } else {
      setRecipientResults([]);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRecipient || !composeSubject || !composeBody) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSending(true);
    try {
      const currentUser = await base44.auth.me();
      
      const result = await simulateSendMessage({
        to: selectedRecipient,
        subject: composeSubject,
        body: composeBody,
        attachments
      });

      if (result.success) {
        // Audit
        await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: 'EHEALTHBOX_SEND',
          target_entity: 'EHealthBoxMessage',
          target_id: result.messageId,
          details: `Envoi message eHealthBox vers ${selectedRecipient.nihii}: ${composeSubject}`,
          timestamp: new Date().toISOString()
        });

        toast.success('Message envoyé avec succès');
        
        // Reset form
        setSelectedRecipient(null);
        setRecipientSearch('');
        setComposeSubject('');
        setComposeBody('');
        setAttachments([]);
        setActiveTab('inbox');
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, read: true } : m
    ));
  };

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.read) {
      markAsRead(message.id);
    }
    if (onMessageSelected) {
      onMessageSelected(message);
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-600" />
            eHealthBox
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} nouveau(x)</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Info className="w-3 h-3 mr-1" />
              Mode simulation
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchMessages} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="inbox" className="flex-1 gap-2">
              <Inbox className="w-4 h-4" />
              Réception
              {unreadCount > 0 && <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex-1 gap-2">
              <Send className="w-4 h-4" />
              Nouveau message
            </TabsTrigger>
          </TabsList>

          {/* Inbox */}
          <TabsContent value="inbox" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucun message</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map(message => (
                  <div
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      message.read ? 'bg-white hover:bg-slate-50' : 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100'
                    } ${selectedMessage?.id === message.id ? 'ring-2 ring-cyan-500' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.from.type === 'DOCTOR' ? 'bg-blue-100 text-blue-600' :
                          message.from.type === 'LAB' ? 'bg-purple-100 text-purple-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {message.from.type === 'DOCTOR' ? <User className="w-4 h-4" /> :
                           message.from.type === 'LAB' ? <FileText className="w-4 h-4" /> :
                           <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`text-sm ${!message.read ? 'font-semibold' : 'font-medium'}`}>
                            {message.from.name}
                          </p>
                          <p className="text-xs text-slate-500">{message.from.nihii}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(message.date), 'dd/MM HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${!message.read ? 'font-medium' : ''}`}>
                      {message.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{message.preview}</p>
                    {message.hasAttachments && (
                      <div className="flex items-center gap-1 mt-2">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {message.attachments.length} pièce(s) jointe(s)
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Compose */}
          <TabsContent value="compose" className="mt-4 space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                Envoyez des messages sécurisés aux professionnels de santé via eHealthBox.
              </AlertDescription>
            </Alert>

            {/* Recipient search */}
            <div className="space-y-2">
              <Label>Destinataire (NIHII ou nom)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={selectedRecipient ? selectedRecipient.name : recipientSearch}
                  onChange={(e) => {
                    if (selectedRecipient) setSelectedRecipient(null);
                    handleRecipientSearch(e.target.value);
                  }}
                  placeholder="Rechercher un professionnel..."
                  className="pl-10"
                />
              </div>
              {recipientResults.length > 0 && !selectedRecipient && (
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {recipientResults.map(recipient => (
                    <button
                      key={recipient.nihii}
                      onClick={() => {
                        setSelectedRecipient(recipient);
                        setRecipientResults([]);
                      }}
                      className="w-full p-2 text-left hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{recipient.name}</p>
                        <p className="text-xs text-slate-500">{recipient.specialty}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{recipient.nihii}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedRecipient && (
                <div className="flex items-center justify-between p-2 bg-cyan-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{selectedRecipient.name}</p>
                    <p className="text-xs text-slate-500">{selectedRecipient.nihii}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRecipient(null)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Objet du message..."
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Rédigez votre message..."
                rows={6}
              />
            </div>

            {/* Send button */}
            <Button 
              onClick={handleSendMessage} 
              disabled={isSending || !selectedRecipient || !composeSubject || !composeBody}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le message
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Links */}
        <div className="pt-4 mt-4 border-t">
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <a href="https://www.ehealth.fgov.be/ehealthplatform/fr/service-ehealthbox" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Documentation eHealthBox
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}