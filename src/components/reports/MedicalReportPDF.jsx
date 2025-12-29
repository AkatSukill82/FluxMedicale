import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";

const REPORT_TYPE_LABELS = {
  consultation: "Consultation",
  hospitalisation: "Hospitalisation",
  chirurgie: "Chirurgie",
  specialiste: "Spécialiste",
  urgence: "Urgence",
  suivi: "Suivi",
  autre: "Autre",
};

export default function MedicalReportPDF({ report, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // Header
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("RAPPORT MÉDICAL", margin, y);
      doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth - margin, y, { align: "right" });
      y += 15;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text(report.title || "Rapport médical", margin, y);
      y += 10;

      // Type badge
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Type: ${REPORT_TYPE_LABELS[report.report_type] || "Autre"}`, margin, y);
      y += 15;

      // Separator
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Patient info
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("INFORMATIONS PATIENT", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Patient: ${report.patient_name || "Non spécifié"}`, margin, y);
      y += 6;
      doc.text(
        `Date du rapport: ${report.date_rapport ? format(new Date(report.date_rapport), "dd MMMM yyyy", { locale: fr }) : "-"}`,
        margin,
        y
      );
      y += 6;
      doc.text(`Médecin: ${report.medecin_nom || user?.full_name || "-"}`, margin, y);
      y += 6;
      if (report.destinataire) {
        doc.text(`Destinataire: ${report.destinataire}`, margin, y);
        y += 6;
      }
      y += 10;

      // Helper function to add section
      const addSection = (title, content) => {
        if (!content) return;
        
        // Check if we need a new page
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(title.toUpperCase(), margin, y);
        y += 7;

        doc.setFontSize(10);
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(content, contentWidth);
        lines.forEach((line) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 5;
        });
        y += 8;
      };

      // Content sections
      addSection("Diagnostic", report.diagnostic);
      addSection("Traitement", report.traitement);
      addSection("Pronostic", report.pronostic);
      addSection("Observations cliniques", report.observations);
      addSection("Antécédents", report.antecedents);
      addSection("Examens complémentaires", report.examens_complementaires);
      addSection("Conclusion", report.conclusion);

      // Custom fields
      if (report.custom_fields?.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("INFORMATIONS COMPLÉMENTAIRES", margin, y);
        y += 7;

        report.custom_fields.forEach((field) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(10);
          doc.setTextColor(60);
          doc.text(`${field.label}: ${field.value}`, margin, y);
          y += 6;
        });
        y += 8;
      }

      // Footer with signature zone
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y = Math.max(y, 240);
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("Signature du médecin:", margin, y);
      y += 20;
      doc.text(`Dr. ${report.medecin_nom || user?.full_name || ""}`, margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`N° INAMI: ${user?.numero_inami || "-"}`, margin, y);

      // Generate blob URL
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generatePDF();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `rapport_${report.patient_name?.replace(/\s+/g, "_") || "medical"}_${format(new Date(), "yyyyMMdd")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PDF téléchargé");
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Aperçu du rapport PDF</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-[500px] bg-gray-100 rounded-lg overflow-hidden">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Génération du PDF en cours...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Aperçu PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Erreur lors de la génération du PDF</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fermer
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!pdfUrl}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!pdfUrl}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}