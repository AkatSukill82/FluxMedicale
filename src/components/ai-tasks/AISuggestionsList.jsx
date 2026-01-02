import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CreditCard,
  Pill,
  Shield,
  Calendar,
  X,
  Check,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TYPE_CONFIG = {
  followup: { icon: Bell, color: 'bg-blue-100 text-blue-700', label: 'Suivi' },
  prescription_renewal: { icon: Pill, color: 'bg-purple-100 text-purple-700', label: 'Renouvellement' },
  billing: { icon: CreditCard, color: 'bg-green-100 text-green-700', label: 'Facturation' },
  gdpr: { icon: Shield, color: 'bg-orange-100 text-orange-700', label: 'RGPD' },
  appointment_reminder: { icon: Calendar, color: 'bg-pink-100 text-pink-700', label: 'Rappel RDV' }
};

const PRIORITY_CONFIG = {
  high: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Urgent' },
  medium: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Moyen' },
  low: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Bas' }
};

export default function AISuggestionsList({ suggestions = [], onDismiss, patients = [] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState(new Set());

  const handleAction = async (suggestion) => {
    setProcessingIds(prev => new Set([...prev, suggestion.id]));

    try {
      switch (suggestion.action) {
        case 'create_reminder':
          await base44.entities.PatientReminder.create({
            patient_id: suggestion.patient_id,
            patient_name: suggestion.patient_name,
            type: 'suivi',
            titre: 'Rappel de suivi',
            message: `Cher(e) ${suggestion.patient_name}, nous vous invitons à prendre rendez-vous pour votre suivi médical.`,
            date_rappel: new Date().toISOString(),
            statut: 'planifie'
          });
          toast.success('Rappel créé');
          break;

        case 'renew_prescription':
          navigate(createPageUrl(`Patients?patient=${suggestion.patient_id}`));
          toast.info('Ouvrez l\'onglet Prescriptions pour renouveler');
          break;

        case 'create_invoice':
          navigate(createPageUrl(`Patients?patient=${suggestion.patient_id}`));
          toast.info('Ouvrez l\'onglet Facturation pour créer la facture');
          break;

        case 'request_consent':
          navigate(createPageUrl(`Patients?patient=${suggestion.patient_id}`));
          toast.info('Ouvrez l\'onglet Admin pour gérer le consentement');
          break;

        case 'send_reminder':
          const rdv = await base44.entities.RendezVous.filter({ id: suggestion.data.rdv_id });
          if (rdv[0]) {
            const patient = patients.find(p => p.id === suggestion.patient_id);
            const email = patient?.telecom?.find(t => t.system === 'email')?.value;
            if (email) {
              await base44.integrations.Core.SendEmail({
                to: email,
                subject: 'Rappel de rendez-vous',
                body: `Bonjour ${suggestion.patient_name},\n\nNous vous rappelons votre rendez-vous prévu le ${rdv[0].date} à ${rdv[0].heure_debut}.\n\nCordialement`
              });
              await base44.entities.RendezVous.update(rdv[0].id, { rappel_envoye: true });
              toast.success('Rappel envoyé');
            } else {
              toast.error('Email du patient non disponible');
            }
          }
          break;
      }

      onDismiss(suggestion.id);
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-300" />
        <p className="text-muted-foreground">Aucune suggestion pour le moment</p>
        <p className="text-sm text-muted-foreground">L'IA analyse vos données en continu</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map(suggestion => {
        const typeConfig = TYPE_CONFIG[suggestion.type];
        const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
        const Icon = typeConfig?.icon || Bell;
        const isProcessing = processingIds.has(suggestion.id);

        return (
          <Card key={suggestion.id} className={`border-l-4 ${suggestion.priority === 'high' ? 'border-l-red-500' : suggestion.priority === 'medium' ? 'border-l-orange-500' : 'border-l-slate-300'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig?.color || 'bg-slate-100'}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{suggestion.title}</h3>
                    <Badge variant="outline" className={priorityConfig?.color}>
                      {priorityConfig?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {typeConfig?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline"
                     onClick={() => navigate(createPageUrl(`Patients?patient=${suggestion.patient_id}`))}>
                    Voir le dossier patient →
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDismiss(suggestion.id)}
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(suggestion)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Traiter
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}