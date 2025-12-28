import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Users,
  UserCircle,
  Search,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function NewThreadDialog({ 
  open, 
  onOpenChange, 
  users, 
  currentUser,
  patientContext,
  onThreadCreated 
}) {
  const [threadType, setThreadType] = useState(patientContext ? 'patient' : 'direct');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(patientContext || null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForMessaging'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100),
    enabled: threadType === 'patient' && !patientContext
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const participants = [currentUser.email, ...selectedUsers];
      
      let patientName = null;
      if (threadType === 'patient' && selectedPatient) {
        const officialName = selectedPatient.name?.find(n => n.use === 'official') || {};
        patientName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
      }

      const thread = await base44.entities.MessageThread.create({
        title: title || null,
        type: threadType,
        participants,
        patient_id: selectedPatient?.id || null,
        patient_name: patientName,
        is_urgent: isUrgent,
        last_message_at: new Date().toISOString()
      });

      return thread;
    },
    onSuccess: (thread) => {
      toast.success('Conversation créée');
      onThreadCreated(thread);
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const resetForm = () => {
    setThreadType('direct');
    setSelectedUsers([]);
    setTitle('');
    setIsUrgent(false);
    setSearchQuery('');
    setSelectedPatient(patientContext || null);
  };

  const toggleUser = (email) => {
    setSelectedUsers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const filteredUsers = users.filter(u => {
    if (u.email === currentUser?.email) return false;
    if (!searchQuery) return true;
    return (
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const canCreate = selectedUsers.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type de conversation */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={threadType === 'direct' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setThreadType('direct')}
              className="flex-1"
            >
              <User className="w-4 h-4 mr-2" /> Direct
            </Button>
            <Button
              type="button"
              variant={threadType === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setThreadType('group')}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" /> Groupe
            </Button>
            <Button
              type="button"
              variant={threadType === 'patient' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setThreadType('patient')}
              className="flex-1"
            >
              <UserCircle className="w-4 h-4 mr-2" /> Patient
            </Button>
          </div>

          {/* Titre (pour groupe ou patient) */}
          {(threadType === 'group' || threadType === 'patient') && (
            <div>
              <Label>Titre de la conversation</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Discussion cas complexe"
              />
            </div>
          )}

          {/* Sélection patient */}
          {threadType === 'patient' && !patientContext && (
            <div>
              <Label>Patient concerné</Label>
              <Select 
                value={selectedPatient?.id || ''} 
                onValueChange={(id) => setSelectedPatient(patients.find(p => p.id === id))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => {
                    const name = patient.name?.find(n => n.use === 'official') || {};
                    const fullName = `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
                    return (
                      <SelectItem key={patient.id} value={patient.id}>
                        {fullName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {patientContext && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <UserCircle className="w-4 h-4 inline mr-2" />
                Discussion liée au patient sélectionné
              </p>
            </div>
          )}

          {/* Recherche utilisateurs */}
          <div>
            <Label>Participants</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher un collègue..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Utilisateurs sélectionnés */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(email => {
                const user = users.find(u => u.email === email);
                return (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {user?.full_name || email}
                    <button onClick={() => toggleUser(email)}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Liste des utilisateurs */}
          <ScrollArea className="h-48 border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredUsers.map(user => (
                <div
                  key={user.email}
                  onClick={() => toggleUser(user.email)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.includes(user.email) 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <Checkbox checked={selectedUsers.includes(user.email)} />
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-slate-200">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {user.role === 'admin' ? 'Médecin' : 'Staff'}
                  </Badge>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  Aucun utilisateur trouvé
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Urgent */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Marquer comme urgent</span>
            </div>
            <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!canCreate || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer la conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}