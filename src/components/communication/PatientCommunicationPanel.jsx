import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  Plus,
  Calendar,
  FileText,
  Pill,
  User,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import SendMessageModal from './SendMessageModal';

const CATEGORY_CONFIG = {
  rappel_rdv: { label: 'Rappel RDV', icon: Calendar, color: 'bg-blue-100 text-blue-800' },
  resultat: { label: 'Résultats', icon: FileText, color: 'bg-green-100 text-green-800' },
  prescription: { label: 'Prescription', icon: Pill, color: 'bg-purple-100 text-purple-800' },
  suivi: { label: 'Suivi', icon: User, color: 'bg-orange-100 text-orange-800' },
  administratif: { label: 'Administratif', icon: FileText, color: 'bg-slate-100 text-slate-800' },
  personnalise: { label: 'Personnalisé', icon: MessageSquare, color: 'bg-indigo-100 text-indigo-800' }
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Envoyé', icon: Send, color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Délivré', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  failed: { label: 'Échec', icon: XCircle, color: 'bg-red-100 text-red-800' }
};

export default function PatientCommunicationPanel({ patient }) {
  const queryClient = useQueryClient();
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageType, setMessageType] = useState('email');
  const [presetCategory, setPresetCategory] = useState(null);

  // Récupérer l'historique des communications
  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['communications', patient.id],
    queryFn: () => base44.entities.PatientCommunication.filter(
      { patient_id: patient.id },
      '-created_date'
    ),
    enabled: !!patient?.id
  });

  // Extraire les coordonnées du patient
  const patientEmail = patient.telecom?.find(t => t.system === 'email')?.value;
  const patientPhone = patient.telecom?.find(t => t.system === 'phone')?.value;
  const patientName = patient.name?.[0]?.given?.[0] + ' ' + (patient.name?.[0]?.family || '');

  const emailCount = communications.filter(c => c.type === 'email').length;
  const smsCount = communications.filter(c => c.type === 'sms').length;

  const handleOpenSendModal = (type, category = null) => {
    setMessageType(type);
    setPresetCategory(category);
    setShowSendModal(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Communications
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenSendModal('sms')}
              disabled={!patientPhone}
              title={!patientPhone ? 'Aucun téléphone enregistré' : ''}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              SMS
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenSendModal('email')}
              disabled={!patientEmail}
              title={!patientEmail ? 'Aucun email enregistré' : ''}
            >
              <Mail className="w-4 h-4 mr-1" />
              Email
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="justify-start text-xs"
            onClick={() => handleOpenSendModal('email', 'rappel_rdv')}
            disabled={!patientEmail}
          >
            <Calendar className="w-3 h-3 mr-1" />
            Rappel RDV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start text-xs"
            onClick={() => handleOpenSendModal('email', 'resultat')}
            disabled={!patientEmail}
          >
            <FileText className="w-3 h-3 mr-1" />
            Résultats
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start text-xs"
            onClick={() => handleOpenSendModal('email', 'prescription')}
            disabled={!patientEmail}
          >
            <Pill className="w-3 h-3 mr-1" />
            Prescription
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start text-xs"
            onClick={() => handleOpenSendModal('email', 'suivi')}
            disabled={!patientEmail}
          >
            <User className="w-3 h-3 mr-1" />
            Suivi
          </Button>
        </div>

        {/* Historique */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique
            </h4>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {emailCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {smsCount}
              </span>
            </div>
          </div>

          {communications.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Aucune communication envoyée
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {communications.slice(0, 10).map((comm) => {
                const categoryConfig = CATEGORY_CONFIG[comm.category] || CATEGORY_CONFIG.personnalise;
                const statusConfig = STATUS_CONFIG[comm.status] || STATUS_CONFIG.pending;
                const CategoryIcon = categoryConfig.icon;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={comm.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {comm.type === 'email' ? (
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                          )}
                          <span className="font-medium text-sm truncate">
                            {comm.subject || categoryConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {comm.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`text-xs ${categoryConfig.color}`}>
                            {categoryConfig.label}
                          </Badge>
                          <Badge className={`text-xs ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {comm.sent_at ? format(new Date(comm.sent_at), 'dd/MM HH:mm', { locale: fr }) : '-'}
                      </div>
                    </div>
                    {comm.status === 'failed' && comm.error_message && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {comm.error_message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal d'envoi */}
      <SendMessageModal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setPresetCategory(null);
        }}
        patient={patient}
        patientName={patientName}
        patientEmail={patientEmail}
        patientPhone={patientPhone}
        defaultType={messageType}
        presetCategory={presetCategory}
      />
    </Card>
  );
}