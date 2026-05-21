import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Calendar, Pill, FlaskConical, MessageSquare, Plus, Search,
  Shield, Eye, ToggleLeft, ToggleRight, Mail, Loader2, CheckCircle2, XCircle
} from 'lucide-react';

import PortalAccessList from '../components/portal/PortalAccessList';
import PortalPatientView from '../components/portal/PortalPatientView';

export default function PortailPatient() {
  const [tab, setTab] = useState('manage');
  const [search, setSearch] = useState('');
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [previewPortalFor, setPreviewPortalFor] = useState(null);
  const queryClient = useQueryClient();

  const { data: accesses = [], isLoading } = useQuery({
    queryKey: ['portal-accesses'],
    queryFn: () => base44.entities.PatientPortalAccess.list('-created_date', 500),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-portal'],
    queryFn: () => base44.entities.Patient.list('-created_date', 2000),
  });

  const createAccessMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PatientPortalAccess.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-accesses'] });
      setShowGrantDialog(false);
    },
  });

  const getPatientName = (patient) => {
    const name = patient?.name?.find(n => n.use === 'official');
    return `${(name?.given || []).join(' ')} ${name?.family || ''}`.trim() || 'Patient';
  };

  const getPatientEmail = (patient) => {
    return patient?.telecom?.find(t => t.system === 'email')?.value || '';
  };

  const patientsWithoutAccess = patients.filter(p => 
    !accesses.some(a => a.patient_id === p.id)
  );

  const handleGrantAccess = () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;
    const email = getPatientEmail(patient);
    createAccessMutation.mutate({
      patient_id: patient.id,
      patient_email: email,
      patient_name: getPatientName(patient),
      access_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      is_active: true,
      permissions: {
        view_appointments: true,
        view_prescriptions: true,
        view_lab_results: true,
        send_messages: true,
        book_appointments: true,
      },
      medecin_email: '', // filled by created_by
    });
  };

  if (previewPortalFor) {
    return <PortalPatientView 
      access={previewPortalFor} 
      onBack={() => setPreviewPortalFor(null)} 
    />;
  }

  const activeCount = accesses.filter(a => a.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Portail Patient
          </h1>
          <p className="text-muted-foreground">
            Gérez l'accès en ligne de vos patients à leurs données médicales
          </p>
        </div>
        <Button onClick={() => setShowGrantDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Accorder un accès
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <p className="text-2xl font-bold">{accesses.length}</p>
          <p className="text-xs text-muted-foreground">Accès total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Actifs</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Calendar className="w-5 h-5 mx-auto text-purple-600 mb-1" />
          <p className="text-2xl font-bold text-purple-600">RDV</p>
          <p className="text-xs text-muted-foreground">En ligne</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Pill className="w-5 h-5 mx-auto text-orange-600 mb-1" />
          <p className="text-2xl font-bold text-orange-600">Rx</p>
          <p className="text-xs text-muted-foreground">Prescriptions</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <FlaskConical className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
          <p className="text-2xl font-bold text-cyan-600">Lab</p>
          <p className="text-xs text-muted-foreground">Résultats</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="manage" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />Gestion des accès
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" />Activité récente
            </TabsTrigger>
          </TabsList>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Rechercher un patient..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="manage" className="mt-4">
          <PortalAccessList 
            accesses={accesses} 
            search={search} 
            isLoading={isLoading}
            onPreview={setPreviewPortalFor}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Journal d'activité</p>
              <p className="text-sm mt-1">Les connexions et actions des patients apparaîtront ici</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Access Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accorder l'accès au portail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Patient</label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patientsWithoutAccess.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {getPatientName(p)} {getPatientEmail(p) ? `(${getPatientEmail(p)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPatientId && !getPatientEmail(patients.find(p => p.id === selectedPatientId)) && (
              <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Ce patient n'a pas d'email enregistré. Ajoutez-en un dans sa fiche avant d'activer le portail.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>Annuler</Button>
            <Button 
              onClick={handleGrantAccess} 
              disabled={!selectedPatientId || createAccessMutation.isPending}
            >
              {createAccessMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Accorder l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}