import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Plus, MoreVertical, Edit, Trash2, Copy, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import ReportTemplateForm from './ReportTemplateForm';

const TYPE_LABELS = {
  consultation_summary: 'Résumé consultations',
  prescription_report: 'Rapport prescriptions',
  treatment_progress: 'Suivi traitement',
  patient_overview: 'Vue d\'ensemble patient',
  custom: 'Personnalisé'
};

const FREQUENCY_LABELS = {
  manual: 'Manuel',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel'
};

export default function ReportTemplatesList({ templates = [] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success('Modèle supprimé');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_date, updated_date, ...data } = template;
      await base44.entities.ReportTemplate.create({
        ...data,
        name: `${data.name} (copie)`,
        is_default: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success('Modèle dupliqué');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{templates.length} modèle(s)</p>
        <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun modèle de rapport</p>
          <Button variant="link" onClick={() => setShowForm(true)}>
            Créer votre premier modèle
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">Par défaut</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs mb-2">
                      {TYPE_LABELS[template.type]}
                    </Badge>
                    
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {FREQUENCY_LABELS[template.frequency]}
                      </span>
                      {template.auto_send && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Send className="w-3 h-3" />
                          Envoi auto
                        </span>
                      )}
                      <span>{template.sections?.length || 0} section(s)</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingTemplate(template); setShowForm(true); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(template.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <ReportTemplateForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingTemplate(null); }}
          template={editingTemplate}
        />
      )}
    </div>
  );
}