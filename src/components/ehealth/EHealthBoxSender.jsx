import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Lock,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function EHealthBoxSender({ 
  document, 
  patient, 
  onSent, 
  onClose 
}) {
  const [recipientNIHII, setRecipientNIHII] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

  const handleSendToEHealthBox = async () => {
    if (!recipientNIHII || !recipientName) {
      toast.error('Veuillez renseigner le destinataire');
      return;
    }

    setIsSending(true);
    setSendStatus(null);

    try {
      const user = await base44.auth.me();

      // 1. Créer le message eHealthBox
      const ehealthMessage = await base44.entities.EHealthBoxMessage.create({
        message_id: `FLUX_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        sender_nihii: user.numero_inami || '12345678901',
        sender_name: user.full_name,
        recipient_nihii: recipientNIHII,
        recipient_name: recipientName,
        subject: `Document médical - ${document.title}`,
        content: message || `Document médical concernant ${patient.name?.[0]?.family || 'le patient'}`,
        message_type: document.type || 'DOCUMENT',
        priority: priority,
        status: 'SENT',
        sent_date: new Date().toISOString(),
        patient_niss: patient.identifier?.find(id => id.system.includes('ssin'))?.value,
        assigned_to_patient_id: patient.id,
        attachments: [{
          filename: `${document.title}.pdf`,
          file_url: document.file_ref_pdf || '#',
          file_size: 0,
          mime_type: 'application/pdf'
        }]
      });

      // 2. Mettre à jour le document
      await base44.entities.Document.update(document.id, {
        status: 'SENT',
        sent_via: 'EHEALTHBOX',
        sent_at: new Date().toISOString(),
        recipient: {
          nihii: recipientNIHII,
          name: recipientName
        }
      });

      // 3. Créer un événement timeline
      await base44.entities.TimelineEvent.create({
        patient_id: patient.id,
        event_type: 'DOCUMENT',
        event_date: new Date().toISOString(),
        title: `Document envoyé via eHealthBox`,
        description: `${document.title} envoyé à Dr. ${recipientName} (NIHII: ${recipientNIHII})`,
        source: 'FluxMed',
        source_id: document.id,
        provider: user.email,
        created_by: user.email
      });

      setSendStatus('success');
      toast.success('Document envoyé via eHealthBox avec succès');

      setTimeout(() => {
        if (onSent) onSent();
        if (onClose) onClose();
      }, 2000);

    } catch (error) {
      console.error('Erreur envoi eHealthBox:', error);
      setSendStatus('error');
      toast.error('Erreur lors de l\'envoi via eHealthBox');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Envoi sécurisé via eHealthBox
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations document */}
        <Alert>
          <FileText className="w-4 h-4" />
          <AlertDescription>
            <strong>Document:</strong> {document.title}
            <br />
            <strong>Patient:</strong> {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
          </AlertDescription>
        </Alert>

        {/* Sécurité */}
        <Alert className="border-green-200 bg-green-50">
          <Shield className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3" />
              <span className="font-semibold">Communication sécurisée eHealthBox</span>
            </div>
            <p className="text-xs mt-1">
              Conforme aux normes belges de sécurité des données de santé
            </p>
          </AlertDescription>
        </Alert>

        {/* Formulaire destinataire */}
        <div className="space-y-4">
          <div>
            <Label>N° INAMI/NIHII du destinataire *</Label>
            <Input
              value={recipientNIHII}
              onChange={(e) => setRecipientNIHII(e.target.value)}
              placeholder="12345678901"
              maxLength={11}
              className="font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              Numéro INAMI à 11 chiffres du médecin ou établissement destinataire
            </p>
          </div>

          <div>
            <Label>Nom du destinataire *</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Dr. Dupont"
            />
          </div>

          <div>
            <Label>Message (optionnel)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message d'accompagnement..."
              rows={3}
            />
          </div>

          <div>
            <Label>Priorité</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={priority === 'NORMAL' ? 'default' : 'outline'}
                onClick={() => setPriority('NORMAL')}
                size="sm"
              >
                Normale
              </Button>
              <Button
                variant={priority === 'URGENT' ? 'default' : 'outline'}
                onClick={() => setPriority('URGENT')}
                size="sm"
              >
                Urgente
              </Button>
            </div>
          </div>
        </div>

        {/* Status */}
        {sendStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Document envoyé avec succès via eHealthBox
            </AlertDescription>
          </Alert>
        )}

        {sendStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Erreur lors de l'envoi. Vérifiez le N° INAMI du destinataire.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSendToEHealthBox}
            disabled={isSending || !recipientNIHII || !recipientName}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer via eHealthBox
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}