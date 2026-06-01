import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Search,
  Stethoscope,
  Copy,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import TemplatePreview from '@/components/consultation-templates/TemplatePreview';
import TemplateFormDialog from '@/components/consultation-templates/TemplateFormDialog';
import { DEFAULT_CONSULTATION_TEMPLATES } from '@/components/consultation-templates/defaultTemplates';

export default function ModelesConsultation() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const { data: userTemplates = [] } = useQuery({
    queryKey: ['consultationTemplates'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.consultation_templates || [];
    }
  });

  const allTemplates = [...DEFAULT_CONSULTATION_TEMPLATES, ...userTemplates];

  const saveMutation = useMutation({
    mutationFn: async (templates) => {
      await base44.auth.updateMe({ consultation_templates: templates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationTemplates'] });
      toast.success('Modèle sauvegardé');
    }
  });

  const handleSave = (template) => {
    const newTemplates = editingTemplate?.id && !editingTemplate.id.startsWith('default_')
      ? userTemplates.map(t => t.id === editingTemplate.id ? template : t)
      : [...userTemplates, { ...template, id: `custom_${Date.now()}` }];
    saveMutation.mutate(newTemplates);
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleDelete = (templateId) => {
    if (templateId.startsWith('default_')) return;
    saveMutation.mutate(userTemplates.filter(t => t.id !== templateId));
  };

  const handleDuplicate = (template) => {
    setEditingTemplate({
      ...template,
      id: null,
      name: `${template.name} (copie)`,
      is_default: false
    });
    setShowEditor(true);
  };

  const categories = [...new Set(allTemplates.map(t => t.category).filter(Boolean))];

  const filteredTemplates = allTemplates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const customCount = userTemplates.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Stethoscope className="w-7 h-7 text-blue-600" />
            Modèles de Notes de Consultation
          </h1>
          <p className="text-muted-foreground mt-1">
            {allTemplates.length} modèles disponibles • {customCount} personnalisé{customCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowEditor(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un modèle (ex: grippe, diabète, pédiatrie)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory('all')}
              >
                Tous
              </Badge>
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Astuce :</strong> Utilisez des <code className="bg-blue-100 px-1 rounded">[variables]</code> dans vos modèles (ex: <code className="bg-blue-100 px-1 rounded">[température]</code>, <code className="bg-blue-100 px-1 rounded">[poids]</code>) pour créer des champs à remplir rapidement lors de la consultation.
      </div>

      {/* Templates by category */}
      <div className="space-y-4">
        {categories.map(category => {
          const catTemplates = filteredTemplates.filter(t => t.category === category);
          if (catTemplates.length === 0) return null;
          const isExpanded = expandedCategories[category] !== false;

          return (
            <Card key={category}>
              <CardHeader
                className="cursor-pointer py-4"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {category}
                    <Badge variant="secondary" className="ml-2">{catTemplates.length}</Badge>
                  </CardTitle>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onPreview={() => setPreviewTemplate(template)}
                        onEdit={() => { setEditingTemplate(template); setShowEditor(true); }}
                        onDuplicate={() => handleDuplicate(template)}
                        onDelete={() => handleDelete(template.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">Aucun modèle trouvé</p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {/* Editor Dialog */}
      {showEditor && (
        <TemplateFormDialog
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onPreview, onEdit, onDuplicate, onDelete }) {
  return (
    <div className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <h4 className="font-medium text-sm truncate">{template.name}</h4>
        </div>
        {template.is_default && (
          <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">Défaut</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {template.content?.motif || 'Pas de motif défini'}
      </p>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onPreview}>
          <Eye className="w-3 h-3 mr-1" /> Voir
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDuplicate}>
          <Copy className="w-3 h-3 mr-1" /> Copier
        </Button>
        {!template.is_default && (
          <>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}