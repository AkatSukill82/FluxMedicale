import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const REPORT_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "hospitalisation", label: "Hospitalisation" },
  { value: "chirurgie", label: "Chirurgie" },
  { value: "specialiste", label: "Spécialiste" },
  { value: "urgence", label: "Urgence" },
  { value: "suivi", label: "Suivi" },
  { value: "autre", label: "Autre" },
];

export default function MedicalReportForm({ isOpen, onClose, report, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    report_type: "consultation",
    title: "",
    date_rapport: format(new Date(), "yyyy-MM-dd"),
    diagnostic: "",
    traitement: "",
    pronostic: "",
    observations: "",
    antecedents: "",
    examens_complementaires: "",
    conclusion: "",
    destinataire: "",
    statut: "brouillon",
    custom_fields: [],
  });
  const [patientSearch, setPatientSearch] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.list("-created_date", 200),
  });

  useEffect(() => {
    if (report) {
      setFormData({
        ...report,
        custom_fields: report.custom_fields || [],
      });
    }
  }, [report]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        medecin_email: user?.email,
        medecin_nom: user?.full_name,
      };

      if (report?.id) {
        return base44.entities.MedicalReport.update(report.id, payload);
      } else {
        return base44.entities.MedicalReport.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicalReports"] });
      toast.success(report ? "Rapport mis à jour" : "Rapport créé");
      onClose();
    },
    onError: (error) => {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePatientSelect = (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const officialName = patient.name?.find((n) => n.use === "official") || {};
      const fullName = `${(officialName.given || []).join(" ")} ${officialName.family || ""}`.trim();
      setFormData((prev) => ({
        ...prev,
        patient_id: patientId,
        patient_name: fullName,
      }));
    }
  };

  const addCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { label: "", value: "" }],
    }));
  };

  const updateCustomField = (index, field, value) => {
    const newFields = [...formData.custom_fields];
    newFields[index][field] = value;
    setFormData((prev) => ({ ...prev, custom_fields: newFields }));
  };

  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index),
    }));
  };

  const handleSave = (asFinal = false) => {
    if (!formData.title || !formData.patient_id) {
      toast.error("Le titre et le patient sont obligatoires");
      return;
    }

    saveMutation.mutate({
      ...formData,
      statut: asFinal ? "finalise" : "brouillon",
    });
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const officialName = p.name?.find((n) => n.use === "official") || {};
    const fullName = `${(officialName.given || []).join(" ")} ${officialName.family || ""}`.toLowerCase();
    return fullName.includes(patientSearch.toLowerCase());
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {report ? "Modifier le rapport" : "Nouveau rapport médical"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Patient & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient *</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={handlePatientSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Rechercher..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {filteredPatients.slice(0, 20).map((p) => {
                      const officialName = p.name?.find((n) => n.use === "official") || {};
                      const fullName = `${(officialName.given || []).join(" ")} ${officialName.family || ""}`;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {fullName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de rapport</Label>
                <Select
                  value={formData.report_type}
                  onValueChange={(v) => handleChange("report_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Titre du rapport *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ex: Consultation de suivi"
                />
              </div>
              <div>
                <Label>Date du rapport</Label>
                <Input
                  type="date"
                  value={formData.date_rapport}
                  onChange={(e) => handleChange("date_rapport", e.target.value)}
                />
              </div>
            </div>

            {/* Destinataire */}
            <div>
              <Label>Destinataire (optionnel)</Label>
              <Input
                value={formData.destinataire}
                onChange={(e) => handleChange("destinataire", e.target.value)}
                placeholder="Ex: Dr. Martin, Cardiologue"
              />
            </div>

            {/* Medical Fields */}
            <div className="space-y-4">
              <div>
                <Label>Diagnostic</Label>
                <Textarea
                  value={formData.diagnostic}
                  onChange={(e) => handleChange("diagnostic", e.target.value)}
                  placeholder="Décrivez le diagnostic..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Traitement</Label>
                <Textarea
                  value={formData.traitement}
                  onChange={(e) => handleChange("traitement", e.target.value)}
                  placeholder="Traitement prescrit ou recommandé..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Pronostic</Label>
                <Textarea
                  value={formData.pronostic}
                  onChange={(e) => handleChange("pronostic", e.target.value)}
                  placeholder="Pronostic médical..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Observations cliniques</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => handleChange("observations", e.target.value)}
                  placeholder="Observations lors de l'examen..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Antécédents pertinents</Label>
                <Textarea
                  value={formData.antecedents}
                  onChange={(e) => handleChange("antecedents", e.target.value)}
                  placeholder="Antécédents médicaux pertinents..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Examens complémentaires</Label>
                <Textarea
                  value={formData.examens_complementaires}
                  onChange={(e) =>
                    handleChange("examens_complementaires", e.target.value)
                  }
                  placeholder="Examens réalisés ou à réaliser..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Conclusion</Label>
                <Textarea
                  value={formData.conclusion}
                  onChange={(e) => handleChange("conclusion", e.target.value)}
                  placeholder="Conclusion du rapport..."
                  rows={3}
                />
              </div>
            </div>

            {/* Custom Fields */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">
                    Champs personnalisés
                  </Label>
                  <Button variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {formData.custom_fields.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun champ personnalisé. Cliquez sur "Ajouter" pour en créer.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.custom_fields.map((field, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Input
                          placeholder="Label"
                          value={field.label}
                          onChange={(e) =>
                            updateCustomField(index, "label", e.target.value)
                          }
                          className="w-1/3"
                        />
                        <Input
                          placeholder="Valeur"
                          value={field.value}
                          onChange={(e) =>
                            updateCustomField(index, "value", e.target.value)
                          }
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomField(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer brouillon
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Finaliser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}