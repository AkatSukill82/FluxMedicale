import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pill,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  RefreshCw,
  Loader2,
  Bell,
  FileText,
  TrendingUp
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import PrescriptionsList from '@/components/prescriptions/PrescriptionsList';
import PrescriptionRemindersDashboard from '@/components/prescriptions/PrescriptionRemindersDashboard';
import CreatePrescriptionModal from '@/components/prescriptions/CreatePrescriptionModal';

export default function PrescriptionsPage() {
  const [activeTab, setActiveTab] = useState('actives');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Charger toutes les prescriptions
  const { data: prescriptions = [], isLoading, refetch } = useQuery({
    queryKey: ['allPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-date_prescription', 200)
  });

  // Charger les patients pour affichage
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  // Charger les rappels
  const { data: reminders = [] } = useQuery({
    queryKey: ['prescriptionReminders'],
    queryFn: () => base44.entities.PrescriptionReminder.filter({ status: 'active' })
  });

  // Map patients par ID
  const patientsMap = patients.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  // Calcul des statistiques
  const stats = {
    total: prescriptions.length,
    actives: prescriptions.filter(p => p.tracking_status === 'ACTIVE' || !p.tracking_status).length,
    aRenouveler: prescriptions.filter(p => {
      if (p.tracking_status !== 'ACTIVE' && p.tracking_status) return false;
      // Vérifier si un médicament arrive à expiration dans 7 jours
      return p.medicaments?.some(m => {
        if (!m.duree_traitement) return false;
        const startDate = new Date(p.date_prescription);
        const days = parseInt(m.duree_traitement) || 30;
        const endDate = addDays(startDate, days);
        return isBefore(endDate, addDays(new Date(), 7)) && isAfter(endDate, new Date());
      });
    }).length,
    rappelsActifs: reminders.length
  };

  // Filtrage
  const filteredPrescriptions = prescriptions.filter(p => {
    const patient = patientsMap[p.patient_id];
    const patientName = patient ? 
      `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.toLowerCase() : '';
    
    const matchSearch = !searchTerm || 
      patientName.includes(searchTerm.toLowerCase()) ||
      p.medicaments?.some(m => m.nom_produit?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchStatus = true;
    if (filterStatus === 'active') {
      matchStatus = p.tracking_status === 'ACTIVE' || !p.tracking_status;
    } else if (filterStatus === 'completed') {
      matchStatus = p.tracking_status === 'COMPLETED';
    } else if (filterStatus === 'discontinued') {
      matchStatus = p.tracking_status === 'DISCONTINUED';
    }

    return matchSearch && matchStatus;
  });

  // Séparer actives et archivées
  const activePrescriptions = filteredPrescriptions.filter(p => 
    p.tracking_status === 'ACTIVE' || !p.tracking_status
  );
  const archivedPrescriptions = filteredPrescriptions.filter(p => 
    p.tracking_status === 'COMPLETED' || p.tracking_status === 'DISCONTINUED'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-7 h-7 text-blue-600" />
            Gestion des Prescriptions
          </h1>
          <p className="text-muted-foreground">
            Créez, suivez et renouvelez les prescriptions de vos patients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle prescription
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Actives</p>
                <p className="text-2xl font-bold text-green-900">{stats.actives}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">À renouveler</p>
                <p className="text-2xl font-bold text-orange-900">{stats.aRenouveler}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Rappels actifs</p>
                <p className="text-2xl font-bold text-purple-900">{stats.rappelsActifs}</p>
              </div>
              <Bell className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher patient ou médicament..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actives</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="discontinued">Arrêtées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="actives" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Actives
            <Badge variant="secondary">{activePrescriptions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archivees" className="gap-2">
            <Clock className="w-4 h-4" />
            Archivées
            <Badge variant="secondary">{archivedPrescriptions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rappels" className="gap-2">
            <Bell className="w-4 h-4" />
            Rappels
            {stats.rappelsActifs > 0 && (
              <Badge className="bg-orange-500">{stats.rappelsActifs}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actives" className="mt-6">
          <PrescriptionsList 
            prescriptions={activePrescriptions} 
            patientsMap={patientsMap}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="archivees" className="mt-6">
          <PrescriptionsList 
            prescriptions={archivedPrescriptions} 
            patientsMap={patientsMap}
            onRefresh={refetch}
            isArchived
          />
        </TabsContent>

        <TabsContent value="rappels" className="mt-6">
          <PrescriptionRemindersDashboard />
        </TabsContent>
      </Tabs>

      {/* Modal création */}
      <CreatePrescriptionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}