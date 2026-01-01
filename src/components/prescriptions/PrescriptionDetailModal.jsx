import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pill,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Printer,
  Download,
  Sparkles
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  COMPLETED: { label: 'Terminée', color: 'bg-slate-100 text-slate-800', icon: CheckCircle },
  DISCONTINUED: { label: 'Arrêtée', color: 'bg-red-100 text-red-800', icon: XCircle },
  ON_HOLD: { label: 'En pause', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PENDING: { label: 'En attente', color: 'bg-blue-100 text-blue-800', icon: Clock }
};

export default function PrescriptionDetailModal({ prescription, patient, isOpen, onClose }) {
  const status = prescription.tracking_status || 'ACTIVE';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = statusConfig.icon;

  const patientName = patient ? 
    `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() : 
    'Patient inconnu';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              Détail de la prescription
            </span>
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">{patientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Prescription du {prescription.date_prescription && 
                format(new Date(prescription.date_prescription), 'dd MMMM yyyy', { locale: fr })}
            </div>
            {prescription.medecin_email && (
              <p className="text-sm text-muted-foreground mt-1">
                Par: {prescription.medecin_email}
              </p>
            )}
          </div>

          {/* Médicaments */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Médicaments ({prescription.medicaments?.length || 0})
            </h4>
            <div className="space-y-3">
              {prescription.medicaments?.map((med, idx) => {
                const startDate = new Date(prescription.date_prescription);
                const days = parseInt(med.duree_traitement) || 0;
                const endDate = days > 0 ? addDays(startDate, days) : null;

                return (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {med.nom_produit}
                          {med.isCustom && (
                            <Badge variant="outline" className="text-purple-600 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Personnalisé
                            </Badge>
                          )}
                        </p>
                        {med.posologie && (
                          <p className="text-sm text-muted-foreground">{med.posologie}</p>
                        )}
                      </div>
                      {med.quantite && (
                        <Badge variant="outline">Qté: {med.quantite}</Badge>
                      )}
                    </div>
                    {(med.duree_traitement || med.instructions) && (
                      <div className="mt-2 pt-2 border-t text-sm">
                        {med.duree_traitement && (
                          <p className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Durée: {med.duree_traitement} jours
                            {endDate && (
                              <span className="text-muted-foreground">
                                (jusqu'au {format(endDate, 'dd/MM/yyyy', { locale: fr })})
                              </span>
                            )}
                          </p>
                        )}
                        {med.instructions && (
                          <p className="text-muted-foreground mt-1">{med.instructions}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statut Recip-e */}
          {prescription.statut_recip_e && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm">
                <strong>Statut Recip-e:</strong> {prescription.statut_recip_e}
              </p>
              {prescription.recip_e_rid && (
                <p className="text-xs text-muted-foreground mt-1">
                  RID: {prescription.recip_e_rid}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}