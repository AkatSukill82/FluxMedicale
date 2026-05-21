import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PortalPrescriptions({ prescriptions, isLoading }) {
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucune prescription</p>
      </div>
    );
  }

  const statusColors = {
    'Brouillon': 'bg-gray-100 text-gray-700',
    'Envoyé': 'bg-blue-100 text-blue-700',
    'Validé': 'bg-green-100 text-green-700',
    'Délivré': 'bg-emerald-100 text-emerald-700',
    'Annulé': 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-2">
      {prescriptions.map(rx => (
        <Card key={rx.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {rx.date_prescription ? format(new Date(rx.date_prescription), 'dd MMMM yyyy', { locale: fr }) : ''}
                </p>
                <Badge className={statusColors[rx.statut_recip_e] || 'bg-gray-100'} >{rx.statut_recip_e}</Badge>
              </div>
              {rx.recip_e_rid && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  RID: {rx.recip_e_rid}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {(rx.medicaments || []).map((med, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Pill className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{med.nom_produit}</p>
                    <p className="text-xs text-muted-foreground">{med.posologie}{med.duree_traitement ? ` — ${med.duree_traitement}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}