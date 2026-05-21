import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const categoryLabels = {
  ethique: 'Éthique',
  peer_review: 'Peer Review',
  congres: 'Congrès',
  elearning: 'E-Learning',
  seminaire: 'Séminaire',
  glem: 'GLEM',
  autre: 'Autre',
};

const statusColors = {
  planifiee: 'bg-blue-100 text-blue-700',
  completee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
  en_attente_validation: 'bg-yellow-100 text-yellow-700',
};

export default function FormationCreditsList({ formations, onEdit, onDelete }) {
  if (!formations?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="font-semibold mb-2">Aucune formation enregistrée</h3>
          <p className="text-sm text-muted-foreground">Ajoutez vos formations pour suivre vos crédits d'accréditation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {formations.map(f => (
        <Card key={f.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{f.title}</h3>
                  <Badge className={statusColors[f.status] || 'bg-slate-100 text-slate-700'}>
                    {f.status === 'completee' ? 'Complétée' : f.status === 'planifiee' ? 'Planifiée' : f.status === 'annulee' ? 'Annulée' : 'En attente'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>{format(new Date(f.date), 'dd/MM/yyyy')}</span>
                  <Badge variant="outline">{categoryLabels[f.category] || f.category}</Badge>
                  {f.organizer && <span>{f.organizer}</span>}
                  {f.duration_hours && <span>{f.duration_hours}h</span>}
                </div>
                <div className="flex gap-4 mt-2">
                  {f.credits_cp > 0 && (
                    <span className="text-sm font-medium text-blue-600">{f.credits_cp} CP</span>
                  )}
                  {f.credits_ea > 0 && (
                    <span className="text-sm font-medium text-purple-600">{f.credits_ea} EA</span>
                  )}
                  {f.accreditation_number && (
                    <span className="text-xs text-muted-foreground">N° {f.accreditation_number}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {f.certificate_url && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={f.certificate_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onEdit(f)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(f.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}