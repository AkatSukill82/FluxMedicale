import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pill, 
  Calendar, 
  QrCode, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle,
  Send,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import EPrescriptionForm from "../../eprescription/EPrescriptionForm";
import EPrescriptionViewer from "../../eprescription/EPrescriptionViewer";

const STATUS_CONFIG = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: FileText },
  signe: { label: "Signé", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  envoye: { label: "Envoyé", color: "bg-green-100 text-green-700", icon: Send },
  delivre: { label: "Délivré", color: "bg-purple-100 text-purple-700", icon: CheckCircle },
  annule: { label: "Annulé", color: "bg-red-100 text-red-700", icon: XCircle },
  expire: { label: "Expiré", color: "bg-orange-100 text-orange-700", icon: Clock },
};

export default function EPrescriptionsTab({ patient }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["eprescriptions", patient.id],
    queryFn: async () => {
      const all = await base44.entities.EPrescription.list("-date_prescription", 200);
      return all.filter(p => p.patient_id === patient.id);
    },
    enabled: !!patient.id
  });

  const handleView = (prescription) => {
    setSelectedPrescription(prescription);
    setShowViewer(true);
  };

  const handleEdit = (prescription) => {
    setSelectedPrescription(prescription);
    setShowForm(true);
  };

  const handleNewPrescription = () => {
    setSelectedPrescription(null);
    setShowForm(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["eprescriptions", patient.id] });
  };

  // Extraire les infos FHIR du patient
  const officialName = patient.name?.find(n => n.use === 'official') || {};
  const patientFullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  const niss = patient.identifier?.find(id => id.system?.includes('ssin'))?.value || '';

  // Préremplir le formulaire avec les infos patient
  const initialPrescriptionData = {
    patient_id: patient.id,
    patient_name: patientFullName,
    patient_niss: niss,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">e-Prescriptions</h3>
          <p className="text-sm text-muted-foreground">
            {prescriptions.length} prescription(s) pour ce patient
          </p>
        </div>
        <Button onClick={handleNewPrescription} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle prescription
        </Button>
      </div>

      {/* Liste des prescriptions */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Pill className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Aucune e-prescription pour ce patient</p>
            <Button onClick={handleNewPrescription} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Créer une prescription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((prescription) => {
            const StatusIcon = STATUS_CONFIG[prescription.statut]?.icon || FileText;
            const statusConfig = STATUS_CONFIG[prescription.statut] || STATUS_CONFIG.brouillon;
            
            return (
              <Card 
                key={prescription.id} 
                className="hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => handleView(prescription)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Pill className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {prescription.rid && (
                            <Badge variant="outline" className="font-mono text-xs">
                              <QrCode className="w-3 h-3 mr-1" />
                              {prescription.rid}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {prescription.medicaments?.slice(0, 3).map((med, idx) => (
                            <p key={idx} className="text-sm">
                              <span className="font-medium">{med.nom}</span>
                              {med.dosage && <span className="text-gray-500"> {med.dosage}</span>}
                              {med.posologie && <span className="text-gray-500"> - {med.posologie}</span>}
                            </p>
                          ))}
                          {prescription.medicaments?.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{prescription.medicaments.length - 3} autre(s) médicament(s)
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {prescription.date_prescription 
                              ? format(new Date(prescription.date_prescription), "dd MMM yyyy", { locale: fr })
                              : "Date inconnue"
                            }
                          </span>
                          {prescription.medecin_nom && (
                            <span>Dr. {prescription.medecin_nom}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(prescription);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal création/édition */}
      <EPrescriptionForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedPrescription(null);
        }}
        prescription={selectedPrescription || initialPrescriptionData}
        user={user}
      />

      {/* Modal visualisation */}
      {selectedPrescription && (
        <EPrescriptionViewer
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false);
            setSelectedPrescription(null);
          }}
          prescription={selectedPrescription}
          onEdit={() => {
            setShowViewer(false);
            setShowForm(true);
          }}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}