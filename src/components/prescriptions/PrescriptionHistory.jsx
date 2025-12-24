import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pill,
  Search,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Copy,
  QrCode,
  Calendar,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { recipE } from '@/functions/recipE';

const STATUS_CONFIG = {
  'Brouillon': { label: 'Brouillon', color: 'bg-slate-100 text-slate-800', icon: FileText },
  'Envoyé': { label: 'Envoyé', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  'Validé': { label: 'Validé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'Délivré': { label: 'Délivré', color: 'bg-purple-100 text-purple-800', icon: Pill },
  'Annulé': { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: XCircle },
  'Expiré': { label: 'Expiré', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  'Erreur': { label: 'Erreur', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
};

export default function PrescriptionHistory({ patient }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Charger l'historique
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['prescription-history', patient?.id],
    queryFn: async () => {
      const response = await recipE({
        action: 'get_history',
        patient_id: patient.id,
        limit: 100
      });
      return response.data;
    },
    enabled: !!patient?.id
  });

  // Annuler une prescription
  const cancelMutation = useMutation({
    mutationFn: async ({ prescription_id, reason }) => {
      const response = await recipE({
        action: 'cancel_prescription',
        prescription_id,
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-history'] });
      toast.success('Prescription annulée avec succès');
      setCancelDialog(null);
      setCancelReason('');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const prescriptions = data?.prescriptions || [];

  // Filtrer les prescriptions
  const filteredPrescriptions = prescriptions.filter(p => {
    const matchesSearch = !searchQuery || 
      p.medicaments?.some(m => 
        m.nom_produit?.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      p.recip_e_rid?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.statut_recip_e === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const copyRID = (rid) => {
    navigator.clipboard.writeText(rid);
    toast.success('RID copié dans le presse-papiers');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par médicament ou RID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Envoyé">Envoyé</SelectItem>
            <SelectItem value="Validé">Validé</SelectItem>
            <SelectItem value="Délivré">Délivré</SelectItem>
            <SelectItem value="Annulé">Annulé</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">
            {prescriptions.filter(p => p.statut_recip_e === 'Envoyé').length}
          </p>
          <p className="text-xs text-blue-600">En attente</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-700">
            {prescriptions.filter(p => p.statut_recip_e === 'Délivré').length}
          </p>
          <p className="text-xs text-purple-600">Délivrées</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-700">
            {prescriptions.filter(p => p.statut_recip_e === 'Annulé').length}
          </p>
          <p className="text-xs text-red-600">Annulées</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-slate-700">{prescriptions.length}</p>
          <p className="text-xs text-slate-600">Total</p>
        </div>
      </div>

      {/* Liste des prescriptions */}
      {filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Pill className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucune prescription trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPrescriptions.map(prescription => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              isExpanded={expandedId === prescription.id}
              onToggle={() => setExpandedId(expandedId === prescription.id ? null : prescription.id)}
              onCopy={copyRID}
              onCancel={() => setCancelDialog(prescription)}
            />
          ))}
        </div>
      )}

      {/* Dialog annulation */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Annuler la prescription
            </DialogTitle>
          </DialogHeader>

          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              Cette action est irréversible. La prescription sera invalidée sur Recip-e 
              et ne pourra plus être délivrée.
            </AlertDescription>
          </Alert>

          {cancelDialog && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">RID: {cancelDialog.recip_e_rid}</p>
                <p className="text-xs text-slate-500">
                  {cancelDialog.medicaments?.length} médicament(s)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Motif d'annulation</label>
                <Input
                  placeholder="Raison de l'annulation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate({
                prescription_id: cancelDialog.id,
                reason: cancelReason
              })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrescriptionCard({ prescription, isExpanded, onToggle, onCopy, onCancel }) {
  const statusConfig = STATUS_CONFIG[prescription.statut_recip_e] || STATUS_CONFIG['Brouillon'];
  const StatusIcon = statusConfig.icon;
  
  const prescriptionDate = prescription.date_prescription 
    ? new Date(prescription.date_prescription) 
    : null;
  
  const validityEnd = prescription.recip_e_validity_end 
    ? new Date(prescription.recip_e_validity_end) 
    : null;
  
  const isExpired = validityEnd && isPast(validityEnd);
  const daysRemaining = validityEnd && !isExpired 
    ? differenceInDays(validityEnd, new Date()) 
    : 0;

  const canCancel = prescription.statut_recip_e === 'Envoyé' && !isExpired;

  return (
    <Card className={`transition-shadow hover:shadow-md ${isExpired && prescription.statut_recip_e === 'Envoyé' ? 'border-orange-300 bg-orange-50/30' : ''}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Pill className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className={statusConfig.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {isExpired && prescription.statut_recip_e === 'Envoyé' && (
                  <Badge className="bg-orange-500">Expiré</Badge>
                )}
                {!isExpired && daysRemaining <= 1 && daysRemaining > 0 && (
                  <Badge className="bg-yellow-500">Expire bientôt</Badge>
                )}
              </div>
              {prescriptionDate && (
                <p className="text-xs text-slate-500 mt-1">
                  {format(prescriptionDate, 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              )}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* RID */}
        {prescription.recip_e_rid && (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded mb-3">
            <QrCode className="w-4 h-4 text-slate-500" />
            <code className="text-sm font-mono flex-1">{prescription.recip_e_rid}</code>
            <Button variant="ghost" size="sm" onClick={() => onCopy(prescription.recip_e_rid)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Médicaments (résumé) */}
        <div className="space-y-1">
          {prescription.medicaments?.slice(0, isExpanded ? undefined : 2).map((med, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Pill className="w-3 h-3 text-purple-500" />
              <span className="font-medium">{med.nom_produit}</span>
              {med.cnk && <Badge variant="outline" className="text-xs">CNK: {med.cnk}</Badge>}
            </div>
          ))}
          {!isExpanded && prescription.medicaments?.length > 2 && (
            <p className="text-xs text-slate-500 pl-5">
              +{prescription.medicaments.length - 2} autre(s) médicament(s)
            </p>
          )}
        </div>

        {/* Détails expandés */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Posologies */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Posologies</h4>
              {prescription.medicaments?.map((med, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded text-sm">
                  <p className="font-medium">{med.nom_produit}</p>
                  <p className="text-slate-600">{med.posologie}</p>
                  {med.duree_traitement && (
                    <p className="text-slate-500 text-xs">Durée: {med.duree_traitement}</p>
                  )}
                  {med.instructions && (
                    <p className="text-slate-500 text-xs italic">{med.instructions}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Validité */}
            {prescription.recip_e_validity_start && prescription.recip_e_validity_end && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Validité:</span>
                </div>
                <span>
                  {format(new Date(prescription.recip_e_validity_start), 'dd/MM/yyyy')}
                  {' → '}
                  {format(new Date(prescription.recip_e_validity_end), 'dd/MM/yyyy')}
                </span>
                {!isExpired && (
                  <Badge variant="outline" className="text-xs">
                    {daysRemaining} jour(s) restant(s)
                  </Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Printer className="w-4 h-4" />
                Imprimer
              </Button>
              {canCancel && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 text-red-600 hover:text-red-700"
                  onClick={onCancel}
                >
                  <XCircle className="w-4 h-4" />
                  Annuler
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}