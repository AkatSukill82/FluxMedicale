import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield, Plus, Clock, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Pill, Calendar, FileText, ChevronRight, HelpCircle, 
  RotateCcw, Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import { toast } from 'sonner';
import ChapterIVRequestForm from '../../chapterIV/ChapterIVRequestForm';
import ChapterIVRequestDetail from '../../chapterIV/ChapterIVRequestDetail';
import { useI18n } from '../../i18n/i18nContext';

const STATUS_COLORS = {
  DRAFT: { color: 'bg-slate-100 text-slate-800', icon: FileText },
  PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  SUBMITTED: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle },
  EXPIRED: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  CANCELLED: { color: 'bg-slate-100 text-slate-600', icon: XCircle }
};

export default function ChapitreIVTab({ patient }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
  
  const STATUS_CONFIG = {
    DRAFT: { label: t('chapter4.status.draft'), ...STATUS_COLORS.DRAFT },
    PENDING: { label: t('chapter4.status.pending'), ...STATUS_COLORS.PENDING },
    SUBMITTED: { label: t('chapter4.status.submitted'), ...STATUS_COLORS.SUBMITTED },
    APPROVED: { label: t('chapter4.status.approved'), ...STATUS_COLORS.APPROVED },
    REJECTED: { label: t('chapter4.status.rejected'), ...STATUS_COLORS.REJECTED },
    EXPIRED: { label: t('chapter4.status.expired'), ...STATUS_COLORS.EXPIRED },
    CANCELLED: { label: t('chapter4.status.cancelled'), ...STATUS_COLORS.CANCELLED }
  };
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [renewingRequestId, setRenewingRequestId] = useState(null);

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['chapter4-patient', patient?.id, statusFilter],
    queryFn: async () => {
      const filter = { patient_id: patient.id };
      if (statusFilter !== 'all') filter.status = statusFilter;
      return base44.entities.ChapterIVRequest.filter(filter, '-created_date');
    },
    enabled: !!patient?.id
  });

  const patientName = (() => {
    const n = patient?.name?.find(n => n.use === 'official');
    return n ? `${(n.given || []).join(' ')} ${n.family || ''}`.trim() : 'Patient';
  })();

  // Renouvellement
  const renewMutation = useMutation({
    mutationFn: async (request) => {
      const currentUser = await base44.auth.me();
      return base44.entities.ChapterIVRequest.create({
        patient_id: request.patient_id,
        patient_niss: request.patient_niss,
        medication_cnk: request.medication_cnk,
        medication_name: request.medication_name,
        paragraph: request.paragraph,
        diagnosis_code: request.diagnosis_code,
        diagnosis_description: request.diagnosis_description,
        justification: `Renouvellement de l'accord précédent (Réf: ${request.mycarenet_reference || request.id}).\n\nJustification initiale:\n${request.justification || ''}`,
        prescriber_email: currentUser.email,
        prescriber_nihii: request.prescriber_nihii,
        duration_requested: request.duration_requested || 12,
        status: 'DRAFT',
        renewal_of: request.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter4-patient'] });
      toast.success(t('chapter4.renewalCreated'));
      setRenewingRequestId(null);
    }
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => ['SUBMITTED', 'PENDING'].includes(r.status)).length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    expiringSoon: requests.filter(r => {
      if (r.status !== 'APPROVED' || !r.approval_end_date) return false;
      return differenceInDays(new Date(r.approval_end_date), new Date()) <= 30;
    }).length
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
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
          <h2 className="text-xl font-bold">{t('chapter4.title')}</h2>
          <Badge variant="outline">{requests.length}</Badge>
        </div>
        <Button onClick={() => setShowRequestForm(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          {t('chapter4.newRequest')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 cursor-pointer hover:bg-slate-50" onClick={() => setStatusFilter('all')}>
          <p className="text-xs text-slate-500">{t('chapter4.total')}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-yellow-50" onClick={() => setStatusFilter('SUBMITTED')}>
          <p className="text-xs text-yellow-600">{t('chapter4.pending')}</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-green-50" onClick={() => setStatusFilter('APPROVED')}>
          <p className="text-xs text-green-600">{t('chapter4.approved')}</p>
          <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
        </Card>
        {stats.expiringSoon > 0 && (
          <Card className="p-3 bg-orange-50 border-orange-200">
            <p className="text-xs text-orange-600">{t('chapter4.expiringSoon')}</p>
            <p className="text-2xl font-bold text-orange-700">{stats.expiringSoon}</p>
          </Card>
        )}
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('chapter4.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('chapter4.allRequests')}</SelectItem>
            <SelectItem value="DRAFT">{t('chapter4.drafts')}</SelectItem>
            <SelectItem value="SUBMITTED">{t('chapter4.submitted')}</SelectItem>
            <SelectItem value="APPROVED">{t('chapter4.approved')}</SelectItem>
            <SelectItem value="REJECTED">{t('chapter4.rejected')}</SelectItem>
            <SelectItem value="EXPIRED">{t('chapter4.expired')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Liste */}
      {requests.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 mb-4">{t('chapter4.noRequests')}</p>
          <Button onClick={() => setShowRequestForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('chapter4.createRequest')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(request => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;
            const approvalEndDate = request.approval_end_date ? new Date(request.approval_end_date) : null;
            const daysRemaining = approvalEndDate ? differenceInDays(approvalEndDate, new Date()) : null;
            const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
            const canRenew = request.status === 'APPROVED' && daysRemaining !== null && daysRemaining <= 60;
            const canProlongate = request.status === 'APPROVED' && daysRemaining !== null && daysRemaining > 0;

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedRequest(request)}>
                      {/* Médicament et statut */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Pill className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold">{request.medication_name || t('chapter4.medicationUnspecified')}</span>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge className="bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {t('chapter4.expiresIn')} {daysRemaining}{t('chapter4.days')}
                          </Badge>
                        )}
                        {request.renewal_of && (
                          <Badge variant="outline" className="text-xs">{t('chapter4.renewal')}</Badge>
                        )}
                      </div>

                      {/* Détails */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                        {request.paragraph && (
                          <div>
                            <span className="text-slate-400">{t('chapter4.paragraph')}:</span> § {request.paragraph}
                          </div>
                        )}
                        {request.diagnosis_code && (
                          <div>
                            <span className="text-slate-400">{t('chapter4.diagnostic')}:</span> {request.diagnosis_code}
                          </div>
                        )}
                        {request.submitted_at && (
                          <div>
                            <span className="text-slate-400">{t('chapter4.submittedOn')}:</span>{' '}
                            {format(new Date(request.submitted_at), 'dd/MM/yyyy', { locale: dateLocale })}
                          </div>
                        )}
                        {request.mycarenet_reference && (
                          <div>
                            <span className="text-slate-400">{t('chapter4.ref')}:</span>{' '}
                            <span className="font-mono text-xs">{request.mycarenet_reference}</span>
                          </div>
                        )}
                      </div>

                      {/* Validité */}
                      {request.status === 'APPROVED' && request.approval_start_date && request.approval_end_date && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>
                            {t('chapter4.validity')}: {format(new Date(request.approval_start_date), 'dd/MM/yyyy')} → {format(new Date(request.approval_end_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}

                      {/* Refus */}
                      {request.status === 'REJECTED' && request.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800 flex items-start gap-2">
                          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{request.rejection_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                      {canRenew && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenewingRequestId(request.id);
                            renewMutation.mutate(request);
                          }}
                          disabled={renewMutation.isPending && renewingRequestId === request.id}
                        >
                          {renewMutation.isPending && renewingRequestId === request.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {t('chapter4.renew')}
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info réglementaire */}
      <Alert className="bg-blue-50 border-blue-200">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          <strong>{t('chapter4.processingTime')}:</strong> {t('chapter4.processingTimeDesc')}
        </AlertDescription>
      </Alert>

      {/* Modal nouvelle demande */}
      {showRequestForm && (
        <ChapterIVRequestForm
          isOpen={showRequestForm}
          onClose={() => setShowRequestForm(false)}
          patient={patient}
          medication={{ product_name: '', cnk: '', chapter_iv: { paragraph: '' } }}
          onSuccess={() => refetch()}
        />
      )}

      {/* Modal détail */}
      {selectedRequest && (
        <ChapterIVRequestDetail
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          patientName={patientName}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}