import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  FlaskConical, 
  Plus, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Calendar,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import LabResultForm from './LabResultForm';
import LabResultDetail from './LabResultDetail';
import LabTrendsChart from './LabTrendsChart';

const TYPE_LABELS = {
  HEMATOLOGIE: { label: 'Hématologie', color: 'bg-red-100 text-red-800' },
  BIOCHIMIE: { label: 'Biochimie', color: 'bg-blue-100 text-blue-800' },
  HORMONOLOGIE: { label: 'Hormonologie', color: 'bg-purple-100 text-purple-800' },
  SEROLOGIE: { label: 'Sérologie', color: 'bg-green-100 text-green-800' },
  URINAIRE: { label: 'Urinaire', color: 'bg-yellow-100 text-yellow-800' },
  MICROBIOLOGIE: { label: 'Microbiologie', color: 'bg-orange-100 text-orange-800' },
  AUTRE: { label: 'Autre', color: 'bg-slate-100 text-slate-800' }
};

export default function LabResultsPanel({ patient }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ['lab-results', patient.id],
    queryFn: () => base44.entities.LabResult.filter({ patient_id: patient.id }, '-date_prelevement'),
    enabled: !!patient?.id
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation'),
    enabled: !!patient?.id
  });

  const markAsSeenMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.LabResult.update(id, {
        vu_par_medecin: true,
        vu_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-results', patient.id] });
    }
  });

  // Filtrage des résultats
  const filteredResults = labResults.filter(result => {
    const matchesSearch = searchQuery === '' || 
      result.laboratoire?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.resultats?.some(r => r.parametre?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || result.type_analyse === filterType;
    return matchesSearch && matchesType;
  });

  // Compteurs
  const unseenCount = labResults.filter(r => !r.vu_par_medecin).length;
  const urgentCount = labResults.filter(r => r.urgence).length;
  const abnormalCount = labResults.filter(r => 
    r.resultats?.some(res => res.statut && res.statut !== 'NORMAL')
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Résultats de laboratoire
          </h2>
          <div className="flex gap-2">
            {unseenCount > 0 && (
              <Badge className="bg-blue-600">{unseenCount} non vu(s)</Badge>
            )}
            {urgentCount > 0 && (
              <Badge className="bg-red-600">{urgentCount} urgent(s)</Badge>
            )}
            {abnormalCount > 0 && (
              <Badge className="bg-orange-500">{abnormalCount} anormal(aux)</Badge>
            )}
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau résultat
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <FileText className="w-4 h-4" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filtres */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par labo ou paramètre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          {/* Liste des résultats */}
          {filteredResults.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun résultat de laboratoire</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredResults.map(result => (
                <LabResultCard
                  key={result.id}
                  result={result}
                  onView={() => setSelectedResult(result)}
                  onMarkSeen={() => markAsSeenMutation.mutate(result.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <LabTrendsChart labResults={labResults} patient={patient} />
        </TabsContent>
      </Tabs>

      {/* Modal formulaire */}
      {showForm && (
        <LabResultForm
          patient={patient}
          consultations={consultations}
          isOpen={showForm}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Modal détail */}
      {selectedResult && (
        <LabResultDetail
          result={selectedResult}
          consultations={consultations}
          isOpen={!!selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}

function LabResultCard({ result, onView, onMarkSeen }) {
  const typeInfo = TYPE_LABELS[result.type_analyse] || TYPE_LABELS.AUTRE;
  const hasAbnormal = result.resultats?.some(r => r.statut && r.statut !== 'NORMAL');
  const abnormalParams = result.resultats?.filter(r => r.statut && r.statut !== 'NORMAL') || [];

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all ${
        !result.vu_par_medecin ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
      } ${result.urgence ? 'border-l-4 border-l-red-500' : ''}`}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
              {result.urgence && (
                <Badge className="bg-red-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Urgent
                </Badge>
              )}
              {!result.vu_par_medecin && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Nouveau
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(result.date_prelevement), 'd MMM yyyy', { locale: fr })}
              </span>
              {result.laboratoire && (
                <span className="font-medium">{result.laboratoire}</span>
              )}
            </div>

            {/* Aperçu des paramètres anormaux */}
            {hasAbnormal && (
              <div className="flex flex-wrap gap-2 mt-2">
                {abnormalParams.slice(0, 3).map((param, idx) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className={param.statut?.includes('CRITIQUE') ? 'border-red-500 text-red-700' : 'border-orange-500 text-orange-700'}
                  >
                    {param.parametre}: {param.valeur} {param.unite}
                    {param.statut === 'HAUT' || param.statut === 'CRITIQUE_HAUT' ? ' ↑' : ' ↓'}
                  </Badge>
                ))}
                {abnormalParams.length > 3 && (
                  <Badge variant="outline">+{abnormalParams.length - 3} autres</Badge>
                )}
              </div>
            )}

            {/* Résumé des paramètres */}
            {!hasAbnormal && result.resultats?.length > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {result.resultats.length} paramètre(s) - Tous normaux
                <CheckCircle className="w-4 h-4 inline ml-1 text-green-500" />
              </p>
            )}

            {/* Documents */}
            {result.documents?.length > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                <FileText className="w-3 h-3" />
                {result.documents.length} document(s) attaché(s)
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="w-4 h-4" />
            </Button>
            {!result.vu_par_medecin && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => { e.stopPropagation(); onMarkSeen(); }}
                title="Marquer comme vu"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}