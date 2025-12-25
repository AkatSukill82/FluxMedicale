import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Pill,
  Calendar,
  FileText,
  MessageSquare,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Heart,
  Shield
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AIPatientSummary({ patient }) {
  const [summaryLevel, setSummaryLevel] = useState('quick');
  const [expandedSections, setExpandedSections] = useState({});
  const [generatedSummary, setGeneratedSummary] = useState(null);

  // Fetch all patient data
  const { data: consultations = [] } = useQuery({
    queryKey: ['patient-consultations-summary', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation', 20)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patient-prescriptions-summary', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-created_date', 20)
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['patient-appointments-summary', patient.id],
    queryFn: () => base44.entities.RendezVous.filter({ patient_id: patient.id }, 'date', 10)
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['patient-labs-summary', patient.id],
    queryFn: async () => {
      try {
        return await base44.entities.LabResult.filter({ patient_id: patient.id }, '-date_resultat', 10);
      } catch { return []; }
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['patient-messages-summary', patient.id],
    queryFn: async () => {
      try {
        return await base44.entities.SecureMessage.filter({ patient_id: patient.id }, '-created_date', 5);
      } catch { return []; }
    }
  });

  const { data: vitalSigns = [] } = useQuery({
    queryKey: ['patient-vitals-summary', patient.id],
    queryFn: async () => {
      try {
        return await base44.entities.VitalSigns.filter({ patient_id: patient.id }, '-measurement_time', 5);
      } catch { return []; }
    }
  });

  // Generate AI summary
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const patientName = patient.name?.find(n => n.use === 'official');
      const fullName = patientName ? `${(patientName.given || []).join(' ')} ${patientName.family || ''}`.trim() : 'Patient';
      const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;

      const prompt = `Génère un résumé médical ${summaryLevel === 'quick' ? 'concis (3-4 phrases)' : 'détaillé'} pour ce patient.

PATIENT:
- Nom: ${fullName}
- Âge: ${age || 'Non renseigné'} ans
- Sexe: ${patient.gender === 'male' ? 'Homme' : 'Femme'}
- Allergies: ${patient.allergies || 'Aucune connue'}
- Antécédents: ${patient.antecedents_medicaux || 'Non renseignés'}
- Médicaments actuels: ${patient.medicaments_actuels || 'Non renseignés'}

CONSULTATIONS RÉCENTES (${consultations.length}):
${consultations.slice(0, 5).map(c => `- ${c.date_consultation}: ${c.motif || 'Consultation'} - Diagnostic: ${c.diagnostic || 'Non spécifié'}`).join('\n')}

PRESCRIPTIONS ACTIVES:
${prescriptions.slice(0, 5).map(p => `- ${p.medicaments?.map(m => m.nom_produit).join(', ') || 'Médicaments'}`).join('\n')}

RÉSULTATS DE LABO RÉCENTS:
${labResults.slice(0, 3).map(l => `- ${l.date_resultat}: ${l.type_analyse} - ${l.urgence ? 'URGENT' : 'Normal'}`).join('\n')}

PROCHAINS RDV:
${appointments.filter(a => new Date(a.date) >= new Date()).slice(0, 3).map(a => `- ${a.date} ${a.heure_debut}: ${a.type_consultation}`).join('\n')}

SIGNES VITAUX RÉCENTS:
${vitalSigns.slice(0, 2).map(v => `- TA: ${v.blood_pressure || 'N/A'}, FC: ${v.heart_rate || 'N/A'}, T°: ${v.temperature || 'N/A'}`).join('\n')}

${summaryLevel === 'detailed' ? `
Fournis:
1. Résumé clinique global
2. Points d'attention/alertes
3. Médicaments actifs avec interactions potentielles
4. Évolution récente
5. Recommandations de suivi
` : 'Fournis un résumé concis avec les points clés et alertes importantes.'}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Résumé principal" },
            alerts: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  type: { type: "string", enum: ["warning", "info", "critical"] },
                  message: { type: "string" }
                }
              }
            },
            active_conditions: { type: "array", items: { type: "string" } },
            current_medications: { type: "array", items: { type: "string" } },
            recent_evolution: { type: "string" },
            follow_up_recommendations: { type: "array", items: { type: "string" } },
            risk_factors: { type: "array", items: { type: "string" } }
          }
        }
      });

      return {
        ...result,
        generated_at: new Date().toISOString(),
        level: summaryLevel
      };
    },
    onSuccess: (data) => {
      setGeneratedSummary(data);
      toast.success('Résumé généré');
    },
    onError: () => {
      toast.error('Erreur lors de la génération');
    }
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const upcomingAppointments = appointments.filter(a => new Date(a.date) >= new Date());
  const recentConsultations = consultations.slice(0, 3);

  // Extract current medications from prescriptions
  const currentMedications = prescriptions
    .flatMap(p => p.medicaments || [])
    .slice(0, 5);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Résumé IA du patient
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={summaryLevel} onValueChange={setSummaryLevel}>
              <TabsList className="h-8">
                <TabsTrigger value="quick" className="text-xs px-2 h-6">Rapide</TabsTrigger>
                <TabsTrigger value="detailed" className="text-xs px-2 h-6">Détaillé</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              size="sm" 
              onClick={() => generateSummaryMutation.mutate()}
              disabled={generateSummaryMutation.isPending}
              className="gap-1"
            >
              {generateSummaryMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Générer
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-white rounded-lg border">
            <FileText className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{consultations.length}</p>
            <p className="text-xs text-slate-500">Consultations</p>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border">
            <Pill className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{currentMedications.length}</p>
            <p className="text-xs text-slate-500">Médicaments</p>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border">
            <Calendar className="w-4 h-4 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{upcomingAppointments.length}</p>
            <p className="text-xs text-slate-500">RDV à venir</p>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border">
            <MessageSquare className="w-4 h-4 mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold">{messages.length}</p>
            <p className="text-xs text-slate-500">Messages</p>
          </div>
        </div>

        {/* AI Generated Summary */}
        {generateSummaryMutation.isPending && (
          <div className="space-y-2 p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span className="text-sm text-slate-600">Analyse en cours...</span>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {generatedSummary && !generateSummaryMutation.isPending && (
          <div className="space-y-3">
            {/* Main Summary */}
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-sm">{generatedSummary.summary}</p>
              <p className="text-xs text-slate-400 mt-2">
                Généré le {format(new Date(generatedSummary.generated_at), 'dd/MM à HH:mm')}
              </p>
            </div>

            {/* Alerts */}
            {generatedSummary.alerts?.length > 0 && (
              <div className="space-y-2">
                {generatedSummary.alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 rounded-lg flex items-start gap-2 ${
                      alert.type === 'critical' ? 'bg-red-50 border border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                      alert.type === 'critical' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <span className="text-sm">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed sections */}
            {summaryLevel === 'detailed' && (
              <>
                {/* Active Conditions */}
                {generatedSummary.active_conditions?.length > 0 && (
                  <CollapsibleSection 
                    title="Conditions actives" 
                    icon={<Heart className="w-4 h-4 text-red-500" />}
                    expanded={expandedSections.conditions}
                    onToggle={() => toggleSection('conditions')}
                  >
                    <div className="flex flex-wrap gap-1">
                      {generatedSummary.active_conditions.map((c, i) => (
                        <Badge key={i} variant="outline">{c}</Badge>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* Risk Factors */}
                {generatedSummary.risk_factors?.length > 0 && (
                  <CollapsibleSection 
                    title="Facteurs de risque" 
                    icon={<Shield className="w-4 h-4 text-orange-500" />}
                    expanded={expandedSections.risks}
                    onToggle={() => toggleSection('risks')}
                  >
                    <ul className="text-sm space-y-1">
                      {generatedSummary.risk_factors.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}

                {/* Evolution */}
                {generatedSummary.recent_evolution && (
                  <CollapsibleSection 
                    title="Évolution récente" 
                    icon={<Activity className="w-4 h-4 text-green-500" />}
                    expanded={expandedSections.evolution}
                    onToggle={() => toggleSection('evolution')}
                  >
                    <p className="text-sm">{generatedSummary.recent_evolution}</p>
                  </CollapsibleSection>
                )}

                {/* Recommendations */}
                {generatedSummary.follow_up_recommendations?.length > 0 && (
                  <CollapsibleSection 
                    title="Recommandations de suivi" 
                    icon={<Clock className="w-4 h-4 text-blue-500" />}
                    expanded={expandedSections.recommendations}
                    onToggle={() => toggleSection('recommendations')}
                  >
                    <ul className="text-sm space-y-1">
                      {generatedSummary.follow_up_recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500">→</span> {r}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        )}

        {/* Quick Data Sections */}
        {!generatedSummary && !generateSummaryMutation.isPending && (
          <div className="space-y-3">
            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> PROCHAINS RDV
                </h4>
                <div className="space-y-1">
                  {upcomingAppointments.slice(0, 2).map(apt => (
                    <div key={apt.id} className="flex justify-between text-sm">
                      <span>{apt.type_consultation}</span>
                      <span className="text-slate-500">
                        {format(new Date(apt.date), 'dd/MM')} {apt.heure_debut}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Diagnoses */}
            {recentConsultations.some(c => c.diagnostic) && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> DIAGNOSTICS RÉCENTS
                </h4>
                <div className="space-y-1">
                  {recentConsultations.filter(c => c.diagnostic).map(c => (
                    <p key={c.id} className="text-sm">{c.diagnostic}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {currentMedications.length > 0 && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> MÉDICAMENTS
                </h4>
                <div className="flex flex-wrap gap-1">
                  {currentMedications.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {m.nom_produit}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-center text-slate-400 pt-2">
              Cliquez sur "Générer" pour un résumé IA complet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollapsibleSection({ title, icon, children, expanded, onToggle }) {
  return (
    <div className="bg-white rounded-lg border">
      <button 
        onClick={onToggle}
        className="w-full p-2 flex items-center justify-between hover:bg-slate-50"
      >
        <span className="text-sm font-medium flex items-center gap-2">
          {icon} {title}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}