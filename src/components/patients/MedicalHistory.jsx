import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Pill, Activity, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function MedicalHistory({ patient }) {
  const { data: consultations = [], isLoading: isLoadingConsultations } = useQuery({
    queryKey: ['consultations', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation', 100)
  });

  const { data: prescriptions = [], isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['prescriptions', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-created_date', 100)
  });

  const { data: vitalSigns = [], isLoading: isLoadingVitals } = useQuery({
    queryKey: ['vitalSigns', patient.id],
    queryFn: async () => {
      try {
        return await base44.entities.VitalSigns.filter({ patient_id: patient.id }, '-measurement_time', 50);
      } catch {
        return [];
      }
    }
  });

  if (isLoadingConsultations) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="consultations">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consultations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Consultations ({consultations.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Ordonnances ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="vitals" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Signes vitaux
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="space-y-3 mt-4">
          {consultations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune consultation enregistrée</p>
            </div>
          ) : (
            consultations.map(consult => {
              const consultDate = new Date(consult.date_consultation);
              return (
                <Card key={consult.id} className="hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">
                            {!isNaN(consultDate.getTime()) && format(consultDate, 'dd MMMM yyyy', { locale: fr })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Dr. {consult.medecin_email?.split('@')[0]}
                          </Badge>
                        </div>
                        
                        {consult.motif && (
                          <p className="text-sm text-slate-600 mb-2">
                            <strong>Motif:</strong> {consult.motif}
                          </p>
                        )}
                        
                        {consult.diagnostic && (
                          <p className="text-sm text-slate-700 mb-2">
                            <strong>Diagnostic:</strong> {consult.diagnostic}
                          </p>
                        )}
                        
                        {consult.prescriptions && (
                          <p className="text-sm text-slate-600">
                            <strong>Traitement:</strong> {consult.prescriptions}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-3 mt-4">
          {prescriptions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune ordonnance enregistrée</p>
            </div>
          ) : (
            prescriptions.map(presc => (
              <Card key={presc.id} className="hover:border-green-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-green-600" />
                        <span className="font-medium">
                          {presc.created_date && format(new Date(presc.created_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {presc.status || 'Active'}
                        </Badge>
                      </div>
                      {presc.medications && (
                        <div className="space-y-1 mt-2">
                          {presc.medications.map((med, idx) => (
                            <div key={idx} className="text-sm bg-slate-50 p-2 rounded">
                              <p className="font-medium">{med.drug_name}</p>
                              <p className="text-slate-600 text-xs">{med.posology}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="vitals" className="space-y-3 mt-4">
          {vitalSigns.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun signe vital enregistré</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vitalSigns.slice(0, 6).map(vital => (
                <Card key={vital.id}>
                  <CardContent className="p-3">
                    <p className="text-xs text-slate-500">
                      {vital.measurement_time && format(new Date(vital.measurement_time), 'dd/MM HH:mm', { locale: fr })}
                    </p>
                    {vital.blood_pressure && (
                      <p className="text-sm mt-1"><strong>TA:</strong> {vital.blood_pressure}</p>
                    )}
                    {vital.heart_rate && (
                      <p className="text-sm"><strong>FC:</strong> {vital.heart_rate} bpm</p>
                    )}
                    {vital.temperature && (
                      <p className="text-sm"><strong>T°:</strong> {vital.temperature}°C</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}