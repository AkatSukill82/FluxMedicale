import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Search, Lock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ClinicalNotesPanel({ patient }) {
  const queryClient = useQueryClient();
  const [showNewNote, setShowNewNote] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [newNote, setNewNote] = useState({
    note_type: 'ANAMNESIS',
    title: '',
    content: '',
    tags: [],
    is_confidential: false
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['clinical_notes', patient.id],
    queryFn: () => base44.entities.ClinicalNote.filter({ patient_id: patient.id }, '-created_date', 200)
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.ClinicalNote.create({
        ...newNote,
        patient_id: patient.id,
        created_by: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clinical_notes']);
      toast.success('Note créée');
      setShowNewNote(false);
      setNewNote({
        note_type: 'ANAMNESIS',
        title: '',
        content: '',
        tags: [],
        is_confidential: false
      });
    }
  });

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || note.note_type === filterType;
    return matchesSearch && matchesType;
  });

  const noteTypeLabels = {
    ANAMNESIS: 'Anamnèse',
    EXAM: 'Examen',
    DIAGNOSIS: 'Diagnostic',
    TREATMENT_PLAN: 'Plan de traitement',
    FOLLOW_UP: 'Suivi',
    PHONE_CALL: 'Appel téléphonique',
    OTHER: 'Autre'
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notes cliniques ({notes.length})
            </CardTitle>
            <Button onClick={() => setShowNewNote(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle note
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recherche et filtres */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans les notes..."
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                <SelectItem value="ANAMNESIS">Anamnèse</SelectItem>
                <SelectItem value="EXAM">Examen</SelectItem>
                <SelectItem value="DIAGNOSIS">Diagnostic</SelectItem>
                <SelectItem value="TREATMENT_PLAN">Plan traitement</SelectItem>
                <SelectItem value="FOLLOW_UP">Suivi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste des notes */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Chargement...</p>
          ) : filteredNotes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune note trouvée</p>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map(note => (
                <Card key={note.id} className="hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{note.title}</h4>
                        {note.is_confidential && (
                          <Lock className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <Badge variant="outline">{noteTypeLabels[note.note_type]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </span>
                      {note.tags?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          {note.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog nouvelle note */}
      <Dialog open={showNewNote} onOpenChange={setShowNewNote}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle note clinique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de note</Label>
              <Select 
                value={newNote.note_type}
                onValueChange={(v) => setNewNote({ ...newNote, note_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(noteTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Titre</Label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Ex: Consultation de suivi"
              />
            </div>

            <div>
              <Label>Contenu</Label>
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Rédigez votre note clinique..."
                rows={10}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confidential"
                checked={newNote.is_confidential}
                onChange={(e) => setNewNote({ ...newNote, is_confidential: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="confidential" className="cursor-pointer">
                Note confidentielle
              </Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewNote(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => createNoteMutation.mutate()}
                disabled={!newNote.title || !newNote.content || createNoteMutation.isPending}
              >
                Créer la note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}