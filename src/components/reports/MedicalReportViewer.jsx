import React from "react";
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
import { Edit, Download, User, Calendar, FileText, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const REPORT_TYPES = {
  consultation: { label: "Consultation", color: "bg-blue-100 text-blue-700" },
  hospitalisation: { label: "Hospitalisation", color: "bg-purple-100 text-purple-700" },
  chirurgie: { label: "Chirurgie", color: "bg-red-100 text-red-700" },
  specialiste: { label: "Spécialiste", color: "bg-green-100 text-green-700" },
  urgence: { label: "Urgence", color: "bg-orange-100 text-orange-700" },
  suivi: { label: "Suivi", color: "bg-cyan-100 text-cyan-700" },
  autre: { label: "Autre", color: "bg-gray-100 text-gray-700" },
};

const STATUS_BADGES = {
  brouillon: { label: "Brouillon", color: "bg-yellow-100 text-yellow-700" },
  finalise: { label: "Finalisé", color: "bg-green-100 text-green-700" },
  envoye: { label: "Envoyé", color: "bg-blue-100 text-blue-700" },
};

function Section({ title, content }) {
  if (!content) return null;
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
      <p className="text-gray-600 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function MedicalReportViewer({ isOpen, onClose, report, onEdit, onGeneratePDF }) {
  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{report.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={REPORT_TYPES[report.report_type]?.color}>
                  {REPORT_TYPES[report.report_type]?.label}
                </Badge>
                <Badge className={STATUS_BADGES[report.statut]?.color}>
                  {STATUS_BADGES[report.statut]?.label}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4 space-y-6">
            {/* Meta info */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Patient:</span>
                    <span className="font-medium">{report.patient_name || "Non lié"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">
                      {report.date_rapport
                        ? format(new Date(report.date_rapport), "dd MMMM yyyy", { locale: fr })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Médecin:</span>
                    <span className="font-medium">{report.medecin_nom || report.medecin_email}</span>
                  </div>
                  {report.destinataire && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500">Destinataire:</span>
                      <span className="font-medium">{report.destinataire}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Content */}
            <div className="space-y-4">
              <Section title="Diagnostic" content={report.diagnostic} />
              <Section title="Traitement" content={report.traitement} />
              <Section title="Pronostic" content={report.pronostic} />
              <Section title="Observations cliniques" content={report.observations} />
              <Section title="Antécédents" content={report.antecedents} />
              <Section title="Examens complémentaires" content={report.examens_complementaires} />
              <Section title="Conclusion" content={report.conclusion} />
            </div>

            {/* Custom fields */}
            {report.custom_fields?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Champs personnalisés
                  </h4>
                  <div className="space-y-2">
                    {report.custom_fields.map((field, index) => (
                      <div key={index} className="flex">
                        <span className="text-gray-500 min-w-[150px]">{field.label}:</span>
                        <span className="text-gray-700">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <Button onClick={onGeneratePDF} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Générer PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}