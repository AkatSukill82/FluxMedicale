import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Download,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Clock,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import MedicalReportForm from "../components/reports/MedicalReportForm";
import MedicalReportViewer from "../components/reports/MedicalReportViewer";
import MedicalReportPDF from "../components/reports/MedicalReportPDF";
import PeriodicReportGenerator from "../components/reports/PeriodicReportGenerator";
import ReportTemplatesManager from "../components/reports/ReportTemplatesManager";
import ReportsAnalyticsDashboard from "../components/reports/ReportsAnalyticsDashboard";

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

export default function RapportsMedicaux() {
  const [activeTab, setActiveTab] = useState("reports");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showPeriodicGenerator, setShowPeriodicGenerator] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["medicalReports"],
    queryFn: () => base44.entities.MedicalReport.list("-created_date", 200),
  });

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      searchTerm === "" ||
      report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.diagnostic?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || report.report_type === filterType;
    const matchesStatus = filterStatus === "all" || report.statut === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleEdit = (report) => {
    setSelectedReport(report);
    setShowForm(true);
  };

  const handleView = (report) => {
    setViewingReport(report);
  };

  const handleGeneratePDF = (report) => {
    setGeneratingPDF(report);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedReport(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports Médicaux</h1>
          <p className="text-gray-500">
            Gérez et créez des rapports médicaux pour vos patients
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPeriodicGenerator(true)}
          >
            <Clock className="w-4 h-4 mr-2" />
            Rapport périodique
          </Button>
          <Button
            onClick={() => {
              setSelectedReport(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau rapport
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            Rapports
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="w-4 h-4" />
            Modèles
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-4">

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, patient, diagnostic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(REPORT_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUS_BADGES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun rapport trouvé</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un rapport
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {report.title}
                      </h3>
                      <Badge className={REPORT_TYPES[report.report_type]?.color}>
                        {REPORT_TYPES[report.report_type]?.label}
                      </Badge>
                      <Badge className={STATUS_BADGES[report.statut]?.color}>
                        {STATUS_BADGES[report.statut]?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.patient_name || "Patient non lié"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {report.date_rapport
                          ? format(new Date(report.date_rapport), "dd/MM/yyyy", {
                              locale: fr,
                            })
                          : "-"}
                      </span>
                      <span>Par {report.medecin_nom || report.medecin_email}</span>
                    </div>
                    {report.diagnostic && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        <strong>Diagnostic:</strong> {report.diagnostic}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(report)}
                      title="Voir"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(report)}
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleGeneratePDF(report)}
                      title="Générer PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MedicalReportForm
          isOpen={showForm}
          onClose={handleFormClose}
          report={selectedReport}
          user={user}
        />
      )}

      {/* Viewer Modal */}
      {viewingReport && (
        <MedicalReportViewer
          isOpen={!!viewingReport}
          onClose={() => setViewingReport(null)}
          report={viewingReport}
          onEdit={() => {
            setSelectedReport(viewingReport);
            setViewingReport(null);
            setShowForm(true);
          }}
          onGeneratePDF={() => {
            setGeneratingPDF(viewingReport);
            setViewingReport(null);
          }}
        />
      )}

        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <ReportTemplatesManager />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <ReportsAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* PDF Generator */}
      {generatingPDF && (
        <MedicalReportPDF
          report={generatingPDF}
          onClose={() => setGeneratingPDF(null)}
        />
      )}

      {/* Periodic Report Generator */}
      {showPeriodicGenerator && (
        <PeriodicReportGenerator
          isOpen={showPeriodicGenerator}
          onClose={() => setShowPeriodicGenerator(false)}
        />
      )}
    </div>
  );
}