import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Composant de suggestions intelligentes basé sur l'historique et le contexte
 */
export default function SmartSuggestions({ patientId, context = 'general', onSuggestionClick }) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    if (patientId) {
      loadSuggestions();
    }
  }, [patientId, context]);

  const loadSuggestions = async () => {
    try {
      // Get patient history
      const [consultations, prescriptions, appointments] = await Promise.all([
        base44.entities.Consultation.filter({ patient_id: patientId }).catch(() => []),
        base44.entities.Prescription.filter({ patient_id: patientId }).catch(() => []),
        base44.entities.RendezVous.filter({ patient_id: patientId }).catch(() => []),
      ]);

      const newSuggestions = [];

      // Suggest follow-up if last consultation was more than 3 months ago
      if (consultations.length > 0) {
        const lastConsult = consultations[0];
        const daysSince = Math.floor((new Date() - new Date(lastConsult.date_consultation)) / (1000 * 60 * 60 * 24));
        
        if (daysSince > 90 && !dismissed.has('followup')) {
          newSuggestions.push({
            id: 'followup',
            type: 'followup',
            icon: Clock,
            title: 'Rendez-vous de suivi suggéré',
            description: `Dernière consultation il y a ${daysSince} jours. Un suivi pourrait être utile.`,
            action: {
              label: 'Créer rendez-vous',
              handler: () => onSuggestionClick?.({ type: 'create_appointment', patientId })
            }
          });
        }
      }

      // Suggest prescription renewal if needed
      if (prescriptions.length > 0) {
        const recentPrescription = prescriptions.find(p => {
          const daysSince = Math.floor((new Date() - new Date(p.date_prescription)) / (1000 * 60 * 60 * 24));
          return daysSince > 80 && daysSince < 100; // Between 80-100 days
        });

        if (recentPrescription && !dismissed.has('prescription')) {
          newSuggestions.push({
            id: 'prescription',
            type: 'prescription',
            icon: TrendingUp,
            title: 'Renouvellement d\'ordonnance',
            description: 'Une prescription récente pourrait nécessiter un renouvellement bientôt.',
            action: {
              label: 'Voir prescriptions',
              handler: () => onSuggestionClick?.({ type: 'view_prescriptions', patientId })
            }
          });
        }
      }

      // Suggest common actions for this patient type
      if (consultations.length > 3 && !dismissed.has('template')) {
        const motifs = consultations.map(c => c.motif).filter(Boolean);
        const mostCommon = findMostCommon(motifs);
        
        if (mostCommon) {
          newSuggestions.push({
            id: 'template',
            type: 'template',
            icon: Lightbulb,
            title: 'Modèle de consultation suggéré',
            description: `Motif fréquent détecté: "${mostCommon}". Créer un modèle?`,
            action: {
              label: 'Créer modèle',
              handler: () => onSuggestionClick?.({ type: 'create_template', motif: mostCommon })
            }
          });
        }
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const findMostCommon = (arr) => {
    if (arr.length === 0) return null;
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const handleDismiss = (id) => {
    setDismissed(new Set([...dismissed, id]));
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {suggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <suggestion.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-foreground mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={suggestion.action.handler}
                        className="h-7 text-xs"
                      >
                        {suggestion.action.label}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(suggestion.id)}
                        className="h-7 text-xs"
                      >
                        Ignorer
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDismiss(suggestion.id)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}