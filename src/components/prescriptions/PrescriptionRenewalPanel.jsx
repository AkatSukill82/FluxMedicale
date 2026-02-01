import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Pill, 
  Calendar,
  Copy,
  Loader2,
  Bell,
  FileText
} from 'lucide-react';
import { format, differenceInDays, addMonths, isPast, isWithinInterval, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { handleError, handleSuccess } from '../utils/ErrorHandler';
import DrugInteractionChecker from '../clinical/DrugInteractionChecker';

export default function PrescriptionRenewalPanel({ patient }) {
  const queryClient = useQueryClient();
  const [renewingId, setRenewingId] = useState(null);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['patientPrescriptions', patient.id],
    queryFn: () => base44.entities.Prescription.filter(
      { patient_id: patient.id },
      '-date_prescription'
    )
  });

  // Filtrer les prescriptions récurrentes actives
  const recurringPrescriptions = prescriptions.filter(p => 
    p.is_recurring && 
    p.tracking_status === 'ACTIVE' &&
    !p.archived
  );

  // Prescriptions nécessitant un renouvellement (dans les 14 prochains jours)
  const needsRenewal = recurringPrescriptions.filter(p => {
    if (!p.next_renewal_date) return false;
    const nextDate = new Date(p.next_renewal_date);
    const daysUntil = differenceInDays(nextDate, new Date());
    return daysUntil <= 14 && daysUntil >= -7; // 14 jours avant à 7 jours après
  });

  // Prescriptions en retard
  const overdueRenewals = recurringPrescriptions.filter(p => {
    if (!p.next_renewal_date) return false;
    return isPast(new Date(p.next_renewal_date)) && differenceInDays(new Date(), new Date(p.next_renewal_date)) > 7;
  });

  const renewMutation = useMutation({
    mutationFn: async (prescription) => {
      const currentUser = await base44.auth.me();
      const frequencyMonths = {
        'monthly': 1,
        'bimonthly': 2,
        'quarterly': 3,
        'biannual': 6,
        'annual': 12
      }[prescription.recurring_frequency] || 1;

      // Créer une nouvelle prescription basée sur l'ancienne
      const newPrescription = await base44.entities.Prescription.create({
        patient_id: prescription.patient_id,
        medecin_email: currentUser.email,
        date_prescription: new Date().toISOString(),
        medicaments: prescription.medicaments,
        statut_recip_e: 'Brouillon',
        tracking_status: 'ACTIVE',
        is_recurring: true,
        recurring_frequency: prescription.recurring_frequency,
        chronic_condition: prescription.chronic_condition,
        parent_prescription_id: prescription.parent_prescription_id || prescription.id,
        renewal_count: (prescription.renewal_count || 0) + 1,
        max_renewals: prescription.max_renewals,
        next_renewal_date: format(addMonths(new Date(), frequencyMonths), 'yyyy-MM-dd'),
        recurring_end_date: prescription.recurring_end_date
      });

      // Mettre à jour l'ancienne prescription
      await base44.entities.Prescription.update(prescription.id, {
        tracking_status: 'COMPLETED',
        next_renewal_date: null
      });

      return newPrescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientPrescriptions', patient.id] });
      handleSuccess('Prescription renouvelée avec succès');
      setRenewingId(null);
    },
    onError: (error) => {
      handleError(error, 'Renouvellement');
      setRenewingId(null);
    }
  });

  const handleRenew = (prescription) => {
    // Vérifier si max renewals atteint
    if (prescription.max_renewals && prescription.renewal_count >= prescription.max_renewals) {
      toast.error('Nombre maximum de renouvellements atteint');
      return;
    }
    setRenewingId(prescription.id);
    renewMutation.mutate(prescription);
  };

  const getRenewalStatus = (prescription) => {
    if (!prescription.next_renewal_date) return null;
    const nextDate = new Date(prescription.next_renewal_date);
    const daysUntil = differenceInDays(nextDate, new Date());

    if (daysUntil < 0) {
      return { status: 'overdue', label: `En retard de ${Math.abs(daysUntil)} jours`, color: 'bg-red-100 text-red-800' };
    } else if (daysUntil <= 7) {
      return { status: 'urgent', label: `Dans ${daysUntil} jours`, color: 'bg-orange-100 text-orange-800' };
    } else if (daysUntil <= 14) {
      return { status: 'soon', label: `Dans ${daysUntil} jours`, color: 'bg-yellow-100 text-yellow-800' };
    }
    return { status: 'ok', label: format(nextDate, 'dd/MM/yyyy'), color: 'bg-green-100 text-green-800' };
  };

  // Collecter tous les médicaments des prescriptions actives pour vérifier les interactions
  const allActiveMedications = recurringPrescriptions.flatMap(p => 
    p.medicaments?.map(m => m.nom_produit) || []
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            Traitements chroniques & Renouvellements
          </CardTitle>
          <div className="flex gap-2">
            {needsRenewal.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800 gap-1">
                <Bell className="w-3 h-3" />
                {needsRenewal.length} à renouveler
              </Badge>
            )}
            {overdueRenewals.length > 0 && (
              <Badge className="bg-red-100 text-red-800 gap-1">
                <AlertTriangle className="w-3 h-3" />
                {overdueRenewals.length} en retard
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alertes interactions pour tous les médicaments chroniques */}
        {allActiveMedications.length > 1 && (
          <DrugInteractionChecker 
            medications={allActiveMedications}
            patientMedications={patient.medicaments_actuels?.split(',').map(m => m.trim()) || []}
            showInline={true}
          />
        )}

        <Tabs defaultValue="to-renew">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="to-renew" className="gap-1">
              <Clock className="w-3 h-3" />
              À renouveler ({needsRenewal.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Actifs ({recurringPrescriptions.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <FileText className="w-3 h-3" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="to-renew" className="space-y-3 mt-4">
            {needsRenewal.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>Aucun renouvellement à prévoir dans les 14 prochains jours</p>
              </div>
            ) : (
              needsRenewal.map(prescription => {
                const status = getRenewalStatus(prescription);
                return (
                  <Card key={prescription.id} className={`border-l-4 ${status?.status === 'overdue' ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={status?.color}>
                              {status?.label}
                            </Badge>
                            {prescription.chronic_condition && (
                              <Badge variant="outline">{prescription.chronic_condition}</Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {prescription.medicaments?.map((med, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Pill className="w-3 h-3 text-blue-600" />
                                <span className="font-medium">{med.nom_produit}</span>
                                <span className="text-muted-foreground">- {med.posologie}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Renouvellement {prescription.renewal_count || 0}/{prescription.max_renewals || '∞'}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleRenew(prescription)}
                          disabled={renewingId === prescription.id}
                          className="gap-1"
                        >
                          {renewingId === prescription.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Renouveler
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-3 mt-4">
            {recurringPrescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun traitement chronique actif</p>
              </div>
            ) : (
              recurringPrescriptions.map(prescription => {
                const status = getRenewalStatus(prescription);
                return (
                  <Card key={prescription.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-purple-50 gap-1">
                              <RefreshCw className="w-3 h-3" />
                              {prescription.recurring_frequency === 'monthly' ? 'Mensuel' :
                               prescription.recurring_frequency === 'quarterly' ? 'Trimestriel' :
                               prescription.recurring_frequency}
                            </Badge>
                            {prescription.chronic_condition && (
                              <Badge variant="secondary">{prescription.chronic_condition}</Badge>
                            )}
                            {status && (
                              <Badge className={status.color}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {prescription.medicaments?.map((med, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Pill className="w-3 h-3 text-blue-600" />
                                <span className="font-medium">{med.nom_produit}</span>
                                <span className="text-muted-foreground">- {med.posologie}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <span>Depuis: {format(new Date(prescription.date_prescription), 'dd/MM/yyyy')}</span>
                            <span>Renouvellements: {prescription.renewal_count || 0}/{prescription.max_renewals || '∞'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRenew(prescription)}
                            disabled={renewingId === prescription.id}
                            className="gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Dupliquer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {prescriptions.filter(p => p.tracking_status === 'COMPLETED' || p.archived).slice(0, 10).map(prescription => (
              <Card key={prescription.id} className="opacity-75">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {prescription.medicaments?.map(m => m.nom_produit).join(', ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(prescription.date_prescription), 'dd/MM/yyyy', { locale: fr })}
                        {prescription.chronic_condition && ` • ${prescription.chronic_condition}`}
                      </div>
                    </div>
                    <Badge variant="outline">Terminée</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}