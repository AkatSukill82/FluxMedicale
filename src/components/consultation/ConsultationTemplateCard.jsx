import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Edit2, Trash2, Stethoscope, Lock } from 'lucide-react';

export default function ConsultationTemplateCard({ template, onEdit, onDuplicate, onDelete }) {
  const fields = template.content || {};
  const filledFields = Object.values(fields).filter(v => v && v.trim()).length;

  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
              <p className="text-xs text-muted-foreground">{template.category}</p>
            </div>
          </div>
          {template.is_default && (
            <Badge variant="outline" className="text-xs gap-1 shrink-0">
              <Lock className="w-2.5 h-2.5" />
              Défaut
            </Badge>
          )}
        </div>

        {/* Aperçu des champs */}
        <div className="space-y-1.5 mb-4">
          {fields.motif && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">Motif:</span> {fields.motif}
            </p>
          )}
          {fields.anamnese && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              <span className="font-medium text-foreground">Anamnèse:</span> {fields.anamnese}
            </p>
          )}
          {fields.examen_clinique && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">Examen:</span> {fields.examen_clinique.split('\n')[0]}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {filledFields}/5 champs
          </Badge>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(template)}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            {!template.is_default && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(template)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700"
                  onClick={() => onDelete(template.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}