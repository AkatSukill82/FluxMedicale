import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Pill,
  FileText,
  Calendar,
  User,
  Building,
  Filter,
  Download,
  Eye,
  RotateCcw,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format, differenceInDays, addDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import ChapterIVRequestForm from '../components/chapterIV/ChapterIVRequestForm';
import ChapterIVRequestDetail from '../components/chapterIV/ChapterIVRequestDetail';

const STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: FileText },
  PENDING: { label: 'En préparation', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SUBMITTED: { label: 'Soumise', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  APPROVED: { label: 'Approuvée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  REJECTED: { label: 'Refusée', color: 'bg-red-100 text-red-700', icon: XCircle },
  EXPIRED: { label: 'Expirée', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  CANCELLED: { label: 'Annulée', color: 'bg-slate-100 text-slate-500', icon: XCircle }
};

const REQUEST_TYPES = {
  MEDICATION: { label: 'Médicament', icon: Pill, color: 'text-purple-600' },
  AMBULATORY_CARE: { label: 'Soins ambulatoires', icon: Building, color: 'text-blue-600' },
  MEDICAL_DEVICE: { label: 'Dispositif médical', icon: FileText, color: 'text-green-600' }
};

export default function ChapitreIV() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Charger toutes les demandes
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['allChapter4Requests', statusFilter],
    queryFn: async () => {
      let filter = {};
      if (statusFilter !== 'all') {
        filter.status = statusFilter;
      }
      return base44.entities.ChapterIVRequest.filter(filter, '-created_date', 200);
    }
  });

  // Charger les patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForChapter4'],
    queryFn: () => base44.entities.Patient.list('-created_date', 300)
  });

  // Filtrer les demandes
  const filteredRequests = requests.filter(req => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        req.medication_name?.toLowerCase().includes(search) ||
        req.patient_niss?.includes(search) ||
        req.mycarenet_reference?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Calculer les stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'SUBMITTED' || r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
    expiringSoon: requests.filter(r => {
      if (r.status !== 'APPROVED' || !r.approval_end_date) return false;
      const daysLeft = differenceInDays(new Date(r.approval_end_date), new Date());
      return daysLeft > 0 && daysLeft <= 30;
    }).length
  };

  // Demandes à renouveler
  const renewalNeeded = requests.filter(r => {
    if (r.status !== 'APPROVED' || !r.approval_end_date) return false;
    const daysLeft = differenceInDays(new Date(r.approval_end_date), new Date());
    return daysLeft > 0 && daysLeft <= 60;
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const name = patient.name?.find(n => n.use === 'official');
    return name ? `${name.given?.[0] || ''} ${name.family || ''}`.trim() : 'Patient';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-600" />
            Demandes Chapitre IV
          </h1>
          <p className="text-muted-foreground">Gestion des demandes de remboursement MyCareNet</p>
        </div>
        <Button onClick={() => setShowNewRequest(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle demande
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('SUBMITTED')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('APPROVED')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approuvées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('REJECTED')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Refusées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-md ${stats.expiringSoon > 0 ? 'border-orange-300 bg-orange-50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-xs text-muted-foreground">À renouveler</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes renouvellement */}
      {renewalNeeded.length > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{renewalNeeded.length} accord(s) à renouveler prochainement:</strong>
            <ul className="mt-1 text-sm">
              {renewalNeeded.slice(0, 3).map(r => (
                <li key={r.id}>
                  • {r.medication_name} ({getPatientName(r.patient_id)}) - expire le {format(new Date(r.approval_end_date), 'dd/MM/yyyy')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par médicament, NISS, référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillons</SelectItem>
                <SelectItem value="PENDING">En préparation</SelectItem>
                <SelectItem value="SUBMITTED">Soumises</SelectItem>
                <SelectItem value="APPROVED">Approuvées</SelectItem>
                <SelectItem value="REJECTED">Refusées</SelectItem>
                <SelectItem value="EXPIRED">Expirées</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-muted-foreground">Aucune demande Chapitre IV trouvée</p>
            <Button onClick={() => setShowNewRequest(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Créer une demande
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;
            const daysRemaining = request.approval_end_date 
              ? differenceInDays(new Date(request.approval_end_date), new Date())
              : null;
            const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;

            return (
              <Card 
                key={request.id} 
                className="hover:shadow-md cursor-pointer transition-all"
                onClick={() => setSelectedRequest(request)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">{request.medication_name}</span>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge className="bg-orange-100 text-orange-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Expire dans {daysRemaining}j
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getPatientName(request.patient_id)}
                        </div>
                        <div>
                          § {request.paragraph}
                        </div>
                        {request.submitted_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(request.submitted_at), 'dd/MM/yyyy')}
                          </div>
                        )}
                        {request.mycarenet_reference && (
                          <div className="font-mono text-xs">
                            Réf: {request.mycarenet_reference}
                          </div>
                        )}
                      </div>

                      {request.status === 'APPROVED' && request.approval_end_date && (
                        <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded inline-flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Validité: {format(new Date(request.approval_start_date), 'dd/MM/yyyy')} → {format(new Date(request.approval_end_date), 'dd/MM/yyyy')}
                        </div>
                      )}

                      {request.status === 'REJECTED' && request.rejection_reason && (
                        <div className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                          <XCircle className="w-4 h-4 inline mr-1" />
                          {request.rejection_reason}
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info réglementaire */}
      <Alert className="bg-blue-50 border-blue-200">
        <FileText className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Réglementation belge:</strong> Le médecin-conseil dispose de 10 jours ouvrables pour répondre. 
          En l'absence de réponse, l'accord est considéré comme tacite (Art. 6 de l'AR du 3 juillet 1996).
          Les demandes de renouvellement doivent être introduites au moins 30 jours avant l'expiration.
        </AlertDescription>
      </Alert>

      {/* Modal nouvelle demande */}
      {showNewRequest && (
        <ChapterIVRequestForm
          isOpen={showNewRequest}
          onClose={() => {
            setShowNewRequest(false);
            setSelectedPatient(null);
          }}
          patient={selectedPatient}
          medication={{}}
          onSuccess={() => {
            refetch();
            setShowNewRequest(false);
          }}
        />
      )}

      {/* Modal détail demande */}
      {selectedRequest && (
        <ChapterIVRequestDetail
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          patientName={getPatientName(selectedRequest.patient_id)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}