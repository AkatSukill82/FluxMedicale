import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, Plus, Eye, EyeOff, GripVertical, Trash2, Save } from 'lucide-react';

// Analyses prédéfinies disponibles
export const PREDEFINED_ANALYSES = [
  { id: 'barometres', label: 'Baromètres principaux', description: 'DMG, vaccinations, allergies, maladies chroniques', category: 'Vue d\'ensemble', default: true },
  { id: 'kpis', label: 'KPIs rapides', description: 'Compteurs patients, vaccinations, allergies, antécédents', category: 'Vue d\'ensemble', default: true },
  { id: 'demographie', label: 'Démographie', description: 'Répartition par âge et genre', category: 'Population', default: true },
  { id: 'dmg', label: 'Analyse DMG', description: 'Statut des Dossiers Médicaux Globaux', category: 'Administration', default: true },
  { id: 'vaccinations', label: 'Vaccinations par type', description: 'Répartition des vaccinations administrées', category: 'Prévention', default: true },
  { id: 'couverture_vaccinale', label: 'Couverture vaccinale', description: 'Taux de vaccination par maladie', category: 'Prévention', default: true },
  { id: 'allergies', label: 'Analyse des allergies', description: 'Type, sévérité et top allergènes', category: 'Clinique', default: true },
  { id: 'maladies_chroniques', label: 'Maladies chroniques', description: 'Antécédents et pathologies chroniques', category: 'Clinique', default: true },
];

const CUSTOM_ANALYSIS_TYPES = [
  { value: 'vaccination_coverage', label: 'Couverture vaccinale', description: 'Mesurer le % de patients vaccinés pour un vaccin spécifique' },
  { value: 'diagnosis_prevalence', label: 'Prévalence d\'un diagnostic', description: 'Compter les patients avec un diagnostic/antécédent spécifique' },
  { value: 'allergy_tracking', label: 'Suivi d\'allergie', description: 'Suivre un allergène spécifique dans la patientèle' },
  { value: 'age_group_metric', label: 'Métrique par tranche d\'âge', description: 'Analyser une métrique pour une tranche d\'âge spécifique' },
  { value: 'medication_usage', label: 'Utilisation de médicament', description: 'Suivre la prescription d\'un médicament spécifique' },
];

export default function AnalysisSelector({ selectedAnalyses, onSelectionChange, customAnalyses, onCustomAnalysesChange }) {
  const [showConfig, setShowConfig] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: '', type: '', description: '', searchTerm: '', ageMin: '', ageMax: '', gender: '' });

  const toggleAnalysis = (id) => {
    if (selectedAnalyses.includes(id)) {
      onSelectionChange(selectedAnalyses.filter(a => a !== id));
    } else {
      onSelectionChange([...selectedAnalyses, id]);
    }
  };

  const addCustomAnalysis = () => {
    if (!newCustom.name || !newCustom.type || !newCustom.searchTerm) return;
    const id = 'custom_' + Date.now();
    const analysis = { ...newCustom, id };
    onCustomAnalysesChange([...customAnalyses, analysis]);
    onSelectionChange([...selectedAnalyses, id]);
    setNewCustom({ name: '', type: '', description: '', searchTerm: '', ageMin: '', ageMax: '', gender: '' });
    setShowAddCustom(false);
  };

  const removeCustomAnalysis = (id) => {
    onCustomAnalysesChange(customAnalyses.filter(a => a.id !== id));
    onSelectionChange(selectedAnalyses.filter(a => a !== id));
  };

  const categories = [...new Set(PREDEFINED_ANALYSES.map(a => a.category))];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Mes analyses
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddCustom(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Analyse personnalisée
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
            {showConfig ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showConfig ? 'Masquer config' : 'Configurer'}
          </Button>
        </div>
      </div>

      {showConfig && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4">Cochez les analyses que vous souhaitez afficher :</p>
            <div className="space-y-4">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PREDEFINED_ANALYSES.filter(a => a.category === cat).map(analysis => (
                      <label key={analysis.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={selectedAnalyses.includes(analysis.id)}
                          onCheckedChange={() => toggleAnalysis(analysis.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">{analysis.label}</p>
                          <p className="text-xs text-muted-foreground">{analysis.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Analyses personnalisées */}
              {customAnalyses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Analyses personnalisées</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {customAnalyses.map(analysis => (
                      <div key={analysis.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        <Checkbox
                          checked={selectedAnalyses.includes(analysis.id)}
                          onCheckedChange={() => toggleAnalysis(analysis.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{analysis.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {CUSTOM_ANALYSIS_TYPES.find(t => t.value === analysis.type)?.label} — "{analysis.searchTerm}"
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCustomAnalysis(analysis.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog ajout analyse personnalisée */}
      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle analyse personnalisée</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de l'analyse</Label>
              <Input
                placeholder="Ex: Couverture grippe > 65 ans"
                value={newCustom.name}
                onChange={e => setNewCustom({ ...newCustom, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Type d'analyse</Label>
              <Select value={newCustom.type} onValueChange={v => setNewCustom({ ...newCustom, type: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir le type..." /></SelectTrigger>
                <SelectContent>
                  {CUSTOM_ANALYSIS_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Terme de recherche</Label>
              <Input
                placeholder={newCustom.type === 'vaccination_coverage' ? 'Ex: GRIPPE, COVID, TETANOS...' :
                  newCustom.type === 'diagnosis_prevalence' ? 'Ex: Diabète, Hypertension...' :
                  newCustom.type === 'allergy_tracking' ? 'Ex: Pénicilline, Arachide...' :
                  newCustom.type === 'medication_usage' ? 'Ex: Metformine, Amlodipine...' :
                  'Mot-clé à rechercher'}
                value={newCustom.searchTerm}
                onChange={e => setNewCustom({ ...newCustom, searchTerm: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Âge min (optionnel)</Label>
                <Input type="number" placeholder="0" value={newCustom.ageMin} onChange={e => setNewCustom({ ...newCustom, ageMin: e.target.value })} />
              </div>
              <div>
                <Label>Âge max (optionnel)</Label>
                <Input type="number" placeholder="120" value={newCustom.ageMax} onChange={e => setNewCustom({ ...newCustom, ageMax: e.target.value })} />
              </div>
              <div>
                <Label>Genre (optionnel)</Label>
                <Select value={newCustom.gender} onValueChange={v => setNewCustom({ ...newCustom, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="male">Hommes</SelectItem>
                    <SelectItem value="female">Femmes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Textarea placeholder="Notes sur cette analyse..." value={newCustom.description} onChange={e => setNewCustom({ ...newCustom, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustom(false)}>Annuler</Button>
            <Button onClick={addCustomAnalysis} disabled={!newCustom.name || !newCustom.type || !newCustom.searchTerm}>
              <Plus className="w-4 h-4 mr-1" />
              Créer l'analyse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}