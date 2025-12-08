import React, { useState, useEffect } from 'react';
import { EHealthBoxMessage } from '@/entities/EHealthBoxMessage';
import { Patient } from '@/entities/Patient';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  MailOpen, 
  Paperclip, 
  Search,
  Download,
  FileText,
  Image
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import MessageViewer from '../components/inbox/MessageViewer';
import PatientAssignment from '../components/inbox/PatientAssignment';

export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [patients, setPatients] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showAssignment, setShowAssignment] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [messagesData, patientsData, userData] = await Promise.all([
        EHealthBoxMessage.list('-received_date'),
        Patient.list(),
        User.me()
      ]);
      
      setMessages(messagesData);
      setPatients(patientsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Erreur chargement inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageOpen = async (message) => {
    setSelectedMessage(message);
    
    if (message.status === 'UNREAD') {
      // Marquer comme lu
      await EHealthBoxMessage.update(message.id, {
        status: 'READ',
        opened_by: currentUser.email,
        opened_at: new Date().toISOString()
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'OPEN_EHEALTH_MESSAGE',
        target_entity: 'EHealthBoxMessage',
        target_id: message.id,
        details: `Ouverture message eHealthBox: ${message.subject} de ${message.sender_name}`,
        timestamp: new Date().toISOString()
      });

      loadData(); // Refresh
    }
  };

  const handleAssignToPatient = async (message, patientId) => {
    try {
      await EHealthBoxMessage.update(message.id, {
        assigned_to_patient_id: patientId,
        status: 'ASSIGNED',
        assigned_by: currentUser.email,
        assigned_at: new Date().toISOString()
      });

      // Audit
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'ASSIGN_MESSAGE_TO_PATIENT',
        target_entity: 'EHealthBoxMessage',
        target_id: message.id,
        details: `Message assigné au patient ID: ${patientId}`,
        timestamp: new Date().toISOString()
      });

      setShowAssignment(false);
      loadData();
    } catch (error) {
      console.error('Erreur assignation:', error);
    }
  };

  const getMessageIcon = (message) => {
    if (message.status === 'UNREAD') {
      return <Mail className="w-5 h-5 text-blue-600" />;
    }
    return <MailOpen className="w-5 h-5 text-slate-500" />;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'LAB_RESULT': return <FileText className="w-4 h-4 text-green-600" />;
      case 'RADIOLOGY': return <Image className="w-4 h-4 text-purple-600" />;
      case 'DISCHARGE_REPORT': return <FileText className="w-4 h-4 text-blue-600" />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'NORMAL': return 'bg-slate-100 text-slate-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesStatus = filters.status === 'all' || message.status.toLowerCase() === filters.status;
    const matchesType = filters.type === 'all' || message.message_type === filters.type;
    const matchesPriority = filters.priority === 'all' || message.priority === filters.priority;
    const matchesSearch = message.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
                         message.sender_name.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesType && matchesPriority && matchesSearch;
  });

  const unreadCount = messages.filter(m => m.status === 'UNREAD').length;
  const assignedCount = messages.filter(m => m.status === 'ASSIGNED').length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">eHealthBox Inbox</h1>
          <p className="text-slate-600 mt-1">
            Messages et résultats médicaux sécurisés
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">
              {unreadCount} non lus
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              {assignedCount} assignés
            </Badge>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Synchroniser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="unread">Non lus</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
                <SelectItem value="assigned">Assignés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="LAB_RESULT">Résultats labo</SelectItem>
                <SelectItem value="RADIOLOGY">Imagerie</SelectItem>
                <SelectItem value="DISCHARGE_REPORT">Rapport de sortie</SelectItem>
                <SelectItem value="REFERRAL">Courrier</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">Important</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des messages */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Messages ({filteredMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageOpen(message)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    } ${message.status === 'UNREAD' ? 'font-semibold' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {getMessageIcon(message)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(message.message_type)}
                          <Badge className={getPriorityColor(message.priority)} size="sm">
                            {message.priority}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-medium text-slate-900 truncate mb-1">
                          {message.subject}
                        </h4>
                        <p className="text-xs text-slate-600 mb-2">
                          De: {message.sender_name}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{format(new Date(message.received_date), 'dd/MM HH:mm', { locale: fr })}</span>
                          {message.attachments?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              <span>{message.attachments.length}</span>
                            </div>
                          )}
                        </div>
                        {message.assigned_to_patient_id && (
                          <Badge className="bg-green-100 text-green-800 mt-2" size="sm">
                            Assigné
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualiseur */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <MessageViewer
              message={selectedMessage}
              patients={patients}
              onAssignToPatient={() => setShowAssignment(true)}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <Mail className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Sélectionnez un message
                </h3>
                <p className="text-slate-600">
                  Cliquez sur un message pour le visualiser
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog d'assignation */}
      {showAssignment && selectedMessage && (
        <PatientAssignment
          message={selectedMessage}
          patients={patients}
          onAssign={(patientId) => handleAssignToPatient(selectedMessage, patientId)}
          onCancel={() => setShowAssignment(false)}
        />
      )}
    </div>
  );
}