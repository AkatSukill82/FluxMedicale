import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, AlertTriangle, CheckCircle, Calendar, Pill, Loader2 } from 'lucide-react';
import { differenceInYears, differenceInMonths, parseISO } from 'date-fns';

export default function ContextualInspector({ patient, consultations = [], vitalSigns = [] }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (patient) {
      analyzePatientContext();
    }
  }, [patient, consultations, vitalSigns]);

  const analyzePatientContext = async () => {
    setIsAnalyzing(true);
    const contextSuggestions = [];

    const birthDate = patient.birthDate ? new Date(patient.birthDate) : null;
    const age = birthDate ? differenceInYears(new Date(), birthDate) : null;

    if (age) {
      if (age >= 50 && age < 75) {
        contextSuggestions.push({
          type: 'PREVENTION',
          icon: AlertTriangle,
          title: 'Dépistage recommandé',
          description: 'Patient éligible au dépistage colorectal (50-75 ans)',
          action: 'Proposer FIT test',
          priority: 'MEDIUM'
        });
      }

      if (age >= 65) {
        contextSuggestions.push({
          type: 'PREVENTION',
          icon: Pill,
          title: 'Vaccination grippe',
          description: 'Vaccination antigrippale recommandée (>65 ans)',
          action: 'Vérifier statut vaccinal',
          priority: 'HIGH'
        });
      }

      if (age >= 40 && age % 2 === 0) {
        contextSuggestions.push({
          type: 'MONITORING',
          icon: CheckCircle,
          title: 'Bilan de santé',
          description: 'Bilan sanguin préventif recommandé',
          action: 'Prescrire bilan lipidique',
          priority: 'LOW'
        });
      }
    }

    if (consultations.length > 0) {
      const lastConsult = consultations[0];
      const lastDate = parseISO(lastConsult.date_consultation);
      const monthsSince = differenceInMonths(new Date(), lastDate);

      if (monthsSince >= 12) {
        contextSuggestions.push({
          type: 'FOLLOW_UP',
          icon: Calendar,
          title: 'Suivi annuel',
          description: `Dernière consultation il y a ${monthsSince} mois`,
          action: 'Planifier consultation de suivi',
          priority: 'MEDIUM'
        });
      }
    }

    if (vitalSigns.length > 0) {
      const latest = vitalSigns[0];
      
      if (latest.blood_pressure_systolic > 140 || latest.blood_pressure_diastolic > 90) {
        contextSuggestions.push({
          type: 'ALERT',
          icon: AlertTriangle,
          title: 'Tension artérielle élevée',
          description: `TA: ${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic} mmHg`,
          action: 'Contrôle TA + ECG si nécessaire',
          priority: 'HIGH'
        });
      }

      if (latest.weight && latest.height) {
        const bmi = latest.weight / ((latest.height / 100) ** 2);
        if (bmi > 30) {
          contextSuggestions.push({
            type: 'LIFESTYLE',
            icon: Lightbulb,
            title: 'Surpoids détecté',
            description: `IMC: ${bmi.toFixed(1)} (obésité)`,
            action: 'Conseils diététiques + objectifs',
            priority: 'MEDIUM'
          });
        }
      }
    }

    if (patient.medicaments_actuels) {
      contextSuggestions.push({
        type: 'MEDICATION',
        icon: Pill,
        title: 'Revue médicamenteuse',
        description: 'Vérifier interactions et renouvellements',
        action: 'Analyser prescriptions actuelles',
        priority: 'LOW'
      });
    }

    if (patient.allergies) {
      contextSuggestions.push({
        type: 'ALERT',
        icon: AlertTriangle,
        title: 'Allergies connues',
        description: patient.allergies,
        action: 'Vérifier avant prescription',
        priority: 'URGENT'
      });
    }

    setSuggestions(contextSuggestions);
    setIsAnalyzing(false);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800 border-gray-300',
      MEDIUM: 'bg-blue-100 text-blue-800 border-blue-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      URGENT: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[priority] || colors.MEDIUM;
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4" />
            Inspecteur Contextuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="text-sm text-muted-foreground">Aucune action recommandée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Inspecteur Contextuel
          <Badge variant="secondary" className="ml-auto">{suggestions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => {
            const Icon = suggestion.icon;
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${getPriorityColor(suggestion.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                    <p className="text-xs mt-1">{suggestion.description}</p>
                    <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-xs">
                      → {suggestion.action}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}