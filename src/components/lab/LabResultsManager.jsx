import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  TestTube,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  RefreshCw,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const FLAG_STYLES = {
  normal: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  low: { color: 'bg-blue-100 text-blue-700', icon: TrendingDown },
  high: { color: 'bg-orange-100 text-orange-700', icon: TrendingUp },
  critical_low: { color: 'bg-red-100 text-red-700', icon: TrendingDown },
  critical_high: { color: 'bg-red-100 text-red-700', icon: TrendingUp },
  abnormal: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle }
};

export default function LabResultsManager({ patientId }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('unread');
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les résultats de labo
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ['labResults', patientId],
    queryFn: async () => {
      if (patientId) {
        return base44.entities.LabResult.filter({ patient_id: patientId });
      }
      return base44.entities.LabResult.list('-result_date', 100);
    }
  });

  // Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (resultId) => {
      const user = await base44.auth.me();
      return base44.entities.LabResult.update(resultId, {
        status: 'validated',
        read_by: user.email,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labResults'] });
      toast.success('Résultat marqué comme lu');
    }
  });

  const unreadResults = labResults.filter(r => !r.read_at);
  const criticalResults = labResults.filter(r => r.has_critical);
  const abnormalResults = labResults.filter(r => r.has_abnormal && !r.has_critical);

  const filteredResults = labResults.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.laboratory_name?.toLowerCase().includes(term) ||
      r.results?.some(res => res.name?.toLowerCase().includes(term))
    );
  });

  const getDisplayResults = () => {
    switch (activeTab) {
      case 'unread': return unreadResults;
      case 'critical': return criticalResults;
      case 'abnormal': return abnormalResults;
      default: return filteredResults;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-600" />
            Résultats de laboratoire
          </h2>
          <p className="text-sm text-muted-foreground">
            {unreadResults.length} non lu(s) • {criticalResults.length} critique(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      {criticalResults.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  {criticalResults.length} résultat(s) critique(s) à examiner
                </p>
                <p className="text-sm text-red-600">
                  Valeurs en dehors des limites de sécurité
                </p>
              </div>
              <Button 
                variant="outline" 
                className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => setActiveTab('critical')}
              >
                Voir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="unread" className="gap-2">
            <Clock className="w-4 h-4" />
            Non lus
            {unreadResults.length > 0 && (
              <Badge className="bg-blue-600 text-white ml-1">{unreadResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Critiques
            {criticalResults.length > 0 && (
              <Badge className="bg-red-600 text-white ml-1">{criticalResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="abnormal" className="gap-2">
            Anormaux
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            Tous
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : getDisplayResults().length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TestTube className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-muted-foreground">Aucun résultat</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {getDisplayResults().map(result => (
                <Card 
                  key={result.id} 
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    result.has_critical ? 'border-red-200 bg-red-50/50' :
                    result.has_abnormal ? 'border-orange-200 bg-orange-50/50' :
                    !result.read_at ? 'border-blue-200 bg-blue-50/50' : ''
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          result.has_critical ? 'bg-red-100' :
                          result.has_abnormal ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          <TestTube className={`w-5 h-5 ${
                            result.has_critical ? 'text-red-600' :
                            result.has_abnormal ? 'text-orange-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{result.laboratory_name}</span>
                            {!result.read_at && (
                              <Badge className="bg-blue-100 text-blue-700">Nouveau</Badge>
                            )}
                            {result.has_critical && (
                              <Badge className="bg-red-100 text-red-700">Critique</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(result.sample_date), 'd MMMM yyyy', { locale: fr })}
                            {' • '}{result.results?.length || 0} analyses
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.pdf_url && (
                          <Button size="icon" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Aperçu des résultats anormaux */}
                    {result.results?.filter(r => r.flag !== 'normal').slice(0, 3).length > 0 && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                        {result.results.filter(r => r.flag !== 'normal').slice(0, 3).map((res, idx) => {
                          const flagStyle = FLAG_STYLES[res.flag] || FLAG_STYLES.abnormal;
                          const FlagIcon = flagStyle.icon;
                          return (
                            <Badge key={idx} variant="outline" className={flagStyle.color}>
                              <FlagIcon className="w-3 h-3 mr-1" />
                              {res.name}: {res.value} {res.unit}
                            </Badge>
                          );
                        })}
                        {result.results.filter(r => r.flag !== 'normal').length > 3 && (
                          <Badge variant="outline">
                            +{result.results.filter(r => r.flag !== 'normal').length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog détail résultat */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <TestTube className="w-5 h-5 text-blue-600" />
              {selectedResult?.laboratory_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Date prélèvement</p>
                    <p className="font-medium">
                      {format(new Date(selectedResult.sample_date), 'd MMMM yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date résultat</p>
                    <p className="font-medium">
                      {selectedResult.result_date && format(new Date(selectedResult.result_date), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">N° commande</p>
                    <p className="font-medium">{selectedResult.order_number || '-'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedResult.results?.map((res, idx) => {
                    const flagStyle = FLAG_STYLES[res.flag] || FLAG_STYLES.normal;
                    const FlagIcon = flagStyle.icon;
                    const isAbnormal = res.flag !== 'normal';
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border ${isAbnormal ? flagStyle.color : 'bg-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FlagIcon className={`w-4 h-4 ${
                              res.flag === 'normal' ? 'text-green-600' :
                              res.flag?.includes('critical') ? 'text-red-600' : 'text-orange-600'
                            }`} />
                            <div>
                              <span className="font-medium">{res.name}</span>
                              {res.code && (
                                <span className="text-xs text-muted-foreground ml-2">({res.code})</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${isAbnormal ? 'text-red-600' : ''}`}>
                              {res.value} {res.unit}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Réf: {res.reference_range || `${res.reference_low || '?'} - ${res.reference_high || '?'}`}
                            </p>
                          </div>
                        </div>
                        {res.comment && (
                          <p className="text-sm text-muted-foreground mt-2 pl-7">{res.comment}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {selectedResult?.pdf_url && (
                <Button variant="outline" asChild>
                  <a href={selectedResult.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    PDF original
                  </a>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!selectedResult?.read_at && (
                <Button 
                  onClick={() => {
                    markAsReadMutation.mutate(selectedResult.id);
                    setSelectedResult(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marquer comme lu
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}