import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Search,
  Copy,
  Edit,
  Trash2,
  Sparkles,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import TemplateEditor from '../components/templates/TemplateEditor';

export default function Templates() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.DocumentTemplate.list('-usage_count')
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Modèle supprimé');
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_by, created_date, updated_date, ...templateData } = template;
      return base44.entities.DocumentTemplate.create({
        ...templateData,
        name: `${templateData.name} (copie)`,
        usage_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Modèle dupliqué');
    }
  });

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = {
    ALL: { label: 'Tous', icon: FileText },
    CONSULTATION: { label: 'Consultations', icon: FileText },
    CERTIFICAT: { label: 'Certificats', icon: FileText },
    ORDONNANCE: { label: 'Ordonnances', icon: FileText },
    COURRIER: { label: 'Courriers', icon: FileText },
    POST_OP: { label: 'Post-opératoire', icon: FileText },
    PATHOLOGIE: { label: 'Pathologies', icon: FileText }
  };

  const popularTemplates = templates.filter(t => t.usage_count > 0).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Modèles de Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez des templates intelligents pour vos consultations récurrentes
          </p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowEditor(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {/* Popular Templates */}
      {popularTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Modèles les plus utilisés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {popularTemplates.map(t => (
                <Badge 
                  key={t.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => { setEditingTemplate(t); setShowEditor(true); }}
                >
                  {t.name} ({t.usage_count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList>
                {Object.entries(categories).map(([key, { label }]) => (
                  <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun modèle trouvé</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer votre premier modèle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{categories[template.category]?.label || template.category}</Badge>
                      {template.is_public && <Badge className="bg-purple-100 text-purple-800">Public</Badge>}
                      {template.usage_count > 0 && (
                        <Badge variant="secondary">{template.usage_count} utilisations</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description || 'Pas de description'}
                </p>
                {template.documents_bundle && (
                  <div className="mb-4">
                    <p className="text-xs font-medium mb-1">Génère {template.documents_bundle.length} document(s):</p>
                    <div className="flex gap-1 flex-wrap">
                      {template.documents_bundle.map((doc, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {doc.document_type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingTemplate(template); setShowEditor(true); }}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateTemplateMutation.mutate(template)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Supprimer ce modèle ?')) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
          onSave={() => {
            setShowEditor(false);
            setEditingTemplate(null);
            queryClient.invalidateQueries({ queryKey: ['templates'] });
          }}
        />
      )}
    </div>
  );
}