import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Send,
  FileSignature,
  User,
  Calendar,
  Pill,
  QrCode,
  Printer,
  XCircle,
  Loader2,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as RecipEService from "./RecipEService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

const STATUS_CONFIG = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  signe: { label: "Signé", color: "bg-blue-100 text-blue-700" },
  envoye: { label: "Envoyé", color: "bg-green-100 text-green-700" },
  delivre: { label: "Délivré", color: "bg-purple-100 text-purple-700" },
  annule: { label: "Annulé", color: "bg-red-100 text-red-700" },
  expire: { label: "Expiré", color: "bg-orange-100 text-orange-700" },
};

export default function EPrescriptionViewer({
  isOpen,
  onClose,
  prescription,
  onEdit,
  onRefresh,
}) {
  const queryClient = useQueryClient();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [recipEStatus, setRecipEStatus] = useState(null);

  const isSimulation = RecipEService.isSimulationMode();

  // Rafraîchir le statut depuis Recip-e
  const handleRefreshStatus = async () => {
    if (!prescription.rid) {
      toast.error("Pas de RID pour cette prescription");
      return;
    }

    setIsRefreshingStatus(true);
    setStatusError(null);

    try {
      const result = await RecipEService.getPrescriptionStatus(prescription.rid);
      
      if (result.success) {
        setRecipEStatus(result.data);
        
        // Mettre à jour le statut local si différent
        const statusMap = {
          "CREATED": "envoye",
          "DELIVERED": "delivre",
          "PARTIALLY_DELIVERED": "delivre",
          "EXPIRED": "expire",
          "REVOKED": "annule"
        };
        
        const newStatus = statusMap[result.data.status];
        if (newStatus && newStatus !== prescription.statut) {
          await base44.entities.EPrescription.update(prescription.id, {
            statut: newStatus
          });
          queryClient.invalidateQueries({ queryKey: ["eprescriptions"] });
          toast.success(`Statut mis à jour: ${STATUS_CONFIG[newStatus]?.label}`);
          onRefresh?.();
        } else {
          toast.info(isSimulation ? "[Simulation] Statut vérifié" : "Statut à jour");
        }
      } else {
        setStatusError(RecipEService.getErrorMessage(result.error?.code));
        toast.error(RecipEService.getErrorMessage(result.error?.code));
      }
    } catch (error) {
      setStatusError("Erreur de communication avec Recip-e");
      toast.error("Erreur de communication avec Recip-e");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const signMutation = useMutation({
    mutationFn: async () => {
      const result = await RecipEService.createPrescription(prescription, prescription.medecin_inami);
      
      if (!result.success) {
        throw new Error(RecipEService.getErrorMessage(result.error?.code));
      }

      return base44.entities.EPrescription.update(prescription.id, {
        statut: "signe",
        rid: result.data.rid,
        barcode: result.data.barcode,
        signature_date: new Date().toISOString(),
        signature_hash: btoa(JSON.stringify(prescription)).substr(0, 32),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eprescriptions"] });
      toast.success(isSimulation ? "Prescription signée (simulation)" : "Prescription signée");
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la signature");
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.EPrescription.update(prescription.id, {
        statut: "envoye",
        envoi_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eprescriptions"] });
      toast.success("Prescription envoyée via Recip-e");
      onRefresh?.();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Annuler dans Recip-e si un RID existe
      if (prescription.rid) {
        const result = await RecipEService.cancelPrescription(prescription.rid, "Annulation par le médecin");
        if (!result.success) {
          throw new Error(RecipEService.getErrorMessage(result.error?.code));
        }
      }
      
      return base44.entities.EPrescription.update(prescription.id, {
        statut: "annule",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eprescriptions"] });
      toast.success(isSimulation ? "Prescription annulée (simulation)" : "Prescription annulée dans Recip-e");
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'annulation");
    },
  });

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(16);
      doc.text("PRESCRIPTION ÉLECTRONIQUE", pageWidth / 2, y, { align: "center" });
      y += 15;

      // RID/Barcode
      if (prescription.rid) {
        doc.setFontSize(12);
        doc.text(`RID: ${prescription.rid}`, pageWidth / 2, y, { align: "center" });
        y += 10;
      }

      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Patient info
      doc.setFontSize(11);
      doc.text("PATIENT", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(`Nom: ${prescription.patient_name || "-"}`, margin, y);
      y += 5;
      doc.text(`NISS: ${prescription.patient_niss || "-"}`, margin, y);
      y += 10;

      // Médecin info
      doc.setFontSize(11);
      doc.text("PRESCRIPTEUR", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(`Dr. ${prescription.medecin_nom || "-"}`, margin, y);
      y += 5;
      doc.text(`INAMI: ${prescription.medecin_inami || "-"}`, margin, y);
      y += 5;
      doc.text(
        `Date: ${prescription.date_prescription ? format(new Date(prescription.date_prescription), "dd/MM/yyyy") : "-"}`,
        margin,
        y
      );
      y += 15;

      // Médicaments
      doc.setFontSize(11);
      doc.text("MÉDICAMENTS PRESCRITS", margin, y);
      y += 10;

      prescription.medicaments?.forEach((med, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`${idx + 1}. ${med.nom} ${med.dosage || ""}`, margin, y);
        y += 5;
        doc.setFont(undefined, "normal");
        doc.text(`   Forme: ${med.forme} | Quantité: ${med.quantite}`, margin, y);
        y += 5;
        doc.text(`   Posologie: ${med.posologie || "-"}`, margin, y);
        y += 5;
        doc.text(`   Durée: ${med.duree_jours} jours`, margin, y);
        y += 8;
      });

      // Notes
      if (prescription.notes_pharmacien) {
        y += 5;
        doc.setFontSize(10);
        doc.text("Instructions pharmacien:", margin, y);
        y += 5;
        doc.text(prescription.notes_pharmacien, margin, y);
      }

      // Validité
      y += 15;
      doc.setFontSize(9);
      doc.text(
        `Validité: ${prescription.date_validite_debut || "-"} au ${prescription.date_validite_fin || "-"}`,
        margin,
        y
      );

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => printWindow.print();
      }
      toast.success("Document prêt à imprimer");
    } catch (error) {
      toast.error("Erreur lors de la génération");
    } finally {
      setIsPrinting(false);
    }
  };

  if (!prescription) return null;

  const canEdit = prescription.statut === "brouillon";
  const canSign = prescription.statut === "brouillon";
  const canSend = prescription.statut === "signe";
  const canCancel = ["brouillon", "signe", "envoye"].includes(prescription.statut);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-600" />
                e-Prescription
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={STATUS_CONFIG[prescription.statut]?.color}>
                  {STATUS_CONFIG[prescription.statut]?.label}
                </Badge>
                {prescription.rid && (
                  <Badge variant="outline" className="font-mono">
                    <QrCode className="w-3 h-3 mr-1" />
                    {prescription.rid}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4 space-y-6">
            {/* Mode simulation */}
            {isSimulation && (
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Mode simulation - Les données Recip-e sont simulées
                </AlertDescription>
              </Alert>
            )}

            {/* Erreur statut */}
            {statusError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  {statusError}
                </AlertDescription>
              </Alert>
            )}

            {/* Statut Recip-e */}
            {recipEStatus && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Statut Recip-e:</strong> {recipEStatus.status}
                  {recipEStatus.deliveryInfo && (
                    <span className="block mt-1">
                      Délivré par: {recipEStatus.deliveryInfo.pharmacyName}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Meta info */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Patient:</span>
                    <span className="font-medium">{prescription.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">NISS:</span>
                    <span className="font-medium font-mono">
                      {prescription.patient_niss || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">
                      {prescription.date_prescription
                        ? format(
                            new Date(prescription.date_prescription),
                            "dd MMMM yyyy",
                            { locale: fr }
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Médecin:</span>
                    <span className="font-medium">{prescription.medecin_nom}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-4 pt-4 border-t flex items-center gap-6 text-xs">
                  {prescription.signature_date && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <FileSignature className="w-3 h-3" />
                      Signé le{" "}
                      {format(new Date(prescription.signature_date), "dd/MM/yyyy HH:mm")}
                    </div>
                  )}
                  {prescription.envoi_date && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Send className="w-3 h-3" />
                      Envoyé le{" "}
                      {format(new Date(prescription.envoi_date), "dd/MM/yyyy HH:mm")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Médicaments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Médicaments prescrits
              </h4>
              <div className="space-y-3">
                {prescription.medicaments?.map((med, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-semibold">
                            {med.nom} {med.dosage}
                          </h5>
                          <p className="text-sm text-gray-500">
                            {med.forme} • Quantité: {med.quantite} • Durée:{" "}
                            {med.duree_jours} jours
                          </p>
                          {med.posologie && (
                            <p className="text-sm mt-1">
                              <span className="text-gray-500">Posologie:</span>{" "}
                              {med.posologie}
                            </p>
                          )}
                          {med.instructions && (
                            <p className="text-sm text-gray-600 mt-1">
                              {med.instructions}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {med.substitution_autorisee
                            ? "Substitution OK"
                            : "Non substituable"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Validité & Renouvellement */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Validité
                  </h5>
                  <p className="text-sm">
                    Du{" "}
                    <span className="font-medium">
                      {prescription.date_validite_debut || "-"}
                    </span>{" "}
                    au{" "}
                    <span className="font-medium">
                      {prescription.date_validite_fin || "-"}
                    </span>
                  </p>
                </CardContent>
              </Card>
              {prescription.renouvellement?.autorise && (
                <Card>
                  <CardContent className="p-4">
                    <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Renouvellement
                    </h5>
                    <p className="text-sm">
                      Max {prescription.renouvellement.nombre_max} fois, tous les{" "}
                      {prescription.renouvellement.intervalle_jours} jours
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Notes */}
            {prescription.notes_pharmacien && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Instructions pharmacien
                </h4>
                <p className="text-gray-600 bg-yellow-50 p-3 rounded-lg">
                  {prescription.notes_pharmacien}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {canCancel && (
              <Button
                variant="ghost"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Annuler
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {prescription.rid && (
              <Button
                variant="outline"
                onClick={handleRefreshStatus}
                disabled={isRefreshingStatus}
              >
                {isRefreshingStatus ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Vérifier statut
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Imprimer
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
            {canSign && (
              <Button
                onClick={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {signMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSignature className="w-4 h-4 mr-2" />
                )}
                Signer
              </Button>
            )}
            {canSend && (
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer Recip-e
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}