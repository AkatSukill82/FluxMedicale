import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Save, Pencil, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientNotes({ patient }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(patient.notes_importantes || '');

  const saveMutation = useMutation({
    mutationFn: async (newNotes) => {
      return base44.entities.Patient.update(patient.id, {
        notes_importantes: newNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['allPatients'] });
      toast.success('Notes enregistrées');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(notes);
  };

  const handleCancel = () => {
    setNotes(patient.notes_importantes || '');
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-yellow-600" />
            Notes générales
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Modifier
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes générales sur ce patient (informations importantes, rappels, etc.)..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saveMutation.isPending}
              >
                <X className="w-3 h-3 mr-1" />
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {patient.notes_importantes ? (
              <p className="text-slate-700 whitespace-pre-wrap">{patient.notes_importantes}</p>
            ) : (
              <p className="text-slate-400 italic">Aucune note enregistrée</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}