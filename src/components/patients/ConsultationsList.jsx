import React from 'react';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, ClipboardList } from "lucide-react";

export default function ConsultationsList({ consultations, onEdit }) {
  if (consultations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <p>Aucune consultation enregistrée pour ce patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map(consult => (
        <div key={consult.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-slate-800">
                Consultation du {format(new Date(consult.date_consultation), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </h4>
              <p className="text-sm text-slate-600">
                Par: {consult.medecin_email}
              </p>
              <Badge variant="outline" className="mt-2">
                {consult.statut}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(consult)}>
              <Edit className="w-4 h-4 mr-2" />
              Voir / Modifier
            </Button>
          </div>
          {consult.motif && (
            <p className="mt-2 text-sm text-slate-700">
              <strong>Motif:</strong> {consult.motif}
            </p>
          )}
          {consult.diagnostic && (
            <p className="mt-1 text-sm text-slate-700">
              <strong>Diagnostic:</strong> {consult.diagnostic}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}