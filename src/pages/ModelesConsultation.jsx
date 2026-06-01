import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileText, Plus, Search, Stethoscope, Loader2,
  Heart, Brain, Baby, Bone, Activity, ShieldPlus
} from 'lucide-react';
import { DEFAULT_TEMPLATES } from '@/components/consultation/consultationTemplateData';
import ConsultationTemplateCard from '@/components/consultation/ConsultationTemplateCard';
import ConsultationTemplateEditorPage from '@/components/consultation/ConsultationTemplateEditorPage';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  'Infectiologie': Activity,
  'Cardiologie': Heart,
  'Endocrinologie': Activity,
  'Pédiatrie': Baby,
  'Dermatologie': ShieldPlus,
  'Psychiatrie': Brain,
  'Rhumatologie': Bone,
  'Administratif': FileText,
};

export default function ModelesConsultation() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: userTemplates = [], isLoading } = useQuery({
    queryKey: ['consultationTemplates'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.consultation_templates || [];
    }
  });

  const allTemplates = useMemo(() => [
    ...DEFAULT_TEMPLATES,
    ...userTemplates
  ], [userTemplates]);

  const categories = useMemo(() => {
    const cats = [...new Set(allTemplates.map(t => t.category).filter(Boolean))];
    return cats.sort();
  }, [allTemplates]);

  const saveMutation = useMutation({
    mutationFn: async (templates) => {
      await base44.auth.updateMe({ consultation_templates: templates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationTemplates'] });
      toast.success('Modèle sauvegardé');
      setShowEditor(false);
      setEditingTemplate(null);
    }
  });

  const handleSaveTemplate = (template) => {
    const isEditing = editingTemplate?.id && !editingTemplate.id.startsWith('default_');
    const newTemplates = isEditing
      ? userTemplates.map(t => t.id === editingTemplate.id ? { ...template, id: editingTemplate.id } : t)
      : [...userTemplates, { ...template, id: `custom_${Date.now()}` }];
    saveMutation.mutate(newTemplates);
  };

  const handleDeleteTemplate = (templateId) => {
    if (templateId.startsWith('default_')) {
      toast.error('Impossible de supprimer un modèle par défaut');
      return;
    }
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

  const filteredTemplates = allTemplates.filter(t => {
    const matchSearch = !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const defaultCount = filteredTemplates.filter(t => t.is_default).length;
  const customCount = filteredTemplates.filter(t => !t.is_default).length;

  if (showEditor) {
    return (
      <ConsultationTemplateEditorPage
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => { setShowEditor(false); setEditingTemplate(null); }}
        isSaving={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Stethoscope className="w-7 h-7 text-blue-600" />
            Modèles de Consultation
          </h1>
          <p className="text-muted-foreground mt-1">
            {allTemplates.length} modèles • {defaultCount} par défaut, {customCount} personnalisés
          </p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowEditor(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {/* Search + Category Tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Tous ({allTemplates.length})
            </Button>
            {categories.map(cat => {
              const Icon = CATEGORY_ICONS[cat] || FileText;
              const count = allTemplates.filter(t => t.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun modèle trouvé</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un modèle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <ConsultationTemplateCard
              key={template.id}
              template={template}
              onEdit={(t) => { setEditingTemplate(t); setShowEditor(true); }}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}