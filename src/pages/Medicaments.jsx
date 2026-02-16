import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pill,
  Search,
  AlertTriangle,
  BookOpen,
  Database,
  Star,
  Plus,
  Info,
  FileText,
  Beaker
} from 'lucide-react';
import DrugSearchPanel from '@/components/medications/DrugSearchPanel';
import DrugInteractionPanel from '@/components/medications/DrugInteractionPanel';
import DrugFavorites from '@/components/medications/DrugFavorites';
import DrugInfoModal from '@/components/medications/DrugInfoModal';

export default function Medicaments() {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [showDrugInfo, setShowDrugInfo] = useState(false);
  const [interactionDrugs, setInteractionDrugs] = useState([]);

  const handleViewDrugInfo = (drug) => {
    setSelectedDrug(drug);
    setShowDrugInfo(true);
  };

  const handleAddToInteractionCheck = (drug) => {
    if (!interactionDrugs.find(d => d.cnk === drug.cnk || d.product_name === drug.product_name)) {
      setInteractionDrugs([...interactionDrugs, drug]);
      setActiveTab('interactions');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="w-6 h-6 text-blue-600" />
          Base de données médicaments
        </h1>
        <p className="text-slate-600 mt-1">
          Recherche SAM v2, interactions médicamenteuses, informations détaillées
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="search" className="gap-2">
            <Search className="w-4 h-4" />
            Recherche
          </TabsTrigger>
          <TabsTrigger value="interactions" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Interactions
            {interactionDrugs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{interactionDrugs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Star className="w-4 h-4" />
            Favoris
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Guide
          </TabsTrigger>
        </TabsList>

        {/* Recherche */}
        <TabsContent value="search">
          <DrugSearchPanel 
            onViewInfo={handleViewDrugInfo}
            onAddToInteractions={handleAddToInteractionCheck}
          />
        </TabsContent>

        {/* Interactions */}
        <TabsContent value="interactions">
          <DrugInteractionPanel 
            drugs={interactionDrugs}
            onRemoveDrug={(drug) => setInteractionDrugs(interactionDrugs.filter(d => d.cnk !== drug.cnk))}
            onClear={() => setInteractionDrugs([])}
            onAddDrug={(drug) => {
              if (!interactionDrugs.find(d => d.cnk === drug.cnk)) {
                setInteractionDrugs([...interactionDrugs, drug]);
              }
            }}
          />
        </TabsContent>

        {/* Favoris */}
        <TabsContent value="favorites">
          <DrugFavorites 
            onSelect={handleViewDrugInfo}
            onAddToInteractions={handleAddToInteractionCheck}
          />
        </TabsContent>

        {/* Guide */}
        <TabsContent value="guide">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Base SAM v2
                </CardTitle>
                <CardDescription>
                  Base de données authentique des médicaments belges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  La base SAM (Source Authentique des Médicaments) contient toutes les 
                  informations officielles sur les médicaments commercialisés en Belgique.
                </p>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium text-blue-800 mb-2">Informations disponibles:</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Code CNK et DCI</li>
                    <li>• Composition et forme galénique</li>
                    <li>• Prix et remboursement</li>
                    <li>• Conditions de délivrance</li>
                    <li>• Notice patient (RCP)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Interactions médicamenteuses
                </CardTitle>
                <CardDescription>
                  Vérifiez les interactions entre médicaments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  L'outil d'interactions vérifie les combinaisons de médicaments 
                  et signale les risques potentiels.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600">Contre-indication</Badge>
                    <span className="text-xs">Association interdite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-600">Majeure</Badge>
                    <span className="text-xs">Surveillance étroite requise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">Modérée</Badge>
                    <span className="text-xs">Précaution d'emploi</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-purple-600" />
                  Équivalents génériques
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="mb-3">
                  Recherchez les alternatives génériques moins coûteuses pour vos patients.
                </p>
                <p className="text-slate-600">
                  Les génériques ont la même composition et efficacité que les médicaments 
                  de marque, à un prix inférieur.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Prescription rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="mb-3">
                  Depuis cette page, vous pouvez rapidement créer une prescription 
                  pour un patient.
                </p>
                <ol className="text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Recherchez le médicament</li>
                  <li>Ajoutez la posologie</li>
                  <li>Sélectionnez le patient</li>
                  <li>Envoyez via Recip-e</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal info médicament */}
      {showDrugInfo && selectedDrug && (
        <DrugInfoModal 
          drug={selectedDrug}
          open={showDrugInfo}
          onClose={() => setShowDrugInfo(false)}
        />
      )}
    </div>
  );
}