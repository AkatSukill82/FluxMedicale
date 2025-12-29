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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  FileSignature,
  Send,
  Loader2,
  Pill,
  Search,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as RecipEService from "./RecipEService";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const isSimulation = RecipEService.isSimulationMode();

const FORMES = [
  "Comprimé",
  "Gélule",
  "Sirop",
  "Solution",
  "Pommade",
  "Crème",
  "Gel",
  "Injection",
  "Suppositoire",
  "Patch",
  "Gouttes",
  "Spray",
  "Inhalateur",
];

const PRESCRIPTION_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "chronique", label: "Chronique" },
  { value: "urgence", label: "Urgence" },
  { value: "hospitaliere", label: "Hospitalière" },
];

export default function EPrescriptionForm({ isOpen, onClose, prescription, user }) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState("");
  const [drugSearch, setDrugSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recipEError, setRecipEError] = useState(null);

  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    patient_niss: "",
    type_prescription: "standard",
    date_validite_debut: format(new Date(), "yyyy-MM-dd"),
    date_validite_fin: format(addDays(new Date(), 90), "yyyy-MM-dd"),
    medicaments: [],
    notes_pharmacien: "",
    renouvellement: {
      autorise: false,
      nombre_max: 0,
      intervalle_jours: 30,
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.list("-created_date", 200),
  });

  // Recherche de médicaments via Recip-e/SAM
  const handleDrugSearch = async (query) => {
    setDrugSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const result = await RecipEService.searchMedications(query, { limit: 15 });
      if (result.success) {
        setSearchResults(result.data.medications);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Erreur recherche médicaments:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (prescription) {
      setFormData({
        ...prescription,
        medicaments: prescription.medicaments || [],
        renouvellement: prescription.renouvellement || {
          autorise: false,
          nombre_max: 0,
          intervalle_jours: 30,
        },
      });
    }
  }, [prescription]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        medecin_email: user?.email,
        medecin_nom: user?.full_name,
        medecin_inami: user?.numero_inami,
        date_prescription: new Date().toISOString(),
      };

      if (prescription?.id) {
        return base44.entities.EPrescription.update(prescription.id, payload);
      } else {
        return base44.entities.EPrescription.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eprescriptions"] });
      toast.success(prescription ? "Prescription mise à jour" : "Prescription créée");
      onClose();
    },
    onError: (error) => {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    },
  });

  const signAndSendMutation = useMutation({
    mutationFn: async (data) => {
      setRecipEError(null);
      
      // Appel au service Recip-e
      const recipEResult = await RecipEService.createPrescription(
        {
          ...data,
          medecin_inami: user?.numero_inami,
        },
        user?.numero_inami
      );

      if (!recipEResult.success) {
        throw new Error(RecipEService.getErrorMessage(recipEResult.error?.code) || recipEResult.error?.message);
      }

      const { rid, barcode } = recipEResult.data;

      const payload = {
        ...data,
        medecin_email: user?.email,
        medecin_nom: user?.full_name,
        medecin_inami: user?.numero_inami,
        date_prescription: new Date().toISOString(),
        statut: "envoye",
        rid,
        barcode,
        signature_date: new Date().toISOString(),
        signature_hash: btoa(JSON.stringify(data)).substr(0, 32),
        envoi_date: new Date().toISOString(),
      };

      if (prescription?.id) {
        return base44.entities.EPrescription.update(prescription.id, payload);
      } else {
        return base44.entities.EPrescription.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eprescriptions"] });
      toast.success(isSimulation 
        ? "Prescription créée (mode simulation)" 
        : "Prescription signée et envoyée via Recip-e"
      );
      onClose();
    },
    onError: (error) => {
      setRecipEError(error.message);
      toast.error(error.message || "Erreur lors de l'envoi à Recip-e");
    },
  });

  const handlePatientSelect = (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const officialName = patient.name?.find((n) => n.use === "official") || {};
      const fullName = `${(officialName.given || []).join(" ")} ${officialName.family || ""}`.trim();
      const niss = patient.identifier?.find((i) => i.system?.includes("ssin"))?.value || "";

      setFormData((prev) => ({
        ...prev,
        patient_id: patientId,
        patient_name: fullName,
        patient_niss: niss,
      }));
    }
  };

  const addMedicament = (drug = null) => {
    const newMed = drug
      ? {
          nom: drug.name || drug.nom,
          cnk: drug.cnk || "",
          dci: drug.dci || "",
          dosage: drug.dosage || "",
          forme: drug.forme || "Comprimé",
          posologie: "",
          quantite: 1,
          duree_jours: 30,
          instructions: "",
          substitution_autorisee: true,
        }
      : {
          nom: "",
          cnk: "",
          dci: "",
          dosage: "",
          forme: "Comprimé",
          posologie: "",
          quantite: 1,
          duree_jours: 30,
          instructions: "",
          substitution_autorisee: true,
        };

    setFormData((prev) => ({
      ...prev,
      medicaments: [...prev.medicaments, newMed],
    }));
    setDrugSearch("");
    setSearchResults([]);
  };

  const updateMedicament = (index, field, value) => {
    const newMeds = [...formData.medicaments];
    newMeds[index][field] = value;
    setFormData((prev) => ({ ...prev, medicaments: newMeds }));
  };

  const removeMedicament = (index) => {
    setFormData((prev) => ({
      ...prev,
      medicaments: prev.medicaments.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!formData.patient_id) {
      toast.error("Veuillez sélectionner un patient");
      return;
    }
    if (formData.medicaments.length === 0) {
      toast.error("Veuillez ajouter au moins un médicament");
      return;
    }
    saveMutation.mutate({ ...formData, statut: "brouillon" });
  };

  const handleSignAndSend = () => {
    if (!formData.patient_id) {
      toast.error("Veuillez sélectionner un patient");
      return;
    }
    if (formData.medicaments.length === 0) {
      toast.error("Veuillez ajouter au moins un médicament");
      return;
    }
    signAndSendMutation.mutate(formData);
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const officialName = p.name?.find((n) => n.use === "official") || {};
    const fullName = `${(officialName.given || []).join(" ")} ${officialName.family || ""}`.toLowerCase();
    return fullName.includes(patientSearch.toLowerCase());
  });



  const isPending = saveMutation.isPending || signAndSendMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {prescription ? "Modifier la prescription" : "Nouvelle e-Prescription"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Mode simulation warning */}
            {isSimulation && (
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Mode simulation actif.</strong> Les prescriptions ne sont pas envoyées à Recip-e. 
                  Configurez les certificats eHealth pour une intégration réelle.
                </AlertDescription>
              </Alert>
            )}

            {/* Erreur Recip-e */}
            {recipEError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Erreur Recip-e:</strong> {recipEError}
                </AlertDescription>
              </Alert>
            )}

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
                {formData.patient_niss && (
                  <p className="text-xs text-gray-500 mt-1">
                    NISS: {formData.patient_niss}
                  </p>
                )}
              </div>
              <div>
                <Label>Type de prescription</Label>
                <Select
                  value={formData.type_prescription}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, type_prescription: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESCRIPTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates de validité */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Début de validité</Label>
                <Input
                  type="date"
                  value={formData.date_validite_debut}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date_validite_debut: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Fin de validité</Label>
                <Input
                  type="date"
                  value={formData.date_validite_fin}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date_validite_fin: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Médicaments */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Médicaments
                  </Label>
                </div>

                {/* Recherche de médicaments via Recip-e/SAM */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un médicament (nom, DCI, CNK)..."
                    value={drugSearch}
                    onChange={(e) => handleDrugSearch(e.target.value)}
                    className="pl-10"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <Card className="absolute z-10 w-full mt-1 max-h-64 overflow-y-auto shadow-lg">
                      <CardContent className="p-2">
                        {searchResults.map((drug, idx) => (
                          <div
                            key={drug.cnk || idx}
                            onClick={() => addMedicament(drug)}
                            className="p-2 hover:bg-blue-50 rounded cursor-pointer border-b last:border-0"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{drug.name}</p>
                                <p className="text-xs text-gray-500">
                                  {drug.dci} • {drug.dosage} • {drug.forme}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 font-mono">
                                {drug.cnk}
                              </span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addMedicament()}
                  className="mb-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter manuellement
                </Button>

                {formData.medicaments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun médicament. Recherchez ou ajoutez manuellement.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {formData.medicaments.map((med, index) => (
                      <Card key={index} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium">Médicament {index + 1}</h4>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMedicament(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nom</Label>
                              <Input
                                value={med.nom}
                                onChange={(e) =>
                                  updateMedicament(index, "nom", e.target.value)
                                }
                                placeholder="Nom du médicament"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Dosage</Label>
                              <Input
                                value={med.dosage}
                                onChange={(e) =>
                                  updateMedicament(index, "dosage", e.target.value)
                                }
                                placeholder="Ex: 500mg"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Forme</Label>
                              <Select
                                value={med.forme}
                                onValueChange={(v) =>
                                  updateMedicament(index, "forme", v)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FORMES.map((f) => (
                                    <SelectItem key={f} value={f}>
                                      {f}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Quantité</Label>
                              <Input
                                type="number"
                                value={med.quantite}
                                onChange={(e) =>
                                  updateMedicament(
                                    index,
                                    "quantite",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                min={1}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Posologie</Label>
                              <Input
                                value={med.posologie}
                                onChange={(e) =>
                                  updateMedicament(index, "posologie", e.target.value)
                                }
                                placeholder="Ex: 1 comprimé 3x/jour"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Durée (jours)</Label>
                              <Input
                                type="number"
                                value={med.duree_jours}
                                onChange={(e) =>
                                  updateMedicament(
                                    index,
                                    "duree_jours",
                                    parseInt(e.target.value) || 30
                                  )
                                }
                                min={1}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <Switch
                                checked={med.substitution_autorisee}
                                onCheckedChange={(v) =>
                                  updateMedicament(index, "substitution_autorisee", v)
                                }
                              />
                              <Label className="text-xs">Substitution autorisée</Label>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Instructions</Label>
                              <Input
                                value={med.instructions}
                                onChange={(e) =>
                                  updateMedicament(index, "instructions", e.target.value)
                                }
                                placeholder="Instructions spécifiques..."
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Renouvellement */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="font-semibold">Renouvellement</Label>
                  <Switch
                    checked={formData.renouvellement.autorise}
                    onCheckedChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        renouvellement: { ...prev.renouvellement, autorise: v },
                      }))
                    }
                  />
                </div>
                {formData.renouvellement.autorise && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Nombre max de renouvellements</Label>
                      <Input
                        type="number"
                        value={formData.renouvellement.nombre_max}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            renouvellement: {
                              ...prev.renouvellement,
                              nombre_max: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Intervalle (jours)</Label>
                      <Input
                        type="number"
                        value={formData.renouvellement.intervalle_jours}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            renouvellement: {
                              ...prev.renouvellement,
                              intervalle_jours: parseInt(e.target.value) || 30,
                            },
                          }))
                        }
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes pharmacien */}
            <div>
              <Label>Instructions pour le pharmacien</Label>
              <Textarea
                value={formData.notes_pharmacien}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes_pharmacien: e.target.value,
                  }))
                }
                placeholder="Instructions spéciales pour le pharmacien..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer brouillon
          </Button>
          <Button
            onClick={handleSignAndSend}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {signAndSendMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <>
                <FileSignature className="w-4 h-4 mr-2" />
                Signer & Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}