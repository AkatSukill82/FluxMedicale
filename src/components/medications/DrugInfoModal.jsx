import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pill,
  Package,
  Euro,
  FileText,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function DrugInfoModal({ drug, open, onClose }) {
  const [activeTab, setActiveTab] = useState('info');

  // Charger les informations détaillées via IA
  const { data: detailedInfo, isLoading } = useQuery({
    queryKey: ['drugInfo', drug?.cnk],
    queryFn: async () => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Donne des informations détaillées sur le médicament belge "${drug.product_name}" (${drug.substance}):
        - Indications principales
        - Posologie habituelle adulte
        - Contre-indications importantes
        - Effets secondaires fréquents
        - Précautions d'emploi
        - Interactions principales
        
        Sois concis et pratique pour un médecin.`,
        response_json_schema: {
          type: "object",
          properties: {
            indications: { type: "array", items: { type: "string" } },
            posologie: { type: "string" },
            contre_indications: { type: "array", items: { type: "string" } },
            effets_secondaires: { type: "array", items: { type: "string" } },
            precautions: { type: "array", items: { type: "string" } },
            interactions: { type: "array", items: { type: "string" } }
          }
        }
      });
      return response;
    },
    enabled: open && !!drug
  });

  const formatPrice = (cents) => {
    if (!cents) return '-';
    return `€${(cents / 100).toFixed(2)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  if (!drug) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            {drug.product_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info de base */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Package className="w-3 h-3" />
              CNK: {drug.cnk}
            </Badge>
            {drug.price && (
              <Badge variant="outline" className="gap-1">
                <Euro className="w-3 h-3" />
                {formatPrice(drug.price)}
              </Badge>
            )}
            {drug.reimbursed && (
              <Badge className="bg-green-600">Remboursé</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(drug.cnk)}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copier CNK
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Substance:</span>
                  <p className="font-medium">{drug.substance}</p>
                </div>
                <div>
                  <span className="text-slate-500">Forme:</span>
                  <p className="font-medium">{drug.form}</p>
                </div>
                <div>
                  <span className="text-slate-500">Dosage:</span>
                  <p className="font-medium">{drug.strength}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="posologie">Posologie</TabsTrigger>
              <TabsTrigger value="precautions">Précautions</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[300px] mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-slate-600">Chargement des informations...</span>
                </div>
              ) : (
                <>
                  <TabsContent value="info" className="space-y-4">
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Indications
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {detailedInfo?.indications?.map((ind, i) => (
                          <li key={i}>{ind}</li>
                        )) || <li>Information non disponible</li>}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Contre-indications
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {detailedInfo?.contre_indications?.map((ci, i) => (
                          <li key={i}>{ci}</li>
                        )) || <li>Information non disponible</li>}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="posologie" className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Posologie habituelle</h4>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                        {detailedInfo?.posologie || 'Information non disponible'}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        Effets secondaires fréquents
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {detailedInfo?.effets_secondaires?.map((es, i) => (
                          <li key={i}>{es}</li>
                        )) || <li>Information non disponible</li>}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="precautions" className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Précautions d'emploi</h4>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {detailedInfo?.precautions?.map((p, i) => (
                          <li key={i}>{p}</li>
                        )) || <li>Information non disponible</li>}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Interactions principales
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {detailedInfo?.interactions?.map((int, i) => (
                          <li key={i}>{int}</li>
                        )) || <li>Information non disponible</li>}
                      </ul>
                    </div>
                  </TabsContent>
                </>
              )}
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" asChild>
              <a 
                href={`https://www.cbip.be/fr/search?q=${encodeURIComponent(drug.substance)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                CBIP
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a 
                href={`https://www.fagg-afmps.be/fr/items-HOME/base_de_donnees_medicaments_a_usage_humain_et_veterinaire`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                AFMPS
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}