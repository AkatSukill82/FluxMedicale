import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Pill,
  User,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  RotateCcw,
  Trash2,
  Download,
  Loader2,
  ExternalLink,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { myCareNetChapter4 } from '@/functions/myCareNetChapter4';

const STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: FileText },
  PENDING: { label: 'En préparation', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SUBMITTED: { label: 'Soumise', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  APPROVED: { label: 'Approuvée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  REJECTED: { label: 'Refusée', color: 'bg-red-100 text-red-700', icon: XCircle },
  EXPIRED: { label: 'Expirée', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  CANCELLED: { label: 'Annulée', color: 'bg-slate-100 text-slate-500', icon: XCircle }
};

export default function ChapterIVRequestDetail({ isOpen, onClose, request, patientName, onRefresh }) {
  const queryClient = useQueryClient();
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const daysRemaining = request.approval_end_date 
    ? differenceInDays(new Date(request.approval_end_date), new Date())
    : null;

  // Rafraîchir le statut depuis MyCareNet
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await myCareNetChapter4({
        action: 'check_status',
        request_id: request.id,
        mycarenet_reference: request.mycarenet_reference
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allChapter4Requests'] });
      onRefresh?.();
      if (data.status_changed) {
        toast.success('Statut mis à jour', { description: `Nouveau statut: ${STATUS_CONFIG[data.new_status]?.label}` });
      } else {
        toast.info('Aucun changement de statut');
      }
    },
    onError: (error) => {
      toast.error('Erreur lors du rafraîchissement: ' + error.message);
    }
  });

  // Annuler la demande
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ChapterIVRequest.update(request.id, {
        status: 'CANCELLED',
        cancellation_reason: cancelReason,
        cancelled_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allChapter4Requests'] });
      onRefresh?.();
      toast.success('Demande annulée');
      onClose();
    }
  });

  // Créer une demande de renouvellement
  const renewMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const newRequest = await base44.entities.ChapterIVRequest.create({
        patient_id: request.patient_id,
        patient_niss: request.patient_niss,
        medication_cnk: request.medication_cnk,
        medication_name: request.medication_name,
        paragraph: request.paragraph,
        diagnosis_code: request.diagnosis_code,
        diagnosis_description: request.diagnosis_description,
        justification: `Renouvellement de l'accord précédent (Réf: ${request.mycarenet_reference}).\n\n${request.justification}`,
        prescriber_email: currentUser.email,
        prescriber_nihii: request.prescriber_nihii,
        duration_requested: request.duration_requested || 12,
        status: 'DRAFT',
        renewal_of: request.id
      });
      return newRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allChapter4Requests'] });
      onRefresh?.();
      toast.success('Demande de renouvellement créée (brouillon)');
      onClose();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Détail de la demande Chapitre IV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut principal */}
          <Card className={`${request.status === 'APPROVED' ? 'bg-green-50 border-green-200' : request.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-8 h-8 ${request.status === 'APPROVED' ? 'text-green-600' : request.status === 'REJECTED' ? 'text-red-600' : 'text-slate-600'}`} />
                  <div>
                    <Badge className={`${statusConfig.color} text-base px-3 py-1`}>
                      {statusConfig.label}
                    </Badge>
                    {request.mycarenet_reference && (
                      <p className="text-xs font-mono mt-1 text-muted-foreground">
                        Réf: {request.mycarenet_reference}
                      </p>
                    )}
                  </div>
                </div>
                {request.status === 'SUBMITTED' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                  >
                    {refreshMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    Actualiser
                  </Button>
                )}
              </div>

              {/* Période de validité si approuvé */}
              {request.status === 'APPROVED' && request.approval_end_date && (
                <div className="mt-4 p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">Période de validité</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(request.approval_start_date), 'dd/MM/yyyy')} → {format(new Date(request.approval_end_date), 'dd/MM/yyyy')}
                  </p>
                  {daysRemaining !== null && daysRemaining > 0 && (
                    <Badge className={daysRemaining <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                      {daysRemaining} jour(s) restant(s)
                    </Badge>
                  )}
                </div>
              )}

              {/* Motif de refus */}
              {request.status === 'REJECTED' && request.rejection_reason && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800 mb-1">Motif du refus</p>
                  <p className="text-sm">{request.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations patient et médicament */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Patient</span>
                </div>
                <p className="font-semibold">{patientName}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  NISS: {request.patient_niss?.replace(/(.{6})(.*)(.{2})/, '$1***$3')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <Pill className="w-4 h-4" />
                  <span className="text-sm font-medium">Médicament</span>
                </div>
                <p className="font-semibold">{request.medication_name}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">CNK: {request.medication_cnk}</Badge>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">§ {request.paragraph}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Diagnostic */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500 mb-2">Diagnostic</p>
              <p>
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded mr-2">
                  {request.diagnosis_code}
                </span>
                {request.diagnosis_description}
              </p>
            </CardContent>
          </Card>

          {/* Justification */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500 mb-2">Justification médicale</p>
              <p className="text-sm whitespace-pre-wrap">{request.justification}</p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Créée le</span>
                <span>{format(new Date(request.created_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
              </div>
              {request.submitted_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Soumise le</span>
                  <span>{format(new Date(request.submitted_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                </div>
              )}
              {request.response_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Réponse le</span>
                  <span>{format(new Date(request.response_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                </div>
              )}
              {request.cancelled_at && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Annulée le</span>
                  <span>{format(new Date(request.cancelled_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pièces jointes */}
          {request.attachments?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pièces jointes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.attachments.map((att, i) => (
                    <a 
                      key={i} 
                      href={att.url} 
                      target="_blank"
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{att.name}</span>
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zone d'annulation */}
          {showCancelReason && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 space-y-3">
                <Label>Motif d'annulation</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Indiquez le motif d'annulation..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCancelReason(false)}>
                    Retour
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Confirmer l'annulation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {/* Renouveler si approuvé et bientôt expiré */}
            {request.status === 'APPROVED' && daysRemaining !== null && daysRemaining <= 60 && (
              <Button onClick={() => renewMutation.mutate()} disabled={renewMutation.isPending}>
                {renewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Renouveler
              </Button>
            )}

            {/* Annuler si en cours */}
            {['DRAFT', 'PENDING', 'SUBMITTED'].includes(request.status) && !showCancelReason && (
              <Button variant="outline" onClick={() => setShowCancelReason(true)}>
                <XCircle className="w-4 h-4 mr-2" />
                Annuler la demande
              </Button>
            )}

            <Button variant="outline" onClick={onClose} className="ml-auto">
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}