import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Pill,
  Calendar,
  FileText,
  ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
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

export default function ChapterIVRequestsList({ patient, onCreateNew }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chapter4-requests', patient?.id, statusFilter],
    queryFn: async () => {
      const response = await myCareNetChapter4({
        action: 'list_requests',
        patient_id: patient.id,
        status_filter: statusFilter
      });
      return response.data;
    },
    enabled: !!patient?.id
  });

  const requests = data?.requests || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">Demandes Chapitre IV</h3>
          <Badge variant="outline">{requests.length}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="SUBMITTED">Soumises</SelectItem>
              <SelectItem value="APPROVED">Approuvées</SelectItem>
              <SelectItem value="REJECTED">Refusées</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Liste */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucune demande Chapitre IV</p>
            {onCreateNew && (
              <Button className="mt-4" onClick={onCreateNew}>
                Nouvelle demande
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <ChapterIVRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterIVRequestCard({ request }) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  
  const submittedDate = request.submitted_at ? new Date(request.submitted_at) : null;
  const approvalEndDate = request.approval_end_date ? new Date(request.approval_end_date) : null;
  
  // Calcul jours restants si approuvé
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
                  <span className="text-slate-400">Réf:</span>{' '}
                  <span className="font-mono text-xs">{request.mycarenet_reference}</span>
                </div>
              )}
            </div>

            {/* Période de validité si approuvé */}
            {request.status === 'APPROVED' && request.approval_start_date && request.approval_end_date && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                <Calendar className="w-4 h-4 inline mr-1 text-green-600" />
                Validité: {format(new Date(request.approval_start_date), 'dd/MM/yyyy')} 
                {' → '} 
                {format(new Date(request.approval_end_date), 'dd/MM/yyyy')}
              </div>
            )}

            {/* Motif de refus */}
            {request.status === 'REJECTED' && request.rejection_reason && (
              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                <XCircle className="w-4 h-4 inline mr-1" />
                {request.rejection_reason}
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