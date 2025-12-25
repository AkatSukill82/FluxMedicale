import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Pill,
  Calendar,
  FileText,
  ChevronRight,
  AlertOctagon,
  ServerCrash,
  WifiOff,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import ChapterIVRequestForm from './ChapterIVRequestForm';
import { myCareNetChapter4 } from '@/functions/myCareNetChapter4';

const STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800', icon: FileText },
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  SUBMITTED: { label: 'Soumise', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  APPROVED: { label: 'Approuvée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
  EXPIRED: { label: 'Expirée', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  CANCELLED: { label: 'Annulée', color: 'bg-slate-100 text-slate-600', icon: XCircle }
};

// Classification des erreurs
const ERROR_TYPES = {
  INTERNAL: {
    icon: ServerCrash,
    title: 'Erreur interne',
    color: 'border-red-500 bg-red-50',
    iconColor: 'text-red-600',
    description: 'Une erreur s\'est produite dans notre système.',
    action: 'Veuillez réessayer ou contacter le support technique.'
  },
  EXTERNAL: {
    icon: WifiOff,
    title: 'Erreur MyCareNet',
    color: 'border-orange-500 bg-orange-50',
    iconColor: 'text-orange-600',
    description: 'Le service MyCareNet est indisponible ou a retourné une erreur.',
    action: 'Veuillez réessayer plus tard. Si le problème persiste, contactez MyCareNet.'
  },
  VALIDATION: {
    icon: AlertTriangle,
    title: 'Données invalides',
    color: 'border-yellow-500 bg-yellow-50',
    iconColor: 'text-yellow-600',
    description: 'Les données fournies sont incomplètes ou incorrectes.',
    action: 'Vérifiez les informations et corrigez les erreurs.'
  },
  AUTHORIZATION: {
    icon: Shield,
    title: 'Non autorisé',
    color: 'border-purple-500 bg-purple-50',
    iconColor: 'text-purple-600',
    description: 'Vous n\'avez pas les droits pour effectuer cette action.',
    action: 'Vérifiez vos accréditations ou contactez votre administrateur.'
  }
};

// Fonction pour classifier une erreur
function classifyError(error) {
  const message = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.response?.status;

  // Erreurs de validation
  if (status === 400 || message.includes('manquant') || message.includes('invalide') || message.includes('requis')) {
    return { type: 'VALIDATION', details: error.message };
  }

  // Erreurs d'autorisation
  if (status === 401 || status === 403 || message.includes('autorisé') || message.includes('permission')) {
    return { type: 'AUTHORIZATION', details: error.message };
  }

  // Erreurs MyCareNet (externes)
  if (
    message.includes('mycarenet') ||
    message.includes('timeout') ||
    message.includes('soap') ||
    message.includes('service indisponible') ||
    message.includes('connexion') ||
    message.includes('réseau') ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return { type: 'EXTERNAL', details: error.message };
  }

  // Par défaut: erreur interne
  return { type: 'INTERNAL', details: error.message || 'Une erreur inattendue s\'est produite.' };
}

// Composant d'affichage d'erreur
function ErrorDisplay({ error, onRetry, onDismiss }) {
  const classification = classifyError(error);
  const config = ERROR_TYPES[classification.type];
  const Icon = config.icon;

  return (
    <Alert className={`${config.color} border-l-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <AlertTitle className="font-semibold mb-1">{config.title}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">{config.description}</p>
            {classification.details && (
              <p className="text-xs bg-white/50 p-2 rounded font-mono">
                {classification.details}
              </p>
            )}
            <p className="text-sm font-medium">{config.action}</p>
            
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Réessayer
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  Fermer
                </Button>
              )}
              {classification.type === 'EXTERNAL' && (
                <Button size="sm" variant="ghost" asChild>
                  <a href="https://www.mycarenet.be/fr/support" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Support MyCareNet
                  </a>
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

export default function ChapterIVPanel({ patient }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [error, setError] = useState(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['chapter4-requests', patient?.id, statusFilter],
    queryFn: async () => {
      const response = await myCareNetChapter4({
        action: 'list_requests',
        patient_id: patient.id,
        status_filter: statusFilter
      });
      return response.data;
    },
    enabled: !!patient?.id,
    retry: 2,
    onError: (err) => setError(err)
  });

  const requests = data?.requests || [];

  const handleCreateRequest = (medication = null) => {
    setSelectedMedication(medication || {
      product_name: '',
      cnk: '',
      chapter_iv: { paragraph: '' }
    });
    setShowRequestForm(true);
  };

  const handleRetry = () => {
    setError(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold">Demandes Chapitre IV</h2>
          <Badge variant="outline">{requests.length}</Badge>
        </div>
        
        <Button onClick={() => handleCreateRequest()} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Erreur globale */}
      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 cursor-pointer hover:bg-slate-50" onClick={() => setStatusFilter('all')}>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold">{requests.length}</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-yellow-50" onClick={() => setStatusFilter('SUBMITTED')}>
          <p className="text-xs text-yellow-600">En attente</p>
          <p className="text-2xl font-bold text-yellow-700">
            {requests.filter(r => r.status === 'SUBMITTED' || r.status === 'PENDING').length}
          </p>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-green-50" onClick={() => setStatusFilter('APPROVED')}>
          <p className="text-xs text-green-600">Approuvées</p>
          <p className="text-2xl font-bold text-green-700">
            {requests.filter(r => r.status === 'APPROVED').length}
          </p>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-red-50" onClick={() => setStatusFilter('REJECTED')}>
          <p className="text-xs text-red-600">Refusées</p>
          <p className="text-2xl font-bold text-red-700">
            {requests.filter(r => r.status === 'REJECTED').length}
          </p>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les demandes</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="SUBMITTED">Soumises</SelectItem>
            <SelectItem value="APPROVED">Approuvées</SelectItem>
            <SelectItem value="REJECTED">Refusées</SelectItem>
            <SelectItem value="EXPIRED">Expirées</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Liste des demandes */}
      {requests.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 mb-4">Aucune demande Chapitre IV pour ce patient</p>
          <Button onClick={() => handleCreateRequest()} className="gap-2">
            <Plus className="w-4 h-4" />
            Créer une demande
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <ChapterIVRequestCard 
              key={request.id} 
              request={request}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      {/* Info réglementaire */}
      <Alert className="bg-blue-50 border-blue-200">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          <strong>Délai de traitement:</strong> Le médecin-conseil dispose de 10 jours ouvrables pour répondre. 
          En l'absence de réponse, l'accord est considéré comme tacite (principe du silence vaut accord).
        </AlertDescription>
      </Alert>

      {/* Modal de création */}
      {showRequestForm && (
        <ChapterIVRequestForm
          isOpen={showRequestForm}
          onClose={() => {
            setShowRequestForm(false);
            setSelectedMedication(null);
          }}
          patient={patient}
          medication={selectedMedication}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ChapterIVRequestCard({ request, onRefresh }) {
  const queryClient = useQueryClient();
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  
  const submittedDate = request.submitted_at ? new Date(request.submitted_at) : null;
  const approvalEndDate = request.approval_end_date ? new Date(request.approval_end_date) : null;
  
  const daysRemaining = approvalEndDate ? differenceInDays(approvalEndDate, new Date()) : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Médicament et statut */}
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4 text-purple-500" />
              <span className="font-semibold">{request.medication_name}</span>
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {isExpiringSoon && (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Expire dans {daysRemaining}j
                </Badge>
              )}
            </div>

            {/* Détails */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
              <div>
                <span className="text-slate-400">Paragraphe:</span> § {request.paragraph}
              </div>
              <div>
                <span className="text-slate-400">Diagnostic:</span> {request.diagnosis_code}
              </div>
              {submittedDate && (
                <div>
                  <span className="text-slate-400">Soumise le:</span>{' '}
                  {format(submittedDate, 'dd/MM/yyyy', { locale: fr })}
                </div>
              )}
              {request.mycarenet_reference && (
                <div>
                  <span className="text-slate-400">Réf MyCareNet:</span>{' '}
                  <span className="font-mono text-xs">{request.mycarenet_reference}</span>
                </div>
              )}
            </div>

            {/* Période de validité si approuvé */}
            {request.status === 'APPROVED' && request.approval_start_date && request.approval_end_date && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  Validité: {format(new Date(request.approval_start_date), 'dd/MM/yyyy')} 
                  {' → '} 
                  {format(new Date(request.approval_end_date), 'dd/MM/yyyy')}
                </span>
              </div>
            )}

            {/* Motif de refus */}
            {request.status === 'REJECTED' && request.rejection_reason && (
              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800 flex items-start gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{request.rejection_reason}</span>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}