import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Pill, FlaskConical, MessageSquare, Loader2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import PortalAppointments from './PortalAppointments';
import PortalPrescriptions from './PortalPrescriptions';
import PortalLabResults from './PortalLabResults';
import PortalMessages from './PortalMessages';

export default function PortalPatientView({ access, onBack }) {
  const [tab, setTab] = useState('appointments');

  const { data: appointments = [], isLoading: loadingRdv } = useQuery({
    queryKey: ['portal-rdv', access.patient_id],
    queryFn: () => base44.entities.RendezVous.filter({ patient_id: access.patient_id }, '-date', 50),
  });

  const { data: prescriptions = [], isLoading: loadingRx } = useQuery({
    queryKey: ['portal-rx', access.patient_id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: access.patient_id }, '-date_prescription', 50),
  });

  const { data: labResults = [], isLoading: loadingLab } = useQuery({
    queryKey: ['portal-lab', access.patient_id],
    queryFn: () => base44.entities.LabResult.filter({ patient_id: access.patient_id }, '-result_date', 50),
  });

  const { data: messages = [], isLoading: loadingMsg } = useQuery({
    queryKey: ['portal-messages', access.patient_id],
    queryFn: () => base44.entities.PatientMessage.filter({ patient_id: access.patient_id }, '-created_date', 50),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Vue portail patient</h2>
          <p className="text-muted-foreground">
            Aperçu de ce que voit <strong>{access.patient_name}</strong> sur son portail
          </p>
        </div>
      </div>

      {/* Patient Portal Preview */}
      <Card className="border-2 border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">{(access.patient_name || '?')[0]}</span>
            </div>
            <div>
              <CardTitle>Bonjour, {access.patient_name?.split(' ')[0] || 'Patient'}</CardTitle>
              <p className="text-sm text-muted-foreground">Votre espace santé personnel</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <Calendar className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <p className="text-lg font-bold">{appointments.filter(r => r.statut !== 'Annulé').length}</p>
                <p className="text-[10px] text-muted-foreground">Rendez-vous</p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <Pill className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                <p className="text-lg font-bold">{prescriptions.length}</p>
                <p className="text-[10px] text-muted-foreground">Prescriptions</p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <FlaskConical className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
                <p className="text-lg font-bold">{labResults.length}</p>
                <p className="text-[10px] text-muted-foreground">Résultats labo</p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <MessageSquare className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-bold">{messages.length}</p>
                <p className="text-[10px] text-muted-foreground">Messages</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="appointments" className="gap-1.5 text-xs">
                <Calendar className="w-3 h-3" />Rendez-vous
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="gap-1.5 text-xs">
                <Pill className="w-3 h-3" />Prescriptions
              </TabsTrigger>
              <TabsTrigger value="lab" className="gap-1.5 text-xs">
                <FlaskConical className="w-3 h-3" />Laboratoire
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 text-xs">
                <MessageSquare className="w-3 h-3" />Messages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="mt-4">
              <PortalAppointments appointments={appointments} isLoading={loadingRdv} />
            </TabsContent>
            <TabsContent value="prescriptions" className="mt-4">
              <PortalPrescriptions prescriptions={prescriptions} isLoading={loadingRx} />
            </TabsContent>
            <TabsContent value="lab" className="mt-4">
              <PortalLabResults results={labResults} isLoading={loadingLab} />
            </TabsContent>
            <TabsContent value="messages" className="mt-4">
              <PortalMessages messages={messages} isLoading={loadingMsg} patientId={access.patient_id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}