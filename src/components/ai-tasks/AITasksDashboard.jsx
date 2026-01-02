import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Brain,
  FileText,
  Bell,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import AISuggestionsList from './AISuggestionsList';
import AIDocumentGenerator from './AIDocumentGenerator';
import AIAnalysisPanel from './AIAnalysisPanel';

export default function AITasksDashboard() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Charger les données nécessaires
  const { data: patients = [] } = useQuery({
    queryKey: ['aiTasksPatients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 200)
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['aiTasksConsultations'],
    queryFn: () => base44.entities.Consultation.list('-date_consultation', 500)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['aiTasksPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-date_prescription', 300)
  });

  const { data: rdvs = [] } = useQuery({
    queryKey: ['aiTasksRdvs'],
    queryFn: () => base44.entities.RendezVous.list('-date', 200)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['aiTasksInvoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 300)
  });

  // Analyser et générer des suggestions
  const analyzeAndSuggest = async () => {
    setIsAnalyzing(true);
    const newSuggestions = [];
    const today = new Date();

    // 1. Patients sans consultation récente (> 6 mois)
    patients.forEach(patient => {
      const patientConsults = consultations.filter(c => c.patient_id === patient.id);
      const lastConsult = patientConsults[0];
      const patientName = `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim();

      if (lastConsult) {
        const daysSince = differenceInDays(today, new Date(lastConsult.date_consultation));
        if (daysSince > 180) {
          newSuggestions.push({
            id: `followup-${patient.id}`,
            type: 'followup',
            priority: daysSince > 365 ? 'high' : 'medium',
            title: `Rappel de suivi recommandé`,
            description: `${patientName} n'a pas eu de consultation depuis ${daysSince} jours`,
            patient_id: patient.id,
            patient_name: patientName,
            action: 'create_reminder',
            data: { days_since: daysSince }
          });
        }
      }

      // 2. Patients avec prescriptions chroniques à renouveler
      const patientPrescriptions = prescriptions.filter(p => p.patient_id === patient.id);
      patientPrescriptions.forEach(presc => {
        if (presc.tracking_status === 'ACTIVE') {
          const prescDate = new Date(presc.date_prescription);
          const daysSince = differenceInDays(today, prescDate);
          if (daysSince > 80 && daysSince < 100) {
            newSuggestions.push({
              id: `renewal-${presc.id}`,
              type: 'prescription_renewal',
              priority: 'medium',
              title: `Renouvellement de prescription`,
              description: `Prescription de ${patientName} arrive à échéance (${90 - daysSince} jours restants)`,
              patient_id: patient.id,
              patient_name: patientName,
              action: 'renew_prescription',
              data: { prescription_id: presc.id }
            });
          }
        }
      });

      // 3. Consultations non facturées
      patientConsults.forEach(consult => {
        const hasInvoice = invoices.some(inv => 
          inv.patient_id === patient.id && 
          Math.abs(differenceInDays(new Date(inv.created_date), new Date(consult.date_consultation))) < 2
        );
        if (!hasInvoice && consult.statut === 'Completee') {
          newSuggestions.push({
            id: `billing-${consult.id}`,
            type: 'billing',
            priority: 'high',
            title: `Facturation en attente`,
            description: `Consultation du ${format(new Date(consult.date_consultation), 'dd/MM/yyyy')} pour ${patientName} non facturée`,
            patient_id: patient.id,
            patient_name: patientName,
            action: 'create_invoice',
            data: { consultation_id: consult.id }
          });
        }
      });

      // 4. RGPD - Consentement manquant ou expiré
      if (!patient.gdpr_consent?.has_consented) {
        newSuggestions.push({
          id: `gdpr-${patient.id}`,
          type: 'gdpr',
          priority: 'medium',
          title: `Consentement RGPD requis`,
          description: `${patientName} n'a pas encore donné son consentement`,
          patient_id: patient.id,
          patient_name: patientName,
          action: 'request_consent',
          data: {}
        });
      }
    });

    // 5. RDV sans rappel envoyé (dans les 3 prochains jours)
    rdvs.forEach(rdv => {
      const rdvDate = new Date(rdv.date);
      const daysUntil = differenceInDays(rdvDate, today);
      if (daysUntil > 0 && daysUntil <= 3 && !rdv.rappel_envoye) {
        const patient = patients.find(p => p.id === rdv.patient_id);
        const patientName = patient ? 
          `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() : 'Patient';
        
        newSuggestions.push({
          id: `reminder-${rdv.id}`,
          type: 'appointment_reminder',
          priority: daysUntil === 1 ? 'high' : 'low',
          title: `Rappel de RDV à envoyer`,
          description: `RDV de ${patientName} le ${format(rdvDate, 'dd/MM à HH:mm')}`,
          patient_id: rdv.patient_id,
          patient_name: patientName,
          action: 'send_reminder',
          data: { rdv_id: rdv.id }
        });
      }
    });

    // Trier par priorité
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    newSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setSuggestions(newSuggestions);
    setIsAnalyzing(false);
  };

  // Lancer l'analyse au chargement
  React.useEffect(() => {
    if (patients.length > 0) {
      analyzeAndSuggest();
    }
  }, [patients.length, consultations.length, prescriptions.length]);

  // Stats
  const stats = {
    total: suggestions.length,
    high: suggestions.filter(s => s.priority === 'high').length,
    medium: suggestions.filter(s => s.priority === 'medium').length,
    low: suggestions.filter(s => s.priority === 'low').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            Assistant IA - Tâches administratives
          </h1>
          <p className="text-muted-foreground">Suggestions automatiques et génération de documents</p>
        </div>
        <Button onClick={analyzeAndSuggest} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Actualiser l'analyse
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Suggestions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.high}</p>
                <p className="text-xs text-muted-foreground">Priorité haute</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.medium}</p>
                <p className="text-xs text-muted-foreground">Priorité moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.low}</p>
                <p className="text-xs text-muted-foreground">Priorité basse</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Suggestions IA
            {stats.high > 0 && <Badge variant="destructive" className="ml-1">{stats.high}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Génération documents
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <Brain className="w-4 h-4" />
            Analyse IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <AISuggestionsList 
            suggestions={suggestions}
            onDismiss={(id) => setSuggestions(suggestions.filter(s => s.id !== id))}
            patients={patients}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <AIDocumentGenerator patients={patients} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <AIAnalysisPanel patients={patients} consultations={consultations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}