import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Pill, Calendar, QrCode, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  signe: { label: "Signé", color: "bg-blue-100 text-blue-700" },
  envoye: { label: "Envoyé", color: "bg-green-100 text-green-700" },
  delivre: { label: "Délivré", color: "bg-purple-100 text-purple-700" },
  annule: { label: "Annulé", color: "bg-red-100 text-red-700" },
  expire: { label: "Expiré", color: "bg-orange-100 text-orange-700" },
};

export default function EPrescriptionHistory({ isOpen, onClose, patientId }) {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["eprescriptions-history", patientId],
    queryFn: async () => {
      const all = await base44.entities.EPrescription.filter(
        { patient_id: patientId },
        "-created_date",
        100
      );
      return all;
    },
    enabled: !!patientId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.list("-created_date", 200),
  });

  const patient = patients.find((p) => p.id === patientId);
  const patientName = patient
    ? `${(patient.name?.find((n) => n.use === "official")?.given || []).join(" ")} ${patient.name?.find((n) => n.use === "official")?.family || ""}`
    : "Patient";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des prescriptions
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="w-4 h-4" />
            {patientName}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                Aucune prescription pour ce patient
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_CONFIG[prescription.statut]?.color}>
                          {STATUS_CONFIG[prescription.statut]?.label}
                        </Badge>
                        {prescription.rid && (
                          <Badge variant="outline" className="font-mono text-xs">
                            <QrCode className="w-3 h-3 mr-1" />
                            {prescription.rid}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {prescription.date_prescription
                          ? format(
                              new Date(prescription.date_prescription),
                              "dd/MM/yyyy",
                              { locale: fr }
                            )
                          : "-"}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {prescription.medicaments?.map((med, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Pill className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{med.nom}</span>
                          <span className="text-gray-500">
                            {med.dosage} - {med.forme}
                          </span>
                          <span className="text-gray-400">
                            x{med.quantite} ({med.duree_jours}j)
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                      Prescrit par {prescription.medecin_nom}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}