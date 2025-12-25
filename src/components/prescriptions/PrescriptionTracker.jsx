import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Pill,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  FileText,
  Edit,
  MessageSquare,
  TrendingUp,
  Loader2,
  Copy,
  RefreshCw,
  BookTemplate,
  Plus
} from 'lucide-react';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import PrescriptionTemplates from './PrescriptionTemplates';
import RenewalTracker from './RenewalTracker';
import QuickPrescription from './QuickPrescription';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  COMPLETED: { label: 'Terminée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  DISCONTINUED: { label: 'Arrêtée', color: 'bg-red-100 text-red-800', icon: XCircle },
  ON_HOLD: { label: 'En pause', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  PENDING: { label: 'En attente', color: 'bg-slate-100 text-slate-800', icon: Clock }
};

const ADHERENCE_LEVELS = {
  EXCELLENT: { label: 'Excellente', color: 'text-green-600', value: 100 },
  GOOD: { label: 'Bonne', color: 'text-blue-600', value: 75 },
  MODERATE: { label: 'Moyenne', color: 'text-orange-600', value: 50 },
  POOR: { label: 'Faible', color: 'text-red-600', value: 25 },
  UNKNOWN: { label: 'Non évaluée', color: 'text-slate-500', value: 0 }
};

export default function PrescriptionTracker({ patient }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showAdherenceDialog, setShowAdherenceDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickPrescription, setShowQuickPrescription] = useState(false);
  const [duplicateMedications, setDuplicateMedications] = useState(null);
  const [adherenceData, setAdherenceData] = useState({
    adherence_level: 'UNKNOWN',
    adherence_notes: '',
    tracking_status: 'ACTIVE'
  });

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions-tracking', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-date_prescription'),
    enabled: !!patient?.id
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Prescription.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions-tracking', patient.id] });
      toast.success('Ordonnance mise à jour');
      setShowAdherenceDialog(false);
      setSelectedPrescription(null);
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  // Filtrage
  const filteredPrescriptions = prescriptions.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.medicaments?.some(m => m.nom_produit?.toLowerCase().includes(searchQuery.toLowerCase()));
    const status = p.tracking_status || 'ACTIVE';
    const matchesFilter = filterStatus === 'all' || status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    active: prescriptions.filter(p => (p.tracking_status || 'ACTIVE') === 'ACTIVE').length,
    completed: prescriptions.filter(p => p.tracking_status === 'COMPLETED').length,
    discontinued: prescriptions.filter(p => p.tracking_status === 'DISCONTINUED').length,
    total: prescriptions.length
  };

  const handleOpenAdherence = (prescription) => {
    setSelectedPrescription(prescription);
    setAdherenceData({
      adherence_level: prescription.adherence_level || 'UNKNOWN',
      adherence_notes: prescription.adherence_notes || '',
      tracking_status: prescription.tracking_status || 'ACTIVE'
    });
    setShowAdherenceDialog(true);
  };

  const handleSaveAdherence = () => {
    if (!selectedPrescription) return;
    updateMutation.mutate({
      id: selectedPrescription.id,
      data: adherenceData
    });
  };

  const handleDuplicate = (prescription) => {
    setDuplicateMedications(prescription.medicaments || []);
    setShowQuickPrescription(true);
    toast.info('Ordonnance copiée - Modifiez si nécessaire avant de valider');
  };

  const handleTemplateSelect = (medications) => {
    setDuplicateMedications(medications);
    setShowQuickPrescription(true);
  };

  const handleRenew = (prescription) => {
    handleDuplicate(prescription);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Pill className="w-5 h-5 text-purple-600" />
          Suivi des ordonnances
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)} className="gap-2">
            <BookTemplate className="w-4 h-4" />
            Templates
          </Button>
          <Button onClick={() => { setDuplicateMedications(null); setShowQuickPrescription(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle ordonnance
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <FileText className="w-4 h-4" />
            Liste ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="renewals" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Renouvellements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="renewals" className="mt-4">
          <RenewalTracker
            patient={patient}
            prescriptions={prescriptions}
            onRenew={handleRenew}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Stats rapides */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-3 cursor-pointer hover:bg-slate-50" onClick={() => setFilterStatus('all')}>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-green-50" onClick={() => setFilterStatus('ACTIVE')}>
              <p className="text-xs text-green-600">Actives</p>
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-blue-50" onClick={() => setFilterStatus('COMPLETED')}>
              <p className="text-xs text-blue-600">Terminées</p>
              <p className="text-2xl font-bold text-blue-700">{stats.completed}</p>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-red-50" onClick={() => setFilterStatus('DISCONTINUED')}>
              <p className="text-xs text-red-600">Arrêtées</p>
              <p className="text-2xl font-bold text-red-700">{stats.discontinued}</p>
            </Card>
          </div>

          {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par médicament..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ACTIVE">Actives</SelectItem>
            <SelectItem value="COMPLETED">Terminées</SelectItem>
            <SelectItem value="DISCONTINUED">Arrêtées</SelectItem>
            <SelectItem value="ON_HOLD">En pause</SelectItem>
          </SelectContent>
        </Select>
      </div>

          {/* Liste des ordonnances */}
          {filteredPrescriptions.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune ordonnance trouvée</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPrescriptions.map(prescription => (
                <PrescriptionCard
                  key={prescription.id}
                  prescription={prescription}
                  onEdit={() => handleOpenAdherence(prescription)}
                  onDuplicate={() => handleDuplicate(prescription)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog d'adhésion */}
      <Dialog open={showAdherenceDialog} onOpenChange={setShowAdherenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Suivi de l'adhésion
            </DialogTitle>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4 py-4">
              {/* Médicaments concernés */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Médicaments:</p>
                <div className="space-y-1">
                  {selectedPrescription.medicaments?.map((med, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{med.nom_produit}</span>
                      {med.posologie && <span className="text-slate-500"> - {med.posologie}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Statut de l'ordonnance */}
              <div>
                <Label>Statut de l'ordonnance</Label>
                <Select
                  value={adherenceData.tracking_status}
                  onValueChange={(value) => setAdherenceData({ ...adherenceData, tracking_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Terminée</SelectItem>
                    <SelectItem value="DISCONTINUED">Arrêtée</SelectItem>
                    <SelectItem value="ON_HOLD">En pause</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Niveau d'adhésion */}
              <div>
                <Label>Niveau d'adhésion au traitement</Label>
                <Select
                  value={adherenceData.adherence_level}
                  onValueChange={(value) => setAdherenceData({ ...adherenceData, adherence_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellente (100%)</SelectItem>
                    <SelectItem value="GOOD">Bonne (75%)</SelectItem>
                    <SelectItem value="MODERATE">Moyenne (50%)</SelectItem>
                    <SelectItem value="POOR">Faible (25%)</SelectItem>
                    <SelectItem value="UNKNOWN">Non évaluée</SelectItem>
                  </SelectContent>
                </Select>
                
                {adherenceData.adherence_level !== 'UNKNOWN' && (
                  <div className="mt-2">
                    <Progress 
                      value={ADHERENCE_LEVELS[adherenceData.adherence_level]?.value || 0} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>

              {/* Notes d'adhésion */}
              <div>
                <Label>Notes sur l'adhésion</Label>
                <Textarea
                  placeholder="Observations sur la prise du traitement, effets secondaires signalés, difficultés rencontrées..."
                  value={adherenceData.adherence_notes}
                  onChange={(e) => setAdherenceData({ ...adherenceData, adherence_notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdherenceDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveAdherence} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates */}
      <PrescriptionTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Quick Prescription avec pré-remplissage */}
      {showQuickPrescription && (
        <QuickPrescription
          patient={patient}
          isOpen={showQuickPrescription}
          onClose={() => {
            setShowQuickPrescription(false);
            setDuplicateMedications(null);
          }}
          initialMedications={duplicateMedications}
        />
      )}
    </div>
  );
}

function PrescriptionCard({ prescription, onEdit, onDuplicate }) {
  const status = prescription.tracking_status || 'ACTIVE';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = statusConfig.icon;
  const adherenceLevel = prescription.adherence_level || 'UNKNOWN';
  const adherenceConfig = ADHERENCE_LEVELS[adherenceLevel];

  const prescriptionDate = prescription.date_prescription 
    ? new Date(prescription.date_prescription) 
    : null;
  const isValidDate = prescriptionDate && !isNaN(prescriptionDate.getTime());

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Date et statut */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {isValidDate 
                  ? format(prescriptionDate, 'd MMM yyyy', { locale: fr })
                  : 'Date inconnue'
                }
              </span>
              {prescription.recip_e_rid && (
                <Badge variant="outline" className="text-xs font-mono">
                  RID: {prescription.recip_e_rid}
                </Badge>
              )}
            </div>

            {/* Médicaments */}
            <div className="space-y-1 mb-3">
              {prescription.medicaments?.map((med, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Pill className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{med.nom_produit}</span>
                    {med.posologie && (
                      <span className="text-sm text-slate-600 ml-2">{med.posologie}</span>
                    )}
                    {med.duree_traitement && (
                      <span className="text-xs text-slate-500 ml-2">({med.duree_traitement})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Adhésion */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${adherenceConfig.color}`} />
                <span className={`text-sm font-medium ${adherenceConfig.color}`}>
                  Adhésion: {adherenceConfig.label}
                </span>
              </div>
              {adherenceLevel !== 'UNKNOWN' && (
                <Progress 
                  value={adherenceConfig.value} 
                  className="w-24 h-2"
                />
              )}
            </div>

            {/* Notes */}
            {prescription.adherence_notes && (
              <div className="mt-2 p-2 bg-slate-50 rounded text-sm text-slate-600 flex items-start gap-2">
                <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="line-clamp-2">{prescription.adherence_notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onDuplicate} title="Dupliquer">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit} title="Modifier le suivi">
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}