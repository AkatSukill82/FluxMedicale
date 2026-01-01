import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Send,
  FileText,
  Upload,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  Building2,
  User,
  ChevronsUpDown,
  Check,
  Lock,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DOCUMENT_TYPES = [
  { value: 'rapport', label: 'Rapport médical', category: 'clinical' },
  { value: 'prescription', label: 'Prescription', category: 'prescription' },
  { value: 'lettre_sortie', label: 'Lettre de sortie', category: 'clinical' },
  { value: 'resultat', label: 'Résultat d\'examen', category: 'lab' },
  { value: 'certificat', label: 'Certificat médical', category: 'admin' },
  { value: 'demande_avis', label: 'Demande d\'avis', category: 'referral' },
  { value: 'compte_rendu', label: 'Compte-rendu opératoire', category: 'clinical' },
  { value: 'autre', label: 'Autre document', category: 'other' }
];

const URGENCY_LEVELS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'tres_urgent', label: 'Très urgent' }
];

export default function EHealthDocumentSender({ patient }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    document_type: '',
    subject: '',
    message: '',
    urgency: 'normal',
    patient_id: patient?.id || '',
    encrypt: true
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Charger les médecins externes
  const { data: externalDoctors = [] } = useQuery({
    queryKey: ['externalDoctors'],
    queryFn: () => base44.entities.ExternalDoctor.list()
  });

  // Historique des envois
  const { data: sentDocuments = [] } = useQuery({
    queryKey: ['ehealthSentDocuments', patient?.id],
    queryFn: () => base44.entities.EHealthBoxMessage.filter({ 
      patient_id: patient?.id,
      direction: 'outgoing'
    }),
    enabled: !!patient?.id
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({
        name: file.name,
        url: file_url,
        type: file.type,
        size: file.size
      });
      toast.success('Fichier uploadé');
    } catch (error) {
      toast.error('Erreur upload: ' + error.message);
    }
    setIsUploading(false);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Simulation d'envoi via eHealthBox
      await new Promise(resolve => setTimeout(resolve, 2000));

      const patientName = patient ? 
        `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() : '';

      // Enregistrer dans EHealthBoxMessage
      await base44.entities.EHealthBoxMessage.create({
        direction: 'outgoing',
        sender_nihii: currentUser?.inami || 'unknown',
        sender_name: currentUser?.full_name,
        recipient_nihii: selectedRecipient?.nihii,
        recipient_name: `${selectedRecipient?.prenom} ${selectedRecipient?.nom}`,
        recipient_email: selectedRecipient?.email,
        subject: formData.subject,
        content: formData.message,
        document_type: formData.document_type,
        urgency: formData.urgency,
        patient_id: patient?.id,
        patient_name: patientName,
        attachments: uploadedFile ? [uploadedFile] : [],
        status: 'sent',
        sent_at: new Date().toISOString(),
        encrypted: formData.encrypt
      });

      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email,
        action: 'EHEALTHBOX_SEND',
        target_entity: 'EHealthBoxMessage',
        target_id: selectedRecipient?.nihii,
        details: `Envoi document eHealthBox - Type: ${formData.document_type}, Destinataire: ${selectedRecipient?.nom}`,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehealthSentDocuments'] });
      toast.success('Document envoyé via eHealthBox');
      resetForm();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      document_type: '',
      subject: '',
      message: '',
      urgency: 'normal',
      patient_id: patient?.id || '',
      encrypt: true
    });
    setSelectedRecipient(null);
    setUploadedFile(null);
    setShowModal(false);
  };

  const filteredDoctors = externalDoctors.filter(d => 
    !recipientSearch || 
    `${d.prenom} ${d.nom}`.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    d.nihii?.includes(recipientSearch)
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-5 h-5 text-cyan-600" />
              Envoi sécurisé eHealthBox
            </CardTitle>
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="bg-cyan-50 border-cyan-200 mb-4">
            <Lock className="w-4 h-4 text-cyan-600" />
            <AlertDescription className="text-cyan-900 text-sm">
              Transmission sécurisée de documents via eHealthBox vers d'autres professionnels de santé.
              <br />
              <span className="text-xs text-cyan-700">Mode simulation actif</span>
            </AlertDescription>
          </Alert>

          {/* Historique des envois */}
          {sentDocuments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Documents envoyés récemment</p>
              {sentDocuments.slice(0, 5).map((doc, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium">{doc.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      À: {doc.recipient_name} • {doc.sent_at && format(new Date(doc.sent_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Envoyé
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">
              Aucun document envoyé pour ce patient
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal d'envoi */}
      <Dialog open={showModal} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-600" />
              Envoyer via eHealthBox
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-xs">
                Mode simulation - En production, le document serait envoyé via eHealthBox.
              </AlertDescription>
            </Alert>

            {/* Destinataire */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Destinataire
              </Label>
              <Popover open={recipientOpen} onOpenChange={setRecipientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedRecipient ? 
                      `${selectedRecipient.prenom} ${selectedRecipient.nom} (${selectedRecipient.specialite || 'Médecin'})` : 
                      "Sélectionner un destinataire..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Rechercher par nom ou NIHII..." 
                      value={recipientSearch}
                      onValueChange={setRecipientSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun médecin trouvé</CommandEmpty>
                      <CommandGroup>
                        {filteredDoctors.map((doc) => (
                          <CommandItem
                            key={doc.id}
                            value={`${doc.prenom} ${doc.nom}`}
                            onSelect={() => {
                              setSelectedRecipient(doc);
                              setRecipientOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedRecipient?.id === doc.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div>
                              <p>{doc.prenom} {doc.nom}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.specialite} • NIHII: {doc.nihii}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Type de document */}
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select 
                value={formData.document_type} 
                onValueChange={(v) => setFormData({ ...formData, document_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgence */}
            <div className="space-y-2">
              <Label>Urgence</Label>
              <Select 
                value={formData.urgency} 
                onValueChange={(v) => setFormData({ ...formData, urgency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sujet */}
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Objet du message"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Contenu du message..."
                rows={4}
              />
            </div>

            {/* Pièce jointe */}
            <div className="space-y-2">
              <Label>Pièce jointe</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              {uploadedFile && (
                <Badge variant="outline" className="mt-1">
                  <FileText className="w-3 h-3 mr-1" />
                  {uploadedFile.name}
                </Badge>
              )}
            </div>

            {/* Chiffrement */}
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                Document chiffré de bout en bout (eHealth)
              </span>
              <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button 
              onClick={() => sendMutation.mutate()} 
              disabled={sendMutation.isPending || !selectedRecipient || !formData.subject}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}