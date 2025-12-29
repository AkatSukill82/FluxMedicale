import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pill,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Send,
  Eye,
  Edit,
  FileSignature,
  History,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import EPrescriptionForm from "../components/eprescription/EPrescriptionForm";
import EPrescriptionViewer from "../components/eprescription/EPrescriptionViewer";
import EPrescriptionHistory from "../components/eprescription/EPrescriptionHistory";

const STATUS_CONFIG = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: Edit },
  signe: { label: "Signé", color: "bg-blue-100 text-blue-700", icon: FileSignature },
  envoye: { label: "Envoyé", color: "bg-green-100 text-green-700", icon: Send },
  delivre: { label: "Délivré", color: "bg-purple-100 text-purple-700", icon: Pill },
  annule: { label: "Annulé", color: "bg-red-100 text-red-700", icon: AlertCircle },
  expire: { label: "Expiré", color: "bg-orange-100 text-orange-700", icon: Calendar },
};

const TYPE_CONFIG = {
  standard: { label: "Standard", color: "bg-slate-100 text-slate-700" },
  chronique: { label: "Chronique", color: "bg-cyan-100 text-cyan-700" },
  urgence: { label: "Urgence", color: "bg-red-100 text-red-700" },
  hospitaliere: { label: "Hospitalière", color: "bg-amber-100 text-amber-700" },
};

export default function EPrescriptions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [viewingPrescription, setViewingPrescription] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPatientId, setHistoryPatientId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: prescriptions = [], isLoading, refetch } = useQuery({
    queryKey: ["eprescriptions"],
    queryFn: () => base44.entities.EPrescription.list("-created_date", 200),
  });

  const filteredPrescriptions = prescriptions.filter((p) => {
    const matchesSearch =
      searchTerm === "" ||
      p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.medicaments?.some((m) =>
        m.nom?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus = filterStatus === "all" || p.statut === filterStatus;
    const matchesType = filterType === "all" || p.type_prescription === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Grouper par statut pour les stats
  const stats = {
    total: prescriptions.length,
    brouillon: prescriptions.filter((p) => p.statut === "brouillon").length,
    signe: prescriptions.filter((p) => p.statut === "signe").length,
    envoye: prescriptions.filter((p) => p.statut === "envoye").length,
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedPrescription(null);
    refetch();
  };

  const handleViewHistory = (patientId) => {
    setHistoryPatientId(patientId);
    setShowHistory(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">e-Prescriptions</h1>
          <p className="text-gray-500">
            Gérez vos prescriptions électroniques Recip-e
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedPrescription(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle prescription
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.brouillon}</p>
            <p className="text-sm text-gray-500">Brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.signe}</p>
            <p className="text-sm text-gray-500">Signées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.envoye}</p>
            <p className="text-sm text-gray-500">Envoyées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par patient, RID, médicament..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Pill className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune prescription trouvée</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une prescription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrescriptions.map((prescription) => {
            const StatusIcon = STATUS_CONFIG[prescription.statut]?.icon || Edit;
            return (
              <Card
                key={prescription.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">
                          {prescription.patient_name || "Patient"}
                        </h3>
                        <Badge className={STATUS_CONFIG[prescription.statut]?.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {STATUS_CONFIG[prescription.statut]?.label}
                        </Badge>
                        <Badge className={TYPE_CONFIG[prescription.type_prescription]?.color}>
                          {TYPE_CONFIG[prescription.type_prescription]?.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {prescription.date_prescription
                            ? format(
                                new Date(prescription.date_prescription),
                                "dd/MM/yyyy",
                                { locale: fr }
                              )
                            : "-"}
                        </span>
                        {prescription.rid && (
                          <span className="flex items-center gap-1">
                            <QrCode className="w-4 h-4" />
                            RID: {prescription.rid}
                          </span>
                        )}
                        <span>Par {prescription.medecin_nom}</span>
                      </div>

                      {/* Médicaments */}
                      <div className="flex flex-wrap gap-2">
                        {prescription.medicaments?.slice(0, 3).map((med, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            {med.nom} {med.dosage}
                          </Badge>
                        ))}
                        {prescription.medicaments?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{prescription.medicaments.length - 3} autres
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewHistory(prescription.patient_id)}
                        title="Historique patient"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingPrescription(prescription)}
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {prescription.statut === "brouillon" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPrescription(prescription);
                            setShowForm(true);
                          }}
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <EPrescriptionForm
          isOpen={showForm}
          onClose={handleFormClose}
          prescription={selectedPrescription}
          user={user}
        />
      )}

      {/* Viewer Modal */}
      {viewingPrescription && (
        <EPrescriptionViewer
          isOpen={!!viewingPrescription}
          onClose={() => setViewingPrescription(null)}
          prescription={viewingPrescription}
          onEdit={() => {
            setSelectedPrescription(viewingPrescription);
            setViewingPrescription(null);
            setShowForm(true);
          }}
          onRefresh={refetch}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <EPrescriptionHistory
          isOpen={showHistory}
          onClose={() => {
            setShowHistory(false);
            setHistoryPatientId(null);
          }}
          patientId={historyPatientId}
        />
      )}
    </div>
  );
}