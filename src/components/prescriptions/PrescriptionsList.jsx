import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Pill,
  MoreVertical,
  Eye,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Bell,
  Printer
} from 'lucide-react';
import { format, addDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import PrescriptionDetailModal from './PrescriptionDetailModal';
import CreateReminderModal from './CreateReminderModal';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  COMPLETED: { label: 'Terminée', color: 'bg-slate-100 text-slate-800', icon: CheckCircle },
  DISCONTINUED: { label: 'Arrêtée', color: 'bg-red-100 text-red-800', icon: XCircle },
  ON_HOLD: { label: 'En pause', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PENDING: { label: 'En attente', color: 'bg-blue-100 text-blue-800', icon: Clock }
};

export default function PrescriptionsList({ prescriptions, patientsMap, onRefresh, isArchived = false }) {
  const queryClient = useQueryClient();
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderPrescription, setReminderPrescription] = useState(null);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Prescription.update(id, { tracking_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPrescriptions'] });
      toast.success('Statut mis à jour');
      onRefresh?.();
    }
  });

  const handleCreateReminder = (prescription) => {
    setReminderPrescription(prescription);
    setShowReminderModal(true);
  };

  const getPatientName = (patientId) => {
    const patient = patientsMap[patientId];
    if (!patient) return 'Patient inconnu';
    return `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim();
  };

  const isExpiringSoon = (prescription) => {
    return prescription.medicaments?.some(m => {
      if (!m.duree_traitement) return false;
      const startDate = new Date(prescription.date_prescription);
      const days = parseInt(m.duree_traitement) || 30;
      const endDate = addDays(startDate, days);
      return isBefore(endDate, addDays(new Date(), 7));
    });
  };

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{isArchived ? 'Aucune prescription archivée' : 'Aucune prescription active'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {prescriptions.map((prescription) => {
        const status = prescription.tracking_status || 'ACTIVE';
        const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
        const StatusIcon = statusConfig.icon;
        const patientName = getPatientName(prescription.patient_id);
        const expiringSoon = !isArchived && isExpiringSoon(prescription);

        return (
          <Card 
            key={prescription.id} 
            className={`hover:shadow-md transition-shadow ${expiringSoon ? 'border-orange-300 bg-orange-50/50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Patient et date */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{patientName}</span>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    {expiringSoon && (
                      <Badge className="bg-orange-500 text-white">
                        <Clock className="w-3 h-3 mr-1" />
                        À renouveler
                      </Badge>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4" />
                    {prescription.date_prescription && 
                      format(new Date(prescription.date_prescription), 'dd MMMM yyyy', { locale: fr })}
                  </div>

                  {/* Médicaments */}
                  <div className="flex flex-wrap gap-2">
                    {prescription.medicaments?.slice(0, 4).map((med, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1">
                        <Pill className="w-3 h-3" />
                        {med.nom_produit}
                        {med.posologie && <span className="text-muted-foreground">- {med.posologie}</span>}
                      </Badge>
                    ))}
                    {prescription.medicaments?.length > 4 && (
                      <Badge variant="outline">+{prescription.medicaments.length - 4} autres</Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedPrescription(prescription)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreateReminder(prescription)}>
                      <Bell className="w-4 h-4 mr-2" />
                      Créer un rappel
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {status === 'ACTIVE' && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => updateStatusMutation.mutate({ id: prescription.id, status: 'COMPLETED' })}
                        >
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Marquer terminée
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateStatusMutation.mutate({ id: prescription.id, status: 'DISCONTINUED' })}
                          className="text-red-600"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Arrêter
                        </DropdownMenuItem>
                      </>
                    )}
                    {(status === 'COMPLETED' || status === 'DISCONTINUED') && (
                      <DropdownMenuItem 
                        onClick={() => updateStatusMutation.mutate({ id: prescription.id, status: 'ACTIVE' })}
                      >
                        <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                        Réactiver
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Modal détail */}
      {selectedPrescription && (
        <PrescriptionDetailModal
          prescription={selectedPrescription}
          patient={patientsMap[selectedPrescription.patient_id]}
          isOpen={!!selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
        />
      )}

      {/* Modal rappel */}
      {showReminderModal && reminderPrescription && (
        <CreateReminderModal
          prescription={reminderPrescription}
          patient={patientsMap[reminderPrescription.patient_id]}
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setReminderPrescription(null);
          }}
        />
      )}
    </div>
  );
}