import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Star, Search, Plus, TrendingUp } from 'lucide-react';

export default function TemplateSelector({ onSelectTemplate, onCreateTemplate, currentMedications }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['prescription-templates'],
    queryFn: () => base44.entities.PrescriptionTemplate.list('-frequency_used', 100)
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ['therapeutic-schemes'],
    queryFn: () => base44.entities.TherapeuticScheme.list('-created_date', 100)
  });

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.use_case?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSchemes = schemes.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.condition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category) => {
    const colors = {
      INFECTION: 'bg-red-100 text-red-800',
      PAIN: 'bg-orange-100 text-orange-800',
      CHRONIC: 'bg-purple-100 text-purple-800',
      ACUTE: 'bg-blue-100 text-blue-800',
      PREVENTIVE: 'bg-green-100 text-green-800',
      CARDIOVASCULAR: 'bg-rose-100 text-rose-800',
      DIABETES: 'bg-amber-100 text-amber-800',
      HYPERTENSION: 'bg-red-100 text-red-800',
      ASTHMA: 'bg-cyan-100 text-cyan-800',
      COPD: 'bg-teal-100 text-teal-800',
      DEPRESSION: 'bg-indigo-100 text-indigo-800',
      OTHER: 'bg-slate-100 text-slate-800'
    };
    return colors[category] || colors.OTHER;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un modèle ou schéma..."
            className="pl-10"
          />
        </div>
        {currentMedications?.length > 0 && (
          <Button onClick={onCreateTemplate} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Sauvegarder comme modèle
          </Button>
        )}
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-4">
          {/* Modèles de prescriptions */}
          {filteredTemplates.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-600 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Modèles de prescriptions ({filteredTemplates.length})
              </h3>
              <div className="space-y-2">
                {filteredTemplates.map(template => (
                  <Card
                    key={template.id}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onSelectTemplate({ type: 'template', data: template })}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{template.name}</h4>
                          {template.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                        {template.use_case && (
                          <p className="text-sm text-slate-600 mb-2">{template.use_case}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.medications?.length || 0} médicaments
                          </Badge>
                          {template.frequency_used > 0 && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {template.frequency_used}x utilisé
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Schémas thérapeutiques */}
          {filteredSchemes.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-600 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Schémas thérapeutiques ({filteredSchemes.length})
              </h3>
              <div className="space-y-2">
                {filteredSchemes.map(scheme => (
                  <Card
                    key={scheme.id}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-l-purple-500"
                    onClick={() => onSelectTemplate({ type: 'scheme', data: scheme })}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{scheme.name}</h4>
                        <p className="text-sm text-slate-600 mb-2">{scheme.condition}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getCategoryColor(scheme.category)}>
                            {scheme.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {scheme.medications?.length || 0} médicaments
                          </Badge>
                          {scheme.is_shared && (
                            <Badge variant="secondary" className="text-xs">
                              Partagé
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredTemplates.length === 0 && filteredSchemes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">Aucun modèle trouvé</p>
              <p className="text-sm text-slate-400 mt-1">
                Créez votre premier modèle en prescrivant des médicaments
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}