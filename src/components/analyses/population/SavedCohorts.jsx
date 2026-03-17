import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, Trash2, Play, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FILTER_LABELS = {
  age: 'Âge',
  gender: 'Sexe',
  city: 'Ville/CP',
  status: 'Statut',
  diagnosis: 'Diagnostic',
  medication: 'Médicament',
  medication_class: 'Polypharmacie',
  allergy: 'Allergie',
  allergy_severity: 'Sév. allergie',
  vaccination: 'Vaccination',
  vaccination_overdue: 'Vaccin retard',
  lab: 'Labo',
  lab_range: 'Labo valeur',
  vital_signs: 'Signes vitaux',
  bmi: 'IMC',
  insurance: 'Assurance',
  dmg: 'DMG',
  sumehr: 'SUMEHR',
  consultation: 'Consultation',
  consultation_count: 'Nb consultations',
  prescription_recurring: 'Rx récurrente',
  no_followup: 'Sans suivi',
};

export default function SavedCohorts({ cohorts, onLoad, onDelete }) {
  if (!cohorts || cohorts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cohortes sauvegardées</p>
      <div className="flex flex-wrap gap-2">
        {cohorts.map(cohort => (
          <Card key={cohort.id} className="w-full md:w-auto">
            <CardContent className="p-3 flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cohort.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {cohort.filters.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {FILTER_LABELS[f.type] || f.type}
                      {f.searchTerm ? `: ${f.searchTerm}` : ''}
                    </Badge>
                  ))}
                  {cohort.resultCount != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Users className="w-2.5 h-2.5 mr-0.5" />
                      {cohort.resultCount}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(cohort.savedAt), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onLoad(cohort)}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(cohort.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}