import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ConsultationTab({ patient }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['consultations', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation'),
    enabled: !!patient?.id
  });

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
    <div className="space-y-4">
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