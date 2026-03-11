import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Plus, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CareGoalsPanel from '../../clinical/CareGoalsPanel';
import ConsultationWorkflow from '../../consultation/ConsultationWorkflow';
import GrowthChart from '../GrowthChart';
import TherapeuticGoalsPanel from '../../clinical/TherapeuticGoalsPanel';
import PediatricGrowthCharts from '../../clinical/PediatricGrowthCharts';
import PrescriptionRenewalPanel from '../../prescriptions/PrescriptionRenewalPanel';
import { differenceInYears } from 'date-fns';
import { useOfflineConsultations } from '../../offline/useOfflineData';

export default function ConsultationTab({ patient }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: consultations = [], isLoading, meta } = useOfflineConsultations(patient?.id);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }
  
  if (selectedConsultation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détails de la consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Motif</p>
            <p className="font-medium">{selectedConsultation.motif || '-'}</p>
          </div>
          {selectedConsultation.anamnese && (
            <div>
              <p className="text-sm text-muted-foreground">Anamnèse</p>
              <p>{selectedConsultation.anamnese}</p>
            </div>
          )}
          {selectedConsultation.examen_clinique && (
            <div>
              <p className="text-sm text-muted-foreground">Examen clinique</p>
              <p>{selectedConsultation.examen_clinique}</p>
            </div>
          )}
          {selectedConsultation.diagnostic && (
            <div>
              <p className="text-sm text-muted-foreground">Diagnostic</p>
              <p className="font-medium">{selectedConsultation.diagnostic}</p>
            </div>
          )}
          {selectedConsultation.prescriptions && (
            <div>
              <p className="text-sm text-muted-foreground">Prescriptions</p>
              <p>{selectedConsultation.prescriptions}</p>
            </div>
          )}
          <Button onClick={() => setSelectedConsultation(null)}>Retour</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bouton Nouvelle Consultation en haut */}
      <div className="flex justify-end">
        <Button onClick={() => setIsFormOpen(true)} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle Consultation
        </Button>
      </div>

      {/* Courbes de croissance et constantes */}
      <GrowthChart patient={patient} />

      {/* Courbes pédiatriques OMS (si enfant) */}
      {patient.birthDate && differenceInYears(new Date(), new Date(patient.birthDate)) < 18 && (
        <PediatricGrowthCharts patient={patient} />
      )}

      {/* Traitements chroniques & Renouvellements */}
      <PrescriptionRenewalPanel patient={patient} />

      {/* Objectifs thérapeutiques */}
      <TherapeuticGoalsPanel patient={patient} />

      {/* Objectifs de soins */}
      <CareGoalsPanel patientId={patient.id} />

      {/* Modal de consultation */}
      <ConsultationWorkflow
        patient={patient}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      {/* Liste des consultations */}
      {consultations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune consultation enregistrée pour ce patient.</p>
      ) : (
        <div className="space-y-3">
          {consultations.map(consult => {
            const consultDate = consult.date_consultation ? new Date(consult.date_consultation) : null;
            const isValidDate = consultDate && !isNaN(consultDate.getTime());
            
            return (
              <Card key={consult.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedConsultation(consult)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-primary">{consult.motif || "Consultation générale"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isValidDate 
                            ? format(consultDate, 'd MMMM yyyy, HH:mm', { locale: fr })
                            : 'Date non disponible'
                          }
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {consult.medecin_email ? `Dr. ${consult.medecin_email.split('@')[0]}` : 'Médecin inconnu'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}